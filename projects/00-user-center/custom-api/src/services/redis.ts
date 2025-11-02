import { createClient, RedisClientType } from 'redis';
import logger from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisPassword = process.env.REDIS_PASSWORD;

export const redisClient: RedisClientType = createClient({
  url: redisUrl,
  password: redisPassword,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis reconnection failed after 10 attempts');
        return new Error('Redis reconnection failed');
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on('connect', () => {
  logger.info('Redis connection established');
});

redisClient.on('error', (err) => {
  logger.error('Redis error', { error: err });
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis reconnecting...');
});

// 初始化连接
export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Failed to connect to Redis', { error });
    throw error;
  }
}

// 缓存操作封装
export const cache = {
  // 设置缓存（带过期时间，默认1小时）
  async set(key: string, value: any, expiresInSeconds: number = 3600): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await redisClient.setEx(key, expiresInSeconds, serialized);
    } catch (error) {
      logger.error('Cache set failed', { key, error });
      throw error;
    }
  },

  // 获取缓存
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get failed', { key, error });
      return null;
    }
  },

  // 删除缓存
  async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Cache delete failed', { key, error });
    }
  },

  // 批量删除（按模式）
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      logger.error('Cache delete pattern failed', { pattern, error });
    }
  },

  // 检查键是否存在
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists check failed', { key, error });
      return false;
    }
  },

  // 设置键的过期时间
  async expire(key: string, seconds: number): Promise<void> {
    try {
      await redisClient.expire(key, seconds);
    } catch (error) {
      logger.error('Cache expire failed', { key, error });
    }
  },

  // 获取键的TTL
  async ttl(key: string): Promise<number> {
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      logger.error('Cache TTL check failed', { key, error });
      return -1;
    }
  },
};

// 权限缓存
export const permissionCache = {
  // 生成缓存键
  getKey(userId: string, organizationId: string): string {
    return `permission:${userId}:${organizationId}`;
  },

  // 设置权限缓存（15分钟）
  async set(userId: string, organizationId: string, permissions: any): Promise<void> {
    const key = this.getKey(userId, organizationId);
    await cache.set(key, permissions, 900); // 15分钟
  },

  // 获取权限缓存
  async get(userId: string, organizationId: string): Promise<any | null> {
    const key = this.getKey(userId, organizationId);
    return await cache.get(key);
  },

  // 清除用户的权限缓存
  async clear(userId: string, organizationId?: string): Promise<void> {
    if (organizationId) {
      const key = this.getKey(userId, organizationId);
      await cache.del(key);
    } else {
      // 清除该用户所有组织的权限缓存
      await cache.delPattern(`permission:${userId}:*`);
    }
  },
};

// Token缓存（用于黑名单）
export const tokenBlacklist = {
  // 添加Token到黑名单
  async add(token: string, expiresInSeconds: number): Promise<void> {
    const key = `blacklist:token:${token}`;
    await cache.set(key, true, expiresInSeconds);
  },

  // 检查Token是否在黑名单
  async isBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:token:${token}`;
    return await cache.exists(key);
  },
};

// 速率限制
export const rateLimiter = {
  // 检查速率限制
  async check(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    try {
      const limiterKey = `ratelimit:${key}`;
      const current = await redisClient.incr(limiterKey);

      if (current === 1) {
        await redisClient.expire(limiterKey, windowSeconds);
      }

      const ttl = await redisClient.ttl(limiterKey);
      const resetAt = Date.now() + ttl * 1000;

      return {
        allowed: current <= maxRequests,
        remaining: Math.max(0, maxRequests - current),
        resetAt,
      };
    } catch (error) {
      logger.error('Rate limiter check failed', { key, error });
      // 失败时允许请求通过
      return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowSeconds * 1000 };
    }
  },

  // 重置速率限制
  async reset(key: string): Promise<void> {
    const limiterKey = `ratelimit:${key}`;
    await cache.del(limiterKey);
  },
};

// 健康检查
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return false;
  }
}

// 优雅关闭
export async function closeRedis(): Promise<void> {
  await redisClient.quit();
  logger.info('Redis connection closed');
}
