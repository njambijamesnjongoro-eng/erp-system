const db = require('../config/db');

class ProcurementWorkflowEngine {
  static APPROVAL_LEVELS = {
    MANAGER: 1,
    FINANCE: 2,
    PROCUREMENT: 3,
    CEO: 4,
  };

  static async submitRequest(requestId, requesterId) {
    const deptResult = await db.query(
      `SELECT department_id FROM employee_profiles WHERE id = $1`,
      [requesterId]
    );
    const departmentId = deptResult.rows[0]?.department_id;

    const managerResult = await db.query(
      `SELECT ep.id FROM employee_profiles ep
       JOIN users u ON ep.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE ep.department_id = $1 AND r.name = 'Manager' AND ep.employment_status = 'active' LIMIT 1`,
      [departmentId]
    );

    if (managerResult.rows.length > 0) {
      await db.query(
        `INSERT INTO procurement_approvals (request_id, approver_id, approval_level, approver_role, status)
         VALUES ($1, $2, $3, 'Manager', 'pending')`,
        [requestId, managerResult.rows[0].id, this.APPROVAL_LEVELS.MANAGER]
      );
    }

    const financeResult = await db.query(
      `SELECT ep.id FROM employee_profiles ep
       JOIN users u ON ep.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'Finance Officer' AND ep.employment_status = 'active' LIMIT 1`
    );
    if (financeResult.rows.length > 0) {
      await db.query(
        `INSERT INTO procurement_approvals (request_id, approver_id, approval_level, approver_role, status)
         VALUES ($1, $2, $3, 'Finance Officer', 'pending')`,
        [requestId, financeResult.rows[0].id, this.APPROVAL_LEVELS.FINANCE]
      );
    }

    const procurementResult = await db.query(
      `SELECT ep.id FROM employee_profiles ep
       JOIN users u ON ep.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'Procurement Officer' AND ep.employment_status = 'active' LIMIT 1`
    );
    if (procurementResult.rows.length > 0) {
      await db.query(
        `INSERT INTO procurement_approvals (request_id, approver_id, approval_level, approver_role, status)
         VALUES ($1, $2, $3, 'Procurement Officer', 'pending')`,
        [requestId, procurementResult.rows[0].id, this.APPROVAL_LEVELS.PROCUREMENT]
      );
    }

    await db.query(
      `UPDATE procurement_requests SET status = 'pending', submitted_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [requestId]
    );

    return { success: true };
  }

  static async approveRequest(approvalId, approverId, comments) {
    const approval = await db.query(
      `SELECT * FROM procurement_approvals WHERE id = $1`,
      [approvalId]
    );
    if (approval.rows.length === 0) throw new Error('Approval record not found');
    const { request_id, approval_level } = approval.rows[0];

    await db.query(
      `UPDATE procurement_approvals SET status = 'approved', comments = $1, action_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [comments, approvalId]
    );

    const currentLevel = approval_level;
    const nextLevel = currentLevel + 1;

    const nextApproval = await db.query(
      `SELECT * FROM procurement_approvals WHERE request_id = $1 AND approval_level = $2 AND status = 'pending'`,
      [request_id, nextLevel]
    );

    if (nextApproval.rows.length === 0) {
      await db.query(
        `UPDATE procurement_requests SET status = 'approved' WHERE id = $1`,
        [request_id]
      );
    }

    return { success: true };
  }

  static async rejectRequest(approvalId, approverId, comments) {
    const approval = await db.query(
      `SELECT request_id FROM procurement_approvals WHERE id = $1`,
      [approvalId]
    );
    if (approval.rows.length === 0) throw new Error('Approval record not found');
    const { request_id } = approval.rows[0];

    await db.query(
      `UPDATE procurement_approvals SET status = 'rejected', comments = $1, action_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [comments, approvalId]
    );

    await db.query(
      `UPDATE procurement_approvals SET status = 'cancelled' WHERE request_id = $1 AND status = 'pending'`,
      [request_id]
    );

    await db.query(
      `UPDATE procurement_requests SET status = 'rejected' WHERE id = $1`,
      [request_id]
    );

    return { success: true, request_id };
  }

  static async getApprovalStatus(requestId) {
    const result = await db.query(
      `SELECT pa.*, ep.full_name AS approver_name
       FROM procurement_approvals pa
       LEFT JOIN employee_profiles ep ON pa.approver_id = ep.id
       WHERE pa.request_id = $1
       ORDER BY pa.approval_level ASC`,
      [requestId]
    );
    return result.rows;
  }

  static async getPendingApprovals(employeeId, includeAll = false) {
    const params = [];
    let where = `pa.status = 'pending'`;
    if (!includeAll) {
      params.push(employeeId);
      where += ` AND pa.approver_id = $1`;
    }
    const result = await db.query(
      `SELECT pa.*, pr.request_number, pr.title, pr.total_estimated_cost, pr.urgency, pr.created_at,
              ep.full_name AS requester_name
       FROM procurement_approvals pa
       JOIN procurement_requests pr ON pa.request_id = pr.id
       LEFT JOIN employee_profiles ep ON pr.requester_id = ep.id
       WHERE ${where}
       ORDER BY pr.urgency DESC, pr.created_at ASC`,
      params
    );
    return result.rows;
  }

  static async generateRequestNumber() {
    const year = new Date().getFullYear();
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM procurement_requests WHERE EXTRACT(YEAR FROM created_at) = $1`,
      [year]
    );
    const seq = String(result.rows[0].count + 1).padStart(4, '0');
    return `PR-${year}-${seq}`;
  }
}

module.exports = ProcurementWorkflowEngine;
