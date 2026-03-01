import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../config/redis.js';

const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests, please try again later.',
    keyPrefix = 'rl:',
    skipFailedRequests = false,
    skipSuccessfulRequests = false
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      status: 'error',
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: process.env.NODE_ENV === 'production' ? new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: keyPrefix
    }) : undefined,
    skipFailedRequests,
    skipSuccessfulRequests,
    keyGenerator: (req) => {
      return req.user ? `${req.user.id}` : req.ip;
    }
  });
};

// Different rate limiters for different endpoints
export const authLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many authentication attempts, please try again after an hour.',
  keyPrefix: 'rl:auth:'
});

export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later.',
  keyPrefix: 'rl:api:'
});

export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Upload limit reached, please try again after an hour.',
  keyPrefix: 'rl:upload:'
});