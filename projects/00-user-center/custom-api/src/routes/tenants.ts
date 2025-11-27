import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import { validate, createTenantSchema, updateQuotaSchema, updateSettingsSchema } from '../utils/validators';
import { ApiResponse } from '../types';
import logtoClient from '../services/logto';
import { tenantQuotaDb, tenantSettingsDb } from '../services/database';

const router = Router();

// POST /api/v1/tenants
// 创建新租户（组织）
router.post('/', validate(createTenantSchema), async (req: Request, res: Response) => {
  try {
    const { name, description, plan } = req.body;

    // 创建Logto组织
    const organization = await logtoClient.createOrganization({ name, description });
    if (!organization) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'TENANT_CREATION_ERROR',
          message: 'Failed to create organization',
        },
      } as ApiResponse);
    }

    // 初始化租户配额
    await tenantQuotaDb.create({
      organizationId: organization.id,
      plan: plan || 'free',
      maxUsers: 0,
      maxApplications: 0,
      maxApiCallsPerDay: 0,
      maxStorageGb: 0,
      features: [],
      currentUsers: 0,
      currentApplications: 0,
      apiCallsToday: 0,
      storageUsedGb: 0,
      lastUsageUpdate: new Date(),
    });

    // 初始化租户设置
    await tenantSettingsDb.create({
      organizationId: organization.id,
      sessionTimeoutMinutes: 60,
      mfaRequired: false,
    });

    logger.info('Tenant created successfully', {
      organizationId: organization.id,
      name,
      plan,
    });

    res.status(201).json({
      success: true,
      data: {
        organization,
        message: 'Tenant created successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to create tenant', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_CREATION_ERROR',
        message: 'Failed to create tenant',
        details: error instanceof Error ? error.message : undefined,
      },
    } as ApiResponse);
  }
});

// GET /api/v1/tenants/:organizationId
// 获取租户信息
router.get('/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    // 获取组织信息
    const organization = await logtoClient.getOrganization(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'Tenant not found',
        },
      } as ApiResponse);
    }

    // 获取配额信息
    const quota = await tenantQuotaDb.get(organizationId);

    // 获取设置信息
    const settings = await tenantSettingsDb.get(organizationId);

    res.json({
      success: true,
      data: {
        organization,
        quota,
        settings,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to get tenant', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_RETRIEVAL_ERROR',
        message: 'Failed to get tenant',
      },
    } as ApiResponse);
  }
});

// GET /api/v1/tenants/:organizationId/quota
// 获取租户配额
router.get('/:organizationId/quota', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const quota = await tenantQuotaDb.get(organizationId);

    if (!quota) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'QUOTA_NOT_FOUND',
          message: 'Quota not found for this tenant',
        },
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: quota,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to get tenant quota', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'QUOTA_RETRIEVAL_ERROR',
        message: 'Failed to get tenant quota',
      },
    } as ApiResponse);
  }
});

// PATCH /api/v1/tenants/:organizationId/quota
// 更新租户配额
router.patch(
  '/:organizationId/quota',
  validate(updateQuotaSchema),
  async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.params;
      const updates = req.body;

      // 检查租户是否存在
      const quota = await tenantQuotaDb.get(organizationId);
      if (!quota) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: 'Tenant not found',
          },
        } as ApiResponse);
      }

      // 更新配额
      const updatedQuota = await tenantQuotaDb.update(organizationId, updates);

      logger.info('Tenant quota updated', { organizationId, updates });

      res.json({
        success: true,
        data: updatedQuota,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to update tenant quota', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'QUOTA_UPDATE_ERROR',
          message: 'Failed to update tenant quota',
        },
      } as ApiResponse);
    }
  }
);

// GET /api/v1/tenants/:organizationId/settings
// 获取租户设置
router.get('/:organizationId/settings', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const settings = await tenantSettingsDb.get(organizationId);

    if (!settings) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SETTINGS_NOT_FOUND',
          message: 'Settings not found for this tenant',
        },
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: settings,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to get tenant settings', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'SETTINGS_RETRIEVAL_ERROR',
        message: 'Failed to get tenant settings',
      },
    } as ApiResponse);
  }
});

// PATCH /api/v1/tenants/:organizationId/settings
// 更新租户设置
router.patch(
  '/:organizationId/settings',
  validate(updateSettingsSchema),
  async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.params;
      const updates = req.body;

      // 检查租户是否存在
      const settings = await tenantSettingsDb.get(organizationId);
      if (!settings) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: 'Tenant not found',
          },
        } as ApiResponse);
      }

      // 更新设置
      const updatedSettings = await tenantSettingsDb.update(organizationId, updates);

      logger.info('Tenant settings updated', { organizationId });

      res.json({
        success: true,
        data: updatedSettings,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to update tenant settings', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'SETTINGS_UPDATE_ERROR',
          message: 'Failed to update tenant settings',
        },
      } as ApiResponse);
    }
  }
);

// POST /api/v1/tenants/:organizationId/check-quota
// 检查配额是否超限
router.post('/:organizationId/check-quota', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { quotaType } = req.body;

    if (!['users', 'applications', 'apiCalls', 'storage'].includes(quotaType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUOTA_TYPE',
          message: 'Invalid quota type',
        },
      } as ApiResponse);
    }

    const exceeded = await tenantQuotaDb.checkQuotaExceeded(organizationId, quotaType);

    res.json({
      success: true,
      data: {
        organizationId,
        quotaType,
        exceeded,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to check quota', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'QUOTA_CHECK_ERROR',
        message: 'Failed to check quota',
      },
    } as ApiResponse);
  }
});

export default router;
