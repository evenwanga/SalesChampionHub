// 审计日志类型定义

export interface AuditLog {
  id: number;
  tenant_id: string;
  user_id: string;
  username: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_path?: string;
  status: 'success' | 'failure' | 'error';
  error_message?: string;
  duration_ms?: number;
  created_at: string;
}

export interface AuditLogQuery {
  tenant_id?: string;
  user_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface AuditLogStats {
  total_operations: number;
  unique_users: number;
  success_rate: number;
  top_users: Array<{
    user_id: string;
    username: string;
    count: number;
  }>;
  top_actions: Array<{
    action: string;
    count: number;
  }>;
}

export interface UserAuditStats {
  total_operations: number;
  success_count: number;
  failure_count: number;
  error_count: number;
  top_actions: Array<{
    action: string;
    count: number;
  }>;
}

export interface AuditLogResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

// 操作类型映射（用于显示）
export const ACTION_LABELS: Record<string, string> = {
  'user.login': '用户登录',
  'user.logout': '用户登出',
  'user.register': '用户注册',
  'user.update': '更新用户',
  'user.delete': '删除用户',
  'user.password_change': '修改密码',
  'user.permission_change': '权限变更',
  'kb.create': '创建知识库',
  'kb.update': '更新知识库',
  'kb.delete': '删除知识库',
  'kb.view': '查看知识库',
  'kb.export': '导出知识库',
  'kb.mount': '挂载知识库',
  'kb.unmount': '卸载知识库',
  'kb.share': '分享知识库',
  'kb.permission_change': '知识库权限变更',
  'doc.upload': '上传文档',
  'doc.update': '更新文档',
  'doc.delete': '删除文档',
  'doc.download': '下载文档',
  'doc.view': '查看文档',
  'doc.batch_upload': '批量上传文档',
  'doc.batch_delete': '批量删除文档',
  'search.query': '搜索查询',
  'search.embedding': '生成向量',
  'system.config_change': '系统配置变更',
  'system.backup': '系统备份',
  'system.restore': '系统恢复',
  'system.maintenance': '系统维护',
  'admin.access': '管理员访问',
  'admin.operation': '管理员操作',
};

// 资源类型映射
export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  user: '用户',
  knowledge_base: '知识库',
  document: '文档',
  mount: '挂载',
  system: '系统',
  admin: '管理',
};

// 状态映射
export const STATUS_LABELS: Record<string, string> = {
  success: '成功',
  failure: '失败',
  error: '错误',
};

// 状态颜色映射
export const STATUS_COLORS: Record<string, string> = {
  success: 'text-green-600 bg-green-50',
  failure: 'text-yellow-600 bg-yellow-50',
  error: 'text-red-600 bg-red-50',
};

