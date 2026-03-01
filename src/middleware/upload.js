import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

/* 🔹 Image Storage */
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "uploads/images",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1000, crop: "limit" }],
  },
});

/* 🔹 Video Storage */
const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "uploads/videos",
    resource_type: "video",
    allowed_formats: ["mp4", "mov", "avi", "mkv"],
  },
});

export const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

export const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});