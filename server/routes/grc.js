const router = require('express').Router();
const grcController = require('../controllers/grcController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Dashboard
router.get('/dashboard', grcController.getDashboard);

// Policies
router.post('/policies', grcController.createPolicy);
router.get('/policies', grcController.getPolicies);
router.get('/policies/:policyId', grcController.getPolicy);
router.put('/policies/:policyId', grcController.updatePolicy);
router.post('/policies/:policyId/publish', grcController.publishPolicy);

// Policy Acknowledgments
router.post('/policies/:policyId/acknowledge', grcController.acknowledgePolicy);
router.get('/policies/:policyId/acknowledgments', grcController.getPolicyAcknowledgmentStatus);

// Audits
router.post('/audits', grcController.createAudit);
router.get('/audits', grcController.getAudits);
router.get('/audits/:auditId', grcController.getAudit);
router.put('/audits/:auditId', grcController.updateAudit);

// Audit Findings
router.post('/audits/:auditId/findings', grcController.createAuditFinding);
router.put('/findings/:findingId', grcController.updateAuditFinding);

// Corrective Actions
router.post('/corrective-actions', grcController.createCorrectiveAction);
router.get('/corrective-actions', grcController.getCorrectiveActions);
router.put('/corrective-actions/:actionId', grcController.updateCorrectiveAction);

// Risks
router.post('/risks', grcController.createRisk);
router.get('/risks', grcController.getRisks);
router.get('/risks/:riskId', grcController.getRisk);
router.put('/risks/:riskId', grcController.updateRisk);

// Risk Assessments
router.post('/risk-assessments', grcController.createRiskAssessment);

// Compliance
router.get('/compliance-obligations', grcController.getComplianceObligations);
router.put('/compliance-obligations/:obligationId', grcController.updateComplianceObligation);

// Access Reviews
router.post('/access-reviews', grcController.createAccessReview);
router.get('/access-reviews', grcController.getAccessReviews);
router.get('/access-reviews/:reviewId', grcController.getAccessReview);
router.put('/access-review-entries/:entryId', grcController.updateAccessReviewEntry);

// SoD
router.get('/sod-rules', grcController.getSodRules);
router.post('/sod/check-violation', grcController.checkSodViolation);
router.get('/sod-violations', grcController.getSodViolations);

// Investigations
router.post('/investigations', grcController.createInvestigation);
router.get('/investigations', grcController.getInvestigations);
router.get('/investigations/:investigationId', grcController.getInvestigation);
router.post('/investigations/:investigationId/evidence', grcController.addInvestigationEvidence);

// Governance Reports
router.post('/reports/generate', grcController.generateReport);
router.get('/reports', grcController.getReports);

// Approval Workflows
router.post('/approval-workflows', grcController.createApprovalWorkflow);
router.post('/approval-workflows/:workflowId/action', grcController.processApprovalAction);

// Compliance Score
router.post('/compliance-score/calculate', grcController.calculateComplianceScore);

// Notifications
router.post('/notifications', grcController.createNotification);
router.get('/notifications', grcController.getNotifications);

// Audit Trail
router.get('/audit-log', grcController.getGovernanceAuditLog);

// Legal Holds
router.post('/legal-holds', grcController.createLegalHold);
router.get('/legal-holds', grcController.getLegalHolds);

// Compliance Calendar
router.get('/compliance-calendar', grcController.getComplianceCalendar);

// Retention Policies
router.get('/retention-policies', grcController.getRetentionPolicies);

module.exports = router;
