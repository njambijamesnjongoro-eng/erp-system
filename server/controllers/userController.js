const { pool } = require('../config/db');
const { NotFoundError } = require('../utils/errors');
const { sanitizeUser, paginate, buildPaginationMeta } = require('../utils/helpers');
const authService = require('../services/authService');

const list = async (req, res, next) => {
  try {
    const { offset, limit, page } = paginate(req.query.page, req.query.limit);
    const { search, roleId, isActive } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      where += ` AND (u.email ILIKE $${paramIndex} OR ep.full_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (roleId) {
      where += ` AND u.role_id = $${paramIndex}`;
      params.push(roleId);
      paramIndex++;
    }
    if (isActive !== undefined) {
      where += ` AND u.is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u LEFT JOIN employee_profiles ep ON ep.user_id = u.id ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await pool.query(
      `SELECT u.id, u.email, u.is_active, u.is_locked, u.last_login, u.created_at,
              r.name as role_name,
              ep.employee_id, ep.full_name, ep.department_id, ep.position,
              d.name as department_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       LEFT JOIN departments d ON ep.department_id = d.id
       ${where}
       ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.is_active, u.is_locked, u.last_login, u.created_at, u.updated_at,
              r.id as role_id, r.name as role_name,
              ep.employee_id, ep.full_name, ep.phone, ep.department_id, ep.position,
              ep.passport_photo, ep.employment_status, ep.date_hired, ep.date_of_birth,
              ep.address, ep.emergency_contact_name, ep.emergency_contact_phone,
              d.name as department_name, d.code as department_code
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       LEFT JOIN departments d ON ep.department_id = d.id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { roleId, isActive } = req.body;
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (roleId !== undefined) {
      updates.push(`role_id = $${idx++}`);
      params.push(roleId);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${idx++}`);
      params.push(isActive);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);
      await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
        params
      );
    }

    if (req.body.roleId) {
      await authService.logAudit(req.user.id, 'UPDATE_USER_ROLE', 'users', id,
        { newRoleId: roleId }, req.ip);
    }

    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    next(err);
  }
};

const toggleActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE users SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, email, is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }
    await authService.logAudit(req.user.id, 'TOGGLE_USER_ACTIVE', 'users', id,
      { isActive: result.rows[0].is_active }, req.ip);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, update, toggleActive };
