import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import sharp from 'sharp';
import crypto from 'crypto';
import awsConfig from '../config/aws.js';
import logger from '../config/logger.js';
import AppError from '../utils/AppError.js';

const unlinkFile = promisify(fs.unlink);

class FileService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // File filters
  imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only images are allowed.', 400), false);
    }
  };

  videoFilter = (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only videos are allowed.', 400), false);
    }
  };

  documentFilter = (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only documents are allowed.', 400), false);
    }
  };

  // Generate filename
  generateFilename = (req, file, cb) => {
    const randomString = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname);
    const filename = `${Date.now()}-${randomString}${extension}`;
    cb(null, filename);
  };

  // Local storage configuration
  localStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      let uploadPath = this.uploadDir;
      
      // Create subdirectories based on file type
      if (file.fieldname === 'avatar') {
        uploadPath = path.join(this.uploadDir, 'avatars');
      } else if (file.fieldname === 'courseThumbnail') {
        uploadPath = path.join(this.uploadDir, 'courses/thumbnails');
      } else if (file.fieldname === 'lectureVideo') {
        uploadPath = path.join(this.uploadDir, 'courses/videos');
      } else if (file.fieldname === 'resource') {
        uploadPath = path.join(this.uploadDir, 'resources');
      } else if (file.fieldname === 'certificate') {
        uploadPath = path.join(this.uploadDir, 'certificates');
      }

      // Ensure directory exists
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: this.generateFilename,
  });

  // S3 storage configuration
  s3Storage = (folder) => multerS3({
    s3: awsConfig.s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'private',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        userId: req.user?._id?.toString() || 'anonymous',
        uploadTime: new Date().toISOString(),
      });
    },
    key: (req, file, cb) => {
      const randomString = crypto.randomBytes(16).toString('hex');
      const extension = path.extname(file.originalname);
      const filename = `${folder}/${Date.now()}-${randomString}${extension}`;
      cb(null, filename);
    },
  });

  // Multer upload instances
  upload = {
    // Single file upload
    single: (fieldName, fileType = 'image', storage = 'local') => {
      let fileFilter;
      switch (fileType) {
        case 'image':
          fileFilter = this.imageFilter;
          break;
        case 'video':
          fileFilter = this.videoFilter;
          break;
        case 'document':
          fileFilter = this.documentFilter;
          break;
        default:
          fileFilter = this.imageFilter;
      }

      const storage_engine = storage === 's3' 
        ? this.s3Storage(fileType + 's')
        : this.localStorage;

      return multer({
        storage: storage_engine,
        fileFilter,
        limits: {
          fileSize: this.getMaxFileSize(fileType),
        },
      }).single(fieldName);
    },

    // Multiple file upload
    array: (fieldName, maxCount, fileType = 'image', storage = 'local') => {
      let fileFilter;
      switch (fileType) {
        case 'image':
          fileFilter = this.imageFilter;
          break;
        case 'video':
          fileFilter = this.videoFilter;
          break;
        case 'document':
          fileFilter = this.documentFilter;
          break;
        default:
          fileFilter = this.imageFilter;
      }

      const storage_engine = storage === 's3' 
        ? this.s3Storage(fileType + 's')
        : this.localStorage;

      return multer({
        storage: storage_engine,
        fileFilter,
        limits: {
          fileSize: this.getMaxFileSize(fileType),
          files: maxCount,
        },
      }).array(fieldName, maxCount);
    },

    // Multiple fields upload
    fields: (fields, storage = 'local') => {
      const storage_engine = storage === 's3' 
        ? this.s3Storage('uploads')
        : this.localStorage;

      return multer({
        storage: storage_engine,
        limits: {
          fileSize: 100 * 1024 * 1024, // 100MB
        },
      }).fields(fields);
    },
  };

  // Get max file size based on type
  getMaxFileSize(fileType) {
    const sizes = {
      image: 5 * 1024 * 1024, // 5MB
      video: 500 * 1024 * 1024, // 500MB
      document: 10 * 1024 * 1024, // 10MB
    };
    return sizes[fileType] || 10 * 1024 * 1024;
  }

  // Process image (resize, optimize)
  async processImage(filePath, options = {}) {
    const {
      width = null,
      height = null,
      quality = 80,
      format = 'jpeg',
    } = options;

    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();

      let processed = image;

      // Resize if dimensions provided
      if (width || height) {
        processed = processed.resize(width, height, {
          fit: 'cover',
          position: 'center',
        });
      }

      // Change format and quality
      switch (format) {
        case 'jpeg':
        case 'jpg':
          processed = processed.jpeg({ quality });
          break;
        case 'png':
          processed = processed.png({ quality });
          break;
        case 'webp':
          processed = processed.webp({ quality });
          break;
      }

      // Generate output filename
      const ext = path.extname(filePath);
      const dir = path.dirname(filePath);
      const basename = path.basename(filePath, ext);
      const outputPath = path.join(dir, `${basename}_processed.${format}`);

      await processed.toFile(outputPath);

      // Delete original file
      await unlinkFile(filePath);

      return {
        path: outputPath,
        size: (await fs.promises.stat(outputPath)).size,
        width: width || metadata.width,
        height: height || metadata.height,
        format,
      };
    } catch (error) {
      logger.error('Image processing error:', error);
      throw new AppError('Failed to process image', 500);
    }
  }

  // Delete file
  async deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        await unlinkFile(filePath);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('File deletion error:', error);
      return false;
    }
  }

  // Delete S3 file
  async deleteS3File(key) {
    try {
      await awsConfig.deleteFile(key);
      return true;
    } catch (error) {
      logger.error('S3 file deletion error:', error);
      return false;
    }
  }

  // Get file info
  async getFileInfo(filePath) {
    try {
      const stats = await fs.promises.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      logger.error('File info error:', error);
      return null;
    }
  }

  // Validate file
  validateFile(file, options = {}) {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = [],
      minWidth = null,
      minHeight = null,
    } = options;

    if (!file) {
      throw new AppError('No file provided', 400);
    }

    // Check file size
    if (file.size > maxSize) {
      throw new AppError(`File size exceeds ${maxSize / 1024 / 1024}MB`, 400);
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      throw new AppError(`File type ${file.mimetype} not allowed`, 400);
    }

    return true;
  }

  // Create directory
  async createDirectory(dirPath) {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      logger.error('Directory creation error:', error);
      return false;
    }
  }

  // List directory contents
  async listDirectory(dirPath) {
    try {
      const files = await fs.promises.readdir(dirPath);
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(dirPath, file);
          const stats = await fs.promises.stat(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            modified: stats.mtime,
          };
        })
      );
      return fileStats;
    } catch (error) {
      logger.error('Directory listing error:', error);
      return [];
    }
  }

  // Clean up old files
  async cleanupOldFiles(directory, ageInDays = 30) {
    try {
      const files = await fs.promises.readdir(directory);
      const now = Date.now();
      const maxAge = ageInDays * 24 * 60 * 60 * 1000;

      let deletedCount = 0;
      for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = await fs.promises.stat(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          await this.deleteFile(filePath);
          deletedCount++;
        }
      }

      logger.info(`Cleaned up ${deletedCount} old files from ${directory}`);
      return deletedCount;
    } catch (error) {
      logger.error('Cleanup error:', error);
      return 0;
    }
  }
}

export default new FileService();