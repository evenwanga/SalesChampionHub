import { Pool, PoolClient } from 'pg';
import logger from '../utils/logger';
import { TenantQuota, TenantSettings, AuditLog } from '../types';

// 从环境变量解析数据库URL
const parseDbUrl = (url: string) => {
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) throw new Error('Invalid DB_URL format');
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
};

const dbConfig = process.env.DB_URL
  ? parseDbUrl(process.env.DB_URL)
  : {
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'logto',
    };

export const pool = new Pool({
  ...dbConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 连接测试
pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err });
});

// 租户配额操作
export const tenantQuotaDb = {
  async get(organizationId: string): Promise<TenantQuota | null> {
    const result = await pool.query(
      'SELECT * FROM tenant_quotas WHERE organization_id = $1',
      [organizationId]
    );
    return result.rows[0] || null;
  },

  async create(quota: Partial<TenantQuota>): Promise<TenantQuota> {
    const result = await pool.query(
      `INSERT INTO tenant_quotas (
        organization_id, plan, max_users, max_applications,
        max_api_calls_per_day, max_storage_gb, features
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        quota.organizationId,
        quota.plan || 'free',
        quota.maxUsers || 10,
        quota.maxApplications || 5,
        quota.maxApiCallsPerDay || 10000,
        quota.maxStorageGb || 10,
        JSON.stringify(quota.features || []),
      ]
    );
    return result.rows[0];
  },

  async update(organizationId: string, updates: Partial<TenantQuota>): Promise<TenantQuota> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'organizationId') {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = $${paramIndex}`);
        values.push(key === 'features' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(organizationId);
    const result = await pool.query(
      `UPDATE tenant_quotas SET ${fields.join(', ')}
       WHERE organization_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  },

  async updateUsage(
    organizationId: string,
    usage: {
      currentUsers?: number;
      currentApplications?: number;
      apiCallsToday?: number;
      storageUsedGb?: number;
    }
  ): Promise<void> {
    const fields: string[] = ['last_usage_update = NOW()'];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(usage).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    values.push(organizationId);
    await pool.query(
      `UPDATE tenant_quotas SET ${fields.join(', ')}
       WHERE organization_id = $${paramIndex}`,
      values
    );
  },

  async checkQuotaExceeded(
    organizationId: string,
    quotaType: 'users' | 'applications' | 'apiCalls' | 'storage'
  ): Promise<boolean> {
    const quota = await this.get(organizationId);
    if (!quota) return true;

    switch (quotaType) {
      case 'users':
        return quota.currentUsers >= quota.maxUsers;
      case 'applications':
        return quota.currentApplications >= quota.maxApplications;
      case 'apiCalls':
        return quota.apiCallsToday >= quota.maxApiCallsPerDay;
      case 'storage':
        return quota.storageUsedGb >= quota.maxStorageGb;
      default:
        return false;
    }
  },
};

// 租户设置操作
export const tenantSettingsDb = {
  async get(organizationId: string): Promise<TenantSettings | null> {
    const result = await pool.query(
      'SELECT * FROM tenant_settings WHERE organization_id = $1',
      [organizationId]
    );
    return result.rows[0] || null;
  },

  async create(settings: Partial<TenantSettings>): Promise<TenantSettings> {
    const result = await pool.query(
      `INSERT INTO tenant_settings (organization_id)
       VALUES ($1)
       RETURNING *`,
      [settings.organizationId]
    );
    return result.rows[0];
  },

  async update(organizationId: string, updates: Partial<TenantSettings>): Promise<TenantSettings> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'organizationId') {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = $${paramIndex}`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(organizationId);
    const result = await pool.query(
      `UPDATE tenant_settings SET ${fields.join(', ')}
       WHERE organization_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  },
};

// 审计日志操作
export const auditLogDb = {
  async create(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    await pool.query(
      `INSERT INTO api_audit_logs (
        organization_id, user_id, method, path, query_params,
        request_body, status_code, response_time_ms, error_message,
        ip_address, user_agent, request_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        log.organizationId,
        log.userId,
        log.method,
        log.path,
        JSON.stringify(log.queryParams),
        JSON.stringify(log.requestBody),
        log.statusCode,
        log.responseTimeMs,
        log.errorMessage,
        log.ipAddress,
        log.userAgent,
        log.requestId,
      ]
    );
  },

  async query(
    organizationId: string,
    options: {
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<AuditLog[]> {
    const conditions: string[] = ['organization_id = $1'];
    const values: any[] = [organizationId];
    let paramIndex = 2;

    if (options.userId) {
      conditions.push(`user_id = $${paramIndex}`);
      values.push(options.userId);
      paramIndex++;
    }

    if (options.startDate) {
      conditions.push(`timestamp >= $${paramIndex}`);
      values.push(options.startDate);
      paramIndex++;
    }

    if (options.endDate) {
      conditions.push(`timestamp <= $${paramIndex}`);
      values.push(options.endDate);
      paramIndex++;
    }

    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const result = await pool.query(
      `SELECT * FROM api_audit_logs
       WHERE ${conditions.join(' AND ')}
       ORDER BY timestamp DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return result.rows;
  },
};

// 健康检查
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1');
    return result.rowCount === 1;
  } catch (error) {
    logger.error('Database health check failed', { error });
    return false;
  }
}

// 优雅关闭
export async function closeDatabase(): Promise<void> {
  await pool.end();
  logger.info('Database connection closed');
}
