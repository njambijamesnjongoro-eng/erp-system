const router = require('express').Router();
const controller = require('../../controllers/analytics/auditLogController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/activity', authorize('audit_logs', 'read'), controller.getActivityFeed);
router.get('/system-logs', authorize('audit_logs', 'read'), controller.getSystemLogs);
router.get('/compliance', authorize('compliance', 'read'), controller.getComplianceRecords);
router.get('/export', authorize('audit_logs', 'export'), controller.exportAuditLogs);
router.get('/login-history', authorize('audit_logs', 'read'), controller.getLoginHistory);
router.get('/:entityType/:entityId', authorize('audit_logs', 'read'), controller.getAuditTrail);

module.exports = router;
