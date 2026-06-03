const db = require('../../config/db');
const ProcurementWorkflowEngine = require('../../services/procurementWorkflowEngine');

exports.getPending = async (req, res) => {
  try {
    const result = await ProcurementWorkflowEngine.getPendingApprovals(req.user.employeeId);
    res.json({ success: true, data: result });
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
    const result = await ProcurementWorkflowEngine.getApprovalStatus(req.params.requestId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyApprovals = async (req, res) => {
  try {
    const { status } = req.query;
    let conditions = ['pa.approver_id = $1'];
    let params = [req.user.employeeId];
    let idx = 2;

    if (status) {
      conditions.push(`pa.status = $${idx++}`);
      params.push(status);
    }

    const result = await db.query(
      `SELECT pa.*, pr.request_number, pr.title as request_title,
       ep.full_name as requester_name
       FROM procurement_approvals pa
       JOIN procurement_requests pr ON pa.request_id = pr.id
       JOIN employee_profiles ep ON pr.requester_id = ep.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY pa.created_at DESC`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
