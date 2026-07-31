const { Pool } = require('pg');
const { getPoolConfig } = require('../config/poolConfig');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool(getPoolConfig());

async function seedAnalytics() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Permissions ---
    const resources = [
      'dashboard', 'analytics', 'notifications', 'email_templates',
      'reports', 'audit_logs', 'bi_insights', 'system_monitor',
      'compliance', 'activity_feed'
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

    // System Admin: ALL 10 x 6 actions
    if (roleMap['System Admin']) {
      for (const perm of allPerms.rows) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['System Admin'], perm.id]
        );
      }
    }

    // Helper to assign specific resource/action combos to a role
    async function assignPerms(roleName, rules) {
      const roleId = roleMap[roleName];
      if (!roleId) return;
      for (const perm of allPerms.rows) {
        const allowedActions = rules[perm.resource];
        if (allowedActions && allowedActions.includes(perm.action)) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [roleId, perm.id]
          );
        }
      }
    }

    // CEO
    await assignPerms('CEO', {
      dashboard: ['read', 'export'],
      analytics: ['read', 'export'],
      notifications: ['create', 'read', 'update', 'delete', 'approve', 'export'],
      reports: ['create', 'read', 'update', 'delete', 'approve', 'export'],
      bi_insights: ['read', 'export'],
      system_monitor: ['read'],
    });

    // Manager
    await assignPerms('Manager', {
      dashboard: ['read', 'export'],
      analytics: ['read', 'export'],
      notifications: ['read', 'update'],
      reports: ['read', 'create', 'export'],
    });

    // HR Officer
    await assignPerms('HR Officer', {
      dashboard: ['read'],
      analytics: ['read', 'export'],
      notifications: ['read', 'update'],
      reports: ['read', 'create', 'export'],
      compliance: ['read'],
    });

    // Finance Officer
    await assignPerms('Finance Officer', {
      dashboard: ['read', 'export'],
      analytics: ['read', 'export'],
      notifications: ['read', 'update'],
      reports: ['read', 'create', 'export'],
      compliance: ['read'],
    });

    // Asset Manager
    await assignPerms('Asset Manager', {
      dashboard: ['read'],
      analytics: ['read', 'export'],
      notifications: ['read', 'update'],
      reports: ['read', 'create', 'export'],
    });

    // Procurement Officer
    await assignPerms('Procurement Officer', {
      dashboard: ['read'],
      analytics: ['read', 'export'],
      notifications: ['read', 'update'],
      reports: ['read', 'create', 'export'],
    });

    // Employee
    await assignPerms('Employee', {
      notifications: ['read', 'update'],
    });

    // Auditor
    await assignPerms('Auditor', {
      dashboard: ['read'],
      analytics: ['read', 'export'],
      reports: ['read', 'export'],
      audit_logs: ['read', 'export'],
      compliance: ['read', 'export'],
    });

    // --- Email Templates ---
    const emailTemplates = [
      {
        name: 'welcome_email',
        subject: 'Welcome to {{company_name}} {{employee_name}}!',
        category: 'onboarding',
        variables: ['company_name', 'employee_name', 'email', 'portal_link'],
        body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table width="100%" bgcolor="#f4f4f4" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding: 40px 0;">
      <table width="600" bgcolor="#ffffff" cellpadding="0" cellspacing="0" style="border-radius: 8px; overflow: hidden;">
        <tr><td style="background: #2563eb; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome Aboard!</h1>
        </td></tr>
        <tr><td style="padding: 30px;">
          <p style="font-size: 16px; color: #333;">Dear {{employee_name}},</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Welcome to <strong>{{company_name}}</strong>! We are thrilled to have you join our team.
            Your account has been created with the email <strong>{{email}}</strong>.
          </p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            You can access the employee portal at:
            <br/><a href="{{portal_link}}" style="color: #2563eb;">{{portal_link}}</a>
          </p>
          <p style="font-size: 16px; color: #333;">We look forward to great things together!</p>
          <p style="font-size: 16px; color: #333;">Best regards,<br/>The {{company_name}} Team</p>
        </td></tr>
        <tr><td style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #888;">
          &copy; {{company_name}} &mdash; All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      },
      {
        name: 'payslip_notification',
        subject: 'Your Payslip for {{period}} is Ready',
        category: 'payslip',
        variables: ['employee_name', 'period', 'payslip_link'],
        body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table width="100%" bgcolor="#f4f4f4" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding: 40px 0;">
      <table width="600" bgcolor="#ffffff" cellpadding="0" cellspacing="0" style="border-radius: 8px; overflow: hidden;">
        <tr><td style="background: #059669; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Payslip Available</h1>
        </td></tr>
        <tr><td style="padding: 30px;">
          <p style="font-size: 16px; color: #333;">Dear {{employee_name}},</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Your payslip for the period <strong>{{period}}</strong> is now ready for viewing.
          </p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="{{payslip_link}}" style="background: #059669; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">View Payslip</a>
          </p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            If the button does not work, copy this link: <a href="{{payslip_link}}" style="color: #059669;">{{payslip_link}}</a>
          </p>
          <p style="font-size: 16px; color: #333;">Best regards,<br/>Payroll Department</p>
        </td></tr>
        <tr><td style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #888;">
          This is an automated message. Please do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      },
      {
        name: 'leave_approved',
        subject: 'Leave Request Approved',
        category: 'leave',
        variables: ['employee_name', 'leave_type', 'start_date', 'end_date'],
        body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table width="100%" bgcolor="#f4f4f4" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding: 40px 0;">
      <table width="600" bgcolor="#ffffff" cellpadding="0" cellspacing="0" style="border-radius: 8px; overflow: hidden;">
        <tr><td style="background: #16a34a; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Leave Approved</h1>
        </td></tr>
        <tr><td style="padding: 30px;">
          <p style="font-size: 16px; color: #333;">Dear {{employee_name}},</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Your <strong>{{leave_type}}</strong> leave request has been <strong>approved</strong>.
          </p>
          <table width="100%" cellpadding="8" style="background: #f0fdf4; border-radius: 6px; margin: 20px 0;">
            <tr><td style="font-size: 14px; color: #333;"><strong>Start Date:</strong> {{start_date}}</td></tr>
            <tr><td style="font-size: 14px; color: #333;"><strong>End Date:</strong> {{end_date}}</td></tr>
          </table>
          <p style="font-size: 16px; color: #333;">Enjoy your time off!</p>
          <p style="font-size: 16px; color: #333;">Best regards,<br/>HR Department</p>
        </td></tr>
        <tr><td style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #888;">
          &copy; {{company_name}} &mdash; All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      },
      {
        name: 'leave_rejected',
        subject: 'Leave Request Update',
        category: 'leave',
        variables: ['employee_name', 'leave_type', 'reason'],
        body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table width="100%" bgcolor="#f4f4f4" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding: 40px 0;">
      <table width="600" bgcolor="#ffffff" cellpadding="0" cellspacing="0" style="border-radius: 8px; overflow: hidden;">
        <tr><td style="background: #dc2626; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Leave Request Update</h1>
        </td></tr>
        <tr><td style="padding: 30px;">
          <p style="font-size: 16px; color: #333;">Dear {{employee_name}},</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Unfortunately, your <strong>{{leave_type}}</strong> leave request has been <strong>rejected</strong>.
          </p>
          <table width="100%" cellpadding="8" style="background: #fef2f2; border-radius: 6px; margin: 20px 0;">
            <tr><td style="font-size: 14px; color: #333;"><strong>Reason:</strong> {{reason}}</td></tr>
          </table>
          <p style="font-size: 16px; color: #333;">Please contact your supervisor or HR for further clarification.</p>
          <p style="font-size: 16px; color: #333;">Best regards,<br/>HR Department</p>
        </td></tr>
        <tr><td style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #888;">
          &copy; {{company_name}} &mdash; All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      },
      {
        name: 'procurement_approval',
        subject: 'Procurement Request #{{request_number}} Needs Your Approval',
        category: 'procurement',
        variables: ['approver_name', 'request_number', 'title', 'amount', 'approval_link'],
        body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table width="100%" bgcolor="#f4f4f4" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding: 40px 0;">
      <table width="600" bgcolor="#ffffff" cellpadding="0" cellspacing="0" style="border-radius: 8px; overflow: hidden;">
        <tr><td style="background: #f59e0b; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Approval Required</h1>
        </td></tr>
        <tr><td style="padding: 30px;">
          <p style="font-size: 16px; color: #333;">Dear {{approver_name}},</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Procurement Request <strong>#{{request_number}}</strong> &mdash; <em>{{title}}</em> &mdash; requires your approval.
          </p>
          <table width="100%" cellpadding="8" style="background: #fffbeb; border-radius: 6px; margin: 20px 0;">
            <tr><td style="font-size: 14px; color: #333;"><strong>Amount:</strong> {{amount}}</td></tr>
          </table>
          <p style="text-align: center; margin: 30px 0;">
            <a href="{{approval_link}}" style="background: #f59e0b; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">Review &amp; Approve</a>
          </p>
          <p style="font-size: 16px; color: #333;">Best regards,<br/>Procurement Department</p>
        </td></tr>
        <tr><td style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #888;">
          This is an automated notification. Please do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      },
      {
        name: 'maintenance_reminder',
        subject: 'Maintenance Reminder for {{asset_name}}',
        category: 'maintenance',
        variables: ['asset_name', 'maintenance_type', 'scheduled_date', 'asset_link'],
        body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table width="100%" bgcolor="#f4f4f4" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding: 40px 0;">
      <table width="600" bgcolor="#ffffff" cellpadding="0" cellspacing="0" style="border-radius: 8px; overflow: hidden;">
        <tr><td style="background: #6366f1; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Maintenance Reminder</h1>
        </td></tr>
        <tr><td style="padding: 30px;">
          <p style="font-size: 16px; color: #333;">Dear Team,</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            This is a reminder for upcoming <strong>{{maintenance_type}}</strong> maintenance on <strong>{{asset_name}}</strong>.
          </p>
          <table width="100%" cellpadding="8" style="background: #eef2ff; border-radius: 6px; margin: 20px 0;">
            <tr><td style="font-size: 14px; color: #333;"><strong>Scheduled Date:</strong> {{scheduled_date}}</td></tr>
          </table>
          <p style="text-align: center; margin: 30px 0;">
            <a href="{{asset_link}}" style="background: #6366f1; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">View Asset Details</a>
          </p>
          <p style="font-size: 16px; color: #333;">Best regards,<br/>Asset Management Team</p>
        </td></tr>
        <tr><td style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #888;">
          This is an automated reminder. Please do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      },
      {
        name: 'insurance_renewal',
        subject: 'Insurance Policy Renewal Notice - {{policy_number}}',
        category: 'insurance',
        variables: ['policy_number', 'insured_entity', 'expiry_date', 'renewal_link'],
        body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table width="100%" bgcolor="#f4f4f4" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding: 40px 0;">
      <table width="600" bgcolor="#ffffff" cellpadding="0" cellspacing="0" style="border-radius: 8px; overflow: hidden;">
        <tr><td style="background: #0891b2; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Renewal Notice</h1>
        </td></tr>
        <tr><td style="padding: 30px;">
          <p style="font-size: 16px; color: #333;">Dear Team,</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Insurance policy <strong>{{policy_number}}</strong> for <strong>{{insured_entity}}</strong> is due for renewal.
          </p>
          <table width="100%" cellpadding="8" style="background: #ecfeff; border-radius: 6px; margin: 20px 0;">
            <tr><td style="font-size: 14px; color: #333;"><strong>Expiry Date:</strong> {{expiry_date}}</td></tr>
          </table>
          <p style="text-align: center; margin: 30px 0;">
            <a href="{{renewal_link}}" style="background: #0891b2; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">Renew Now</a>
          </p>
          <p style="font-size: 16px; color: #333;">Best regards,<br/>Finance Department</p>
        </td></tr>
        <tr><td style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #888;">
          This is an automated notice. Please do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      },
      {
        name: 'password_reset',
        subject: 'Password Reset Request',
        category: 'security',
        variables: ['employee_name', 'reset_link', 'expiry_hours'],
        body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table width="100%" bgcolor="#f4f4f4" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding: 40px 0;">
      <table width="600" bgcolor="#ffffff" cellpadding="0" cellspacing="0" style="border-radius: 8px; overflow: hidden;">
        <tr><td style="background: #7c3aed; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Password Reset</h1>
        </td></tr>
        <tr><td style="padding: 30px;">
          <p style="font-size: 16px; color: #333;">Dear {{employee_name}},</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            A password reset was requested for your account.
          </p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="{{reset_link}}" style="background: #7c3aed; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">Reset Password</a>
          </p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            This link expires in <strong>{{expiry_hours}} hours</strong>. If you did not request this, please ignore this email.
          </p>
          <p style="font-size: 16px; color: #333;">Best regards,<br/>IT Support</p>
        </td></tr>
        <tr><td style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #888;">
          This is an automated message. Please do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      },
    ];

    for (const tpl of emailTemplates) {
      await client.query(
        `INSERT INTO email_templates (name, subject, category, variables, body)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO NOTHING`,
        [tpl.name, tpl.subject, tpl.category, JSON.stringify(tpl.variables), tpl.body]
      );
    }

    // --- Dashboard Widgets ---
    const defaultWidgets = [
      { widget_type: 'kpi_card', config: { title: 'Total Employees', dataSource: 'employee_count', icon: 'Users' } },
      { widget_type: 'kpi_card', config: { title: 'Active Payroll', dataSource: 'monthly_payroll', icon: 'DollarSign' } },
      { widget_type: 'kpi_card', config: { title: 'Pending Approvals', dataSource: 'pending_approvals', icon: 'Clock' } },
      { widget_type: 'kpi_card', config: { title: 'System Health', dataSource: 'system_health', icon: 'Activity' } },
      { widget_type: 'kpi_card', config: { title: 'Monthly Revenue', dataSource: 'monthly_revenue', icon: 'TrendingUp' } },
      { widget_type: 'kpi_card', config: { title: 'Open Requests', dataSource: 'open_requests', icon: 'FileText' } },
      { widget_type: 'bar_chart', config: { title: 'Department Headcount', dataSource: 'department_headcount' } },
      { widget_type: 'line_chart', config: { title: 'Revenue Trend', dataSource: 'revenue_trend' } },
      { widget_type: 'pie_chart', config: { title: 'Expense Distribution', dataSource: 'expense_distribution' } },
    ];

    const adminResult = await client.query('SELECT id FROM users WHERE role_id = $1 LIMIT 1', [roleMap['System Admin']]);
    const adminUserId = adminResult.rows[0]?.id;
    if (adminUserId) {
      for (const widget of defaultWidgets) {
        await client.query(
           `INSERT INTO dashboard_widgets (user_id, widget_type, title, config, is_visible)
           VALUES ($1, $2, $3, $4, true)`,
          [adminUserId, widget.widget_type, widget.config.title || widget.widget_type, JSON.stringify(widget.config)]
        );
      }
    }

    // --- Compliance Seed Data ---
    const compRecords = [
      { compliance_type: 'tax', entity_type: 'company', status: 'compliant', score: 95, description: 'PAYE Tax Filing - Q1 2026 completed', due_date: '2026-04-15', completed_date: '2026-04-10', notes: 'All monthly PAYE remittances filed on time' },
      { compliance_type: 'tax', entity_type: 'company', status: 'pending', score: 0, description: 'PAYE Tax Filing - Q2 2026', due_date: '2026-07-15', completed_date: null, notes: 'Pending filing for April to June 2026' },
      { compliance_type: 'insurance', entity_type: 'company', status: 'compliant', score: 100, description: 'SHA Monthly Remittance - March 2026', due_date: '2026-04-09', completed_date: '2026-04-05', notes: 'SHA contributions submitted on time' },
      { compliance_type: 'insurance', entity_type: 'company', status: 'pending', score: 0, description: 'SHA Monthly Remittance - April 2026', due_date: '2026-05-09', completed_date: null, notes: 'Due for submission' },
      { compliance_type: 'social', entity_type: 'company', status: 'compliant', score: 100, description: 'SHA Contributions - Q1 2026', due_date: '2026-04-15', completed_date: '2026-04-10', notes: 'SHA quarterly contributions submitted' },
      { compliance_type: 'audit', entity_type: 'company', status: 'compliant', score: 90, description: 'Internal Audit - Payroll Process Q1 2026', due_date: '2026-04-30', completed_date: '2026-04-25', notes: 'Minor findings addressed' },
      { compliance_type: 'audit', entity_type: 'company', status: 'non_compliant', score: 60, description: 'External Audit - FY2025 Annual Report', due_date: '2026-06-30', completed_date: null, notes: 'Documentation gaps identified' },
    ];

    for (const rec of compRecords) {
      await client.query(
        `INSERT INTO compliance_records (compliance_type, entity_type, status, score, description, due_date, completed_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [rec.compliance_type, rec.entity_type, rec.status, rec.score, rec.description, rec.due_date, rec.completed_date, rec.notes]
      );
    }

    console.log('Analytics module seed data completed successfully.');
    await client.query('COMMIT');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Analytics module seed failed:', err.message, 'LINE:', err.line || 'N/A');
    process.exit(1);
  } finally {
    client.release();
  }
}

seedAnalytics();
