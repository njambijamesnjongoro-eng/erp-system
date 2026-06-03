const router = require('express').Router();
const controller = require('../../controllers/analytics/systemMonitorController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/health', authorize('system_monitor', 'read'), controller.getSystemHealth);
router.get('/performance', authorize('system_monitor', 'read'), controller.getPerformanceMetrics);
router.get('/user-activity', authorize('system_monitor', 'read'), controller.getUserActivity);
router.get('/errors', authorize('system_monitor', 'read'), controller.getErrorLogs);
router.get('/active-users', authorize('system_monitor', 'read'), controller.getActiveUsers);

module.exports = router;
