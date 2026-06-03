const { pool } = require('../config/db');

const list = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.*, (SELECT COUNT(*) FROM users WHERE role_id = r.id) as user_count
       FROM roles r ORDER BY r.name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const roleResult = await pool.query('SELECT * FROM roles WHERE id = $1', [req.params.id]);
    if (roleResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const permResult = await pool.query(
      `SELECT p.id, p.resource, p.action
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1
       ORDER BY p.resource, p.action`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: { ...roleResult.rows[0], permissions: permResult.rows },
    });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const result = await pool.query(
      'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const result = await pool.query(
      'UPDATE roles SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [name, description, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM roles WHERE id = $1 AND is_system = false RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete system roles or role not found' });
    }
    res.json({ success: true, message: 'Role deleted' });
  } catch (err) {
    next(err);
  }
};

const assignPermissions = async (req, res, next) => {
  try {
    const { permissionIds } = req.body;
    const { id } = req.params;

    await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

    if (permissionIds && permissionIds.length > 0) {
      const values = permissionIds.map((pid, i) => `($1, $${i + 2})`).join(', ');
      await pool.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`,
        [id, ...permissionIds]
      );
    }

    res.json({ success: true, message: 'Permissions updated' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove, assignPermissions };
