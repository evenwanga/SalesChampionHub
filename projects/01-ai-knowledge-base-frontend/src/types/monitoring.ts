// 监控相关类型定义

export interface SystemStatus {
  status: string
  timestamp: string
  uptime: string
  version: string
  system: SystemMetrics
  services: Record<string, ServiceInfo>
  runtime: RuntimeMetrics
}

export interface SystemMetrics {
  cpu: CPUMetrics
  memory: MemoryMetrics
  disk: DiskMetrics
  network: NetworkMetrics
}

export interface CPUMetrics {
  usage_percent: number
  cores: number
}

export interface MemoryMetrics {
  total: number
  used: number
  free: number
  used_percent: number
}

export interface DiskMetrics {
  total: number
  used: number
  free: number
  used_percent: number
  path: string
}

export interface NetworkMetrics {
  bytes_recv: number
  bytes_sent: number
}

export interface ServiceInfo {
  status: string
  latency?: string
  message?: string
  available: boolean
}

export interface RuntimeMetrics {
  goroutines: number
  mem_alloc_mb: number
  mem_total_mb: number
  num_gc: number
  last_gc_time: string
  go_version: string
  num_cpu: number
}

export interface MetricsSnapshot {
  timestamp: string
  database: DatabaseStats
  redis: RedisStats
  runtime: RuntimeSnapshot
}

export interface DatabaseStats {
  open_connections: number
  in_use: number
  idle: number
  wait_count: number
  wait_duration: string
  max_idle_closed: number
  max_lifetime_closed: number
}

export interface RedisStats {
  hits: number
  misses: number
  timeouts: number
  total_conns: number
  idle_conns: number
  stale_conns: number
}

export interface RuntimeSnapshot {
  goroutines: number
  mem_alloc: number
}

// Alert related types
export interface Alert {
  id: string
  type: 'warning' | 'error' | 'critical'
  metric: string
  value: number
  threshold: number
  message: string
  timestamp: string
}

export interface AlertRule {
  id: string
  name: string
  metric: string
  operator: '>' | '<' | '>=' | '<=' | '=='
  threshold: number
  severity: 'warning' | 'error' | 'critical'
  enabled: boolean
}

