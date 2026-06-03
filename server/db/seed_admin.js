const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'erp_system',
});

async function seedAdmin() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Permissions ---
    const resources = [
      'system_settings', 'system_logs', 'user_sessions', 'security_events',
      'backup_management', 'api_keys', 'file_storage', 'admin_dashboard',
      'mfa_management', 'audit_trail', 'deployment'
    ];
    const actions = ['create', 'read', 'update', 'delete', 'approve', 'export'];

    for (const resource of resources) {
      for (const action of actions) {
        await client.query(
          `INSERT INTO permissions (resource, action) VALUES ($1, $2) ON CONFLICT (resource, action) DO NOTHING`,
          [resource, action]
        );
      }
    }

    const allPerms = await client.query(
      `SELECT p.id, p.resource, p.action FROM permissions p WHERE p.resource = ANY($1)`,
      [resources]
    );

    const roles = await client.query('SELECT id, name FROM roles');
    const roleMap = {};
    for (const r of roles.rows) roleMap[r.name] = r.id;

    // System Admin: ALL 11 resources x 6 actions
    if (roleMap['System Admin']) {
      for (const perm of allPerms.rows) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['System Admin'], perm.id]
        );
      }
    }

    // CEO: admin_dashboard(read,export), system_logs(read), audit_trail(read,export), security_events(read), backup_management(read)
    if (roleMap['CEO']) {
      const ceoPerms = allPerms.rows.filter(p =>
        (p.resource === 'admin_dashboard' && (p.action === 'read' || p.action === 'export')) ||
        (p.resource === 'system_logs' && p.action === 'read') ||
        (p.resource === 'audit_trail' && (p.action === 'read' || p.action === 'export')) ||
        (p.resource === 'security_events' && p.action === 'read') ||
        (p.resource === 'backup_management' && p.action === 'read')
      );
      for (const p of ceoPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['CEO'], p.id]
        );
      }
    }

    // Manager: admin_dashboard(read), audit_trail(read)
    if (roleMap['Manager']) {
      const mgrPerms = allPerms.rows.filter(p =>
        (p.resource === 'admin_dashboard' && p.action === 'read') ||
        (p.resource === 'audit_trail' && p.action === 'read')
      );
      for (const p of mgrPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Manager'], p.id]
        );
      }
    }

    // Auditor: admin_dashboard(read,export), system_logs(read,export), audit_trail(read,export), security_events(read), backup_management(read)
    if (roleMap['Auditor']) {
      const auditorPerms = allPerms.rows.filter(p =>
        (p.resource === 'admin_dashboard' && (p.action === 'read' || p.action === 'export')) ||
        (p.resource === 'system_logs' && (p.action === 'read' || p.action === 'export')) ||
        (p.resource === 'audit_trail' && (p.action === 'read' || p.action === 'export')) ||
        (p.resource === 'security_events' && p.action === 'read') ||
        (p.resource === 'backup_management' && p.action === 'read')
      );
      for (const p of auditorPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Auditor'], p.id]
        );
      }
    }

    // All other roles: no admin permissions (implicitly skipped)

    // --- System Settings (default configuration) ---
    const settings = [
      { key: 'company_name', value: 'Enterprise ERP', type: 'string', cat: 'general', desc: 'Company Name' },
      { key: 'company_address', value: '', type: 'string', cat: 'general', desc: 'Company Address' },
      { key: 'company_phone', value: '', type: 'string', cat: 'general', desc: 'Company Phone' },
      { key: 'company_email', value: 'admin@erp.com', type: 'string', cat: 'general', desc: 'Company Email' },
      { key: 'company_currency', value: 'KES', type: 'string', cat: 'general', desc: 'Default Currency' },
      { key: 'company_timezone', value: 'Africa/Nairobi', type: 'string', cat: 'general', desc: 'Default Timezone' },
      { key: 'company_date_format', value: 'DD/MM/YYYY', type: 'string', cat: 'general', desc: 'Date Format' },
      { key: 'smtp_host', value: '', type: 'string', cat: 'email', desc: 'SMTP Host' },
      { key: 'smtp_port', value: '587', type: 'number', cat: 'email', desc: 'SMTP Port' },
      { key: 'smtp_user', value: '', type: 'string', cat: 'email', desc: 'SMTP Username' },
      { key: 'smtp_pass', value: '', type: 'string', cat: 'email', desc: 'SMTP Password (encrypted in production)' },
      { key: 'smtp_from_email', value: 'noreply@erp.com', type: 'string', cat: 'email', desc: 'From Email Address' },
      { key: 'smtp_from_name', value: 'ERP System', type: 'string', cat: 'email', desc: 'From Name' },
      { key: 'password_min_length', value: '8', type: 'number', cat: 'security', desc: 'Minimum Password Length' },
      { key: 'password_require_uppercase', value: 'true', type: 'boolean', cat: 'security', desc: 'Require Uppercase Letters' },
      { key: 'password_require_numbers', value: 'true', type: 'boolean', cat: 'security', desc: 'Require Numbers' },
      { key: 'password_require_symbols', value: 'false', type: 'boolean', cat: 'security', desc: 'Require Special Characters' },
      { key: 'password_expiry_days', value: '90', type: 'number', cat: 'security', desc: 'Password Expiry (days)' },
      { key: 'max_login_attempts', value: '5', type: 'number', cat: 'security', desc: 'Max Failed Login Attempts' },
      { key: 'lockout_duration_minutes', value: '30', type: 'number', cat: 'security', desc: 'Account Lockout Duration' },
      { key: 'session_timeout_minutes', value: '60', type: 'number', cat: 'security', desc: 'Session Timeout' },
      { key: 'mfa_required', value: 'false', type: 'boolean', cat: 'security', desc: 'Require Multi-Factor Auth' },
      { key: 'mfa_enforced_roles', value: '["System Admin","CEO","Finance Officer"]', type: 'json', cat: 'security', desc: 'Roles Required to Use MFA' },
      { key: 'backup_enabled', value: 'true', type: 'boolean', cat: 'backup', desc: 'Enable Automatic Backups' },
      { key: 'backup_retention_days', value: '30', type: 'number', cat: 'backup', desc: 'Backup Retention Period' },
      { key: 'backup_encryption', value: 'true', type: 'boolean', cat: 'backup', desc: 'Encrypt Backups' },
      { key: 'backup_storage_path', value: './backups', type: 'string', cat: 'backup', desc: 'Backup Storage Path' },
      { key: 'rate_limit_api', value: '100', type: 'number', cat: 'api', desc: 'API Rate Limit (per minute)' },
      { key: 'enable_api_logging', value: 'true', type: 'boolean', cat: 'api', desc: 'Enable API Usage Logging' },
      { key: 'maintenance_mode', value: 'false', type: 'boolean', cat: 'general', desc: 'Maintenance Mode' },
      { key: 'max_file_upload_size', value: '10', type: 'number', cat: 'general', desc: 'Max File Upload Size (MB)' },
      { key: 'allowed_file_types', value: '["jpg","png","pdf","doc","docx","xls","xlsx","csv"]', type: 'json', cat: 'general', desc: 'Allowed File Types' },
      { key: 'theme_primary_color', value: '#3B82F6', type: 'string', cat: 'theme', desc: 'Primary Theme Color' },
      { key: 'theme_sidebar_color', value: '#1E293B', type: 'string', cat: 'theme', desc: 'Sidebar Background Color' },
      { key: 'theme_mode', value: 'light', type: 'string', cat: 'theme', desc: 'Default Theme Mode' },
    ];
    for (const s of settings) {
      await client.query(
        `INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (setting_key) DO NOTHING`,
        [s.key, s.value, s.type, s.cat, s.desc]
      );
    }

    // --- Backup Schedule ---
    await client.query(
      `INSERT INTO backup_schedules (name, backup_type, frequency, time_of_day, retention_days, encryption_enabled) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      ['Daily Full Backup', 'full', 'daily', '02:00', 30, true]
    );

    console.log('Admin & Security seed data completed successfully.');
    await client.query('COMMIT');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedAdmin();
