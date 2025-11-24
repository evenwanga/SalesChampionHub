import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { X, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import auditService from '../services/auditService';
import type { AuditLog } from '../types/audit';
import {
  ACTION_LABELS,
  RESOURCE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../types/audit';

interface AuditLogDetailsProps {
  logId: number;
  onClose: () => void;
}

/**
 * 审计日志详情对话框
 */
export function AuditLogDetails({ logId, onClose }: AuditLogDetailsProps) {
  const [log, setLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLog = async () => {
      try {
        setLoading(true);
        const data = await auditService.getLogById(logId);
        setLog(data);
      } catch (err: any) {
        setError(err.message || '加载审计日志失败');
      } finally {
        setLoading(false);
      }
    };

    fetchLog();
  }, [logId]);

  const formatTime = (time: string) => {
    return format(new Date(time), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
  };

  const getStatusBadge = (status: string) => {
    const label = STATUS_LABELS[status] || status;
    const colorClass = STATUS_COLORS[status] || 'text-gray-600 bg-gray-50';
    return (
      <Badge variant="outline" className={colorClass}>
        {label}
      </Badge>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>审计日志详情</DialogTitle>
          <DialogDescription>查看操作的详细信息</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(80vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-500 p-4 bg-red-50 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          ) : log ? (
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    日志ID
                  </label>
                  <p className="mt-1 font-mono">{log.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    时间
                  </label>
                  <p className="mt-1">{formatTime(log.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    状态
                  </label>
                  <div className="mt-1">{getStatusBadge(log.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    耗时
                  </label>
                  <p className="mt-1">
                    {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                  </p>
                </div>
              </div>

              {/* 用户信息 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">用户信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      用户ID
                    </label>
                    <p className="mt-1 font-mono">{log.user_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      用户名
                    </label>
                    <p className="mt-1">{log.username || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      租户ID
                    </label>
                    <p className="mt-1 font-mono">{log.tenant_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      IP地址
                    </label>
                    <p className="mt-1 font-mono">{log.ip_address || '-'}</p>
                  </div>
                </div>
              </div>

              {/* 操作信息 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">操作信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      操作类型
                    </label>
                    <p className="mt-1">
                      {ACTION_LABELS[log.action] || log.action}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      资源类型
                    </label>
                    <p className="mt-1">
                      {RESOURCE_TYPE_LABELS[log.resource_type] || log.resource_type}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      资源ID
                    </label>
                    <p className="mt-1 font-mono">{log.resource_id || '-'}</p>
                  </div>
                </div>
              </div>

              {/* 请求信息 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">请求信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      请求方法
                    </label>
                    <p className="mt-1 font-mono">{log.request_method || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      请求路径
                    </label>
                    <p className="mt-1 font-mono text-xs break-all">
                      {log.request_path || '-'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      User Agent
                    </label>
                    <p className="mt-1 text-xs break-all text-muted-foreground">
                      {log.user_agent || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 错误信息 */}
              {log.error_message && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-red-600">
                    错误信息
                  </h3>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">{log.error_message}</p>
                  </div>
                </div>
              )}

              {/* 详细信息 */}
              {log.details && Object.keys(log.details).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">详细信息</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </ScrollArea>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

