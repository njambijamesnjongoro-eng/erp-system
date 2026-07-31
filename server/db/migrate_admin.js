const { Pool } = require('pg');
const { getPoolConfig } = require('../config/poolConfig');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool(getPoolConfig());

const schema = `
-- ============================================================
-- USER SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  refresh_token VARCHAR(500),
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_info VARCHAR(255),
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  logout_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- LOGIN ATTEMPTS
-- ============================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  attempt_type VARCHAR(20) NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SECURITY EVENTS (extends Phase 1 table)
-- ============================================================
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS source_ip VARCHAR(45);
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT false;
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

-- ============================================================
-- IP BLACKLIST
-- ============================================================
CREATE TABLE IF NOT EXISTS ip_blacklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address VARCHAR(45) NOT NULL,
  reason VARCHAR(255),
  blacklisted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- IP WHITELIST
-- ============================================================
CREATE TABLE IF NOT EXISTS ip_whitelist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address VARCHAR(45) NOT NULL,
  description VARCHAR(255),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BACKUP RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS backup_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  file_path VARCHAR(500),
  file_size BIGINT,
  md5_hash VARCHAR(64),
  encryption_algo VARCHAR(50),
  database_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  error_message TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BACKUP SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS backup_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  backup_type VARCHAR(50) NOT NULL DEFAULT 'full',
  frequency VARCHAR(50) NOT NULL,
  day_of_week INTEGER,
  day_of_month INTEGER,
  time_of_day TIME DEFAULT '02:00',
  retention_days INTEGER DEFAULT 30,
  encryption_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  category VARCHAR(50) NOT NULL,
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- API KEYS
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permissions JSONB DEFAULT '[]',
  rate_limit INTEGER DEFAULT 100,
  ip_restrictions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- API USAGE LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time INTEGER,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- FILE STORAGE
-- ============================================================
CREATE TABLE IF NOT EXISTS file_storage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,
  mime_type VARCHAR(100),
  md5_hash VARCHAR(64),
  category VARCHAR(50),
  storage_type VARCHAR(50) DEFAULT 'local',
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_encrypted BOOLEAN DEFAULT false,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  retention_until TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MFA TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS mfa_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mfa_type VARCHAR(20) NOT NULL,
  secret VARCHAR(255),
  code VARCHAR(10),
  is_verified BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- AUDIT LOGS IMMUTABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs_immutable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  checksum VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(is_resolved);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip ON ip_blacklist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_active ON ip_blacklist(is_active);
CREATE INDEX IF NOT EXISTS idx_backup_status ON backup_records(status);
CREATE INDEX IF NOT EXISTS idx_backup_created ON backup_records(created_at);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_file_storage_category ON file_storage(category);
CREATE INDEX IF NOT EXISTS idx_file_storage_uploaded_by ON file_storage(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_mfa_user ON mfa_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_immutable_entity ON audit_logs_immutable(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_immutable_user ON audit_logs_immutable(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_immutable_created ON audit_logs_immutable(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_immutable_action ON audit_logs_immutable(action);
`;

async function migrate() {
  try {
    console.log('Running System Administration & Security migration...');
    await pool.query(schema);
    console.log('System Administration & Security module migration completed successfully.');
    console.log('Tables: user_sessions, login_attempts, security_events, ip_blacklist, ip_whitelist, backup_records, backup_schedules, system_settings, api_keys, api_usage_logs, file_storage, mfa_tokens, audit_logs_immutable');
    process.exit(0);
  } catch (err) {
    console.error('System Administration & Security migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
