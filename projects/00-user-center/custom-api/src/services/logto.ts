import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';
import { User, Organization, Role, Permission } from '../types';
import { cache, permissionCache } from './redis';

const LOGTO_ENDPOINT = process.env.LOGTO_ENDPOINT || 'http://localhost:3001';
const LOGTO_ADMIN_ENDPOINT = process.env.LOGTO_ADMIN_ENDPOINT || 'http://localhost:3002';

// Logto Management API客户端
class LogtoClient {
  private client: AxiosInstance;
  private adminToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.client = axios.create({
      baseURL: LOGTO_ENDPOINT,
      timeout: 10000,
    });
  }

  // 获取管理员Token（用于调用Management API）
  private async getAdminToken(): Promise<string> {
    const now = Date.now();

    // 如果token还有效（剩余5分钟以上），直接返回
    if (this.adminToken && this.tokenExpiresAt > now + 300000) {
      return this.adminToken;
    }

    try {
      // 这里需要根据实际的Logto配置来获取管理员token
      // 通常需要使用M2M (Machine to Machine) 应用的凭证
      const makeRequest = async (withResource: boolean) => {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', process.env.LOGTO_M2M_APP_ID || '');
        params.append('client_secret', process.env.LOGTO_M2M_APP_SECRET || '');
        params.append('scope', process.env.LOGTO_MANAGEMENT_SCOPE || 'all');
        if (withResource) {
          const resource = process.env.LOGTO_MANAGEMENT_RESOURCE;
          if (resource) {
            params.append('resource', resource);
          }
        }
        return axios.post(
          `${LOGTO_ENDPOINT}/oidc/token`,
          params,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
      };

      let response;
      try {
        response = await makeRequest(true);
      } catch (err: any) {
        logger.warn('Admin token with resource failed, retry without resource', {
          status: err?.response?.status,
          data: err?.response?.data,
        });
        response = await makeRequest(false);
      }

      this.adminToken = response.data.access_token;
      this.tokenExpiresAt = now + (response.data.expires_in * 1000);

      return this.adminToken;
    } catch (error) {
      logger.error('Failed to get Logto admin token', { error });
      throw new Error('Failed to authenticate with Logto');
    }
  }

  // 验证用户Token
  async verifyToken(token: string): Promise<{
    valid: boolean;
    userId?: string;
    organizationId?: string;
    error?: string;
  }> {
    try {
      // 使用Logto的introspection端点验证token
      const response = await axios.post(
        `${LOGTO_ENDPOINT}/oidc/token/introspection`,
        new URLSearchParams({
          token,
          token_type_hint: 'access_token',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          auth: {
            username: process.env.LOGTO_APP_ID || '',
            password: process.env.LOGTO_APP_SECRET || '',
          },
        }
      );

      if (!response.data.active) {
        return { valid: false, error: 'Token is not active' };
      }

      return {
        valid: true,
        userId: response.data.sub,
        organizationId: response.data.organization_id,
      };
    } catch (error) {
      logger.error('Token verification failed', { error });
      return { valid: false, error: 'Token verification failed' };
    }
  }

  // 获取用户信息
  async getUser(userId: string): Promise<User | null> {
    try {
      const cacheKey = `user:${userId}`;
      const cached = await cache.get<User>(cacheKey);
      if (cached) return cached;

      const token = await this.getAdminToken();
      const response = await axios.get(`${LOGTO_ENDPOINT}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user: User = {
        id: response.data.id,
        username: response.data.username,
        email: response.data.primaryEmail,
        phone: response.data.primaryPhone,
        name: response.data.name,
        avatar: response.data.avatar,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt || response.data.createdAt),
        isSuspended: response.data.isSuspended || false,
      };

      await cache.set(cacheKey, user, 300); // 缓存5分钟
      return user;
    } catch (error) {
      logger.error('Failed to get user', { userId, error });
      return null;
    }
  }

  // 获取组织信息
  async getOrganization(organizationId: string): Promise<Organization | null> {
    try {
      const cacheKey = `org:${organizationId}`;
      const cached = await cache.get<Organization>(cacheKey);
      if (cached) return cached;

      const token = await this.getAdminToken();
      const response = await axios.get(`${LOGTO_ENDPOINT}/api/organizations/${organizationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const org: Organization = {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description,
        customData: response.data.customData,
        createdAt: new Date(response.data.createdAt),
        isSuspended: response.data.isSuspended || false,
      };

      await cache.set(cacheKey, org, 300); // 缓存5分钟
      return org;
    } catch (error) {
      logger.error('Failed to get organization', { organizationId, error });
      return null;
    }
  }

  // 列出所有组织
  async listOrganizations(): Promise<Organization[]> {
    try {
      const cacheKey = `org:list`;
      const cached = await cache.get<Organization[]>(cacheKey);
      if (cached) return cached;

      const token = await this.getAdminToken();
      const response = await axios.get(`${LOGTO_ENDPOINT}/api/organizations`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, limit: 200 },
      });

      const raw =
        response.data?.data ||
        response.data?.items ||
        response.data?.organizations ||
        response.data ||
        [];

      const orgs: Organization[] = (Array.isArray(raw) ? raw : []).map((org: any) => ({
        id: org.id,
        name: org.name,
        description: org.description,
        customData: org.customData,
        createdAt: new Date(org.createdAt),
        isSuspended: org.isSuspended || false,
      }));

      await cache.set(cacheKey, orgs, 300);
      return orgs;
    } catch (error) {
      logger.error('Failed to list organizations', { error });
      return [];
    }
  }

  // 列出组织内用户
  async listOrganizationUsers(organizationId: string): Promise<User[]> {
    try {
      const cacheKey = `org:${organizationId}:users`;
      const cached = await cache.get<User[]>(cacheKey);
      if (cached) return cached;

      const token = await this.getAdminToken();
      const response = await axios.get(
        `${LOGTO_ENDPOINT}/api/organizations/${organizationId}/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: 1, limit: 500 },
        }
      );

      const raw =
        response.data?.data ||
        response.data?.items ||
        response.data?.users ||
        response.data ||
        [];

      const users: User[] = (Array.isArray(raw) ? raw : []).map((u: any) => ({
        id: u.id,
        username: u.username,
        email: u.primaryEmail,
        phone: u.primaryPhone,
        name: u.name,
        avatar: u.avatar,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt || u.createdAt),
        isSuspended: u.isSuspended || false,
      }));

      await cache.set(cacheKey, users, 300);
      return users;
    } catch (error) {
      logger.error('Failed to list organization users', { organizationId, error });
      return [];
    }
  }

  // 获取用户在组织中的角色
  async getUserRoles(userId: string, organizationId: string): Promise<Role[]> {
    try {
      const cacheKey = `roles:${userId}:${organizationId}`;
      const cached = await cache.get<Role[]>(cacheKey);
      if (cached) return cached;

      const token = await this.getAdminToken();
      const response = await axios.get(
        `${LOGTO_ENDPOINT}/api/organizations/${organizationId}/users/${userId}/roles`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const roles: Role[] = response.data.map((role: any) => ({
        id: role.id,
        name: role.name,
        description: role.description,
      }));

      await cache.set(cacheKey, roles, 300); // 缓存5分钟
      return roles;
    } catch (error) {
      logger.error('Failed to get user roles', { userId, organizationId, error });
      return [];
    }
  }

  // 获取用户权限
  async getUserPermissions(userId: string, organizationId: string): Promise<Permission[]> {
    try {
      // 先检查缓存
      const cached = await permissionCache.get(userId, organizationId);
      if (cached) return cached;

      // 获取用户角色
      const roles = await this.getUserRoles(userId, organizationId);

      // 获取每个角色的权限
      const token = await this.getAdminToken();
      const allPermissions: Permission[] = [];

      for (const role of roles) {
        try {
          const response = await axios.get(
            `${LOGTO_ENDPOINT}/api/roles/${role.id}/scopes`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          // 将scopes转换为Permission格式
          const permissions = response.data.map((scope: any) => {
            const [resource, action] = scope.name.split(':');
            return { resource, action };
          });

          allPermissions.push(...permissions);
        } catch (error) {
          logger.error('Failed to get role permissions', { roleId: role.id, error });
        }
      }

      // 去重
      const uniquePermissions = allPermissions.filter(
        (perm, index, self) =>
          index ===
          self.findIndex((p) => p.resource === perm.resource && p.action === perm.action)
      );

      // 缓存权限
      await permissionCache.set(userId, organizationId, uniquePermissions);

      return uniquePermissions;
    } catch (error) {
      logger.error('Failed to get user permissions', { userId, organizationId, error });
      return [];
    }
  }

  // 检查用户是否有特定权限
  async checkPermission(
    userId: string,
    organizationId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId, organizationId);

      return permissions.some(
        (perm) =>
          perm.resource === resource &&
          (perm.action === action || perm.action === '*' || perm.action === 'all')
      );
    } catch (error) {
      logger.error('Permission check failed', { userId, organizationId, resource, action, error });
      return false;
    }
  }

  // 为用户分配角色
  async assignRoleToUser(
    userId: string,
    organizationId: string,
    roleId: string
  ): Promise<void> {
    try {
      const token = await this.getAdminToken();
      await axios.post(
        `${LOGTO_ENDPOINT}/api/organizations/${organizationId}/users/${userId}/roles`,
        { organizationRoleIds: [roleId] },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // 清除缓存
      await permissionCache.clear(userId, organizationId);
      await cache.del(`roles:${userId}:${organizationId}`);
    } catch (error) {
      logger.error('Failed to assign role to user', { userId, organizationId, roleId, error });
      throw error;
    }
  }

  // 创建组织（可在 customData 中写入父级信息以实现树状层级）
  async createOrganization(payload: {
    name: string;
    description?: string;
    customData?: Record<string, any>;
  }): Promise<Organization | null> {
    try {
      const token = await this.getAdminToken();
      const response = await axios.post(
        `${LOGTO_ENDPOINT}/api/organizations`,
        {
          name: payload.name,
          description: payload.description,
          customData: payload.customData || {},
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const org = response.data;
      await cache.del('org:list');
      return {
        id: org.id,
        name: org.name,
        description: org.description,
        customData: org.customData,
        createdAt: new Date(org.createdAt),
        isSuspended: org.isSuspended || false,
      };
    } catch (error) {
      logger.error('Failed to create organization', { error });
      return null;
    }
  }

  // 创建用户
  async createUser(payload: {
    username?: string;
    password?: string;
    email?: string;
    phone?: string;
    name?: string;
  }): Promise<User | null> {
    try {
      const token = await this.getAdminToken();
      const response = await axios.post(
        `${LOGTO_ENDPOINT}/api/users`,
        {
          username: payload.username,
          password: payload.password,
          primaryEmail: payload.email,
          primaryPhone: payload.phone,
          name: payload.name,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const u = response.data;
      return {
        id: u.id,
        username: u.username,
        email: u.primaryEmail,
        phone: u.primaryPhone,
        name: u.name,
        avatar: u.avatar,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt || u.createdAt),
        isSuspended: u.isSuspended || false,
      };
    } catch (error) {
      logger.error('Failed to create user', { error });
      return null;
    }
  }

  // 将用户加入组织
  async addUserToOrganization(userId: string, organizationId: string): Promise<boolean> {
    try {
      const token = await this.getAdminToken();
      await axios.post(
        `${LOGTO_ENDPOINT}/api/organizations/${organizationId}/users`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await cache.del(`org:${organizationId}:users`);
      return true;
    } catch (error) {
      logger.error('Failed to add user to organization', { userId, organizationId, error });
      return false;
    }
  }

  // 将用户从组织移除
  async removeUserFromOrganization(userId: string, organizationId: string): Promise<boolean> {
    try {
      const token = await this.getAdminToken();
      await axios.delete(
        `${LOGTO_ENDPOINT}/api/organizations/${organizationId}/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await cache.del(`org:${organizationId}:users`);
      await permissionCache.clear(userId, organizationId);
      return true;
    } catch (error) {
      logger.error('Failed to remove user from organization', { userId, organizationId, error });
      return false;
    }
  }
}

export const logtoClient = new LogtoClient();
export default logtoClient;
