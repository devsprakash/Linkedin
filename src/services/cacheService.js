import redisClient from '../config/redis.js';
import logger from '../config/logger.js';

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour
    this.prefix = 'cache:';
  }

  // Generate cache key
  generateKey(prefix, ...parts) {
    return `${this.prefix}${prefix}:${parts.join(':')}`;
  }

  // Get cached data
  async get(key) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  // Set cached data
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redisClient.setEx(key, ttl, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  // Delete cached data
  async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  // Clear cache by pattern
  async clearPattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return keys.length;
    } catch (error) {
      logger.error('Cache clear pattern error:', error);
      return 0;
    }
  }

  // Get or set cache
  async remember(key, ttl, callback) {
    try {
      let data = await this.get(key);
      
      if (data !== null) {
        return data;
      }

      data = await callback();
      await this.set(key, data, ttl);
      
      return data;
    } catch (error) {
      logger.error('Cache remember error:', error);
      return callback(); // Fallback to callback
    }
  }

  // Increment counter
  async increment(key, amount = 1) {
    try {
      return await redisClient.incrBy(key, amount);
    } catch (error) {
      logger.error('Cache increment error:', error);
      return null;
    }
  }

  // Decrement counter
  async decrement(key, amount = 1) {
    try {
      return await redisClient.decrBy(key, amount);
    } catch (error) {
      logger.error('Cache decrement error:', error);
      return null;
    }
  }

  // Set expiration
  async expire(key, ttl) {
    try {
      return await redisClient.expire(key, ttl);
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  }

  // Check if key exists
  async exists(key) {
    try {
      return await redisClient.exists(key);
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  // Get multiple keys
  async mget(keys) {
    try {
      const data = await redisClient.mGet(keys);
      return data.map(item => item ? JSON.parse(item) : null);
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  // Set multiple keys
  async mset(keyValuePairs, ttl) {
    try {
      const multi = redisClient.multi();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serialized = JSON.stringify(value);
        if (ttl) {
          multi.setEx(key, ttl, serialized);
        } else {
          multi.set(key, serialized);
        }
      }
      
      await multi.exec();
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  // Get all keys matching pattern
  async keys(pattern) {
    try {
      return await redisClient.keys(pattern);
    } catch (error) {
      logger.error('Cache keys error:', error);
      return [];
    }
  }

  // Get cache stats
  async getStats() {
    try {
      const info = await redisClient.info();
      const keys = await redisClient.keys(`${this.prefix}*`);
      
      return {
        totalKeys: keys.length,
        info,
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }

  // Flush all cache
  async flush() {
    try {
      const keys = await redisClient.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return keys.length;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return 0;
    }
  }

  // Cache wrapper for API responses
  cacheResponse(ttl = this.defaultTTL) {
    return async (req, res, next) => {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Skip caching for authenticated requests if configured
      if (req.user && process.env.CACHE_AUTHENTICATED === 'false') {
        return next();
      }

      const key = this.generateKey('response', req.originalUrl);

      try {
        const cachedResponse = await this.get(key);
        
        if (cachedResponse) {
          return res.status(200).json(cachedResponse);
        }

        // Store original send function
        const originalSend = res.json;
        
        res.json = function(data) {
          // Cache the response
          this.cacheService.set(key, data, ttl).catch(err => 
            logger.error('Failed to cache response:', err)
          );
          
          // Call original send
          return originalSend.call(this, data);
        }.bind(res);

        res.cacheService = this;
        next();
      } catch (error) {
        logger.error('Cache middleware error:', error);
        next();
      }
    };
  }

  // Rate limiting cache
  async rateLimit(key, maxAttempts, windowMs) {
    const current = await this.increment(key);
    
    if (current === 1) {
      await this.expire(key, Math.ceil(windowMs / 1000));
    }

    return {
      current,
      remaining: Math.max(0, maxAttempts - current),
      exceeded: current > maxAttempts,
    };
  }

  // Distributed lock
  async acquireLock(lockKey, ttl = 10) {
    const key = `lock:${lockKey}`;
    const value = Date.now().toString();
    
    try {
      const result = await redisClient.set(key, value, {
        NX: true,
        EX: ttl
      });
      return result === 'OK';
    } catch (error) {
      logger.error('Lock acquisition error:', error);
      return false;
    }
  }

  async releaseLock(lockKey) {
    const key = `lock:${lockKey}`;
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Lock release error:', error);
      return false;
    }
  }
}

export default new CacheService();