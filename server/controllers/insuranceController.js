const { pool } = require('../config/db');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { paginate, buildPaginationMeta } = require('../utils/helpers');

const list = async (req, res, next) => {
  try {
    const { offset, limit, page } = paginate(req.query.page, req.query.limit);
    const { employeeId, status, insuranceType } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (employeeId) { where += ` AND ei.employee_id = $${idx++}`; params.push(employeeId); }
    if (status) { where += ` AND ei.status = $${idx++}`; params.push(status); }
    if (insuranceType) { where += ` AND ei.insurance_type ILIKE $${idx++}`; params.push(`%${insuranceType}%`); }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM employee_insurance ei JOIN employee_profiles ep ON ei.employee_id = ep.id ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await pool.query(
      `SELECT ei.*, ep.full_name, ep.employee_id
       FROM employee_insurance ei
       JOIN employee_profiles ep ON ei.employee_id = ep.id
       ${where} ORDER BY ei.coverage_end_date ASC LIMIT $${idx} OFFSET $${idx + 1}`, params);

    res.json({ success: true, data: result.rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ei.*, ep.full_name, ep.employee_id
       FROM employee_insurance ei JOIN employee_profiles ep ON ei.employee_id = ep.id WHERE ei.id = $1`, [req.params.id]);
    if (result.rows.length === 0) throw new NotFoundError('Insurance record not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { employeeId, insuranceType, provider, policyNumber, coverageStartDate,
            coverageEndDate, coverageDetails, dependentCount, monthlyPremium,
            employerContribution, employeeContribution, notes } = req.body;

    const result = await pool.query(
      `INSERT INTO employee_insurance (employee_id, insurance_type, provider, policy_number,
        coverage_start_date, coverage_end_date, coverage_details, dependent_count,
        monthly_premium, employer_contribution, employee_contribution, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [employeeId, insuranceType, provider, policyNumber, coverageStartDate,
       coverageEndDate, coverageDetails, dependentCount || 0,
       monthlyPremium || 0, employerContribution || 0, employeeContribution || 0, notes]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const fieldMap = {
      insuranceType: 'insurance_type', provider: 'provider', policyNumber: 'policy_number',
      coverageStartDate: 'coverage_start_date', coverageEndDate: 'coverage_end_date',
      coverageDetails: 'coverage_details', dependentCount: 'dependent_count',
      monthlyPremium: 'monthly_premium', employerContribution: 'employer_contribution',
      employeeContribution: 'employee_contribution', status: 'status', notes: 'notes'
    };
    const updates = []; const params = []; let idx = 1;
    for (const [c, db] of Object.entries(fieldMap)) {
      if (fields[c] !== undefined) { updates.push(`${db} = $${idx++}`); params.push(fields[c]); }
    }
    if (updates.length === 0) return res.json({ success: true, message: 'No changes' });
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    const result = await pool.query(
      `UPDATE employee_insurance SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (result.rows.length === 0) throw new NotFoundError('Insurance record not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM employee_insurance WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) throw new NotFoundError('Insurance record not found');
    res.json({ success: true, message: 'Insurance record deleted' });
  } catch (err) { next(err); }
};

const getExpiring = async (req, res, next) => {
  try {
    const { days } = req.query;
    const threshold = parseInt(days) || 30;
    const result = await pool.query(
      `SELECT ei.*, ep.full_name, ep.employee_id, ep.email
       FROM employee_insurance ei JOIN employee_profiles ep ON ei.employee_id = ep.id
       WHERE ei.status = 'active' AND ei.coverage_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $1::integer
       ORDER BY ei.coverage_end_date`, [threshold]);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

module.exports = { list, getById, create, update, remove, getExpiring };
