import { useState, useEffect, useCallback } from 'react';
import auditService from '../services/auditService';
import type { AuditLog, AuditLogQuery, AuditLogStats } from '../types/audit';

interface UseAuditLogsResult {
  logs: AuditLog[];
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  queryLogs: (query: AuditLogQuery) => Promise<void>;
  exportLogs: (format: 'csv' | 'json') => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * 审计日志 Hook
 */
export function useAuditLogs(initialQuery: AuditLogQuery = {}): UseAuditLogsResult {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState<AuditLogQuery>(initialQuery);

  const queryLogs = useCallback(async (query: AuditLogQuery) => {
    setLoading(true);
    setError(null);
    setCurrentQuery(query);

    try {
      const response = await auditService.queryLogs(query);
      setLogs(response.data);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.total_pages);
    } catch (err: any) {
      setError(err.message || '查询审计日志失败');
      setLogs([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const exportLogs = useCallback(async (format: 'csv' | 'json') => {
    try {
      setLoading(true);
      const blob = await auditService.exportLogs(currentQuery, format);
      const filename = `audit_logs_${new Date().getTime()}.${format}`;
      auditService.downloadExportFile(blob, filename);
    } catch (err: any) {
      setError(err.message || '导出审计日志失败');
    } finally {
      setLoading(false);
    }
  }, [currentQuery]);

  const refetch = useCallback(async () => {
    await queryLogs(currentQuery);
  }, [currentQuery, queryLogs]);

  // 初始加载
  useEffect(() => {
    queryLogs(initialQuery);
  }, []);

  return {
    logs,
    total,
    totalPages,
    loading,
    error,
    queryLogs,
    exportLogs,
    refetch,
  };
}

interface UseAuditStatsResult {
  stats: AuditLogStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 审计统计 Hook
 */
export function useAuditStats(days: number = 30): UseAuditStatsResult {
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await auditService.getTenantStats(days);
      setStats(data);
    } catch (err: any) {
      setError(err.message || '获取统计数据失败');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

