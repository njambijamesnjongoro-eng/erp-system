const router = require('express').Router();
const ctrl = require('../controllers/securityPhase2Controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// MFA
router.get('/mfa/status', ctrl.getMFAStatus);
router.post('/mfa/setup-totp', ctrl.setupTOTP);
router.post('/mfa/verify-enable-totp', ctrl.verifyAndEnableTOTP);
router.post('/mfa/send-otp', ctrl.sendEmailOTP);
router.post('/mfa/verify-otp', ctrl.verifyEmailOTP);
router.post('/mfa/enable-email-otp', ctrl.enableEmailOTP);
router.post('/mfa/disable', ctrl.disableMFA);
router.post('/mfa/backup-codes', ctrl.generateBackupCodes);
router.post('/mfa/verify-recovery', ctrl.verifyRecoveryCode);

// Devices
router.get('/devices', ctrl.getDevices);
router.post('/devices/:id/approve', ctrl.approveDevice);
router.delete('/devices/:id', ctrl.revokeDevice);

// Login History & Geo
router.get('/login-history', ctrl.getLoginHistory);
router.get('/geo-stats', ctrl.getGeoStats);

// Risk
router.get('/risk/summary', ctrl.getRiskSummary);
router.get('/risk/suspicious-activities', ctrl.getSuspiciousActivities);
router.post('/risk/suspicious-activities/:id/resolve', ctrl.resolveSuspiciousActivity);

// Alerts / Notifications
router.get('/alerts', ctrl.getAlerts);
router.get('/alerts/unread-count', ctrl.getUnreadAlertCount);
router.put('/alerts/:id/read', ctrl.markAlertRead);
router.put('/alerts/read-all', ctrl.markAllAlertsRead);

// Analytics
router.get('/analytics/login-stats', ctrl.getLoginStats);
router.get('/analytics/device-analytics', ctrl.getDeviceAnalytics);
router.get('/analytics/geo-analytics', ctrl.getGeoAnalytics);
router.get('/analytics/risk-heatmap', ctrl.getRiskHeatmap);
router.get('/analytics/global-stats', ctrl.getGlobalLoginStats);

module.exports = router;
