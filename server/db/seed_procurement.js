const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'erp_system',
});

async function seedProcurement() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Permissions ---
const resources = [
  'procurement_requests', 'procurement_approvals', 'procurement_categories',
  'procurement_suppliers', 'supplier_contracts', 'supplier_performance',
  'purchase_orders', 'purchase_order_items', 'warehouses', 'warehouse_bins',
  'inventory_items', 'inventory_categories', 'procurement_stock_movements',
  'goods_received_notes', 'delivery_discrepancies', 'inventory_audits',
  'inventory_adjustments', 'procurement_budgets', 'procurement_reports',
  'procurement_dashboard'
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

    // System Admin & CEO: full access
    for (const perm of allPerms.rows) {
      for (const roleName of ['System Admin', 'CEO']) {
        if (roleMap[roleName]) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [roleMap[roleName], perm.id]
          );
        }
      }
    }

    // Procurement Officer: full procurement + inventory access
    if (roleMap['Procurement Officer']) {
      const poPerms = allPerms.rows.filter(p =>
        !['procurement_budgets'].includes(p.resource)
      );
      for (const p of poPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Procurement Officer'], p.id]
        );
      }
    }

    // Finance Officer: budgets + reports + read-only procurement
    if (roleMap['Finance Officer']) {
      const finPerms = allPerms.rows.filter(p =>
        (['procurement_budgets', 'procurement_reports', 'procurement_dashboard'].includes(p.resource)) ||
        (p.resource === 'procurement_requests' && p.action === 'read') ||
        (p.resource === 'procurement_approvals' && (p.action === 'read' || p.action === 'approve'))
      );
      for (const p of finPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Finance Officer'], p.id]
        );
      }
    }

    // Manager: create/read requests, read reports, approve
    if (roleMap['Manager']) {
      const mgrResPerms = allPerms.rows.filter(p =>
        (p.resource === 'procurement_requests' && ['create', 'read', 'update'].includes(p.action)) ||
        (p.resource === 'procurement_approvals' && (p.action === 'read' || p.action === 'approve')) ||
        (p.resource === 'procurement_reports' && p.action === 'read') ||
        (p.resource === 'procurement_dashboard' && p.action === 'read')
      );
      for (const p of mgrResPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Manager'], p.id]
        );
      }
    }

    // Employee: create/read own requests
    if (roleMap['Employee']) {
      const empPerms = allPerms.rows.filter(p =>
        (p.resource === 'procurement_requests' && ['create', 'read'].includes(p.action))
      );
      for (const p of empPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Employee'], p.id]
        );
      }
    }

    // Asset Manager: read-only inventory (for spare parts linkage)
    if (roleMap['Asset Manager']) {
      const assetMgrPerms = allPerms.rows.filter(p =>
        (['inventory_items', 'inventory_categories', 'warehouses', 'procurement_stock_movements'].includes(p.resource) && p.action === 'read') ||
        (p.resource === 'procurement_dashboard' && p.action === 'read')
      );
      for (const p of assetMgrPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Asset Manager'], p.id]
        );
      }
    }

    // --- Procurement Categories ---
    const procCategories = [
      { name: 'Office Supplies', code: 'OFF', desc: 'Stationery, printing materials, office consumables' },
      { name: 'ICT Equipment', code: 'ICT', desc: 'Computers, accessories, software, networking' },
      { name: 'Furniture & Fixtures', code: 'FUR', desc: 'Office furniture, chairs, desks, cabinets' },
      { name: 'Maintenance & Repairs', code: 'MNT', desc: 'Building maintenance, equipment repairs' },
      { name: 'Professional Services', code: 'SVC', desc: 'Consulting, legal, audit, training services' },
      { name: 'Cleaning & Janitorial', code: 'CLN', desc: 'Cleaning supplies, equipment, services' },
      { name: 'Kitchen & Catering', code: 'KIT', desc: 'Kitchen supplies, beverage, catering services' },
      { name: 'Safety & Security', code: 'SAF', desc: 'Safety equipment, security systems, PPE' },
      { name: 'Transport & Logistics', code: 'TRN', desc: 'Vehicle parts, fuel, logistics services' },
      { name: 'Printing & Branding', code: 'PRN', desc: 'Printing services, branding materials, signage' },
    ];
    for (const c of procCategories) {
      await client.query(
        `INSERT INTO procurement_categories (category_name, category_code, description) VALUES ($1,$2,$3) ON CONFLICT (category_name) DO NOTHING`,
        [c.name, c.code, c.desc]
      );
    }

    // --- Inventory Categories ---
    const invCategories = [
      { name: 'Stationery', code: 'STN', desc: 'Paper, pens, envelopes, folders' },
      { name: 'Printing Supplies', code: 'PRT', desc: 'Toner, ink, drums, ribbons' },
      { name: 'Cleaning Materials', code: 'CLM', desc: 'Detergents, gloves, mops, buckets' },
      { name: 'ICT Consumables', code: 'ICT', desc: 'Cables, connectors, mice, keyboards' },
      { name: 'Kitchen Supplies', code: 'KIT', desc: 'Coffee, sugar, tea, cups, utensils' },
      { name: 'Safety Equipment', code: 'SAF', desc: 'PPE, helmets, gloves, goggles' },
      { name: 'Maintenance Tools', code: 'MTL', desc: 'Tools, hardware, spare parts' },
      { name: 'Furniture & Fixtures', code: 'FUR', desc: 'Desks, chairs, shelves, cabinets' },
    ];
    for (const c of invCategories) {
      await client.query(
        `INSERT INTO inventory_categories (category_name, category_code, description) VALUES ($1,$2,$3) ON CONFLICT (category_name) DO NOTHING`,
        [c.name, c.code, c.desc]
      );
    }

    // --- Procurement Suppliers ---
    const suppliers = [
      { code: 'PS001', name: 'Stationery World Ltd', contact: 'John Kamau', email: 'john@stationeryworld.co.ke', phone: '+254 711 100 001', city: 'Nairobi', category: 'Office Supplies' },
      { code: 'PS002', name: 'Tech Solutions EA', contact: 'Jane Wanjiku', email: 'jane@techsolutions.co.ke', phone: '+254 711 100 002', city: 'Nairobi', category: 'ICT Equipment' },
      { code: 'PS003', name: 'Furniture Mart Kenya', contact: 'Peter Otieno', email: 'peter@furnituremart.co.ke', phone: '+254 711 100 003', city: 'Nairobi', category: 'Furniture' },
      { code: 'PS004', name: 'CleanPro Services', contact: 'Grace Muthoni', email: 'grace@cleanpro.co.ke', phone: '+254 711 100 004', city: 'Mombasa', category: 'Cleaning' },
      { code: 'PS005', name: 'SafeGuard Security Ltd', contact: 'David Kiprop', email: 'david@safeguard.co.ke', phone: '+254 711 100 005', city: 'Nairobi', category: 'Security' },
      { code: 'PS006', name: 'KitchenCraft Supplies', contact: 'Mary Achieng', email: 'mary@kitchencraft.co.ke', phone: '+254 711 100 006', city: 'Kisumu', category: 'Catering' },
      { code: 'PS007', name: 'PrintMaster Kenya', contact: 'Samuel Njoroge', email: 'samuel@printmaster.co.ke', phone: '+254 711 100 007', city: 'Nairobi', category: 'Printing' },
      { code: 'PS008', name: 'BuildRight Hardware', contact: 'James Mwangi', email: 'james@buildright.co.ke', phone: '+254 711 100 008', city: 'Nairobi', category: 'Maintenance' },
    ];
    for (const s of suppliers) {
      await client.query(
        `INSERT INTO procurement_suppliers (supplier_code, supplier_name, contact_person, email, phone, city, supplier_category) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (supplier_code) DO NOTHING`,
        [s.code, s.name, s.contact, s.email, s.phone, s.city, s.category]
      );
    }

    // --- Warehouses ---
    const warehouses = [
      { code: 'WH-MAIN', name: 'Main Store', location: 'Nairobi HQ', city: 'Nairobi' },
      { code: 'WH-ICT', name: 'ICT Store', location: 'Nairobi HQ - Basement', city: 'Nairobi' },
      { code: 'WH-MSA', name: 'Mombasa Branch Store', location: 'Mombasa Office', city: 'Mombasa' },
    ];
    for (const w of warehouses) {
      await client.query(
        `INSERT INTO warehouses (warehouse_code, name, location, city) VALUES ($1,$2,$3,$4) ON CONFLICT (warehouse_code) DO NOTHING`,
        [w.code, w.name, w.location, w.city]
      );
    }

    // --- Sample Procurement Budgets for 2026 ---
    const depts = await client.query('SELECT id, name FROM departments LIMIT 5');
    if (depts.rows.length > 0) {
      const deptBudgets = depts.rows.map((d, i) => ({
        deptId: d.id,
        total: [5000000, 3000000, 2000000, 4000000, 2500000][i] || 2000000,
      }));
      for (const db of deptBudgets) {
        await client.query(
          `INSERT INTO procurement_budgets (department_id, fiscal_year, total_budget, allocated_amount, spent_amount, remaining_amount) VALUES ($1, 2026, $2, $2, 0, $2) ON CONFLICT DO NOTHING`,
          [db.deptId, db.total]
        );
      }
    }

    console.log('Procurement seed data completed successfully.');
    await client.query('COMMIT');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Procurement seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedProcurement();
