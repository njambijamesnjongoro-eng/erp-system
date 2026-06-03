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
  const client = await pool.connect();
  try {
    console.log('Running security phase 1 migration...\n');

    // ── Add columns to users for progressive lockout ──
    const userCols = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS lock_count INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    ];
    for (const sql of userCols) {
      try { await client.query(sql); console.log('  ✓ users column added'); } catch (e) { console.log('  - ' + e.message.slice(0,80)); }
    }

    // ── Password history table ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ password_history table');
    await client.query('CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id)');

    // ── Trusted devices table ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS trusted_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_name VARCHAR(255),
        browser VARCHAR(255),
        os VARCHAR(255),
        ip_address VARCHAR(45),
        fingerprint VARCHAR(255),
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_trusted BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ trusted_devices table');
    await client.query('CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id)');

    // ── Security events table ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) DEFAULT 'info',
        description TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ security_events table');
    await client.query('CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at)');

    // ── Email notification queue ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        error_message TEXT,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ email_queue table');

    console.log('\nSecurity migration complete.\n');
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
