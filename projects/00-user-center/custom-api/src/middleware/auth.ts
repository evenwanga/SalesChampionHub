import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ApiResponse } from '../types';

// 扩展Express Request类型
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      userId?: string;
      requestId?: string;
    }
  }
}

// Service API Key认证中间件（用于子项目调用）
export const serviceAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['authorization']?.replace('Bearer ', '');
  const expectedApiKey = process.env.SERVICE_API_KEY;

  if (!expectedApiKey) {
    logger.error('SERVICE_API_KEY not configured');
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Server configuration error',
      },
    } as ApiResponse);
  }

  if (!apiKey || apiKey !== expectedApiKey) {
    logger.warn('Invalid service API key', {
      ip: req.ip,
      path: req.path,
    });

    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing API key',
      },
    } as ApiResponse);
  }

  return next();
};

// 请求ID中间件
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string ||
                   `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// 错误处理中间件
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.requestId,
  });

  // 如果响应已经发送，交给默认错误处理
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const response: ApiResponse = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  };

  res.status(statusCode).json(response);
};

// 404处理中间件
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  } as ApiResponse);
};

// CORS中间件配置
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];

    // 允许没有origin的请求（如移动应用、Postman等）
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
};

// 速率限制中间件
export const rateLimitMiddleware = (
  maxRequests: number = 1000,
  windowSeconds: number = 60
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 使用IP地址作为限制键
      const key = req.ip || 'unknown';

      const { rateLimiter } = await import('../services/redis');
      const result = await rateLimiter.check(key, maxRequests, windowSeconds);

      // 设置速率限制响应头
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
            resetAt: new Date(result.resetAt).toISOString(),
          },
        } as ApiResponse);
      }

      next();
    } catch (error) {
      // 如果速率限制检查失败，允许请求通过
      logger.error('Rate limit check failed', { error });
      next();
    }
  };
};

// 审计日志中间件
export const auditLogMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // 保存原始的res.json方法
  const originalJson = res.json.bind(res);

  // 重写res.json以捕获响应
  res.json = function (body: any) {
    const responseTime = Date.now() - startTime;

    // 异步记录审计日志（不阻塞响应）
    setImmediate(async () => {
      try {
        const { auditLogDb } = await import('../services/database');

        await auditLogDb.create({
          organizationId: req.organizationId || 'system',
          userId: req.userId,
          method: req.method,
          path: req.path,
          queryParams: req.query,
          requestBody: req.body,
          statusCode: res.statusCode,
          responseTimeMs: responseTime,
          errorMessage: body?.error?.message,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          requestId: req.requestId,
        });
      } catch (error) {
        logger.error('Failed to write audit log', { error });
      }
    });

    // 调用原始的json方法
    return originalJson(body);
  };

  next();
};
