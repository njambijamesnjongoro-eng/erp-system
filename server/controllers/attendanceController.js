const { pool } = require('../config/db');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { paginate, buildPaginationMeta } = require('../utils/helpers');

const list = async (req, res, next) => {
  try {
    const { offset, limit, page } = paginate(req.query.page, req.query.limit);
    const { employeeId, date, startDate, endDate, status, departmentId } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (employeeId) { where += ` AND a.employee_id = $${idx++}`; params.push(employeeId); }
    if (date) { where += ` AND a.date = $${idx++}`; params.push(date); }
    if (startDate) { where += ` AND a.date >= $${idx++}`; params.push(startDate); }
    if (endDate) { where += ` AND a.date <= $${idx++}`; params.push(endDate); }
    if (status) { where += ` AND a.status = $${idx++}`; params.push(status); }
    if (departmentId) { where += ` AND ep.department_id = $${idx++}`; params.push(departmentId); }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM attendance a JOIN employee_profiles ep ON a.employee_id = ep.id ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await pool.query(
      `SELECT a.*, ep.full_name, ep.employee_id, ep.department_id, d.name as department_name
       FROM attendance a
       JOIN employee_profiles ep ON a.employee_id = ep.id
       LEFT JOIN departments d ON ep.department_id = d.id
       ${where} ORDER BY a.date DESC, a.clock_in DESC LIMIT $${idx} OFFSET $${idx + 1}`, params);

    res.json({ success: true, data: result.rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.*, ep.full_name, ep.employee_id
       FROM attendance a JOIN employee_profiles ep ON a.employee_id = ep.id WHERE a.id = $1`, [req.params.id]);
    if (result.rows.length === 0) throw new NotFoundError('Attendance record not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const clockIn = async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();

    const existing = await pool.query(
      'SELECT id, clock_in, clock_out FROM attendance WHERE employee_id = $1 AND date = $2', [employeeId, today]);
    if (existing.rows.length > 0 && existing.rows[0].clock_out === null) {
      throw new BadRequestError('Already clocked in. Please clock out first.');
    }

    const scheduleStart = new Date(); scheduleStart.setHours(8, 0, 0, 0);
    const isLate = now > scheduleStart;
    const lateMinutes = isLate ? Math.round((now - scheduleStart) / 60000) : 0;

    if (existing.rows.length > 0) {
      const result = await pool.query(
        `UPDATE attendance SET clock_in = $1, status = 'present', is_late = $2, late_minutes = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 RETURNING *`,
        [now, isLate, lateMinutes, existing.rows[0].id]);
      return res.json({ success: true, data: result.rows[0] });
    }

    const result = await pool.query(
      `INSERT INTO attendance (employee_id, date, clock_in, status, is_late, late_minutes)
       VALUES ($1, $2, $3, 'present', $4, $5) RETURNING *`,
      [employeeId, today, now, isLate, lateMinutes]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const clockOut = async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();

    const record = await pool.query(
      'SELECT id, clock_in FROM attendance WHERE employee_id = $1 AND date = $2 AND clock_out IS NULL', [employeeId, today]);
    if (record.rows.length === 0) throw new BadRequestError('No active clock-in found');

    const clockIn = new Date(record.rows[0].clock_in);
    const workMs = now - clockIn;
    const workHours = Math.round((workMs / 3600000) * 100) / 100;

    const scheduleEnd = new Date(); scheduleEnd.setHours(17, 0, 0, 0);
    const earlyLeaveMinutes = now < scheduleEnd ? Math.round((scheduleEnd - now) / 60000) : 0;
    const overtimeMinutes = now > scheduleEnd ? Math.round((now - scheduleEnd) / 60000) : 0;

    const result = await pool.query(
      `UPDATE attendance SET clock_out = $1, work_hours = $2, early_leave_minutes = $3, overtime_minutes = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [now, workHours, earlyLeaveMinutes, overtimeMinutes, record.rows[0].id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const getTodayStatus = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const today = new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2', [employeeId, today]);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) { next(err); }
};

const getSummary = async (req, res, next) => {
  try {
    const { employeeId, year, month } = req.query;
    const y = year || new Date().getFullYear();
    const m = month || new Date().getMonth() + 1;

    let where = `WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`;
    const params = [y, m];
    let idx = 3;

    if (employeeId) { where += ` AND employee_id = $${idx++}`; params.push(employeeId); }

    const result = await pool.query(
      `SELECT COUNT(*) as total_days,
              SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
              SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
              SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
              SUM(CASE WHEN is_late THEN 1 ELSE 0 END) as late_arrivals,
              SUM(late_minutes) as total_late_minutes,
              SUM(overtime_minutes) as total_overtime_minutes,
              SUM(early_leave_minutes) as total_early_leave_minutes,
              COALESCE(SUM(work_hours), 0) as total_work_hours
       FROM attendance ${where}`, params);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

module.exports = { list, getById, clockIn, clockOut, getTodayStatus, getSummary };
