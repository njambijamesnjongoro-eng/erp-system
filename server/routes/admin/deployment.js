const router = require('express').Router();
const controller = require('../../controllers/admin/deploymentController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/health', authorize('deployment', 'read'), controller.getSystemHealth);
router.get('/performance', authorize('system_logs', 'read'), controller.getPerformanceMetrics);
router.get('/environment', authorize('deployment', 'read'), controller.getEnvironmentInfo);
router.get('/storage', authorize('deployment', 'read'), controller.getStorageInfo);

module.exports = router;
