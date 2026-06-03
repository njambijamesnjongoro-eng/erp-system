const { pool } = require('../config/db');
const { NotFoundError } = require('../utils/errors');

const list = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT d.*, (SELECT COUNT(*) FROM employee_profiles WHERE department_id = d.id) as employee_count
       FROM departments d ORDER BY d.name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM departments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) throw new NotFoundError('Department not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    const result = await pool.query(
      'INSERT INTO departments (name, code, description) VALUES ($1, $2, $3) RETURNING *',
      [name, code.toUpperCase(), description]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { name, code, description, isActive } = req.body;
    const result = await pool.query(
      `UPDATE departments SET name = COALESCE($1, name), code = COALESCE($2, code),
       description = COALESCE($3, description), is_active = COALESCE($4, is_active),
       updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *`,
      [name, code?.toUpperCase(), description, isActive, req.params.id]
    );
    if (result.rows.length === 0) throw new NotFoundError('Department not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) throw new NotFoundError('Department not found');
    res.json({ success: true, message: 'Department deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove };
