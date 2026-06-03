const { pool } = require('../config/db');
const { NotFoundError } = require('../utils/errors');
const { paginate, buildPaginationMeta } = require('../utils/helpers');

const listPrograms = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM training_programs WHERE is_active = true ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const createProgram = async (req, res, next) => {
  try {
    const { name, description, provider, category, durationHours, isMandatory } = req.body;
    const result = await pool.query(
      `INSERT INTO training_programs (name, description, provider, category, duration_hours, is_mandatory)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, description, provider, category, durationHours, isMandatory || false]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const listEmployeeTraining = async (req, res, next) => {
  try {
    const { offset, limit, page } = paginate(req.query.page, req.query.limit);
    const { employeeId, status, category } = req.query;

    let where = 'WHERE 1=1';
    const params = []; let idx = 1;
    if (employeeId) { where += ` AND et.employee_id = $${idx++}`; params.push(employeeId); }
    if (status) { where += ` AND et.status = $${idx++}`; params.push(status); }
    if (category) { where += ` AND et.category = $${idx++}`; params.push(category); }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM employee_training et JOIN employee_profiles ep ON et.employee_id = ep.id ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await pool.query(
      `SELECT et.*, ep.full_name, ep.employee_id, tp.name as program_name
       FROM employee_training et
       JOIN employee_profiles ep ON et.employee_id = ep.id
       LEFT JOIN training_programs tp ON et.training_program_id = tp.id
       ${where} ORDER BY et.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, params);
    res.json({ success: true, data: result.rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

const createEmployeeTraining = async (req, res, next) => {
  try {
    const { employeeId, trainingProgramId, trainingName, provider, category,
            startDate, completionDate, expiryDate, status, score, skills, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO employee_training (employee_id, training_program_id, training_name, provider,
        category, start_date, completion_date, expiry_date, status, score, skills, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [employeeId, trainingProgramId, trainingName, provider, category,
       startDate, completionDate, expiryDate, status || 'enrolled', score, skills, notes]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const updateEmployeeTraining = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const fieldMap = {
      trainingName: 'training_name', provider: 'provider', category: 'category',
      startDate: 'start_date', completionDate: 'completion_date', expiryDate: 'expiry_date',
      status: 'status', score: 'score', skills: 'skills', notes: 'notes',
      certificateUrl: 'certificate_url'
    };
    const updates = []; const params = []; let idx = 1;
    for (const [c, db] of Object.entries(fieldMap)) {
      if (fields[c] !== undefined) { updates.push(`${db} = $${idx++}`); params.push(fields[c]); }
    }
    if (updates.length === 0) return res.json({ success: true, message: 'No changes' });
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    const result = await pool.query(
      `UPDATE employee_training SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (result.rows.length === 0) throw new NotFoundError('Training record not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const listCertifications = async (req, res, next) => {
  try {
    const { offset, limit, page } = paginate(req.query.page, req.query.limit);
    const { employeeId, status } = req.query;

    let where = 'WHERE 1=1'; const params = []; let idx = 1;
    if (employeeId) { where += ` AND c.employee_id = $${idx++}`; params.push(employeeId); }
    if (status) { where += ` AND c.status = $${idx++}`; params.push(status); }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM certifications c JOIN employee_profiles ep ON c.employee_id = ep.id ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await pool.query(
      `SELECT c.*, ep.full_name, ep.employee_id
       FROM certifications c JOIN employee_profiles ep ON c.employee_id = ep.id
       ${where} ORDER BY c.expiry_date ASC NULLS LAST LIMIT $${idx} OFFSET $${idx + 1}`, params);
    res.json({ success: true, data: result.rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

const createCertification = async (req, res, next) => {
  try {
    const { employeeId, name, issuingBody, certificateNumber, issueDate, expiryDate } = req.body;
    const result = await pool.query(
      `INSERT INTO certifications (employee_id, name, issuing_body, certificate_number, issue_date, expiry_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [employeeId, name, issuingBody, certificateNumber, issueDate, expiryDate]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

module.exports = {
  listPrograms, createProgram, listEmployeeTraining, createEmployeeTraining,
  updateEmployeeTraining, listCertifications, createCertification
};
