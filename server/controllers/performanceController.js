const { pool } = require('../config/db');
const { NotFoundError } = require('../utils/errors');
const { paginate, buildPaginationMeta } = require('../utils/helpers');
const authService = require('../services/authService');

const list = async (req, res, next) => {
  try {
    const { offset, limit, page } = paginate(req.query.page, req.query.limit);
    const { employeeId, reviewerId, status } = req.query;

    let where = 'WHERE 1=1'; const params = []; let idx = 1;
    if (employeeId) { where += ` AND pr.employee_id = $${idx++}`; params.push(employeeId); }
    if (reviewerId) { where += ` AND pr.reviewer_id = $${idx++}`; params.push(reviewerId); }
    if (status) { where += ` AND pr.status = $${idx++}`; params.push(status); }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM performance_reviews pr JOIN employee_profiles ep ON pr.employee_id = ep.id ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await pool.query(
      `SELECT pr.*, ep.full_name, ep.employee_id, rv.full_name as reviewer_name
       FROM performance_reviews pr
       JOIN employee_profiles ep ON pr.employee_id = ep.id
       LEFT JOIN employee_profiles rv ON pr.reviewer_id = rv.id
       ${where} ORDER BY pr.review_date DESC LIMIT $${idx} OFFSET $${idx + 1}`, params);
    res.json({ success: true, data: result.rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT pr.*, ep.full_name, ep.employee_id, ep.department_id, d.name as department_name,
              rv.full_name as reviewer_name
       FROM performance_reviews pr
       JOIN employee_profiles ep ON pr.employee_id = ep.id
       LEFT JOIN departments d ON ep.department_id = d.id
       LEFT JOIN employee_profiles rv ON pr.reviewer_id = rv.id
       WHERE pr.id = $1`, [req.params.id]);
    if (result.rows.length === 0) throw new NotFoundError('Performance review not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { employeeId, reviewerId, reviewPeriod, reviewDate, overallRating, kpiScore,
            goals, achievements, strengths, areasForImprovement, reviewerComments,
            employeeComments, status, nextReviewDate } = req.body;
    const result = await pool.query(
      `INSERT INTO performance_reviews (employee_id, reviewer_id, review_period, review_date,
        overall_rating, kpi_score, goals, achievements, strengths, areas_for_improvement,
        reviewer_comments, employee_comments, status, next_review_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [employeeId, reviewerId, reviewPeriod, reviewDate, overallRating, kpiScore,
       goals, achievements, strengths, areasForImprovement, reviewerComments,
       employeeComments, status || 'draft', nextReviewDate]);
    await authService.logAudit(req.user.id, 'CREATE_PERFORMANCE_REVIEW', 'performance', result.rows[0].id, {}, req.ip);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const fieldMap = {
      reviewerId: 'reviewer_id', reviewPeriod: 'review_period', reviewDate: 'review_date',
      overallRating: 'overall_rating', kpiScore: 'kpi_score', goals: 'goals',
      achievements: 'achievements', strengths: 'strengths', areasForImprovement: 'areas_for_improvement',
      reviewerComments: 'reviewer_comments', employeeComments: 'employee_comments',
      status: 'status', nextReviewDate: 'next_review_date'
    };
    const updates = []; const params = []; let idx = 1;
    for (const [c, db] of Object.entries(fieldMap)) {
      if (fields[c] !== undefined) { updates.push(`${db} = $${idx++}`); params.push(fields[c]); }
    }
    if (updates.length === 0) return res.json({ success: true, message: 'No changes' });
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    const result = await pool.query(
      `UPDATE performance_reviews SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (result.rows.length === 0) throw new NotFoundError('Performance review not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM performance_reviews WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) throw new NotFoundError('Performance review not found');
    res.json({ success: true, message: 'Performance review deleted' });
  } catch (err) { next(err); }
};

module.exports = { list, getById, create, update, remove };
