import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import { validate, verifyTokenSchema, checkPermissionSchema } from '../utils/validators';
import { ApiResponse, TokenVerificationResult } from '../types';
import logtoClient from '../services/logto';
import { tokenBlacklist } from '../services/redis';

const router = Router();

// POST /api/v1/auth/verify-token
// 验证Token并返回用户信息（子项目调用）
router.post('/verify-token', validate(verifyTokenSchema), async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    // 检查token是否在黑名单
    const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_REVOKED',
          message: 'Token has been revoked',
        },
      } as ApiResponse);
    }

    // 验证token
    const verification = await logtoClient.verifyToken(token);

    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: verification.error || 'Token is invalid',
        },
      } as ApiResponse);
    }

    // 获取用户信息
    const user = await logtoClient.getUser(verification.userId!);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      } as ApiResponse);
    }

    // 获取组织信息
    let organization = null;
    if (verification.organizationId) {
      organization = await logtoClient.getOrganization(verification.organizationId);
    }

    // 获取角色
    const roles = verification.organizationId
      ? await logtoClient.getUserRoles(verification.userId!, verification.organizationId)
      : [];

    // 获取权限
    const permissions = verification.organizationId
      ? await logtoClient.getUserPermissions(verification.userId!, verification.organizationId)
      : [];

    const result: TokenVerificationResult = {
      valid: true,
      user,
      organization: organization || undefined,
      roles: roles.map((r) => r.name),
      permissions,
    };

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    } as ApiResponse<TokenVerificationResult>);
  } catch (error) {
    logger.error('Token verification failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'VERIFICATION_ERROR',
        message: 'Failed to verify token',
      },
    } as ApiResponse);
  }
});

// POST /api/v1/auth/check-permission
// 检查用户权限（子项目调用）
router.post(
  '/check-permission',
  validate(checkPermissionSchema),
  async (req: Request, res: Response) => {
    try {
      const { userId, organizationId, resource, action } = req.body;

      // 检查权限
      const allowed = await logtoClient.checkPermission(userId, organizationId, resource, action);

      res.json({
        success: true,
        data: {
          allowed,
          userId,
          organizationId,
          resource,
          action,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      } as ApiResponse);
    } catch (error) {
      logger.error('Permission check failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'PERMISSION_CHECK_ERROR',
          message: 'Failed to check permission',
        },
      } as ApiResponse);
    }
  }
);

// POST /api/v1/auth/revoke-token
// 吊销Token（加入黑名单）
router.post('/revoke-token', validate(verifyTokenSchema), async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    // 验证token以获取过期时间
    const verification = await logtoClient.verifyToken(token);

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Cannot revoke invalid token',
        },
      } as ApiResponse);
    }

    // 假设token有效期为1小时（3600秒）
    // 在实际实现中应该从token payload中提取exp字段
    const expiresInSeconds = 3600;

    // 加入黑名单
    await tokenBlacklist.add(token, expiresInSeconds);

    res.json({
      success: true,
      data: {
        message: 'Token revoked successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Token revocation failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'REVOCATION_ERROR',
        message: 'Failed to revoke token',
      },
    } as ApiResponse);
  }
});

// GET /api/v1/auth/permissions/:userId/:organizationId
// 获取用户在组织中的所有权限
router.get(
  '/permissions/:userId/:organizationId',
  async (req: Request, res: Response) => {
    try {
      const { userId, organizationId } = req.params;

      // 获取用户权限
      const permissions = await logtoClient.getUserPermissions(userId, organizationId);

      res.json({
        success: true,
        data: {
          userId,
          organizationId,
          permissions,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to get user permissions', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'PERMISSIONS_ERROR',
          message: 'Failed to get user permissions',
        },
      } as ApiResponse);
    }
  }
);

export default router;
