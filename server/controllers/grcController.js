const grcService = require('../services/grcService');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ============= DASHBOARD =============

exports.getDashboard = wrap(async (req, res) => {
  const data = await grcService.getGRCDashboard();
  res.json({ success: true, data });
});

// ============= POLICIES =============

exports.createPolicy = wrap(async (req, res) => {
  const result = await grcService.createPolicy({ ...req.body, createdBy: req.user.id, createdByName: req.user.full_name || req.user.email });
  res.status(201).json({ success: true, data: result });
});

exports.getPolicies = wrap(async (req, res) => {
  const result = await grcService.getPolicies(req.query);
  res.json({ success: true, data: result });
});

exports.getPolicy = wrap(async (req, res) => {
  const result = await grcService.getPolicy(req.params.policyId);
  res.json({ success: true, data: result });
});

exports.updatePolicy = wrap(async (req, res) => {
  const result = await grcService.updatePolicy(req.params.policyId, req.body, req.user.id, req.user.full_name || req.user.email);
  res.json({ success: true, data: result });
});

exports.publishPolicy = wrap(async (req, res) => {
  const result = await grcService.publishPolicy(req.params.policyId, req.user.id, req.user.full_name || req.user.email);
  res.json({ success: true, data: result });
});

// ============= POLICY ACKNOWLEDGMENTS =============

exports.acknowledgePolicy = wrap(async (req, res) => {
  const { policyId } = req.params;
  const result = await grcService.acknowledgePolicy(policyId, req.user.id, req.user.full_name || req.user.email, req.user.department_name || '', req.ip, req.headers['user-agent']);
  res.json({ success: true, data: result });
});

exports.getPolicyAcknowledgmentStatus = wrap(async (req, res) => {
  const result = await grcService.getPolicyAcknowledgmentStatus(req.params.policyId);
  res.json({ success: true, data: result });
});

// ============= AUDITS =============

exports.createAudit = wrap(async (req, res) => {
  const result = await grcService.createAudit({ ...req.body, createdBy: req.user.id, createdByName: req.user.full_name || req.user.email });
  res.status(201).json({ success: true, data: result });
});

exports.getAudits = wrap(async (req, res) => {
  const result = await grcService.getAudits(req.query);
  res.json({ success: true, data: result });
});

exports.getAudit = wrap(async (req, res) => {
  const result = await grcService.getAudit(req.params.auditId);
  res.json({ success: true, data: result });
});

exports.updateAudit = wrap(async (req, res) => {
  const result = await grcService.updateAudit(req.params.auditId, req.body, req.user.id, req.user.full_name || req.user.email);
  res.json({ success: true, data: result });
});

// ============= AUDIT FINDINGS =============

exports.createAuditFinding = wrap(async (req, res) => {
  const result = await grcService.createAuditFinding({ ...req.body, createdBy: req.user.id });
  res.status(201).json({ success: true, data: result });
});

exports.updateAuditFinding = wrap(async (req, res) => {
  const result = await grcService.updateAuditFinding(req.params.findingId, req.body, req.user.id);
  res.json({ success: true, data: result });
});

// ============= CORRECTIVE ACTIONS =============

exports.createCorrectiveAction = wrap(async (req, res) => {
  const result = await grcService.createCorrectiveAction({ ...req.body, createdBy: req.user.id, createdByName: req.user.full_name || req.user.email });
  res.status(201).json({ success: true, data: result });
});

exports.getCorrectiveActions = wrap(async (req, res) => {
  const result = await grcService.getCorrectiveActions(req.query);
  res.json({ success: true, data: result });
});

exports.updateCorrectiveAction = wrap(async (req, res) => {
  const result = await grcService.updateCorrectiveAction(req.params.actionId, req.body, req.user.id);
  res.json({ success: true, data: result });
});

// ============= RISKS =============

exports.createRisk = wrap(async (req, res) => {
  const result = await grcService.createRisk({ ...req.body, createdBy: req.user.id });
  res.status(201).json({ success: true, data: result });
});

exports.getRisks = wrap(async (req, res) => {
  const result = await grcService.getRisks(req.query);
  res.json({ success: true, data: result });
});

exports.getRisk = wrap(async (req, res) => {
  const result = await grcService.getRisk(req.params.riskId);
  res.json({ success: true, data: result });
});

exports.updateRisk = wrap(async (req, res) => {
  const result = await grcService.updateRisk(req.params.riskId, req.body, req.user.id);
  res.json({ success: true, data: result });
});

// ============= RISK ASSESSMENTS =============

exports.createRiskAssessment = wrap(async (req, res) => {
  const result = await grcService.createRiskAssessment({ ...req.body, assessorId: req.user.id, assessorName: req.user.full_name || req.user.email });
  res.status(201).json({ success: true, data: result });
});

// ============= COMPLIANCE =============

exports.getComplianceObligations = wrap(async (req, res) => {
  const result = await grcService.getComplianceObligations(req.query);
  res.json({ success: true, data: result });
});

