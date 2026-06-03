const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'erp_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const migration = `
-- =============================================================
-- Security Phase 4: Enterprise File & Document Security System
-- =============================================================

-- 1. File Master Table
CREATE TABLE IF NOT EXISTS file_security_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name VARCHAR(500) NOT NULL,
  stored_name VARCHAR(500) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  encryption_iv VARCHAR(64),
  encryption_tag VARCHAR(64),
  storage_path TEXT NOT NULL,
  storage_provider VARCHAR(50) DEFAULT 'local',
  bucket_name VARCHAR(200),
  classification VARCHAR(50) DEFAULT 'internal',
  department VARCHAR(100),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  file_category VARCHAR(100),
  description TEXT,
  is_encrypted BOOLEAN DEFAULT true,
  is_compressed BOOLEAN DEFAULT false,
  checksum_sha256 VARCHAR(64),
  version INTEGER DEFAULT 1,
  parent_file_id UUID REFERENCES file_security_files(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- 2. File Access Logs
CREATE TABLE IF NOT EXISTS file_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES file_security_files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  access_duration_ms INTEGER,
  is_suspicious BOOLEAN DEFAULT false,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. File Classifications
CREATE TABLE IF NOT EXISTS file_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(200) NOT NULL,
  color VARCHAR(20) NOT NULL,
  description TEXT,
  requires_watermark BOOLEAN DEFAULT false,
  allowed_roles TEXT[] DEFAULT '{}',
  allowed_departments TEXT[] DEFAULT '{}',
  max_access_level INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Malware Scan Logs
CREATE TABLE IF NOT EXISTS file_malware_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES file_security_files(id) ON DELETE CASCADE,
  scanner_version VARCHAR(100),
  scan_result VARCHAR(50) NOT NULL,
  threat_name VARCHAR(200),
  threat_type VARCHAR(100),
  threat_severity VARCHAR(50),
  signature_matched TEXT,
  heuristic_score DECIMAL(5,2),
  file_hash VARCHAR(64),
  file_size BIGINT,
  scan_duration_ms INTEGER,
  scan_engine VARCHAR(100),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Download Tokens (signed URLs, temporary access)
CREATE TABLE IF NOT EXISTS file_download_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES file_security_files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  token_type VARCHAR(50) DEFAULT 'download',
  is_one_time BOOLEAN DEFAULT false,
  is_revoked BOOLEAN DEFAULT false,
  max_downloads INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ
);

-- 6. Shared Documents
CREATE TABLE IF NOT EXISTS file_shared_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES file_security_files(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES users(id) ON DELETE SET NULL,
  shared_with_user UUID REFERENCES users(id) ON DELETE SET NULL,
  shared_with_email VARCHAR(255),
  access_level VARCHAR(50) DEFAULT 'view',
  share_token VARCHAR(64) UNIQUE,
  is_revoked BOOLEAN DEFAULT false,
  requires_watermark BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ
);

-- 7. File Permissions (RBAC override)
CREATE TABLE IF NOT EXISTS file_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES file_security_files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission VARCHAR(50) NOT NULL,
  is_granted BOOLEAN DEFAULT true,
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT file_perm_uniq UNIQUE (file_id, user_id, role_id, permission)
);

