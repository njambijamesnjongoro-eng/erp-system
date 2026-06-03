const router = require('express').Router();
const controller = require('../../controllers/admin/systemDashboardController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/overview', authorize('admin_dashboard', 'read'), controller.getSystemOverview);
router.get('/stats', authorize('admin_dashboard', 'read'), controller.getSystemStats);

module.exports = router;
