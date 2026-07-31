const { Pool } = require('pg');
const { getPoolConfig } = require('../config/poolConfig');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool(getPoolConfig());

async function migrate() {
  const c = await pool.connect();
  try {
    console.log('Running Security Phase 2 migration...\n');

    // MFA settings per user
    await c.query(`
      CREATE TABLE IF NOT EXISTS mfa_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        method VARCHAR(20) NOT NULL DEFAULT 'none',
        totp_secret TEXT,
        totp_enabled BOOLEAN DEFAULT false,
        email_otp_enabled BOOLEAN DEFAULT false,
        sms_otp_enabled BOOLEAN DEFAULT false,
        phone VARCHAR(20),
        is_mfa_required BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);
    console.log('  ✓ mfa_settings table');

    // OTP tokens (email, SMS)
    await c.query(`
      CREATE TABLE IF NOT EXISTS otp_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL DEFAULT 'email',
        otp_code VARCHAR(6) NOT NULL,
        purpose VARCHAR(50) NOT NULL DEFAULT 'login',
        expires_at TIMESTAMP NOT NULL,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 5,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ otp_tokens table');

    // Backup recovery codes for MFA
    await c.query(`
      CREATE TABLE IF NOT EXISTS recovery_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash VARCHAR(255) NOT NULL,
        used BOOLEAN DEFAULT false,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ recovery_codes table');

    // Enhanced device fingerprints
    await c.query(`
      CREATE TABLE IF NOT EXISTS device_fingerprints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        fingerprint_hash VARCHAR(255) NOT NULL,
        device_name VARCHAR(255),
        browser VARCHAR(255),
        browser_version VARCHAR(50),
        os VARCHAR(255),
        os_version VARCHAR(50),
        device_type VARCHAR(50) DEFAULT 'desktop',
        screen_resolution VARCHAR(20),
        timezone VARCHAR(50),
        language VARCHAR(20),
        ip_address VARCHAR(45),
        risk_score INTEGER DEFAULT 0,
        is_trusted BOOLEAN DEFAULT false,
        is_approved BOOLEAN DEFAULT false,
        trusted_until TIMESTAMP,
        first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        login_count INTEGER DEFAULT 1,
        UNIQUE(user_id, fingerprint_hash)
      )
    `);
    console.log('  ✓ device_fingerprints table');

    // Geolocation logs for login events
    await c.query(`
      CREATE TABLE IF NOT EXISTS geolocation_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        login_id UUID,
        ip_address VARCHAR(45) NOT NULL,
        country VARCHAR(100),
        country_code VARCHAR(5),
        city VARCHAR(100),
        region VARCHAR(100),
        latitude DECIMAL(10,7),
        longitude DECIMAL(10,7),
        isp VARCHAR(255),
        is_vpn BOOLEAN DEFAULT false,
        is_proxy BOOLEAN DEFAULT false,
        is_datacenter BOOLEAN DEFAULT false,
        risk_score INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ geolocation_logs table');

    // Login risk scores per event
    await c.query(`
      CREATE TABLE IF NOT EXISTS login_risk_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        login_id UUID,
        risk_score INTEGER NOT NULL DEFAULT 0,
        risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
        factors JSONB,
        device_score INTEGER DEFAULT 0,
        geo_score INTEGER DEFAULT 0,
        behavioral_score INTEGER DEFAULT 0,
        ip_reputation_score INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ login_risk_scores table');

    // Suspicious activities log
    await c.query(`
      CREATE TABLE IF NOT EXISTS suspicious_activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        activity_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'medium',
        description TEXT,
        risk_score INTEGER DEFAULT 0,
        ip_address VARCHAR(45),
        user_agent TEXT,
        geolocation_id UUID,
        metadata JSONB,
        is_resolved BOOLEAN DEFAULT false,
        resolved_at TIMESTAMP,
        resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ suspicious_activities table');

    // Security alerts / notifications
    await c.query(`
      CREATE TABLE IF NOT EXISTS security_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'info',
        title VARCHAR(255) NOT NULL,
        message TEXT,
        channel VARCHAR(20) DEFAULT 'in_app',
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        action_url VARCHAR(500),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ security_alerts table');

    // User security preferences
    await c.query(`
      CREATE TABLE IF NOT EXISTS user_security_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        login_alerts BOOLEAN DEFAULT true,
        new_device_alerts BOOLEAN DEFAULT true,
        geo_anomaly_alerts BOOLEAN DEFAULT true,
        password_expiry_days INTEGER DEFAULT 90,
        session_timeout_minutes INTEGER DEFAULT 60,
        max_concurrent_sessions INTEGER DEFAULT 5,
        ip_restriction_enabled BOOLEAN DEFAULT false,
        allowed_countries TEXT[],
        blocked_countries TEXT[],
        mfa_required BOOLEAN DEFAULT false,
        login_approval_required BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ user_security_preferences table');

    // Country IP restrictions (admin-managed)
    await c.query(`
      CREATE TABLE IF NOT EXISTS country_ip_restrictions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        country_code VARCHAR(5) NOT NULL,
        country VARCHAR(100) NOT NULL,
        action VARCHAR(10) NOT NULL DEFAULT 'block',
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(country_code, action)
      )
    `);
    console.log('  ✓ country_ip_restrictions table');

    // Indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_mfa_settings_user ON mfa_settings(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_otp_tokens_user ON otp_tokens(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_otp_tokens_expires ON otp_tokens(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_recovery_codes_user ON recovery_codes(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user ON device_fingerprints(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_device_fingerprints_hash ON device_fingerprints(user_id, fingerprint_hash)',
      'CREATE INDEX IF NOT EXISTS idx_geolocation_logs_user ON geolocation_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_geolocation_logs_created ON geolocation_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_login_risk_scores_user ON login_risk_scores(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_suspicious_activities_user ON suspicious_activities(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_suspicious_activities_type ON suspicious_activities(activity_type)',
      'CREATE INDEX IF NOT EXISTS idx_security_alerts_user ON security_alerts(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_security_alerts_read ON security_alerts(user_id, is_read)',
    ];
    for (const sql of indexes) {
      try { await c.query(sql); } catch (e) { console.log('  - index error: ' + e.message.slice(0, 60)); }
    }
    console.log('  ✓ indexes created');

    console.log('\nSecurity Phase 2 migration complete.\n');
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    c.release();
    pool.end();
  }
}

migrate();
