export const USER_ROLES = {
  USER: 'user',
  INSTRUCTOR: 'instructor',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
};

export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
  PENDING: 'pending',
};

export const COURSE_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  ALL: 'all',
};

export const COURSE_CATEGORIES = {
  DEVELOPMENT: 'development',
  BUSINESS: 'business',
  DESIGN: 'design',
  MARKETING: 'marketing',
  IT: 'it',
  PERSONAL: 'personal',
};

export const COURSE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export const JOB_TYPES = {
  FULL_TIME: 'full-time',
  PART_TIME: 'part-time',
  CONTRACT: 'contract',
  INTERNSHIP: 'internship',
  REMOTE: 'remote',
};

export const EXPERIENCE_LEVELS = {
  ENTRY: 'entry',
  MID: 'mid',
  SENIOR: 'senior',
  LEAD: 'lead',
  EXECUTIVE: 'executive',
};

export const GROUP_PRIVACY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
};

export const PAYMENT_METHODS = {
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  BANK_TRANSFER: 'bank_transfer',
  WALLET: 'wallet',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
};

export const NOTIFICATION_CHANNELS = {
  IN_APP: 'in-app',
  EMAIL: 'email',
  PUSH: 'push',
  SMS: 'sms',
};

export const NOTIFICATION_TYPES = {
  WELCOME: 'welcome',
  COURSE_ENROLLED: 'course_enrolled',
  COURSE_COMPLETED: 'course_completed',
  JOB_ALERT: 'job_alert',
  MESSAGE_RECEIVED: 'message_received',
  GROUP_INVITATION: 'group_invitation',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  ACCOUNT_VERIFIED: 'account_verified',
  PASSWORD_CHANGED: 'password_changed',
};

export const NOTIFICATION_PRIORITY = {
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low',
};

export const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SCHEDULED: 'scheduled',
  SENT: 'sent',
  FAILED: 'failed',
  READ: 'read',
};

export const FILE_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
  AUDIO: 'audio',
  OTHER: 'other',
};

export const UPLOAD_PATHS = {
  AVATAR: 'avatars',
  COURSE_THUMBNAIL: 'courses/thumbnails',
  COURSE_VIDEO: 'courses/videos',
  COURSE_RESOURCE: 'courses/resources',
  CERTIFICATE: 'certificates',
  GROUP_IMAGE: 'groups',
  JOB_ATTACHMENT: 'jobs',
};

export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
};

export const RATE_LIMITS = {
  API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  AUTH: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 requests per windowMs
  },
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 uploads per hour
  },
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

export const SORT_ORDER = {
  ASC: 1,
  DESC: -1,
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
};

export const EMAIL_SUBJECTS = {
  WELCOME: 'Welcome to ProConnect!',
  VERIFY_EMAIL: 'Verify Your Email Address',
  RESET_PASSWORD: 'Password Reset Request',
  COURSE_ENROLLED: 'Course Enrollment Confirmation',
  COURSE_COMPLETED: 'Congratulations on Course Completion!',
  PAYMENT_SUCCESS: 'Payment Successful',
  PAYMENT_FAILED: 'Payment Failed',
  JOB_ALERT: 'New Job Opportunities',
  MESSAGE_RECEIVED: 'New Message Received',
  GROUP_INVITATION: 'Group Invitation',
};

export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
  PHONE: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
  URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
};

export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  VIDEO: 500 * 1024 * 1024, // 500MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  AUDIO: 50 * 1024 * 1024, // 50MB
};

export const MIME_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  VIDEO: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
};

export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
};

export const DEFAULTS = {
  AVATAR: 'default-avatar.jpg',
  COURSE_THUMBNAIL: 'default-course.jpg',
  GROUP_IMAGE: 'default-group.jpg',
  LANGUAGE: 'en',
  THEME: 'light',
  CURRENCY: 'USD',
};

export const FEATURES = {
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_SMS_NOTIFICATIONS: false,
  ENABLE_TWO_FACTOR: true,
  ENABLE_SOCIAL_LOGIN: true,
  ENABLE_COURSE_REVIEWS: true,
  ENABLE_CERTIFICATES: true,
  ENABLE_PROJECT_BIDDING: true,
  ENABLE_JOB_ALERTS: true,
};

export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2',
};

export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  TESTING: 'testing',
  STAGING: 'staging',
  PRODUCTION: 'production',
};