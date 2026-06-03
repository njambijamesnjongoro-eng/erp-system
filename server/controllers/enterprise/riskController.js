const db = require('../../config/db');

const getCompanyId = (req) => req.query.company_id || req.body.company_id || null;

exports.getRiskAssessments = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { status, risk_type, page = 1, limit = 50 } = req.query;
    const params = [];
    let sql = `SELECT ra.*, ep.full_name AS owner_name, d.name AS department_name FROM risk_assessments ra LEFT JOIN employee_profiles ep ON ra.owner_id = ep.id LEFT JOIN departments d ON ra.department_id = d.id WHERE 1=1`;
    if (company_id) { params.push(company_id); sql += ` AND ra.company_id = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND ra.status = $${params.length}`; }
    if (risk_type) { params.push(risk_type); sql += ` AND ra.risk_type = $${params.length}`; }
    sql += ` ORDER BY ra.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    const result = await db.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRiskAssessmentById = async (req, res) => {
  try {
    const result = await db.query(`SELECT ra.*, ep.full_name AS owner_name, d.name AS department_name FROM risk_assessments ra LEFT JOIN employee_profiles ep ON ra.owner_id = ep.id LEFT JOIN departments d ON ra.department_id = d.id WHERE ra.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Risk assessment not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createRiskAssessment = async (req, res) => {
  try {
    const { company_id, title, risk_type, description, probability, impact, risk_score, status, mitigation_strategy, contingency_plan, owner_id, review_date, department_id } = req.body;
    const result = await db.query(
      `INSERT INTO risk_assessments (company_id, title, risk_type, description, probability, impact, risk_score, status, mitigation_strategy, contingency_plan, owner_id, review_date, department_id, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [company_id, title, risk_type, description, probability, impact, risk_score, status || 'identified', mitigation_strategy, contingency_plan, owner_id, review_date, department_id, req.user?.employeeId || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateRiskAssessment = async (req, res) => {
  try {
    const { title, risk_type, description, probability, impact, risk_score, status, mitigation_strategy, contingency_plan, owner_id, review_date, department_id } = req.body;
    const result = await db.query(
      `UPDATE risk_assessments SET title=$1, risk_type=$2, description=$3, probability=$4, impact=$5, risk_score=$6, status=$7, mitigation_strategy=$8, contingency_plan=$9, owner_id=$10, review_date=$11, department_id=$12, updated_at=CURRENT_TIMESTAMP WHERE id=$13 RETURNING *`,
      [title, risk_type, description, probability, impact, risk_score, status, mitigation_strategy, contingency_plan, owner_id, review_date, department_id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Risk assessment not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteRiskAssessment = async (req, res) => {
  try {
    const result = await db.query(`DELETE FROM risk_assessments WHERE id = $1 RETURNING id`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Risk assessment not found' });
    res.json({ success: true, message: 'Risk assessment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRiskStats = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const params = [];
    let where = '';
    if (company_id) { params.push(company_id); where = ` WHERE company_id = $1`; }
    const [total, byStatus, byType] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS count FROM risk_assessments${where}`, params),
      db.query(`SELECT status, COUNT(*)::int AS count FROM risk_assessments${where}${where ? ' AND' : ' WHERE'} 1=1 GROUP BY status`, params),
      db.query(`SELECT risk_type, COUNT(*)::int AS count FROM risk_assessments${where}${where ? ' AND' : ' WHERE'} 1=1 GROUP BY risk_type`, params),
    ]);
    res.json({ success: true, data: { total: total.rows[0].count, byStatus: byStatus.rows, byType: byType.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRiskDashboard = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const params = [];
    let where = '';
    if (company_id) { params.push(company_id); where = ` WHERE company_id = $1`; }
    const [recent, highRisks, stats] = await Promise.all([
      db.query(`SELECT ra.*, ep.full_name AS owner_name FROM risk_assessments ra LEFT JOIN employee_profiles ep ON ra.owner_id = ep.id${where} ORDER BY ra.created_at DESC LIMIT 10`, params),
      db.query(`SELECT COUNT(*)::int AS count FROM risk_assessments${where}${where ? ' AND' : ' WHERE'} risk_score >= 70`, params),
      db.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'identified') AS identified, COUNT(*) FILTER (WHERE status = 'mitigated') AS mitigated, COUNT(*) FILTER (WHERE status = 'accepted') AS accepted FROM risk_assessments${where}`, params),
    ]);
    res.json({ success: true, data: { recent: recent.rows, highRisks: highRisks.rows[0].count, stats: stats.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
