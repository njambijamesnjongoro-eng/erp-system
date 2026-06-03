const { pool } = require('../config/db');
const { NotFoundError, BadRequestError } = require('../utils/errors');

const getTasks = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const result = await pool.query(
      `SELECT ot.*, a_ep.full_name as assigned_to_name
       FROM onboarding_tasks ot
       LEFT JOIN employee_profiles a_ep ON ot.assigned_to = a_ep.id
       WHERE ot.employee_id = $1 ORDER BY ot.due_date`, [employeeId]);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const createTask = async (req, res, next) => {
  try {
    const { employeeId, taskName, assignedTo, dueDate, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO onboarding_tasks (employee_id, task_name, assigned_to, due_date, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [employeeId, taskName, assignedTo, dueDate, notes]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const completeTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE onboarding_tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]);
    if (result.rows.length === 0) throw new NotFoundError('Task not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const removeTask = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM onboarding_tasks WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) throw new NotFoundError('Task not found');
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) { next(err); }
};

module.exports = { getTasks, createTask, completeTask, removeTask };
