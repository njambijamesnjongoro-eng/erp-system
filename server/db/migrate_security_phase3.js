const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'erp_system',
});

async function migrate() {
  const c = await pool.connect();
  try {
    console.log('Running Security Phase 3 migration...\n');

    // ── Encrypted fields registry ──
    await c.query(`
      CREATE TABLE IF NOT EXISTS encrypted_fields (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_name VARCHAR(100) NOT NULL,
        column_name VARCHAR(100) NOT NULL,
        encryption_key_id VARCHAR(100) NOT NULL DEFAULT 'master',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(table_name, column_name)
      )
    `);
    console.log('  ✓ encrypted_fields table');

    // ── API request logs ──
    await c.query(`
      CREATE TABLE IF NOT EXISTS request_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        method VARCHAR(10) NOT NULL,
        path VARCHAR(500) NOT NULL,
        query_params TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        referer TEXT,
        status_code INTEGER,
        response_time_ms INTEGER,
        body_size INTEGER,
        rate_limited BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ request_logs table');

    // ── API logs for analytics ──
    await c.query(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        endpoint VARCHAR(500) NOT NULL,
        method VARCHAR(10) NOT NULL,
        status_code INTEGER,
        response_time_ms INTEGER,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ api_logs table');

    // ── Token blacklist ──
    await c.query(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        token_type VARCHAR(20) NOT NULL DEFAULT 'access',
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reason VARCHAR(100) DEFAULT 'logout'
      )
    `);
    console.log('  ✓ token_blacklist table');

    // ── Threat detections ──
    await c.query(`
      CREATE TABLE IF NOT EXISTS threat_detections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        threat_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'medium',
        source_ip VARCHAR(45),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        endpoint VARCHAR(500),
        method VARCHAR(10),
        payload_snippet TEXT,
        headers JSONB,
        description TEXT,
        is_blocked BOOLEAN DEFAULT false,
        is_resolved BOOLEAN DEFAULT false,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ threat_detections table');

    // ── Backup logs ──
    await c.query(`
      CREATE TABLE IF NOT EXISTS backup_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        backup_type VARCHAR(20) NOT NULL DEFAULT 'full',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        file_path VARCHAR(500),
        file_size BIGINT,
        checksum VARCHAR(64),
        encryption_algorithm VARCHAR(50) DEFAULT 'aes-256-gcm',
        is_encrypted BOOLEAN DEFAULT true,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        error_message TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ backup_logs table');

    // ── Database activity logs ──
    await c.query(`
      CREATE TABLE IF NOT EXISTS db_activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        table_name VARCHAR(100) NOT NULL,
        operation VARCHAR(20) NOT NULL,
        record_id UUID,
        old_values JSONB,
        new_values JSONB,
        query_text TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ db_activities table');

    // ── Rate limit violations ──
    await c.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_violations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address VARCHAR(45) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        endpoint VARCHAR(500),
        method VARCHAR(10),
        limit_type VARCHAR(50) NOT NULL,
        limit_value INTEGER,
        window_ms INTEGER,
        blocked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ rate_limit_violations table');

    // ── Security health checks ──
    await c.query(`
      CREATE TABLE IF NOT EXISTS security_health_checks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        check_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        message TEXT,
        duration_ms INTEGER,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ security_health_checks table');

    // Indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_request_logs_created ON request_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_request_logs_user ON request_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_request_logs_ip ON request_logs(ip_address)',
      'CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint)',
      'CREATE INDEX IF NOT EXISTS idx_api_logs_status ON api_logs(status_code)',
      'CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON token_blacklist(token_hash)',
      'CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_threat_detections_type ON threat_detections(threat_type)',
      'CREATE INDEX IF NOT EXISTS idx_threat_detections_severity ON threat_detections(severity)',
      'CREATE INDEX IF NOT EXISTS idx_threat_detections_created ON threat_detections(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status)',
      'CREATE INDEX IF NOT EXISTS idx_db_activities_table ON db_activities(table_name)',
      'CREATE INDEX IF NOT EXISTS idx_db_activities_created ON db_activities(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_ip ON rate_limit_violations(ip_address)',
      'CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_created ON rate_limit_violations(created_at)',
    ];
    for (const sql of indexes) {
      try { await c.query(sql); } catch (e) { console.log('  - index: ' + e.message.slice(0, 60)); }
    }
    console.log('  ✓ indexes created');

    // Register encrypted fields
    const fields = [
      ['employee_profiles', 'salary'],
      ['employee_profiles', 'bank_account'],
      ['employee_profiles', 'national_id'],
      ['employee_profiles', 'tax_id'],
      ['employee_profiles', 'phone'],
      ['users', 'email'],
    ];
    for (const [table, column] of fields) {
      await c.query(
        `INSERT INTO encrypted_fields (table_name, column_name) VALUES ($1, $2)
         ON CONFLICT (table_name, column_name) DO NOTHING`,
        [table, column]
      );
    }
    console.log('  ✓ encrypted fields registered');

    console.log('\nSecurity Phase 3 migration complete.\n');
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    c.release();
    pool.end();
  }
}

migrate();
