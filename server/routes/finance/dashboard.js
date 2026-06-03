const router = require('express').Router();
const controller = require('../../controllers/finance/financeDashboardController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', authenticate, authorize('finance_dashboard', 'read'), controller.getDashboardStats);

module.exports = router;
