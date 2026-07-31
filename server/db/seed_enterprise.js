const { Pool } = require('pg');
const { getPoolConfig } = require('../config/poolConfig');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool(getPoolConfig());

async function seedEnterprise() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Permissions ---
    const resources = [
      'companies', 'branches', 'company_users',
      'compliance_frameworks', 'compliance_requirements', 'compliance_audits',
      'ai_analytics', 'ai_models',
      'workflow_definitions',
      'risk_assessments',
      'policies',
      'forecast_records',
      'enterprise_search',
      'api_keys', 'enterprise_settings',
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

    // System Admin: ALL 16 resources x 6 actions
    if (roleMap['System Admin']) {
      for (const perm of allPerms.rows) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['System Admin'], perm.id]
        );
      }
    }

    // CEO: all except api_keys, enterprise_settings
    if (roleMap['CEO']) {
      const ceoPerms = allPerms.rows.filter(p =>
        p.resource !== 'api_keys' && p.resource !== 'enterprise_settings'
      );
      for (const p of ceoPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['CEO'], p.id]
        );
      }
    }

    // Manager: companies, branches, company_users, compliance_frameworks, compliance_requirements, workflow_definitions, risk_assessments, policies, forecast_records, enterprise_search
    if (roleMap['Manager']) {
      const mgrPerms = allPerms.rows.filter(p =>
        p.resource === 'companies' || p.resource === 'branches' || p.resource === 'company_users' ||
        p.resource === 'compliance_frameworks' || p.resource === 'compliance_requirements' ||
        p.resource === 'workflow_definitions' || p.resource === 'risk_assessments' ||
        p.resource === 'policies' || p.resource === 'forecast_records' ||
        p.resource === 'enterprise_search'
      );
      for (const p of mgrPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Manager'], p.id]
        );
      }
    }

    // HR Officer: companies, branches, company_users, compliance_frameworks, compliance_requirements, policies
    if (roleMap['HR Officer']) {
      const hrPerms = allPerms.rows.filter(p =>
        p.resource === 'companies' || p.resource === 'branches' || p.resource === 'company_users' ||
        p.resource === 'compliance_frameworks' || p.resource === 'compliance_requirements' ||
        p.resource === 'policies'
      );
      for (const p of hrPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['HR Officer'], p.id]
        );
      }
    }

    // Finance Officer: companies, branches, compliance_frameworks, compliance_requirements, risk_assessments, forecast_records, api_keys, enterprise_settings
    if (roleMap['Finance Officer']) {
      const finPerms = allPerms.rows.filter(p =>
        p.resource === 'companies' || p.resource === 'branches' ||
        p.resource === 'compliance_frameworks' || p.resource === 'compliance_requirements' ||
        p.resource === 'risk_assessments' || p.resource === 'forecast_records' ||
        p.resource === 'api_keys' || p.resource === 'enterprise_settings'
      );
      for (const p of finPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Finance Officer'], p.id]
        );
      }
    }

    // Procurement Officer: companies, branches, compliance_frameworks, compliance_requirements, workflow_definitions, policies
    if (roleMap['Procurement Officer']) {
      const procPerms = allPerms.rows.filter(p =>
        p.resource === 'companies' || p.resource === 'branches' ||
        p.resource === 'compliance_frameworks' || p.resource === 'compliance_requirements' ||
        p.resource === 'workflow_definitions' || p.resource === 'policies'
      );
      for (const p of procPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Procurement Officer'], p.id]
        );
      }
    }

    // Employee: companies, branches, company_users, policies, enterprise_search
    if (roleMap['Employee']) {
      const empPerms = allPerms.rows.filter(p =>
        p.resource === 'companies' || p.resource === 'branches' || p.resource === 'company_users' ||
        p.resource === 'policies' || p.resource === 'enterprise_search'
      );
      for (const p of empPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Employee'], p.id]
        );
      }
    }

    // Auditor: companies, compliance_frameworks, compliance_requirements, compliance_audits, risk_assessments, policies
    if (roleMap['Auditor']) {
      const audPerms = allPerms.rows.filter(p =>
        p.resource === 'companies' || p.resource === 'compliance_frameworks' ||
        p.resource === 'compliance_requirements' || p.resource === 'compliance_audits' ||
        p.resource === 'risk_assessments' || p.resource === 'policies'
      );
      for (const p of audPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Auditor'], p.id]
        );
      }
    }

    // --- Sample Company ---
    const adminUser = await client.query(
      `SELECT id FROM users WHERE email = 'admin@erp.com'`
    );
    const adminUserId = adminUser.rows[0]?.id;

    const empProfile = await client.query(
      `SELECT id FROM employee_profiles WHERE user_id = $1 LIMIT 1`,
      [adminUserId]
    );
    const empId = empProfile.rows[0]?.id;

    await client.query(
      `INSERT INTO companies (company_name, company_code, is_active, address, phone, email, city, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (company_code) DO NOTHING`,
      ['ERP Solutions Ltd', 'ERP-001', true, '123 Business Park', '+254700100200', 'info@erpsolutions.com', 'Nairobi', 'Kenya']
    );

    const company = await client.query(
      `SELECT id FROM companies WHERE company_code = 'ERP-001'`
    );
    const companyId = company.rows[0]?.id;

    // --- Sample Branches ---
    const branches = [
      { branch_name: 'HQ Nairobi', branch_code: 'NBO-HQ', city: 'Nairobi', phone: '+254700100201' },
      { branch_name: 'Mombasa Office', branch_code: 'MSA-OFF', city: 'Mombasa', phone: '+254700100202' },
      { branch_name: 'Kisumu Depot', branch_code: 'KSM-DEP', city: 'Kisumu', phone: '+254700100203' },
    ];

    for (const b of branches) {
      await client.query(
        `INSERT INTO branches (company_id, branch_name, branch_code, city, phone, is_active)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (company_id, branch_code) DO NOTHING`,
        [companyId, b.branch_name, b.branch_code, b.city, b.phone, true]
      );
    }

    // --- Sample Compliance Frameworks ---
    await client.query(
      `INSERT INTO compliance_frameworks (company_id, name, code, description, category, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [companyId, 'ISO 27001', 'ISO_27001', 'IT Security Management System', 'security', true]
    );

    await client.query(
      `INSERT INTO compliance_frameworks (company_id, name, code, description, category, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [companyId, 'KRA Tax Compliance', 'KRA_TAX', 'Kenya Revenue Authority Tax Compliance Framework', 'tax', true]
    );

    const frameworks = await client.query(
      `SELECT id, name FROM compliance_frameworks WHERE company_id = $1 AND name IN ('ISO 27001', 'KRA Tax Compliance')`,
      [companyId]
    );
    const frameworkMap = {};
    for (const f of frameworks.rows) frameworkMap[f.name] = f.id;

    // --- Sample Compliance Requirements ---
    const isoRequirements = [
      { requirement_code: 'A.5', title: 'Information Security Policies', description: 'Policies for information security management' },
      { requirement_code: 'A.6', title: 'Organization of Information Security', description: 'Internal organization and mobile device policy' },
      { requirement_code: 'A.9', title: 'Access Control', description: 'Access control policy and user access management' },
      { requirement_code: 'A.12', title: 'Operations Security', description: 'Operational procedures and protection from malware' },
      { requirement_code: 'A.16', title: 'Incident Management', description: 'Information security incident management' },
    ];

    for (const r of isoRequirements) {
      await client.query(
        `INSERT INTO compliance_requirements (framework_id, requirement_code, title, description, status, risk_level)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [frameworkMap['ISO 27001'], r.requirement_code, r.title, r.description, 'pending', 'medium']
      );
    }

    const kraRequirements = [
      { requirement_code: 'VAT-01', title: 'VAT Registration and Filing', description: 'Monthly VAT returns and compliance' },
      { requirement_code: 'PAYE-01', title: 'Payroll Tax (PAYE) Deductions', description: 'Monthly PAYE remittance and filing' },
      { requirement_code: 'CIT-01', title: 'Corporate Income Tax Filing', description: 'Annual corporate tax returns' },
    ];

    for (const r of kraRequirements) {
      await client.query(
        `INSERT INTO compliance_requirements (framework_id, requirement_code, title, description, status, risk_level)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [frameworkMap['KRA Tax Compliance'], r.requirement_code, r.title, r.description, 'in_progress', 'high']
      );
    }

    // --- Sample Compliance Audit ---
    await client.query(
      `INSERT INTO compliance_audits (company_id, framework_id, title, audit_type, status, audit_date, auditor_name, findings, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
      [companyId, frameworkMap['ISO 27001'], 'ISO 27001 Internal Audit Q2 2026', 'internal', 'in_progress', new Date().toISOString().split('T')[0], 'Internal Audit Team', 'Initial assessment in progress', empId]
    );

    // --- Sample AI Analytics ---
    await client.query(
      `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, severity, result_data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
      [companyId, 'anomaly_detection', 'procurement', 'Transaction Anomaly Scan', 'Scans recent transactions for unusual patterns indicating fraud or error', 'warning', '{}', new Date()]
    );

    await client.query(
      `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, severity, result_data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
      [companyId, 'prediction', 'finance', 'Cash Flow Prediction', 'Predicts future cash flow based on historical data and trends', 'info', '{}', new Date()]
    );

    // --- Sample AI Models ---
    await client.query(
      `INSERT INTO ai_models (company_id, name, model_type, target_variable, parameters, training_status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
      [companyId, 'Revenue Forecast Model', 'forecast', 'revenue', JSON.stringify({ algorithm: 'lstm', retrain_frequency: 'monthly' }), 'trained', true]
    );

    await client.query(
      `INSERT INTO ai_models (company_id, name, model_type, target_variable, parameters, training_status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
      [companyId, 'Maintenance Prediction Model', 'prediction', 'maintenance_due', JSON.stringify({ algorithm: 'random_forest', retrain_frequency: 'weekly' }), 'trained', true]
    );

    // --- Sample Workflow Definitions ---
    await client.query(
      `INSERT INTO workflow_definitions (company_id, name, description, category, trigger_type, steps, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
      [companyId, 'Leave Approval Workflow', 'Two-step leave approval process', 'leave', 'event', JSON.stringify([
        { step: 1, name: 'Manager Approval', assignee_role: 'Manager' },
        { step: 2, name: 'HR Approval', assignee_role: 'HR Officer' },
      ]), true, empId]
    );

    await client.query(
      `INSERT INTO workflow_definitions (company_id, name, description, category, trigger_type, steps, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
      [companyId, 'Purchase Order Approval', 'Single-step purchase order approval by manager', 'procurement', 'event', JSON.stringify([
        { step: 1, name: 'Manager Approval', assignee_role: 'Manager' },
      ]), true, empId]
    );

    // --- Sample Risk Assessments ---
    await client.query(
      `INSERT INTO risk_assessments (company_id, title, risk_type, probability, impact, risk_score, description, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
      [companyId, 'Operational Risk Assessment Q2 2026', 'operational', 'medium', 'major', 12, 'Assessment of operational risks including supply chain disruptions and system downtimes', 'assessed', empId]
    );

    await client.query(
      `INSERT INTO risk_assessments (company_id, title, risk_type, probability, impact, risk_score, description, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
      [companyId, 'IT Security Risk Assessment', 'security', 'low', 'severe', 10, 'Assessment of cybersecurity risks including data breaches and unauthorized access', 'assessed', empId]
    );

    // --- Sample Policies ---
    await client.query(
      `INSERT INTO policies (company_id, policy_code, title, category, content, version, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
      [companyId, 'IT-SEC-001', 'IT Security Policy', 'security', 'This policy defines the security requirements for all IT systems and data handling within the organization. All employees must comply with the security controls outlined herein.', 1, 'published', empId]
    );

    await client.query(
      `INSERT INTO policies (company_id, policy_code, title, category, content, version, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
      [companyId, 'HR-COD-001', 'Code of Conduct', 'hr', 'This code of conduct outlines the ethical standards and behavioral expectations for all employees, contractors, and stakeholders.', 1, 'published', empId]
    );

    // --- Policy Acknowledgment ---
    const policy = await client.query(
      `SELECT id FROM policies WHERE company_id = $1 AND policy_code = 'IT-SEC-001'`,
      [companyId]
    );
    const policyId = policy.rows[0]?.id;

    if (policyId && empId) {
      await client.query(
        `INSERT INTO policy_acknowledgements (policy_id, employee_id, acknowledged, acknowledged_at)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [policyId, empId, true, new Date()]
      );
    }

    // --- Sample Forecast Records ---
    await client.query(
      `INSERT INTO forecast_records (company_id, forecast_type, module, period, period_start, period_end, predicted_value, confidence_lower, confidence_upper)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
      [companyId, 'revenue', 'finance', 'quarterly', '2026-07-01', '2026-09-30', 50000000, 45000000, 55000000]
    );

    await client.query(
      `INSERT INTO forecast_records (company_id, forecast_type, module, period, period_start, period_end, predicted_value, confidence_lower, confidence_upper)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
      [companyId, 'expense', 'finance', 'quarterly', '2026-07-01', '2026-09-30', 35000000, 32000000, 38000000]
    );

    // --- Sample API Gateway Key ---
    const crypto = require('crypto');
    await client.query(
      `INSERT INTO api_gateway_keys (company_id, name, api_key, permissions, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [companyId, 'Integration Test Key', 'epk_test_' + crypto.randomBytes(16).toString('hex'), JSON.stringify(['read:companies', 'read:branches']), true, adminUserId]
    );

    // --- Sample Data Governance Rules ---
    await client.query(
      `INSERT INTO data_governance (company_id, entity_type, retention_days, archive_after_days, purge_after_days, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (company_id, entity_type) DO NOTHING`,
      [companyId, 'employee_records', 2555, 1825, 3650, true, adminUserId]
    );

    await client.query(
      `INSERT INTO data_governance (company_id, entity_type, retention_days, archive_after_days, purge_after_days, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (company_id, entity_type) DO NOTHING`,
      [companyId, 'financial_records', 3650, 3650, 7300, true, adminUserId]
    );

    // --- Sample Notification Orchestration Rules ---
    await client.query(
      `INSERT INTO notification_orchestrator (company_id, name, trigger_event, priority, channels, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [companyId, 'Compliance Alert Notification', 'compliance_alert', 'high', '{in_app,email}', true]
    );

    await client.query(
      `INSERT INTO notification_orchestrator (company_id, name, trigger_event, priority, channels, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [companyId, 'Anomaly Detection Alert', 'anomaly_detected', 'critical', '{in_app,email,sms}', true]
    );

    console.log('Enterprise seed data completed successfully.');
    await client.query('COMMIT');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Enterprise seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedEnterprise();
