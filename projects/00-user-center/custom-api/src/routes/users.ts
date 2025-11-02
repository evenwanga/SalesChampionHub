import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import { ApiResponse } from '../types';
import logtoClient from '../services/logto';

const router = Router();

// GET /api/v1/users/:userId
// 获取用户信息
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await logtoClient.getUser(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: user,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to get user', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_RETRIEVAL_ERROR',
        message: 'Failed to get user',
      },
    } as ApiResponse);
  }
});

// GET /api/v1/users/:userId/organizations/:organizationId/roles
// 获取用户在组织中的角色
router.get('/:userId/organizations/:organizationId/roles', async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.params;

    const roles = await logtoClient.getUserRoles(userId, organizationId);

    res.json({
      success: true,
      data: {
        userId,
        organizationId,
        roles,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to get user roles', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'ROLES_RETRIEVAL_ERROR',
        message: 'Failed to get user roles',
      },
    } as ApiResponse);
  }
});

// GET /api/v1/users/:userId/organizations/:organizationId/permissions
// 获取用户在组织中的权限
router.get(
  '/:userId/organizations/:organizationId/permissions',
  async (req: Request, res: Response) => {
    try {
      const { userId, organizationId } = req.params;

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
          code: 'PERMISSIONS_RETRIEVAL_ERROR',
          message: 'Failed to get user permissions',
        },
      } as ApiResponse);
    }
  }
);

export default router;
