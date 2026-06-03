const router = require('express').Router();
const controller = require('../../controllers/assets/assetDashboardController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', authenticate, authorize('asset_dashboard', 'read'), controller.getDashboardStats);

module.exports = router;
