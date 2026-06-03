const { pool } = require('../config/db');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { paginate, buildPaginationMeta } = require('../utils/helpers');
const authService = require('../services/authService');

const listLeaveTypes = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM leave_types ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const listRequests = async (req, res, next) => {
  try {
    const { offset, limit, page } = paginate(req.query.page, req.query.limit);
    const { employeeId, status, leaveTypeId, startDate, endDate, departmentId } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (employeeId) { where += ` AND lr.employee_id = $${idx++}`; params.push(employeeId); }
    if (status) { where += ` AND lr.status = $${idx++}`; params.push(status); }
    if (leaveTypeId) { where += ` AND lr.leave_type_id = $${idx++}`; params.push(leaveTypeId); }
    if (startDate) { where += ` AND lr.start_date >= $${idx++}`; params.push(startDate); }
    if (endDate) { where += ` AND lr.end_date <= $${idx++}`; params.push(endDate); }
    if (departmentId) { where += ` AND ep.department_id = $${idx++}`; params.push(departmentId); }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM leave_requests lr JOIN employee_profiles ep ON lr.employee_id = ep.id ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await pool.query(
      `SELECT lr.*, lt.name as leave_type_name, lt.code as leave_type_code, lt.is_paid,
              ep.full_name, ep.employee_id, ep.department_id, d.name as department_name,
              a_ep.full_name as approver_name
       FROM leave_requests lr
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       JOIN employee_profiles ep ON lr.employee_id = ep.id
       LEFT JOIN departments d ON ep.department_id = d.id
       LEFT JOIN employee_profiles a_ep ON lr.approver_id = a_ep.id
       ${where} ORDER BY lr.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, params);

    res.json({ success: true, data: result.rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

const getRequestById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT lr.*, lt.name as leave_type_name, lt.code as leave_type_code, lt.is_paid,
              ep.full_name, ep.employee_id,
              a_ep.full_name as approver_name
       FROM leave_requests lr
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       JOIN employee_profiles ep ON lr.employee_id = ep.id
       LEFT JOIN employee_profiles a_ep ON lr.approver_id = a_ep.id
       WHERE lr.id = $1`, [req.params.id]);
    if (result.rows.length === 0) throw new NotFoundError('Leave request not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const createRequest = async (req, res, next) => {
  try {
    const { employeeId, leaveTypeId, startDate, endDate, reason } = req.body;

    const lt = await pool.query('SELECT * FROM leave_types WHERE id = $1', [leaveTypeId]);
    if (lt.rows.length === 0) throw new BadRequestError('Invalid leave type');

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) throw new BadRequestError('End date must be after start date');

    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const balance = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3',
      [employeeId, leaveTypeId, start.getFullYear()]);

    if (balance.rows.length > 0) {
      const bal = balance.rows[0];
      if (bal.remaining_days < totalDays) {
        throw new BadRequestError(`Insufficient leave balance. Remaining: ${bal.remaining_days} days`);
      }
    }

    const result = await pool.query(
      `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [employeeId, leaveTypeId, startDate, endDate, totalDays, reason]);

    if (balance.rows.length > 0) {
      await pool.query(
        'UPDATE leave_balances SET pending_days = pending_days + $1, remaining_days = remaining_days - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [totalDays, balance.rows[0].id]);
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const approveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approverId, status, rejectionReason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      throw new BadRequestError('Status must be approved or rejected');
    }

    const lr = await pool.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
    if (lr.rows.length === 0) throw new NotFoundError('Leave request not found');
    if (lr.rows[0].status !== 'pending') throw new BadRequestError('Leave request already processed');

    const now = new Date();
    const result = await pool.query(
      `UPDATE leave_requests SET status = $1, approver_id = $2, approved_at = $3, rejection_reason = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *`,
      [status, approverId, status === 'approved' ? now : null, rejectionReason, id]);

    if (status === 'approved') {
      const leave = lr.rows[0];
      await pool.query(
        `UPDATE leave_balances SET used_days = used_days + $1, pending_days = pending_days - $1, remaining_days = remaining_days - $1, updated_at = CURRENT_TIMESTAMP
         WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
        [leave.total_days, leave.employee_id, leave.leave_type_id, new Date(leave.start_date).getFullYear()]);
    } else {
      const leave = lr.rows[0];
      await pool.query(
        `UPDATE leave_balances SET pending_days = pending_days - $1, remaining_days = remaining_days + $1, updated_at = CURRENT_TIMESTAMP
         WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
        [leave.total_days, leave.employee_id, leave.leave_type_id, new Date(leave.start_date).getFullYear()]);
    }

    await authService.logAudit(req.user.id, `${status.toUpperCase()}_LEAVE`, 'leave', id, {}, req.ip);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const getBalances = async (req, res, next) => {
  try {
    const { employeeId, year } = req.query;
    const y = year || new Date().getFullYear();

    let where = 'WHERE lb.year = $1';
    const params = [y];
    let idx = 2;

    if (employeeId) { where += ` AND lb.employee_id = $${idx++}`; params.push(employeeId); }

    const result = await pool.query(
      `SELECT lb.*, lt.name as leave_type_name, lt.code as leave_type_code, lt.is_paid
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       ${where} ORDER BY lt.name`, params);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const initBalances = async (req, res, next) => {
  try {
    const { employeeId, year } = req.body;
    const y = year || new Date().getFullYear();

    const leaveTypes = await pool.query('SELECT id, days_per_year FROM leave_types WHERE is_active = true');
    const results = [];

    for (const lt of leaveTypes.rows) {
      const existing = await pool.query(
        'SELECT id FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3',
        [employeeId, lt.id, y]);
      if (existing.rows.length === 0) {
        const res2 = await pool.query(
          `INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, remaining_days)
           VALUES ($1, $2, $3, $4, $4) RETURNING *`,
          [employeeId, lt.id, y, lt.days_per_year]);
        results.push(res2.rows[0]);
      }
    }

    res.status(201).json({ success: true, data: results });
  } catch (err) { next(err); }
};

module.exports = { listLeaveTypes, listRequests, getRequestById, createRequest, approveRequest, getBalances, initBalances };
