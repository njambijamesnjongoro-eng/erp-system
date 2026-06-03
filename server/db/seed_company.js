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

    const finRes = ['employees:read', 'reports:read', 'reports:export'];
    for (const key of finRes) {
      if (permissionIds[key]) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleIds['Finance Officer'], permissionIds[key]]
        );
      }
    }

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

    const passwordHash = await bcrypt.hash('Admin@123456', 12);
    const year = new Date().getFullYear();

    const users = [
      { email: 'admin@erp.com', role: 'System Admin', name: 'System Administrator', dept: 'Information Technology', gender: 'Male', pos: 'System Administrator', empId: `${year}-IT-0001` },
      { email: 'ceo@erp.com', role: 'CEO', name: 'Alexander Sterling', dept: 'Executive', gender: 'Male', pos: 'Chief Executive Officer', empId: `${year}-EXEC-0001` },
      { email: 'hr@erp.com', role: 'HR Officer', name: 'Sarah Johnson', dept: 'Human Resources', gender: 'Female', pos: 'HR Manager', empId: `${year}-HR-0001` },
      { email: 'hr.assistant@erp.com', role: 'HR Officer', name: 'Emily Davis', dept: 'Human Resources', gender: 'Female', pos: 'HR Assistant', empId: `${year}-HR-0002` },
      { email: 'manager@erp.com', role: 'Manager', name: 'Michael Chen', dept: 'Information Technology', gender: 'Male', pos: 'IT Manager', empId: `${year}-IT-0002` },
      { email: 'finance@erp.com', role: 'Finance Officer', name: 'Robert Martinez', dept: 'Finance', gender: 'Male', pos: 'Finance Manager', empId: `${year}-FIN-0001` },
      { email: 'finance.analyst@erp.com', role: 'Finance Officer', name: 'Lisa Wang', dept: 'Finance', gender: 'Female', pos: 'Financial Analyst', empId: `${year}-FIN-0002` },
      { email: 'ops.manager@erp.com', role: 'Manager', name: 'David Thompson', dept: 'Operations', gender: 'Male', pos: 'Operations Manager', empId: `${year}-OPS-0001` },
      { email: 'procurement@erp.com', role: 'Procurement Officer', name: 'Nancy Garcia', dept: 'Procurement', gender: 'Female', pos: 'Procurement Manager', empId: `${year}-PROC-0001` },
      { email: 'assets@erp.com', role: 'Asset Manager', name: 'Kevin Brown', dept: 'Asset Management', gender: 'Male', pos: 'Asset Manager', empId: `${year}-AST-0001` },
      { email: 'compliance@erp.com', role: 'Auditor', name: 'Rachel Green', dept: 'Compliance', gender: 'Female', pos: 'Compliance Officer', empId: `${year}-COMP-0001` },
      { email: 'sales.manager@erp.com', role: 'Manager', name: 'Daniel Kim', dept: 'Sales', gender: 'Male', pos: 'Sales Manager', empId: `${year}-SALES-0001` },
      { email: 'eng.manager@erp.com', role: 'Manager', name: 'Amanda Lee', dept: 'Engineering', gender: 'Female', pos: 'Engineering Manager', empId: `${year}-ENG-0001` },
      { email: 'employee@erp.com', role: 'Employee', name: 'James Wilson', dept: 'Engineering', gender: 'Male', pos: 'Software Engineer', empId: `${year}-ENG-0002` },
      { email: 'employee2@erp.com', role: 'Employee', name: 'Sophia Turner', dept: 'Engineering', gender: 'Female', pos: 'Junior Developer', empId: `${year}-ENG-0003` },
      { email: 'employee3@erp.com', role: 'Employee', name: 'Oliver Martinez', dept: 'Sales', gender: 'Male', pos: 'Sales Representative', empId: `${year}-SALES-0002` },
      { email: 'employee4@erp.com', role: 'Employee', name: 'Isabella Anderson', dept: 'Customer Support', gender: 'Female', pos: 'Support Agent', empId: `${year}-CS-0001` },
      { email: 'employee5@erp.com', role: 'Employee', name: 'Ethan Taylor', dept: 'Operations', gender: 'Male', pos: 'Operations Associate', empId: `${year}-OPS-0002` },
    ];

    for (const u of users) {
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, is_active, role_id) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id`,
        [u.email, passwordHash, true, roleIds[u.role]]
      );
      if (userRes.rows.length > 0) {
        const userId = userRes.rows[0].id;
        await client.query(
          `INSERT INTO employee_profiles (employee_id, user_id, full_name, email, gender, department_id, position, employment_type, employment_status, date_hired)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING`,
          [u.empId, userId, u.name, u.email, u.gender, deptIds[u.dept], u.pos, 'full_time', 'active', new Date()]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Seed completed successfully.');
    console.log('');
    console.log('All accounts use password: Admin@123456');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  admin@erp.com          (System Admin)');
    console.log('  ceo@erp.com            (CEO)');
    console.log('  hr@erp.com             (HR Officer)');
    console.log('  hr.assistant@erp.com   (HR Officer)');
    console.log('  manager@erp.com        (IT Manager)');
    console.log('  finance@erp.com        (Finance Officer)');
    console.log('  finance.analyst@erp.com(Finance Officer)');
    console.log('  ops.manager@erp.com    (Operations Manager)');
    console.log('  procurement@erp.com    (Procurement Officer)');
    console.log('  assets@erp.com         (Asset Manager)');
    console.log('  compliance@erp.com     (Auditor)');
    console.log('  sales.manager@erp.com  (Sales Manager)');
    console.log('  eng.manager@erp.com    (Engineering Manager)');
    console.log('  employee@erp.com       (Employee)');
    console.log('  employee2@erp.com      (Employee)');
    console.log('  employee3@erp.com      (Employee)');
    console.log('  employee4@erp.com      (Employee)');
    console.log('  employee5@erp.com      (Employee)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
