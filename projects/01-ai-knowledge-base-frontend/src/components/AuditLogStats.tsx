import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { AuditLogStats as AuditLogStatsType } from '../types/audit';
import { Activity, Users, CheckCircle, TrendingUp } from 'lucide-react';

interface AuditLogStatsProps {
  stats: AuditLogStatsType;
}

/**
 * 审计日志统计组件
 */
export function AuditLogStats({ stats }: AuditLogStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* 总操作数 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">总操作数</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.total_operations.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            最近30天的操作记录
          </p>
        </CardContent>
      </Card>

      {/* 活跃用户数 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.unique_users.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            唯一用户数量
          </p>
        </CardContent>
      </Card>

      {/* 成功率 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">成功率</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.success_rate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            操作成功率
          </p>
        </CardContent>
      </Card>

      {/* 热门操作 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">热门操作</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {stats.top_actions?.slice(0, 3).map((action, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate max-w-[120px]">
                  {action.action}
                </span>
                <span className="font-medium">{action.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

