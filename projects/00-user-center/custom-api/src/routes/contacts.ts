import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import { ApiResponse } from '../types';
import logtoClient from '../services/logto';

const router = Router();

// GET /api/v1/contacts
// 返回组织及组织内用户列表
router.get('/', async (_req: Request, res: Response) => {
  try {
    const orgs = await logtoClient.listOrganizations();
    const contacts = [];

    for (const org of orgs) {
      const users = await logtoClient.listOrganizationUsers(org.id);
      contacts.push({
        tenant_id: org.id,
        organization_name: org.name,
        parent_id: (org as any).customData?.parentOrganizationId,
        users: users.map((u) => ({
          user_id: u.id,
          username: u.username || u.name,
          name: u.name,
          email: u.email,
          phone: u.phone,
          avatar: u.avatar,
          last_active: u.updatedAt || u.createdAt,
        })),
      });
    }

    res.json({
      success: true,
      data: contacts,
      meta: {
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to load contacts', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTACTS_ERROR',
        message: 'Failed to load contacts',
      },
    } as ApiResponse);
  }
});

// POST /api/v1/contacts/organizations
// 创建组织，支持 customData 写入 parent 信息以实现树状层级
router.post('/organizations', async (req: Request, res: Response) => {
  try {
    const { name, description, parentOrganizationId, level } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PARAMS', message: 'name is required' },
      } as ApiResponse);
    }

    const customData: Record<string, any> = {};
    if (parentOrganizationId) {
      customData.parentOrganizationId = parentOrganizationId;
    }
    if (level !== undefined) {
      customData.level = level;
    }

    const org = await logtoClient.createOrganization({ name, description, customData });
    if (!org) {
      return res.status(500).json({
        success: false,
        error: { code: 'CREATE_ORG_FAILED', message: 'Failed to create organization' },
      } as ApiResponse);
    }

    res.status(201).json({
      success: true,
      data: org,
      meta: { timestamp: new Date().toISOString() },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to create organization', { error });
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ORG_FAILED', message: 'Failed to create organization' },
    } as ApiResponse);
  }
});

// POST /api/v1/contacts/users
// 创建用户
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { username, password, email, phone, name } = req.body;
    if (!username) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PARAMS', message: 'username is required' },
      } as ApiResponse);
    }

    const user = await logtoClient.createUser({ username, password, email, phone, name });
    if (!user) {
      return res.status(500).json({
        success: false,
        error: { code: 'CREATE_USER_FAILED', message: 'Failed to create user' },
      } as ApiResponse);
    }

    res.status(201).json({
      success: true,
      data: user,
      meta: { timestamp: new Date().toISOString() },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to create user', { error });
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_USER_FAILED', message: 'Failed to create user' },
    } as ApiResponse);
  }
});

// POST /api/v1/contacts/organizations/:orgId/users
// 将用户加入组织
router.post('/organizations/:orgId/users', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PARAMS', message: 'userId is required' },
      } as ApiResponse);
    }

    const ok = await logtoClient.addUserToOrganization(userId, orgId);
    if (!ok) {
      return res.status(500).json({
        success: false,
        error: { code: 'ADD_MEMBER_FAILED', message: 'Failed to add user to organization' },
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: { userId, organizationId: orgId },
      meta: { timestamp: new Date().toISOString() },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to add user to organization', { error });
    res.status(500).json({
      success: false,
      error: { code: 'ADD_MEMBER_FAILED', message: 'Failed to add user to organization' },
    } as ApiResponse);
  }
});

// DELETE /api/v1/contacts/organizations/:orgId/users/:userId
router.delete('/organizations/:orgId/users/:userId', async (req: Request, res: Response) => {
  try {
    const { orgId, userId } = req.params;
    const ok = await logtoClient.removeUserFromOrganization(userId, orgId);
    if (!ok) {
      return res.status(500).json({
        success: false,
        error: { code: 'REMOVE_MEMBER_FAILED', message: 'Failed to remove user from organization' },
      } as ApiResponse);
    }
    res.json({
      success: true,
      data: { userId, organizationId: orgId },
      meta: { timestamp: new Date().toISOString() },
    } as ApiResponse);
  } catch (error) {
    logger.error('Failed to remove user from organization', { error });
    res.status(500).json({
      success: false,
      error: { code: 'REMOVE_MEMBER_FAILED', message: 'Failed to remove user from organization' },
    } as ApiResponse);
  }
});

export default router;
