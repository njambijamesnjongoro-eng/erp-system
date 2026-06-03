const router = require('express').Router();
const controller = require('../../controllers/admin/auditController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', authorize('audit_trail', 'read'), controller.getAuditLogs);
router.get('/summary', authorize('audit_trail', 'read'), controller.getAuditSummary);
router.get('/export', authorize('audit_trail', 'export'), controller.exportAuditLogs);
router.get('/verify', authorize('audit_trail', 'read'), controller.verifyAuditIntegrity);
router.get('/:id', authorize('audit_trail', 'read'), controller.getAuditLog);

module.exports = router;
