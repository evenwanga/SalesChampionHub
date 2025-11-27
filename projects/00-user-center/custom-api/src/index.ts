import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import logger from './utils/logger';
import {
  serviceAuthMiddleware,
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
  corsOptions,
  rateLimitMiddleware,
  auditLogMiddleware,
} from './middleware/auth';
import authRoutes from './routes/auth';
import tenantRoutes from './routes/tenants';
import userRoutes from './routes/users';
import contactRoutes from './routes/contacts';
import { connectRedis, checkRedisHealth, closeRedis } from './services/redis';
import { checkDatabaseHealth, closeDatabase } from './services/database';

// 加载环境变量
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3003;

// ==================== 全局中间件 ====================

// 安全头部
app.use(helmet());

// CORS
app.use(cors(corsOptions));

// 请求压缩
app.use(compression());

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求ID
app.use(requestIdMiddleware);

// 请求日志
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// 速率限制（全局）
if (process.env.RATE_LIMIT_ENABLED !== 'false') {
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000');
  const windowSeconds = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000') / 1000;
  app.use(rateLimitMiddleware(maxRequests, windowSeconds));
}

// ==================== 健康检查 ====================

app.get('/health', async (_req, res) => {
  try {
    const dbHealthy = await checkDatabaseHealth();
    const redisHealthy = await checkRedisHealth();

    const healthy = dbHealthy && redisHealthy;

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
      },
      version: process.env.npm_package_version || '1.0.0',
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

app.get('/health/liveness', (_req, res) => {
  res.status(200).json({ status: 'alive' });
});

app.get('/health/readiness', async (_req, res) => {
  try {
    const dbHealthy = await checkDatabaseHealth();
    const redisHealthy = await checkRedisHealth();

    if (dbHealthy && redisHealthy) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

// ==================== API路由 ====================

// 应用Service API Key认证
app.use('/api/v1', serviceAuthMiddleware);

// 应用审计日志中间件（仅在启用时）
if (process.env.AUDIT_LOG_ENABLED !== 'false') {
  app.use('/api/v1', auditLogMiddleware);
}

// 注册路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/contacts', contactRoutes);

// ==================== 错误处理 ====================

// 404处理
app.use(notFoundHandler);

// 错误处理中间件
app.use(errorHandler);

// ==================== 服务器启动 ====================

async function startServer() {
  try {
    // 连接Redis
    logger.info('Connecting to Redis...');
    await connectRedis();

    // 测试数据库连接
    logger.info('Testing database connection...');
    const dbHealthy = await checkDatabaseHealth();
    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }

    // 启动HTTP服务器
    app.listen(PORT, () => {
      logger.info(`🚀 User Center Custom API started`, {
        port: PORT,
        nodeEnv: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'info',
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// ==================== 优雅关闭 ====================

async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully...`);

  try {
    // 关闭Redis连接
    await closeRedis();

    // 关闭数据库连接
    await closeDatabase();

    logger.info('Server shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

// 监听关闭信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 捕获未处理的异常
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// 启动服务器
startServer();
