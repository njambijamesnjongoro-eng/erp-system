const { Pool } = require('pg');
const { getPoolConfig } = require('../config/poolConfig');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool(getPoolConfig());

async function seedPortal() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Permissions ---
    const resources = [
      'employee_portal', 'client_portal', 'supplier_portal', 'support_tickets',
      'announcements', 'internal_messages', 'calendar', 'integrations',
      'payment_transactions', 'webhooks', 'shared_reports'
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

    // CEO: all except integrations, webhooks
    if (roleMap['CEO']) {
      const ceoPerms = allPerms.rows.filter(p =>
        p.resource !== 'integrations' && p.resource !== 'webhooks'
      );
      for (const p of ceoPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['CEO'], p.id]
        );
      }
    }

    // Manager: employee_portal, support_tickets, announcements, internal_messages, calendar, shared_reports
    if (roleMap['Manager']) {
      const mgrPerms = allPerms.rows.filter(p =>
        p.resource === 'employee_portal' || p.resource === 'support_tickets' ||
        p.resource === 'announcements' || p.resource === 'internal_messages' ||
        p.resource === 'calendar' || p.resource === 'shared_reports'
      );
      for (const p of mgrPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Manager'], p.id]
        );
      }
    }

    // HR Officer: employee_portal, support_tickets, announcements, calendar
    if (roleMap['HR Officer']) {
      const hrPerms = allPerms.rows.filter(p =>
        p.resource === 'employee_portal' || p.resource === 'support_tickets' ||
        p.resource === 'announcements' || p.resource === 'calendar'
      );
      for (const p of hrPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['HR Officer'], p.id]
        );
      }
    }

    // Finance Officer: employee_portal, client_portal, support_tickets, payment_transactions, calendar, shared_reports
    if (roleMap['Finance Officer']) {
      const finPerms = allPerms.rows.filter(p =>
        p.resource === 'employee_portal' || p.resource === 'client_portal' ||
        p.resource === 'support_tickets' || p.resource === 'payment_transactions' ||
        p.resource === 'calendar' || p.resource === 'shared_reports'
      );
      for (const p of finPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Finance Officer'], p.id]
        );
      }
    }

    // Asset Manager: employee_portal, support_tickets, calendar
    if (roleMap['Asset Manager']) {
      const assetPerms = allPerms.rows.filter(p =>
        p.resource === 'employee_portal' || p.resource === 'support_tickets' ||
        p.resource === 'calendar'
      );
      for (const p of assetPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Asset Manager'], p.id]
        );
      }
    }

    // Procurement Officer: employee_portal, supplier_portal, support_tickets, calendar
    if (roleMap['Procurement Officer']) {
      const procPerms = allPerms.rows.filter(p =>
        p.resource === 'employee_portal' || p.resource === 'supplier_portal' ||
        p.resource === 'support_tickets' || p.resource === 'calendar'
      );
      for (const p of procPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Procurement Officer'], p.id]
        );
      }
    }

    // Employee: employee_portal, internal_messages, calendar
    if (roleMap['Employee']) {
      const empPerms = allPerms.rows.filter(p =>
        p.resource === 'employee_portal' || p.resource === 'internal_messages' ||
        p.resource === 'calendar'
      );
      for (const p of empPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Employee'], p.id]
        );
      }
    }

    // Auditor: client_portal, supplier_portal, support_tickets, payment_transactions, shared_reports
    if (roleMap['Auditor']) {
      const audPerms = allPerms.rows.filter(p =>
        p.resource === 'client_portal' || p.resource === 'supplier_portal' ||
        p.resource === 'support_tickets' || p.resource === 'payment_transactions' ||
        p.resource === 'shared_reports'
      );
      for (const p of audPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Auditor'], p.id]
        );
      }
    }

    // --- Sample Announcements ---
    const adminEmp = await client.query(
      `SELECT id FROM employee_profiles WHERE email = 'admin@erp.com'`
    );
    const adminEmpId = adminEmp.rows[0]?.id;

    const hrDept = await client.query(
      `SELECT id FROM departments WHERE name = 'Human Resources'`
    );
    const hrDeptId = hrDept.rows[0]?.id;

    const announcements = [
      { title: 'Welcome to the New ERP Portal', category: 'general', priority: 'high', department_id: null },
      { title: 'Updated Leave Policy 2026', category: 'hr', priority: 'normal', department_id: hrDeptId },
      { title: 'Q1 Financial Results Available', category: 'finance', priority: 'normal', department_id: null },
      { title: 'System Maintenance This Weekend', category: 'it', priority: 'urgent', department_id: null },
    ];

    for (const a of announcements) {
      await client.query(
        `INSERT INTO announcements (title, content, category, priority, department_id, created_by) VALUES ($1, $2, $3, $4, $5, $6)`,
        [a.title, a.title, a.category, a.priority, a.department_id, adminEmpId]
      );
    }

    // --- Sample Calendar Events ---
    const now = new Date();

    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(12, 0, 0, 0);

    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
    nextMonday.setHours(9, 0, 0, 0);
    const nextMondayEnd = new Date(nextMonday);
    nextMondayEnd.setHours(11, 0, 0, 0);

    const nextWed = new Date(nextMonday);
    nextWed.setDate(nextMonday.getDate() + 2);
    nextWed.setHours(14, 0, 0, 0);
    const nextWedEnd = new Date(nextWed);
    nextWedEnd.setHours(16, 0, 0, 0);

    const holiday = new Date(2026, 5, 1);

    const events = [
      { title: 'Company All-Hands Meeting', type: 'meeting', start_time: twoHoursLater.toISOString(), end_time: threeHoursLater.toISOString(), all_day: false, department_id: null },
      { title: 'Monthly Financial Review', type: 'meeting', start_time: tomorrow.toISOString(), end_time: tomorrowEnd.toISOString(), all_day: false, department_id: null },
      { title: 'Q2 Maintenance Schedule Review', type: 'meeting', start_time: nextMonday.toISOString(), end_time: nextMondayEnd.toISOString(), all_day: false, department_id: null },
      { title: 'Employee Training: Safety Protocols', type: 'training', start_time: nextWed.toISOString(), end_time: nextWedEnd.toISOString(), all_day: false, department_id: null },
      { title: 'Public Holiday - Madaraka Day', type: 'holiday', start_time: holiday.toISOString(), end_time: holiday.toISOString(), all_day: true, department_id: null },
    ];

    for (const e of events) {
      await client.query(
        `INSERT INTO calendar_events (title, event_type, start_time, end_time, is_all_day, department_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [e.title, e.type, e.start_time, e.end_time, e.all_day, e.department_id, adminEmpId]
      );
    }

    // --- Default Integrations ---
    const adminUser = await client.query(
      `SELECT id FROM users WHERE email = 'admin@erp.com'`
    );
    const adminUserId = adminUser.rows[0]?.id;

    const integrations = [
      { name: 'SMTP Email Service', provider: 'email_smtp', config: JSON.stringify({ host: 'smtp.example.com', port: 587, secure: false, from: 'noreply@erp.com' }) },
      { name: 'SMS Gateway', provider: 'sms_gateway', config: JSON.stringify({ api_url: 'https://api.sms-provider.com', sender_id: 'ERP-System' }) },
      { name: 'M-Pesa Payment', provider: 'mpesa', config: JSON.stringify({ environment: 'sandbox', consumer_key: 'xxx', consumer_secret: 'xxx', passkey: 'xxx', shortcode: '174379' }) },
    ];

    for (const i of integrations) {
      await client.query(
        `INSERT INTO integrations (name, provider, config, created_by) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [i.name, i.provider, i.config, adminUserId]
      );
    }

    console.log('Portal, Communication & Integrations seed data completed successfully.');
    await client.query('COMMIT');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Portal seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedPortal();
