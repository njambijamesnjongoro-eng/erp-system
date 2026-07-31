const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { getPoolConfig } = require('../config/poolConfig');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool(getPoolConfig());

const ACTIONS = new Set(['create', 'read', 'update', 'delete', 'approve', 'export']);
const ADMIN_ROLES = ['System Admin', 'CEO'];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

function collectRoutePermissions() {
  const routesDir = path.join(__dirname, '..', 'routes');
  const permissions = new Map();
  const pattern = /authorize\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\)/g;

  for (const file of walk(routesDir)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(pattern)) {
      const [, resource, action] = match;
      if (ACTIONS.has(action)) {
        permissions.set(`${resource}:${action}`, { resource, action });
      }
    }
  }

  return [...permissions.values()].sort((a, b) =>
    `${a.resource}:${a.action}`.localeCompare(`${b.resource}:${b.action}`)
  );
}

async function seedModulePermissions() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const permissions = collectRoutePermissions();
    for (const permission of permissions) {
      await client.query(
        `INSERT INTO permissions (resource, action)
         VALUES ($1, $2)
         ON CONFLICT (resource, action) DO NOTHING`,
        [permission.resource, permission.action]
      );
    }

    const roles = await client.query(
      'SELECT id, name FROM roles WHERE name = ANY($1)',
      [ADMIN_ROLES]
    );

    for (const role of roles.rows) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, id FROM permissions
         ON CONFLICT DO NOTHING`,
        [role.id]
      );
    }

    await client.query('COMMIT');
    console.log(`Module permissions seeded: ${permissions.length} permissions, ${roles.rowCount} admin roles granted.`);
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Module permission seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedModulePermissions();
