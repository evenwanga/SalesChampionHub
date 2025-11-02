-- 自定义扩展表初始化脚本
-- 在Logto初始化后运行

-- ==================== 租户配额表 ====================
CREATE TABLE IF NOT EXISTS tenant_quotas (
  organization_id VARCHAR(21) PRIMARY KEY,  -- 关联Logto organization.id
  plan VARCHAR(20) NOT NULL DEFAULT 'free',  -- free/pro/enterprise

  -- 配额限制
  max_users INT NOT NULL DEFAULT 10,
  max_applications INT NOT NULL DEFAULT 5,
  max_api_calls_per_day INT NOT NULL DEFAULT 10000,
  max_storage_gb INT NOT NULL DEFAULT 10,

  -- 启用功能
  features JSONB DEFAULT '[]'::jsonb,  -- ['sso', 'mfa', 'audit_log']

  -- 使用情况（定期更新）
  current_users INT DEFAULT 0,
  current_applications INT DEFAULT 0,
  api_calls_today INT DEFAULT 0,
  storage_used_gb DECIMAL(10,2) DEFAULT 0,
  last_usage_update TIMESTAMP DEFAULT NOW(),

  -- 计费信息
  billing_cycle VARCHAR(20),  -- monthly/yearly
  next_billing_date DATE,
  trial_ends_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tenant_quotas_plan ON tenant_quotas(plan);
CREATE INDEX IF NOT EXISTS idx_tenant_quotas_next_billing ON tenant_quotas(next_billing_date);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_tenant_quotas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_quotas_updated_at
    BEFORE UPDATE ON tenant_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_quotas_updated_at();

COMMENT ON TABLE tenant_quotas IS '租户配额表 - 管理每个组织的配额和使用情况';

-- ==================== 租户设置表 ====================
CREATE TABLE IF NOT EXISTS tenant_settings (
  organization_id VARCHAR(21) PRIMARY KEY,

  -- 品牌定制
  logo_url TEXT,
  primary_color VARCHAR(7),  -- #RRGGBB
  custom_domain VARCHAR(255),

  -- 安全设置
  password_policy JSONB DEFAULT '{
    "minLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSpecialChars": false,
    "preventCommonPasswords": true,
    "passwordExpireDays": 90,
    "preventReuseCount": 5
  }'::jsonb,
  session_timeout_minutes INT DEFAULT 60,
  mfa_required BOOLEAN DEFAULT false,
  ip_whitelist TEXT[],

  -- 通知设置
  notification_email VARCHAR(255),
  webhook_url TEXT,
  webhook_secret VARCHAR(255),
  webhook_events TEXT[],

  -- 其他设置
  settings JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER tenant_settings_updated_at
    BEFORE UPDATE ON tenant_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_quotas_updated_at();

COMMENT ON TABLE tenant_settings IS '租户设置表 - 存储组织的个性化配置';

-- ==================== API审计日志表 ====================
CREATE TABLE IF NOT EXISTS api_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  organization_id VARCHAR(21) NOT NULL,
  user_id VARCHAR(21),

  -- 请求信息
  method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  query_params JSONB,
  request_body JSONB,

  -- 响应信息
  status_code INT,
  response_time_ms INT,
  error_message TEXT,

  -- 元数据
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(50),

  -- 时间
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 创建索引（重要！审计日志量大）
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_time ON api_audit_logs(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON api_audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_path ON api_audit_logs(path);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON api_audit_logs(timestamp DESC);

-- 分区表（可选，大规模时使用）
-- CREATE TABLE api_audit_logs_2025_01 PARTITION OF api_audit_logs
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

COMMENT ON TABLE api_audit_logs IS 'API审计日志表 - 记录所有API调用';

-- ==================== 登录历史表 ====================
CREATE TABLE IF NOT EXISTS login_history (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(21) NOT NULL,
  organization_id VARCHAR(21),

  -- 登录信息
  login_method VARCHAR(50) NOT NULL,  -- password/sso/social/mfa
  success BOOLEAN NOT NULL,
  failure_reason TEXT,

  -- 设备信息
  ip_address INET NOT NULL,
  user_agent TEXT,
  device_type VARCHAR(50),  -- desktop/mobile/tablet
  browser VARCHAR(50),
  os VARCHAR(50),
  location VARCHAR(255),  -- 从IP解析的地理位置

  -- 时间
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_login_history_user_time ON login_history(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_org_time ON login_history(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_ip ON login_history(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_history_success ON login_history(success, timestamp DESC);

COMMENT ON TABLE login_history IS '登录历史表 - 跟踪用户登录行为';

-- ==================== 租户计费记录表 ====================
CREATE TABLE IF NOT EXISTS billing_records (
  id BIGSERIAL PRIMARY KEY,
  organization_id VARCHAR(21) NOT NULL,

  -- 计费周期
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,

  -- 金额
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'CNY',

  -- 状态
  status VARCHAR(20) NOT NULL,  -- pending/paid/overdue/cancelled

  -- 使用量统计
  usage_stats JSONB,  -- 详细使用统计

  -- 支付信息
  payment_method VARCHAR(50),
  payment_transaction_id VARCHAR(255),
  paid_at TIMESTAMP,

  -- 发票
  invoice_url TEXT,
  invoice_number VARCHAR(50),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_billing_records_org ON billing_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_period ON billing_records(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_billing_records_status ON billing_records(status);

CREATE TRIGGER billing_records_updated_at
    BEFORE UPDATE ON billing_records
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_quotas_updated_at();

COMMENT ON TABLE billing_records IS '计费记录表 - 存储租户的账单记录';

-- ==================== 配额使用快照表 ====================
-- 用于历史数据分析和趋势
CREATE TABLE IF NOT EXISTS quota_usage_snapshots (
  id BIGSERIAL PRIMARY KEY,
  organization_id VARCHAR(21) NOT NULL,

  -- 快照数据
  snapshot_date DATE NOT NULL,
  users_count INT,
  applications_count INT,
  api_calls_count INT,
  storage_used_gb DECIMAL(10,2),

  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_quota_snapshots_org_date ON quota_usage_snapshots(organization_id, snapshot_date DESC);

-- 创建唯一约束（每天一个快照）
CREATE UNIQUE INDEX IF NOT EXISTS idx_quota_snapshots_org_date_unique
ON quota_usage_snapshots(organization_id, snapshot_date);

COMMENT ON TABLE quota_usage_snapshots IS '配额使用快照表 - 每日记录使用情况';

-- ==================== 权限缓存表（可选，性能优化）====================
CREATE TABLE IF NOT EXISTS permission_cache (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(21) NOT NULL,
  organization_id VARCHAR(21) NOT NULL,

  -- 缓存的权限列表
  permissions JSONB NOT NULL,

  -- 缓存元数据
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,

  -- 创建唯一索引
  CONSTRAINT permission_cache_unique UNIQUE (user_id, organization_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_permission_cache_expires ON permission_cache(expires_at);

COMMENT ON TABLE permission_cache IS '权限缓存表 - 减少重复权限查询';

-- ==================== 初始化函数 ====================

-- 为新组织创建默认配置
CREATE OR REPLACE FUNCTION initialize_tenant_defaults(org_id VARCHAR(21), plan_type VARCHAR(20) DEFAULT 'free')
RETURNS VOID AS $$
DECLARE
  max_users_val INT;
  max_apps_val INT;
  max_api_calls_val INT;
  max_storage_val INT;
BEGIN
  -- 根据计划设置配额
  CASE plan_type
    WHEN 'free' THEN
      max_users_val := 10;
      max_apps_val := 5;
      max_api_calls_val := 10000;
      max_storage_val := 10;
    WHEN 'pro' THEN
      max_users_val := 100;
      max_apps_val := 20;
      max_api_calls_val := 100000;
      max_storage_val := 100;
    WHEN 'enterprise' THEN
      max_users_val := 1000;
      max_apps_val := 100;
      max_api_calls_val := 1000000;
      max_storage_val := 1000;
    ELSE
      max_users_val := 10;
      max_apps_val := 5;
      max_api_calls_val := 10000;
      max_storage_val := 10;
  END CASE;

  -- 创建配额记录
  INSERT INTO tenant_quotas (
    organization_id, plan,
    max_users, max_applications, max_api_calls_per_day, max_storage_gb,
    features
  ) VALUES (
    org_id, plan_type,
    max_users_val, max_apps_val, max_api_calls_val, max_storage_val,
    CASE
      WHEN plan_type = 'enterprise' THEN '["sso", "mfa", "audit_log", "custom_domain"]'::jsonb
      WHEN plan_type = 'pro' THEN '["mfa", "audit_log"]'::jsonb
      ELSE '[]'::jsonb
    END
  )
  ON CONFLICT (organization_id) DO NOTHING;

  -- 创建默认设置
  INSERT INTO tenant_settings (organization_id)
  VALUES (org_id)
  ON CONFLICT (organization_id) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION initialize_tenant_defaults IS '为新租户初始化默认配置';

-- ==================== 清理过期数据的函数 ====================

-- 清理过期的审计日志（保留90天）
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INT DEFAULT 90)
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM api_audit_logs
  WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 清理过期的登录历史（保留180天）
CREATE OR REPLACE FUNCTION cleanup_old_login_history(days_to_keep INT DEFAULT 180)
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM login_history
  WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 清理过期的权限缓存
CREATE OR REPLACE FUNCTION cleanup_expired_permission_cache()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM permission_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==================== 创建定时任务（需要pg_cron扩展）====================
-- 如果安装了pg_cron扩展，取消注释以下内容

-- 每天凌晨2点清理过期数据
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs()');
-- SELECT cron.schedule('cleanup-login-history', '0 2 * * *', 'SELECT cleanup_old_login_history()');
-- SELECT cron.schedule('cleanup-permission-cache', '*/15 * * * *', 'SELECT cleanup_expired_permission_cache()');

-- ==================== 授权 ====================
-- 授权给Logto使用的用户（如果有专门的用户）
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO logto_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO logto_user;

-- ==================== 完成 ====================
RAISE NOTICE 'Custom extension tables created successfully!';
