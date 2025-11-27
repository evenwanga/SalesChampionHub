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

export default router;