exports.updateComplianceObligation = wrap(async (req, res) => {
  const result = await grcService.updateComplianceObligation(req.params.obligationId, req.body);
  res.json({ success: true, data: result });
});

// ============= ACCESS REVIEWS =============

exports.createAccessReview = wrap(async (req, res) => {
  const result = await grcService.createAccessReview({ ...req.body, createdBy: req.user.id });
  res.status(201).json({ success: true, data: result });
});

exports.getAccessReviews = wrap(async (req, res) => {
  const result = await grcService.getAccessReviews(req.query);
  res.json({ success: true, data: result });
});

exports.getAccessReview = wrap(async (req, res) => {
  const result = await grcService.getAccessReview(req.params.reviewId);
  res.json({ success: true, data: result });
});

exports.updateAccessReviewEntry = wrap(async (req, res) => {
  const result = await grcService.updateAccessReviewEntry(req.params.entryId, { ...req.body, reviewerId: req.user.id, reviewerName: req.user.full_name || req.user.email });
  res.json({ success: true, data: result });
});

// ============= SOD =============

exports.getSodRules = wrap(async (req, res) => {
  const result = await grcService.getSodRules(req.query);
  res.json({ success: true, data: result });
});

exports.checkSodViolation = wrap(async (req, res) => {
  const { userId, permission } = req.body;
  const result = await grcService.checkSodViolations(userId, permission);
  res.json({ success: true, data: result });
});

exports.getSodViolations = wrap(async (req, res) => {
  const result = await grcService.getSodViolations(req.query);
  res.json({ success: true, data: result });
});

// ============= INVESTIGATIONS =============

exports.createInvestigation = wrap(async (req, res) => {
  const result = await grcService.createInvestigation({ ...req.body, createdBy: req.user.id });
  res.status(201).json({ success: true, data: result });
});

exports.getInvestigations = wrap(async (req, res) => {
  const result = await grcService.getInvestigations(req.query);
  res.json({ success: true, data: result });
});

exports.getInvestigation = wrap(async (req, res) => {
  const result = await grcService.getInvestigation(req.params.investigationId);
  res.json({ success: true, data: result });
});

exports.addInvestigationEvidence = wrap(async (req, res) => {
  const result = await grcService.addInvestigationEvidence({ ...req.body, investigationId: req.params.investigationId, submittedBy: req.user.id, submittedByName: req.user.full_name || req.user.email });
  res.status(201).json({ success: true, data: result });
});

// ============= REPORTS =============

exports.generateReport = wrap(async (req, res) => {
  const result = await grcService.generateGovernanceReport({ ...req.body, generatedBy: req.user.id, generatedByName: req.user.full_name || req.user.email });
  res.json({ success: true, data: result });
});

exports.getReports = wrap(async (req, res) => {
  const result = await grcService.getGovernanceReports(req.query);
  res.json({ success: true, data: result });
});

// ============= APPROVAL WORKFLOWS =============

exports.createApprovalWorkflow = wrap(async (req, res) => {
  const result = await grcService.createApprovalWorkflow({ ...req.body, requesterId: req.user.id, requesterName: req.user.full_name || req.user.email });
  res.status(201).json({ success: true, data: result });
});

exports.processApprovalAction = wrap(async (req, res) => {
  const result = await grcService.processApprovalAction(req.params.workflowId, { ...req.body, approverId: req.user.id, approverName: req.user.full_name || req.user.email });
  res.json({ success: true, data: result });
});

// ============= COMPLIANCE SCORE =============

exports.calculateComplianceScore = wrap(async (req, res) => {
  const result = await grcService.calculateComplianceScore(req.body);
  res.json({ success: true, data: result });
});

// ============= NOTIFICATIONS =============

exports.createNotification = wrap(async (req, res) => {
  const result = await grcService.createNotification(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.getNotifications = wrap(async (req, res) => {
  const result = await grcService.getNotifications({ ...req.query, userId: req.user.id });
  res.json({ success: true, data: result });
});

// ============= AUDIT TRAIL =============

exports.getGovernanceAuditLog = wrap(async (req, res) => {
  const result = await grcService.getGovernanceAuditLog(req.query);
  res.json({ success: true, data: result });
});

// ============= LEGAL HOLDS =============

exports.createLegalHold = wrap(async (req, res) => {
  const result = await grcService.createLegalHold({ ...req.body, createdBy: req.user.id });
  res.status(201).json({ success: true, data: result });
});

exports.getLegalHolds = wrap(async (req, res) => {
  const result = await grcService.getLegalHolds(req.query);
  res.json({ success: true, data: result });
});

// ============= COMPLIANCE CALENDAR =============

exports.getComplianceCalendar = wrap(async (req, res) => {
  const result = await grcService.getComplianceCalendar(req.query);
  res.json({ success: true, data: result });
});

// ============= RETENTION POLICIES =============

exports.getRetentionPolicies = wrap(async (req, res) => {
  const result = await grcService.getRetentionPolicies(req.query);
  res.json({ success: true, data: result });
});
