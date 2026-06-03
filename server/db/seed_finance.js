const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'erp_system',
});

async function seedFinance() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Permissions ---
    const financeResources = [
      'payroll', 'payslips', 'salary_structures', 'taxes', 'expenses',
      'budgets', 'loans', 'debt', 'insurance_payments', 'accounts',
      'transactions', 'invoices', 'reports', 'finance_dashboard'
    ];
    const actions = ['create', 'read', 'update', 'delete', 'approve', 'export'];

    for (const resource of financeResources) {
      for (const action of actions) {
        await client.query(
          `INSERT INTO permissions (resource, action) VALUES ($1, $2) ON CONFLICT (resource, action) DO NOTHING`,
          [resource, action]
        );
      }
    }

    // --- Assign finance permissions ---
    const allPerms = await client.query(
      `SELECT p.id, p.resource, p.action FROM permissions p WHERE p.resource = ANY($1)`,
      [financeResources]
    );

    const roles = await client.query('SELECT id, name FROM roles');
    const roleMap = {};
    for (const r of roles.rows) roleMap[r.name] = r.id;

    // Full finance access for System Admin, CEO, Finance Officer
    const fullFinanceRoles = ['System Admin', 'CEO', 'Finance Officer'];
    for (const perm of allPerms.rows) {
      for (const roleName of fullFinanceRoles) {
        if (roleMap[roleName]) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [roleMap[roleName], perm.id]
          );
        }
      }
    }

    // HR: read-only payroll
    const hrReadOnly = ['payroll:read', 'payslips:read', 'reports:read'];
    for (const key of hrReadOnly) {
      const [res, act] = key.split(':');
      const p = allPerms.rows.find(x => x.resource === res && x.action === act);
      if (p && roleMap['HR Officer']) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['HR Officer'], p.id]
        );
      }
    }

    // Manager: read budgets
    if (roleMap['Manager']) {
      const mgrPerms = allPerms.rows.filter(p => (p.resource === 'budgets' || p.resource === 'reports') && p.action === 'read');
      for (const p of mgrPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Manager'], p.id]
        );
      }
    }

    // Employee: read own payslip
    if (roleMap['Employee']) {
      const empPerm = allPerms.rows.find(p => p.resource === 'payslips' && p.action === 'read');
      if (empPerm) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Employee'], empPerm.id]
        );
      }
    }

    // --- Chart of Accounts ---
    const accounts = [
      { code: '1000', name: 'Cash', type: 'asset', category: 'Current Assets' },
      { code: '1100', name: 'Bank Accounts', type: 'asset', category: 'Current Assets' },
      { code: '1200', name: 'Accounts Receivable', type: 'asset', category: 'Current Assets' },
      { code: '1300', name: 'Inventory', type: 'asset', category: 'Current Assets' },
      { code: '1400', name: 'Fixed Assets', type: 'asset', category: 'Non-Current Assets' },
      { code: '1500', name: 'Prepaid Expenses', type: 'asset', category: 'Current Assets' },
      { code: '2000', name: 'Accounts Payable', type: 'liability', category: 'Current Liabilities' },
      { code: '2100', name: 'Loans Payable', type: 'liability', category: 'Non-Current Liabilities' },
      { code: '2200', name: 'Tax Payable', type: 'liability', category: 'Current Liabilities' },
      { code: '2300', name: 'Accrued Expenses', type: 'liability', category: 'Current Liabilities' },
      { code: '3000', name: 'Share Capital', type: 'equity', category: "Owner's Equity" },
      { code: '3100', name: 'Retained Earnings', type: 'equity', category: "Owner's Equity" },
      { code: '4000', name: 'Revenue', type: 'income', category: 'Operating Income' },
      { code: '4100', name: 'Other Income', type: 'income', category: 'Non-Operating Income' },
      { code: '5000', name: 'Salaries & Wages', type: 'expense', category: 'Operating Expenses' },
      { code: '5100', name: 'Rent & Utilities', type: 'expense', category: 'Operating Expenses' },
      { code: '5200', name: 'Office Expenses', type: 'expense', category: 'Operating Expenses' },
      { code: '5300', name: 'Travel & Transport', type: 'expense', category: 'Operating Expenses' },
      { code: '5400', name: 'Insurance', type: 'expense', category: 'Operating Expenses' },
      { code: '5500', name: 'Tax Expenses', type: 'expense', category: 'Operating Expenses' },
      { code: '5600', name: 'Depreciation', type: 'expense', category: 'Operating Expenses' },
      { code: '5700', name: 'Loan Interest', type: 'expense', category: 'Finance Costs' },
    ];
    for (const a of accounts) {
      await client.query(
        `INSERT INTO chart_of_accounts (account_code, account_name, account_type, category) VALUES ($1,$2,$3,$4) ON CONFLICT (account_code) DO NOTHING`,
        [a.code, a.name, a.type, a.category]
      );
    }

    console.log('Finance seed completed successfully.');
    await client.query('COMMIT');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Finance seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedFinance();
