const router = require('express').Router();
const controller = require('../../controllers/procurement/procurementDashboardController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/stats', authorize('procurement_dashboard', 'read'), controller.getStats);
router.get('/requests-by-status', authorize('procurement_dashboard', 'read'), controller.getRequestsByStatus);
router.get('/spending-by-department', authorize('procurement_dashboard', 'read'), controller.getSpendingByDepartment);
router.get('/monthly-trend', authorize('procurement_dashboard', 'read'), controller.getMonthlyProcurementTrend);
router.get('/top-suppliers', authorize('procurement_dashboard', 'read'), controller.getTopSuppliers);
router.get('/pending-approvals-count', authorize('procurement_dashboard', 'read'), controller.getPendingApprovalsCount);

module.exports = router;
