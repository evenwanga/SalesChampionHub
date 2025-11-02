import { z } from 'zod';

// Token验证请求
export const verifyTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// 权限检查请求
export const checkPermissionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  resource: z.string().min(1, 'Resource is required'),
  action: z.string().min(1, 'Action is required'),
});

// 创建租户请求
export const createTenantSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100),
  description: z.string().optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
  admin: z.object({
    email: z.string().email('Valid email is required'),
    name: z.string().min(1, 'Admin name is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }).optional(),
});

// 更新租户配额请求
export const updateQuotaSchema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  maxUsers: z.number().int().positive().optional(),
  maxApplications: z.number().int().positive().optional(),
  maxApiCallsPerDay: z.number().int().positive().optional(),
  maxStorageGb: z.number().int().positive().optional(),
  features: z.array(z.string()).optional(),
});

// 更新租户设置请求
export const updateSettingsSchema = z.object({
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  customDomain: z.string().optional(),
  passwordPolicy: z.record(z.any()).optional(),
  sessionTimeoutMinutes: z.number().int().positive().optional(),
  mfaRequired: z.boolean().optional(),
  ipWhitelist: z.array(z.string()).optional(),
  notificationEmail: z.string().email().optional(),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(),
  webhookEvents: z.array(z.string()).optional(),
  settings: z.record(z.any()).optional(),
});

// 验证中间件
export const validate = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        });
      }
      next(error);
    }
  };
};
