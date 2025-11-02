// 用户信息
export interface User {
  id: string;
  username?: string;
  email?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  isSuspended: boolean;
}

// 组织(租户)信息
export interface Organization {
  id: string;
  name: string;
  description?: string;
  customData?: Record<string, any>;
  createdAt: Date;
  isSuspended: boolean;
}

// 租户配额
export interface TenantQuota {
  organizationId: string;
  plan: 'free' | 'pro' | 'enterprise';
  maxUsers: number;
  maxApplications: number;
  maxApiCallsPerDay: number;
  maxStorageGb: number;
  features: string[];
  currentUsers: number;
  currentApplications: number;
  apiCallsToday: number;
  storageUsedGb: number;
  lastUsageUpdate: Date;
}

// 租户设置
export interface TenantSettings {
  organizationId: string;
  logoUrl?: string;
  primaryColor?: string;
  customDomain?: string;
  passwordPolicy?: Record<string, any>;
  sessionTimeoutMinutes: number;
  mfaRequired: boolean;
  ipWhitelist?: string[];
  notificationEmail?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  webhookEvents?: string[];
  settings?: Record<string, any>;
}

// 角色
export interface Role {
  id: string;
  name: string;
  description?: string;
}

// 权限
export interface Permission {
  resource: string;
  action: string;
}

// Token验证结果
export interface TokenVerificationResult {
  valid: boolean;
  user?: User;
  organization?: Organization;
  roles?: string[];
  permissions?: Permission[];
  error?: string;
}

// 权限检查请求
export interface PermissionCheckRequest {
  userId: string;
  organizationId: string;
  resource: string;
  action: string;
}

// API响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

// 审计日志
export interface AuditLog {
  id: number;
  organizationId: string;
  userId?: string;
  method: string;
  path: string;
  queryParams?: Record<string, any>;
  requestBody?: Record<string, any>;
  statusCode?: number;
  responseTimeMs?: number;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  timestamp: Date;
}

// 登录历史
export interface LoginHistory {
  id: number;
  userId: string;
  organizationId?: string;
  loginMethod: string;
  success: boolean;
  failureReason?: string;
  ipAddress: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  location?: string;
  timestamp: Date;
}
