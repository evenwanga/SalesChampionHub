import api from './api';
import type { AuditLog, AuditLogQuery, AuditLogResponse, AuditLogStats, UserAuditStats } from '../types/audit';

/**
 * 审计日志服务
 */
class AuditService {
  /**
   * 查询审计日志
   */
  async queryLogs(query: AuditLogQuery): Promise<AuditLogResponse> {
    const params = new URLSearchParams();
    
    if (query.tenant_id) params.append('tenant_id', query.tenant_id);
    if (query.user_id) params.append('user_id', query.user_id);
    if (query.action) params.append('action', query.action);
    if (query.resource_type) params.append('resource_type', query.resource_type);
    if (query.resource_id) params.append('resource_id', query.resource_id);
    if (query.status) params.append('status', query.status);
    if (query.start_time) params.append('start_time', query.start_time);
    if (query.end_time) params.append('end_time', query.end_time);
    if (query.page) params.append('page', query.page.toString());
    if (query.page_size) params.append('page_size', query.page_size.toString());
    if (query.sort_by) params.append('sort_by', query.sort_by);
    if (query.sort_order) params.append('sort_order', query.sort_order);

    const response = await api.get(`/audit-logs?${params.toString()}`);
    return response.data;
  }

  /**
   * 获取审计日志详情
   */
  async getLogById(id: number): Promise<AuditLog> {
    const response = await api.get(`/audit-logs/${id}`);
    return response.data;
  }

  /**
   * 获取租户统计
   */
  async getTenantStats(days: number = 30): Promise<AuditLogStats> {
    const response = await api.get(`/audit-logs/stats?days=${days}`);
    return response.data;
  }

  /**
   * 获取用户统计
   */
  async getUserStats(userId: string, days: number = 30): Promise<UserAuditStats> {
    const response = await api.get(`/audit-logs/users/${userId}/stats?days=${days}`);
    return response.data;
  }

  /**
   * 导出审计日志
   */
  async exportLogs(query: AuditLogQuery, format: 'csv' | 'json'): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    
    if (query.tenant_id) params.append('tenant_id', query.tenant_id);
    if (query.user_id) params.append('user_id', query.user_id);
    if (query.action) params.append('action', query.action);
    if (query.resource_type) params.append('resource_type', query.resource_type);
    if (query.start_time) params.append('start_time', query.start_time);
    if (query.end_time) params.append('end_time', query.end_time);

    const response = await api.get(`/audit-logs/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * 下载导出文件
   */
  downloadExportFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export default new AuditService();