-- 8. DLP Alerts
CREATE TABLE IF NOT EXISTS file_dlp_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  file_id UUID REFERENCES file_security_files(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  action VARCHAR(100),
  details JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Watermark Logs
CREATE TABLE IF NOT EXISTS file_watermark_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES file_security_files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  watermark_text TEXT NOT NULL,
  watermark_type VARCHAR(50) DEFAULT 'confidential',
  position VARCHAR(50) DEFAULT 'center',
  opacity DECIMAL(3,2) DEFAULT 0.30,
  download_token_id UUID REFERENCES file_download_tokens(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Storage Analytics
CREATE TABLE IF NOT EXISTS file_storage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_files INTEGER DEFAULT 0,
  total_storage_bytes BIGINT DEFAULT 0,
  files_by_type JSONB DEFAULT '{}',
  files_by_classification JSONB DEFAULT '{}',
  files_by_department JSONB DEFAULT '{}',
  uploads_today INTEGER DEFAULT 0,
  downloads_today INTEGER DEFAULT 0,
  active_shares INTEGER DEFAULT 0,
  malware_detections_today INTEGER DEFAULT 0,
  storage_provider VARCHAR(50) DEFAULT 'local',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. File Chunks (for chunked uploads)
CREATE TABLE IF NOT EXISTS file_upload_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_session_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_data BYTEA,
  chunk_size INTEGER NOT NULL,
  checksum VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_chunk UNIQUE (upload_session_id, chunk_index)
);

-- 12. File Backup Registry
CREATE TABLE IF NOT EXISTS file_backup_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_name VARCHAR(200) NOT NULL,
  backup_type VARCHAR(50) DEFAULT 'incremental',
  total_files INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
  checksum VARCHAR(64),
  storage_path TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

-- 13. File Deletion Requests (soft-delete workflow)
CREATE TABLE IF NOT EXISTS file_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES file_security_files(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  permanent_delete BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ
);

-- ===================== INDEXES =====================
CREATE INDEX IF NOT EXISTS idx_file_sec_files_user ON file_security_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_sec_files_status ON file_security_files(status);
CREATE INDEX IF NOT EXISTS idx_file_sec_files_class ON file_security_files(classification);
CREATE INDEX IF NOT EXISTS idx_file_sec_files_dept ON file_security_files(department);
CREATE INDEX IF NOT EXISTS idx_file_sec_files_category ON file_security_files(file_category);
CREATE INDEX IF NOT EXISTS idx_file_sec_files_parent ON file_security_files(parent_file_id);

CREATE INDEX IF NOT EXISTS idx_file_access_file ON file_access_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_access_user ON file_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_access_action ON file_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_file_access_time ON file_access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_file_access_suspicious ON file_access_logs(is_suspicious) WHERE is_suspicious = true;

CREATE INDEX IF NOT EXISTS idx_file_scan_file ON file_malware_scans(file_id);
CREATE INDEX IF NOT EXISTS idx_file_scan_result ON file_malware_scans(scan_result);
CREATE INDEX IF NOT EXISTS idx_file_scan_severity ON file_malware_scans(threat_severity);
CREATE INDEX IF NOT EXISTS idx_file_scan_time ON file_malware_scans(created_at);

CREATE INDEX IF NOT EXISTS idx_file_tokens_file ON file_download_tokens(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tokens_user ON file_download_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_file_tokens_expires ON file_download_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_file_tokens_revoked ON file_download_tokens(is_revoked) WHERE is_revoked = false;

CREATE INDEX IF NOT EXISTS idx_file_shared_file ON file_shared_documents(file_id);
CREATE INDEX IF NOT EXISTS idx_file_shared_by ON file_shared_documents(shared_by);
CREATE INDEX IF NOT EXISTS idx_file_shared_with ON file_shared_documents(shared_with_user);
CREATE INDEX IF NOT EXISTS idx_file_shared_expires ON file_shared_documents(expires_at);
CREATE INDEX IF NOT EXISTS idx_file_shared_revoked ON file_shared_documents(is_revoked) WHERE is_revoked = false;

CREATE INDEX IF NOT EXISTS idx_file_perm_file ON file_permissions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_perm_user ON file_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_file_perm_role ON file_permissions(role_id);

CREATE INDEX IF NOT EXISTS idx_file_dlp_severity ON file_dlp_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_file_dlp_type ON file_dlp_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_file_dlp_resolved ON file_dlp_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_file_dlp_time ON file_dlp_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_file_watermark_file ON file_watermark_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_watermark_user ON file_watermark_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_file_storage_date ON file_storage_analytics(snapshot_date);

CREATE INDEX IF NOT EXISTS idx_file_backup_created ON file_backup_registry(created_at);

CREATE INDEX IF NOT EXISTS idx_file_del_status ON file_deletion_requests(status);

-- ===================== SEED CLASSIFICATIONS =====================
INSERT INTO file_classifications (name, label, color, description, requires_watermark, allowed_roles, allowed_departments, max_access_level) VALUES
  ('public', 'Public', '#22c55e', 'Publicly accessible documents', false, ARRAY['all'], ARRAY['all'], 0),
  ('internal', 'Internal', '#3b82f6', 'Internal company documents', false, ARRAY['all'], ARRAY['all'], 1),
  ('confidential', 'Confidential', '#f59e0b', 'Confidential business documents', true, ARRAY['System Admin','CEO','Manager','HR Officer','Finance Officer','Auditor'], ARRAY['HR','Finance','Legal','Executive'], 2),
  ('highly_confidential', 'Highly Confidential', '#ef4444', 'Highly sensitive corporate records', true, ARRAY['System Admin','CEO','Auditor'], ARRAY['Executive','Legal'], 3)
ON CONFLICT (name) DO NOTHING;

-- ===================== SEED STORAGE ANALYTICS INIT =====================
INSERT INTO file_storage_analytics (snapshot_date, total_files, total_storage_bytes)
VALUES (CURRENT_DATE, 0, 0)
ON CONFLICT DO NOTHING;
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting Security Phase 4 migration...');
    await client.query(migration);
    console.log('Security Phase 4 migration completed successfully');
    console.log('Created tables: file_security_files, file_access_logs, file_classifications,');
    console.log('  file_malware_scans, file_download_tokens, file_shared_documents,');
    console.log('  file_permissions, file_dlp_alerts, file_watermark_logs,');
    console.log('  file_storage_analytics, file_upload_chunks, file_backup_registry,');
    console.log('  file_deletion_requests');
    console.log('Seeded 4 classification levels and initial storage analytics');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
