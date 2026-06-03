const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'erp_system',
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ----- ROLES -----
    const roles = [
      { name: 'System Admin', description: 'Full system access and configuration' },
      { name: 'CEO', description: 'Chief Executive Officer - full system access' },
      { name: 'Manager', description: 'Department manager with oversight' },
      { name: 'HR Officer', description: 'Human Resources management' },
      { name: 'Finance Officer', description: 'Financial operations and reporting' },
      { name: 'Asset Manager', description: 'Asset and inventory management' },
      { name: 'Procurement Officer', description: 'Procurement and vendor management' },
      { name: 'Employee', description: 'Standard employee access' },
      { name: 'Auditor', description: 'Audit and compliance access' },
    ];

    const roleIds = {};
    for (const role of roles) {
      const res = await client.query(
        `INSERT INTO roles (name, description, is_system) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET description = $2 RETURNING id`,
        [role.name, role.description, role.name === 'System Admin']
      );
      roleIds[role.name] = res.rows[0].id;
    }

    // ----- PERMISSIONS -----
    const coreResources = ['users', 'roles', 'permissions', 'departments', 'settings'];
    const hrResources = [
      'employees', 'attendance', 'leave', 'leave_types', 'leave_balances',
      'insurance', 'training', 'certifications', 'performance',
      'documents', 'onboarding', 'reports'
    ];
    const allResources = [...coreResources, ...hrResources];
    const actions = ['create', 'read', 'update', 'delete', 'approve', 'export'];

    const permissionIds = {};
    for (const resource of allResources) {
      for (const action of actions) {
        const res = await client.query(
          `INSERT INTO permissions (resource, action) VALUES ($1, $2) ON CONFLICT (resource, action) DO NOTHING RETURNING id`,
          [resource, action]
        );
        if (res.rows.length > 0) {
          permissionIds[`${resource}:${action}`] = res.rows[0].id;
        }
      }
    }

    const allPerms = await client.query('SELECT id FROM permissions');
    const allPermissionIds = allPerms.rows.map(r => r.id);

    // Full access for System Admin and CEO
    for (const pid of allPermissionIds) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [roleIds['System Admin'], pid]
      );
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [roleIds['CEO'], pid]
      );
    }

    // Manager permissions (department oversight)
    const mgrRes = ['employees', 'attendance', 'leave', 'performance', 'reports'];
    for (const r of mgrRes) {
      for (const a of ['read', 'update']) {
        if (permissionIds[`${r}:${a}`]) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [roleIds['Manager'], permissionIds[`${r}:${a}`]]
          );
        }
      }
    }
    if (permissionIds['leave:approve']) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [roleIds['Manager'], permissionIds['leave:approve']]
      );
    }

    // HR Officer permissions (full HR access)
    const hrRes = ['employees', 'attendance', 'leave', 'leave_types', 'leave_balances',
                   'insurance', 'training', 'certifications', 'performance',
                   'documents', 'onboarding', 'reports'];
    for (const r of hrRes) {
      for (const a of ['create', 'read', 'update', 'delete']) {
        if (permissionIds[`${r}:${a}`]) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [roleIds['HR Officer'], permissionIds[`${r}:${a}`]]
          );
        }
      }
    }
    if (permissionIds['leave:approve']) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [roleIds['HR Officer'], permissionIds['leave:approve']]
      );
    }

    // Employee self-service
    const empSelf = ['employees:read', 'attendance:read', 'leave:create', 'leave:read',
                     'training:read', 'certifications:read', 'documents:read',
                     'performance:read'];
    for (const key of empSelf) {
      if (permissionIds[key]) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleIds['Employee'], permissionIds[key]]
        );
      }
    }

    // Auditor
    const audRes = ['employees:read', 'attendance:read', 'leave:read', 'insurance:read',
                    'training:read', 'certifications:read', 'performance:read',
                    'documents:read', 'reports:read', 'reports:export'];
    for (const key of audRes) {
      if (permissionIds[key]) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleIds['Auditor'], permissionIds[key]]
        );
      }
    }

    // Finance Officer
    const finRes = ['employees:read', 'reports:read', 'reports:export'];
    for (const key of finRes) {
      if (permissionIds[key]) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleIds['Finance Officer'], permissionIds[key]]
        );
      }
    }

    // ----- DEPARTMENTS -----
    const departments = [
      { name: 'Executive', code: 'EXEC', description: 'Executive leadership' },
      { name: 'Human Resources', code: 'HR', description: 'Human resources management' },
      { name: 'Finance', code: 'FIN', description: 'Finance and accounting' },
      { name: 'Information Technology', code: 'IT', description: 'IT and systems' },
      { name: 'Operations', code: 'OPS', description: 'Operations management' },
      { name: 'Procurement', code: 'PROC', description: 'Procurement and supply chain' },
      { name: 'Asset Management', code: 'AST', description: 'Asset and inventory management' },
      { name: 'Compliance', code: 'COMP', description: 'Compliance and audit' },
      { name: 'Sales', code: 'SALES', description: 'Sales and marketing' },
      { name: 'Engineering', code: 'ENG', description: 'Engineering and development' },
      { name: 'Customer Support', code: 'CS', description: 'Customer support services' },
    ];

    const deptIds = {};
    for (const dept of departments) {
      const res = await client.query(
        `INSERT INTO departments (name, code, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET description = $3 RETURNING id`,
        [dept.name, dept.code, dept.description]
      );
      deptIds[dept.name] = res.rows[0].id;
    }

    // ----- LEAVE TYPES -----
    const leaveTypes = [
      { name: 'Annual Leave', code: 'ANNUAL', daysPerYear: 21, isPaid: true },
      { name: 'Sick Leave', code: 'SICK', daysPerYear: 15, isPaid: true },
      { name: 'Maternity Leave', code: 'MATERNITY', daysPerYear: 90, isPaid: true },
      { name: 'Paternity Leave', code: 'PATERNITY', daysPerYear: 14, isPaid: true },
      { name: 'Compassionate Leave', code: 'COMPASSION', daysPerYear: 5, isPaid: true },
      { name: 'Study Leave', code: 'STUDY', daysPerYear: 10, isPaid: false },
      { name: 'Unpaid Leave', code: 'UNPAID', daysPerYear: 30, isPaid: false },
      { name: 'Public Holiday', code: 'PUBLIC', daysPerYear: 12, isPaid: true },
    ];

    const leaveTypeIds = {};
    for (const lt of leaveTypes) {
      const res = await client.query(
        `INSERT INTO leave_types (name, code, days_per_year, is_paid) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING RETURNING id`,
        [lt.name, lt.code, lt.daysPerYear, lt.isPaid]
      );
      if (res.rows.length > 0) {
        leaveTypeIds[lt.name] = res.rows[0].id;
      }
    }

    // ----- SYSTEM ADMIN USER -----
    const passwordHash = await bcrypt.hash('Admin@123456', 12);

    const adminUser = await client.query(
      `INSERT INTO users (email, password_hash, is_active, role_id) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id`,
      ['admin@erp.com', passwordHash, true, roleIds['System Admin']]
    );

    if (adminUser.rows.length > 0) {
      const adminId = adminUser.rows[0].id;
      const year = new Date().getFullYear();
      await client.query(
        `INSERT INTO employee_profiles (employee_id, user_id, full_name, email, gender, department_id, position, employment_type, employment_status, date_hired)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING`,
        [`ERP-${year}-IT-0001`, adminId, 'System Administrator', 'admin@erp.com', 'Male',
         deptIds['Information Technology'], 'System Administrator', 'full_time', 'active', new Date()]
      );
    }

    // ----- HR OFFICER USER -----
    const hrPassword = await bcrypt.hash('Hr@123456', 12);
    const hrUser = await client.query(
      `INSERT INTO users (email, password_hash, is_active, role_id) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id`,
      ['hr@erp.com', hrPassword, true, roleIds['HR Officer']]
    );

    if (hrUser.rows.length > 0) {
      const hrId = hrUser.rows[0].id;
      const year = new Date().getFullYear();
      await client.query(
        `INSERT INTO employee_profiles (employee_id, user_id, full_name, email, gender, department_id, position, employment_type, employment_status, date_hired)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING`,
        [`ERP-${year}-HR-0001`, hrId, 'Sarah Johnson', 'hr@erp.com', 'Female',
         deptIds['Human Resources'], 'HR Manager', 'full_time', 'active', new Date()]
      );
    }

    // ----- MANAGER USER -----
    const mgrPassword = await bcrypt.hash('Manager@123456', 12);
    const mgrUser = await client.query(
      `INSERT INTO users (email, password_hash, is_active, role_id) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id`,
      ['manager@erp.com', mgrPassword, true, roleIds['Manager']]
    );

    if (mgrUser.rows.length > 0) {
      const mgrId = mgrUser.rows[0].id;
      const year = new Date().getFullYear();
      await client.query(
        `INSERT INTO employee_profiles (employee_id, user_id, full_name, email, gender, department_id, position, employment_type, employment_status, date_hired)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING`,
        [`ERP-${year}-IT-0002`, mgrId, 'Michael Chen', 'manager@erp.com', 'Male',
         deptIds['Information Technology'], 'IT Manager', 'full_time', 'active', new Date()]
      );
    }

    // ----- EMPLOYEE USER -----
    const empPassword = await bcrypt.hash('Employee@123456', 12);
    const empUser = await client.query(
      `INSERT INTO users (email, password_hash, is_active, role_id) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id`,
      ['employee@erp.com', empPassword, true, roleIds['Employee']]
    );

    if (empUser.rows.length > 0) {
      const empId = empUser.rows[0].id;
      const year = new Date().getFullYear();
      await client.query(
        `INSERT INTO employee_profiles (employee_id, user_id, full_name, email, gender, department_id, position, employment_type, employment_status, date_hired)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING`,
        [`ERP-${year}-ENG-0001`, empId, 'James Wilson', 'employee@erp.com', 'Male',
         deptIds['Engineering'], 'Software Engineer', 'full_time', 'active', new Date()]
      );
    }

    await client.query('COMMIT');
    console.log('Seed completed successfully.');
    console.log('Default logins:');
    console.log('  admin@erp.com    / Admin@123456     (System Admin)');
    console.log('  hr@erp.com       / Hr@123456        (HR Officer)');
    console.log('  manager@erp.com  / Manager@123456   (Manager)');
    console.log('  employee@erp.com / Employee@123456  (Employee)');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed();
