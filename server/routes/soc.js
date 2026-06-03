const router = require('express').Router();
const ctrl = require('../controllers/socController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Dashboard
router.get('/dashboard', ctrl.getDashboard);
router.get('/security-score', ctrl.getSecurityScore);
router.get('/live-feed', ctrl.getLiveFeed);

// Detection Engine
router.post('/detect', ctrl.detectEvent);

// Alerts
router.get('/alerts', ctrl.getAlerts);
router.get('/alerts/stats', ctrl.getAlertStats);
router.post('/alerts/:id/acknowledge', ctrl.acknowledgeAlert);
router.post('/alerts/:id/assign', ctrl.assignAlert);
router.post('/alerts/:id/resolve', ctrl.resolveAlert);

// Incidents
router.get('/incidents', ctrl.getIncidents);
router.get('/incidents/stats', ctrl.getIncidentStats);
router.get('/incidents/:id', ctrl.getIncident);
router.post('/incidents', ctrl.createIncident);
router.put('/incidents/:id', ctrl.updateIncident);
router.post('/incidents/:id/cases', ctrl.addCaseEntry);

// User Risk
router.post('/user-risk/:userId/calculate', ctrl.calculateUserRisk);
router.get('/user-risk/:userId/history', ctrl.getUserRiskHistory);
router.get('/user-risks', ctrl.getAllUserRisks);
router.get('/user-risk/overview', ctrl.getRiskOverview);

// Event Correlations
router.get('/correlations', ctrl.getCorrelations);
router.post('/correlations/evaluate', ctrl.evaluateCorrelation);

// Threat Intelligence
router.get('/threat-iocs', ctrl.getThreatIOCs);
router.post('/threat-iocs', authorize('system_settings', 'update'), ctrl.addThreatIOC);
router.post('/threat-iocs/:id/deactivate', ctrl.deactivateThreatIOC);

// Threat Records
router.get('/threat-records', ctrl.getThreatRecords);
router.get('/threat-records/stats', ctrl.getThreatStats);

// Attack Events
router.get('/attacks', ctrl.getAttackEvents);
router.get('/attacks/stats', ctrl.getAttackStats);
router.post('/attacks/block-ip/:ip', ctrl.blockIP);

// Notifications
router.get('/notifications', ctrl.getNotifications);
router.get('/notifications/unread-count', ctrl.getUnreadNotificationCount);
router.post('/notifications/:id/read', ctrl.markNotificationRead);
router.post('/notifications/read-all', ctrl.markAllNotificationsRead);

// Reports
router.get('/reports', ctrl.getReports);
router.post('/reports/generate', ctrl.generateReport);

module.exports = router;
