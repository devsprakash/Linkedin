import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import rfs from 'rotating-file-stream';
import crypto from 'crypto';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LoggerMiddleware {
  constructor() {
    this.logDirectory = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
    this.setupMorgan();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  setupMorgan() {
    // Create rotating write streams
    const accessLogStream = rfs.createStream('access.log', {
      interval: '1d', // rotate daily
      path: this.logDirectory,
      maxFiles: 30, // keep 30 days of logs
      compress: 'gzip', // compress rotated files
    });

    const errorLogStream = rfs.createStream('error.log', {
      interval: '1d',
      path: this.logDirectory,
      maxFiles: 30,
      compress: 'gzip',
    });

    // Custom tokens
    morgan.token('user-id', (req) => req.user?._id || 'anonymous');
    morgan.token('session-id', (req) => req.session?.id || '-');
    morgan.token('response-time-ms', (req, res) => {
      if (!res._header || !req._startAt) return '-';
      const ms = Date.now() - req._startAt;
      return `${ms}ms`;
    });
    morgan.token('request-body', (req) => {
      if (req.method === 'POST' || req.method === 'PUT') {
        // Don't log sensitive data
        const body = { ...req.body };
        if (body.password) body.password = '[REDACTED]';
        if (body.token) body.token = '[REDACTED]';
        if (body.creditCard) body.creditCard = '[REDACTED]';
        return JSON.stringify(body);
      }
      return '-';
    });
    morgan.token('request-query', (req) => JSON.stringify(req.query));
    morgan.token('request-params', (req) => JSON.stringify(req.params));

    // Define log formats
    const logFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms :session-id';

    const detailedFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms :session-id - Query: :request-query - Params: :request-params - Body: :request-body';

    // Create morgan middleware for access logs
    this.accessLogger = morgan(logFormat, {
      stream: accessLogStream,
      skip: (req, res) => res.statusCode >= 400, // Skip errors
    });

    // Create morgan middleware for error logs
    this.errorLogger = morgan(detailedFormat, {
      stream: errorLogStream,
      skip: (req, res) => res.statusCode < 400, // Only log errors
    });

    // Console logger for development
    this.consoleLogger = morgan((tokens, req, res) => {
      const status = tokens.status(req, res);
      const color = status >= 500 ? 31 // red
        : status >= 400 ? 33 // yellow
        : status >= 300 ? 36 // cyan
        : status >= 200 ? 32 // green
        : 0; // no color

      const statusColor = `\x1b[${color}m${status}\x1b[0m`;
      
      return [
        tokens.method(req, res),
        tokens.url(req, res),
        statusColor,
        tokens.res(req, res, 'content-length'), '-',
        tokens['response-time'](req, res), 'ms',
        '-', tokens['user-id'](req, res)
      ].join(' ');
    });
  }

  // Main logger middleware
  logger = (req, res, next) => {
    // Add start time
    req._startAt = Date.now();

    // Log request
    logger.info(`Incoming request: ${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userId: req.user?._id,
      userAgent: req.get('User-Agent'),
    });

    // Apply morgan loggers
    if (process.env.NODE_ENV === 'production') {
      this.accessLogger(req, res, () => {});
      this.errorLogger(req, res, () => {});
    } else {
      this.consoleLogger(req, res, () => {});
    }

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - req._startAt;
      const level = res.statusCode >= 400 ? 'warn' : 'info';
      
      logger[level](`Response sent: ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        userId: req.user?._id,
      });
    });

    next();
  };

  // Request ID middleware
  requestId = (req, res, next) => {
    req.id = crypto.randomBytes(16).toString('hex');
    res.setHeader('X-Request-ID', req.id);
    next();
  };

  // Performance logging middleware
  performanceLogger = (req, res, next) => {
    const start = process.hrtime();

    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      if (duration > 1000) { // Log slow requests (>1s)
        logger.warn('Slow request detected', {
          method: req.method,
          url: req.url,
          duration: `${duration.toFixed(2)}ms`,
          userId: req.user?._id,
        });
      }

      // Track metrics (for monitoring systems)
      if (global.metrics) {
        global.metrics.histogram('http_request_duration_ms', duration, {
          method: req.method,
          route: req.route?.path || req.url,
          status_code: res.statusCode,
        });
      }
    });

    next();
  };

  // Structured logging middleware
  structuredLogger = (req, res, next) => {
    const logData = {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userId: req.user?._id,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
    };

    // Add to request for later use
    req.logData = logData;

    // Log request
    logger.debug('Request received', logData);

    // Log response
    res.on('finish', () => {
      logData.statusCode = res.statusCode;
      logData.responseTime = Date.now() - req._startAt;
      
      logger.info('Request completed', logData);
    });

    next();
  };

  // Error logging middleware (use after error handler)
  errorLogger = (err, req, res, next) => {
    const errorData = {
      requestId: req.id,
      method: req.method,
      url: req.url,
      userId: req.user?._id,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
      },
      request: {
        query: req.query,
        params: req.params,
        body: req.method === 'POST' ? '[REDACTED]' : req.body, // Don't log POST bodies
        headers: {
          'user-agent': req.get('User-Agent'),
          'content-type': req.get('Content-Type'),
          referer: req.get('Referer'),
        },
      },
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Server error occurred', errorData);
    } else if (res.statusCode >= 400) {
      logger.warn('Client error occurred', errorData);
    }

    next(err);
  };

  // Audit logging middleware
  auditLogger = (req, res, next) => {
    // Log sensitive operations
    const sensitiveOps = ['POST', 'PUT', 'PATCH', 'DELETE'];
    const sensitivePaths = ['/api/v1/users', '/api/v1/courses', '/api/v1/payments'];

    if (sensitiveOps.includes(req.method) && 
        sensitivePaths.some(path => req.url.startsWith(path))) {
      
      const auditData = {
        timestamp: new Date().toISOString(),
        userId: req.user?._id,
        action: `${req.method} ${req.url}`,
        data: req.body,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      };

      // Store in audit log (could be separate file/DB)
      const auditStream = fs.createWriteStream(
        path.join(this.logDirectory, 'audit.log'),
        { flags: 'a' }
      );
      auditStream.write(JSON.stringify(auditData) + '\n');
    }

    next();
  };
}

export default new LoggerMiddleware();