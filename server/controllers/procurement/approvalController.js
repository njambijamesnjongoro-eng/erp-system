const db = require('../../config/db');
const ProcurementWorkflowEngine = require('../../services/procurementWorkflowEngine');

exports.getPending = async (req, res) => {
  try {
    const includeAll = ['System Admin', 'CEO'].includes(req.user.roleName);
    const result = await ProcurementWorkflowEngine.getPendingApprovals(req.user.employeeId, includeAll);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const includeAll = ['System Admin', 'CEO'].includes(req.user.roleName);
    const params = [];
    let approverClause = '';
    if (!includeAll) {
      params.push(req.user.employeeId);
      approverClause = 'AND approver_id = $1';
    }
    const result = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'approved' AND action_at::date = CURRENT_DATE)::int AS approved_today,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_total
       FROM procurement_approvals
       WHERE 1=1 ${approverClause}`,
      params
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    await ProcurementWorkflowEngine.approveRequest(id, req.user.employeeId, comments);

    await db.query(
      `INSERT INTO procurement_audit_log (entity_type, entity_id, action, changed_by, new_value)
       VALUES ('procurement_request', $1, 'approved', $2, $3)`,
      [id, req.user.employeeId, JSON.stringify({ comments })]
    );

    res.json({ success: true, message: 'Request approved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    await ProcurementWorkflowEngine.rejectRequest(id, req.user.employeeId, comments);

    await db.query(
      `INSERT INTO procurement_audit_log (entity_type, entity_id, action, changed_by, new_value)
       VALUES ('procurement_request', $1, 'rejected', $2, $3)`,
      [id, req.user.employeeId, JSON.stringify({ comments })]
    );

    res.json({ success: true, message: 'Request rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    if (!req.params.requestId) {
      const includeAll = ['System Admin', 'CEO'].includes(req.user.roleName);
      const params = [];
      let where = `pa.status IN ('approved', 'rejected', 'cancelled')`;
      if (!includeAll) {
        params.push(req.user.employeeId);
        where += ` AND pa.approver_id = $1`;
      }
      const result = await db.query(
        `SELECT pa.*, pr.request_number, pr.title, ep.full_name AS requester_name,
          pa.status AS action, pa.action_at AS action_date
         FROM procurement_approvals pa
         JOIN procurement_requests pr ON pa.request_id = pr.id
         LEFT JOIN employee_profiles ep ON pr.requester_id = ep.id
         WHERE ${where}
         ORDER BY COALESCE(pa.action_at, pa.created_at) DESC
         LIMIT 100`,
        params
      );
      return res.json({ success: true, data: result.rows });
    }
    const result = await ProcurementWorkflowEngine.getApprovalStatus(req.params.requestId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyApprovals = async (req, res) => {
  try {
    const { status } = req.query;
    const includeAll = ['System Admin', 'CEO'].includes(req.user.roleName);
    let conditions = [];
    let params = [];
    let idx = 1;

    if (!includeAll) {
      conditions.push(`pa.approver_id = $${idx++}`);
      params.push(req.user.employeeId);
    }

    if (status) {
      conditions.push(`pa.status = $${idx++}`);
      params.push(status);
    }

    const where = conditions.length ? conditions.join(' AND ') : '1=1';

    const result = await db.query(
      `SELECT pa.*, pr.request_number, pr.title as request_title,
       ep.full_name as requester_name
       FROM procurement_approvals pa
       JOIN procurement_requests pr ON pa.request_id = pr.id
       JOIN employee_profiles ep ON pr.requester_id = ep.id
       WHERE ${where}
       ORDER BY pa.created_at DESC`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
