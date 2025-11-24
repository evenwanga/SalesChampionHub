import { useState } from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import type { AuditLogQuery } from '../types/audit';

interface AuditLogFiltersProps {
  query: AuditLogQuery;
  onQueryChange: (query: Partial<AuditLogQuery>) => void;
  onClose: () => void;
}

/**
 * 审计日志过滤器组件
 */
export function AuditLogFilters({ query, onQueryChange, onClose }: AuditLogFiltersProps) {
  const [localQuery, setLocalQuery] = useState<AuditLogQuery>(query);
  const [startDate, setStartDate] = useState<Date | undefined>(
    query.start_time ? new Date(query.start_time) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    query.end_time ? new Date(query.end_time) : undefined
  );

  const handleApply = () => {
    const updatedQuery = {
      ...localQuery,
      start_time: startDate ? startDate.toISOString() : undefined,
      end_time: endDate ? endDate.toISOString() : undefined,
    };
    onQueryChange(updatedQuery);
  };

  const handleReset = () => {
    const resetQuery: AuditLogQuery = {
      page: 1,
      page_size: 20,
      sort_by: 'created_at',
      sort_order: 'desc',
    };
    setLocalQuery(resetQuery);
    setStartDate(undefined);
    setEndDate(undefined);
    onQueryChange(resetQuery);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>高级过滤</CardTitle>
            <CardDescription>设置详细的过滤条件</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* 用户ID */}
          <div className="space-y-2">
            <Label htmlFor="user_id">用户ID</Label>
            <Input
              id="user_id"
              placeholder="输入用户ID"
              value={localQuery.user_id || ''}
              onChange={(e) =>
                setLocalQuery({ ...localQuery, user_id: e.target.value })
              }
            />
          </div>

          {/* 资源ID */}
          <div className="space-y-2">
            <Label htmlFor="resource_id">资源ID</Label>
            <Input
              id="resource_id"
              placeholder="输入资源ID"
              value={localQuery.resource_id || ''}
              onChange={(e) =>
                setLocalQuery({ ...localQuery, resource_id: e.target.value })
              }
            />
          </div>

          {/* 操作类型 */}
          <div className="space-y-2">
            <Label htmlFor="action">操作类型</Label>
            <Select
              value={localQuery.action || 'all'}
              onValueChange={(value) =>
                setLocalQuery({
                  ...localQuery,
                  action: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择操作类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="user.login">用户登录</SelectItem>
                <SelectItem value="user.logout">用户登出</SelectItem>
                <SelectItem value="kb.create">创建知识库</SelectItem>
                <SelectItem value="kb.update">更新知识库</SelectItem>
                <SelectItem value="kb.delete">删除知识库</SelectItem>
                <SelectItem value="doc.upload">上传文档</SelectItem>
                <SelectItem value="doc.delete">删除文档</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 资源类型 */}
          <div className="space-y-2">
            <Label htmlFor="resource_type">资源类型</Label>
            <Select
              value={localQuery.resource_type || 'all'}
              onValueChange={(value) =>
                setLocalQuery({
                  ...localQuery,
                  resource_type: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择资源类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="user">用户</SelectItem>
                <SelectItem value="knowledge_base">知识库</SelectItem>
                <SelectItem value="document">文档</SelectItem>
                <SelectItem value="mount">挂载</SelectItem>
                <SelectItem value="system">系统</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 状态 */}
          <div className="space-y-2">
            <Label htmlFor="status">状态</Label>
            <Select
              value={localQuery.status || 'all'}
              onValueChange={(value) =>
                setLocalQuery({
                  ...localQuery,
                  status: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="success">成功</SelectItem>
                <SelectItem value="failure">失败</SelectItem>
                <SelectItem value="error">错误</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 排序方式 */}
          <div className="space-y-2">
            <Label htmlFor="sort_by">排序方式</Label>
            <Select
              value={localQuery.sort_by || 'created_at'}
              onValueChange={(value) =>
                setLocalQuery({ ...localQuery, sort_by: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择排序字段" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">创建时间</SelectItem>
                <SelectItem value="duration_ms">耗时</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 开始时间 */}
          <div className="space-y-2">
            <Label>开始时间</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate
                    ? format(startDate, 'yyyy-MM-dd', { locale: zhCN })
                    : '选择日期'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 结束时间 */}
          <div className="space-y-2">
            <Label>结束时间</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate
                    ? format(endDate, 'yyyy-MM-dd', { locale: zhCN })
                    : '选择日期'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleReset}>
            重置
          </Button>
          <Button onClick={handleApply}>应用过滤</Button>
        </div>
      </CardContent>
    </Card>
  );
}

