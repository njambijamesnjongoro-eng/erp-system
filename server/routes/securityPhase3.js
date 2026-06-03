const router = require('express').Router();
const ctrl = require('../controllers/securityPhase3Controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Dashboard (admin only)
router.get('/dashboard', authorize('system_settings', 'read'), ctrl.getDashboard);
router.get('/overview', authorize('system_settings', 'read'), ctrl.getSecurityOverview);

// Audit logs
router.get('/audit-logs', authorize('system_logs', 'read'), ctrl.getAuditLogs);
router.get('/audit-logs/summary', authorize('system_logs', 'read'), ctrl.getAuditSummary);

// Threat detection
router.get('/threats', authorize('security_events', 'read'), ctrl.getThreats);
router.post('/threats/:id/resolve', authorize('security_events', 'update'), ctrl.resolveThreat);

// Infrastructure health
router.get('/health', authorize('system_settings', 'read'), ctrl.getHealth);
router.get('/performance', authorize('system_settings', 'read'), ctrl.getPerformance);

// Backups
router.post('/backups', authorize('system_settings', 'create'), ctrl.createBackup);
router.get('/backups', authorize('system_settings', 'read'), ctrl.getBackupLogs);
router.post('/backups/:id/verify', authorize('system_settings', 'read'), ctrl.verifyBackup);

// Rate limiting
router.get('/rate-limits', authorize('system_settings', 'read'), ctrl.getRateLimitStats);

// Gateway
router.get('/gateway', authorize('system_settings', 'read'), ctrl.getGatewayStats);

// Encryption key rotation
router.post('/encryption/rotate', authorize('system_settings', 'update'), ctrl.rotateEncryptionKey);

module.exports = router;
