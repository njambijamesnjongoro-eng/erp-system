const { Pool } = require('pg');
const { getPoolConfig } = require('../config/poolConfig');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool(getPoolConfig());

async function seedAssets() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Asset permissions
    const assetResources = ['assets', 'asset_categories', 'asset_assignments', 'asset_transfers',
      'fleet_vehicles', 'fuel_logs', 'trip_logs', 'maintenance', 'asset_insurance',
      'insurance_claims', 'depreciation', 'asset_disposal', 'spare_parts', 'vendors',
      'asset_documents', 'asset_reports', 'asset_dashboard', 'stock_movements'
    ];
    const actions = ['create', 'read', 'update', 'delete', 'approve', 'export'];

    for (const resource of assetResources) {
      for (const action of actions) {
        await client.query(
          `INSERT INTO permissions (resource, action) VALUES ($1, $2) ON CONFLICT (resource, action) DO NOTHING`,
          [resource, action]
        );
      }
    }

    const allPerms = await client.query(
      `SELECT p.id, p.resource, p.action FROM permissions p WHERE p.resource = ANY($1)`,
      [assetResources]
    );

    const roles = await client.query('SELECT id, name FROM roles');
    const roleMap = {};
    for (const r of roles.rows) roleMap[r.name] = r.id;

    // Full access for System Admin, CEO, Asset Manager
    const fullRoles = ['System Admin', 'CEO', 'Asset Manager'];
    for (const perm of allPerms.rows) {
      for (const roleName of fullRoles) {
        if (roleMap[roleName]) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [roleMap[roleName], perm.id]
          );
        }
      }
    }

    // Fleet Manager: fleet + maintenance + fuel
    if (roleMap['Procurement Officer']) {
      const fleetPerms = allPerms.rows.filter(p =>
        ['fleet_vehicles', 'fuel_logs', 'trip_logs', 'maintenance', 'vendors', 'spare_parts'].includes(p.resource)
      );
      for (const p of fleetPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Procurement Officer'], p.id]
        );
      }
    }

    // Finance Officer: depreciation + asset_reports read
    if (roleMap['Finance Officer']) {
      const finPerms = allPerms.rows.filter(p =>
        ['depreciation', 'asset_reports', 'asset_dashboard'].includes(p.resource) && (p.action === 'read' || p.action === 'export')
      );
      for (const p of finPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Finance Officer'], p.id]
        );
      }
    }

    // Employee: read own assigned assets
    if (roleMap['Employee']) {
      const empPerms = allPerms.rows.filter(p =>
        p.resource === 'assets' && p.action === 'read'
      );
      for (const p of empPerms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['Employee'], p.id]
        );
      }
    }

    // Asset Categories
    const categories = [
      { name: 'Vehicles', code: 'VEH', desc: 'Company vehicles and fleet', method: 'declining_balance', life: 8 },
      { name: 'ICT Equipment', code: 'ICT', desc: 'Computers, servers, networking', method: 'straight_line', life: 3 },
      { name: 'Buildings', code: 'BLD', desc: 'Office buildings and facilities', method: 'straight_line', life: 30 },
      { name: 'Furniture', code: 'FUR', desc: 'Office furniture and fixtures', method: 'straight_line', life: 7 },
      { name: 'Machinery', code: 'MCH', desc: 'Industrial machinery and equipment', method: 'declining_balance', life: 10 },
      { name: 'Office Equipment', code: 'OFF', desc: 'Printers, scanners, projectors', method: 'straight_line', life: 5 },
      { name: 'Generators', code: 'GEN', desc: 'Power generators and UPS', method: 'declining_balance', life: 10 },
      { name: 'Tools', code: 'TOL', desc: 'Company tools and instruments', method: 'straight_line', life: 5 },
    ];
    for (const c of categories) {
      await client.query(
        `INSERT INTO asset_categories (category_name, category_code, description, default_depreciation_method, default_useful_life_years) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (category_name) DO NOTHING`,
        [c.name, c.code, c.desc, c.method, c.life]
      );
    }

    // Vendors
    const vendors = [
      { code: 'V001', name: 'Toyota Kenya Ltd', contact: 'James Mwangi', email: 'james@toyotakenya.co.ke', phone: '+254 712 345 678', city: 'Nairobi' },
      { code: 'V002', name: 'HP East Africa', contact: 'Sarah Wanjiku', email: 'sarah@hp.com', phone: '+254 722 345 678', city: 'Nairobi' },
      { code: 'V003', name: 'Siemens Kenya', contact: 'Peter Kamau', email: 'peter@siemens.co.ke', phone: '+254 732 345 678', city: 'Nairobi', services: 'Industrial equipment' },
      { code: 'V004', name: 'Office Masters Ltd', contact: 'Grace Achieng', email: 'grace@officemasters.co.ke', phone: '+254 742 345 678', city: 'Nairobi', services: 'Office furniture and supplies' },
      { code: 'V005', name: 'Cummins Generators', contact: 'David Ochieng', email: 'david@cummins.co.ke', phone: '+254 752 345 678', city: 'Mombasa', services: 'Generator sales and service' },
      { code: 'V006', name: 'Total Energies', contact: 'Station Manager', email: 'station@total.co.ke', phone: '+254 762 345 678', city: 'Nairobi', services: 'Fuel supply' },
      { code: 'V007', name: 'Honda Kenya', contact: 'Michael Njenga', email: 'michael@honda.co.ke', phone: '+254 772 345 678', city: 'Nairobi' },
      { code: 'V008', name: 'Dell Technologies', contact: 'Nancy Muthoni', email: 'nancy@dell.com', phone: '+254 782 345 678', city: 'Nairobi', services: 'ICT equipment' },
    ];
    for (const v of vendors) {
      await client.query(
        `INSERT INTO vendors (vendor_code, vendor_name, contact_person, email, phone, city, services) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (vendor_code) DO NOTHING`,
        [v.code, v.name, v.contact, v.email, v.phone, v.city, v.services || null]
      );
    }

    console.log('Asset seed data completed successfully.');
    await client.query('COMMIT');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Asset seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedAssets();
