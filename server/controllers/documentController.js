const { pool } = require('../config/db');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { paginate, buildPaginationMeta } = require('../utils/helpers');
const authService = require('../services/authService');

const list = async (req, res, next) => {
  try {
    const { offset, limit, page } = paginate(req.query.page, req.query.limit);
    const { employeeId, documentType, status } = req.query;

    let where = 'WHERE 1=1'; const params = []; let idx = 1;
    if (employeeId) { where += ` AND ed.employee_id = $${idx++}`; params.push(employeeId); }
    if (documentType) { where += ` AND ed.document_type = $${idx++}`; params.push(documentType); }
    if (status) { where += ` AND ed.status = $${idx++}`; params.push(status); }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM employee_documents ed JOIN employee_profiles ep ON ed.employee_id = ep.id ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await pool.query(
      `SELECT ed.*, ep.full_name, ep.employee_id, v_ep.full_name as verified_by_name
       FROM employee_documents ed
       JOIN employee_profiles ep ON ed.employee_id = ep.id
       LEFT JOIN employee_profiles v_ep ON ed.verified_by = v_ep.id
       ${where} ORDER BY ed.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, params);
    res.json({ success: true, data: result.rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ed.*, ep.full_name, ep.employee_id
       FROM employee_documents ed JOIN employee_profiles ep ON ed.employee_id = ep.id WHERE ed.id = $1`, [req.params.id]);
    if (result.rows.length === 0) throw new NotFoundError('Document not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const upload = async (req, res, next) => {
  try {
    if (!req.file) throw new BadRequestError('No file uploaded');
    const { employeeId, documentType, description, expiryDate } = req.body;
    const filePath = req.file.path;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    const result = await pool.query(
      `INSERT INTO employee_documents (employee_id, document_type, document_name, file_path, file_size, mime_type, description, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [employeeId, documentType, req.file.originalname, filePath, fileSize, mimeType, description, expiryDate]);
    await authService.logAudit(req.user.id, 'UPLOAD_DOCUMENT', 'documents', result.rows[0].id, { documentType }, req.ip);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const verify = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verifiedBy } = req.body;
    const result = await pool.query(
      `UPDATE employee_documents SET is_verified = true, verified_by = $1, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [verifiedBy, id]);
    if (result.rows.length === 0) throw new NotFoundError('Document not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM employee_documents WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) throw new NotFoundError('Document not found');
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) { next(err); }
};

module.exports = { list, getById, upload, verify, remove };
