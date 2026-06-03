const router = require('express').Router();
const controller = require('../../controllers/analytics/dashboardController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/stats', authorize('analytics', 'read'), controller.getExecutiveSummary);
router.get('/employee-stats', authorize('analytics', 'read'), controller.getEmployeeStats);
router.get('/financial-stats', authorize('analytics', 'read'), controller.getFinancialStats);
router.get('/asset-stats', authorize('analytics', 'read'), controller.getAssetStats);
router.get('/procurement-stats', authorize('analytics', 'read'), controller.getProcurementStats);
router.get('/compliance-stats', authorize('compliance', 'read'), controller.getComplianceStats);
router.get('/kpi-cards', authorize('dashboard', 'read'), controller.getKpiCards);
router.get('/widget-data', authorize('dashboard', 'read'), controller.getWidgetData);
router.get('/widgets', authorize('dashboard', 'read'), controller.getWidgets);
router.post('/widgets', authorize('dashboard', 'create'), controller.saveWidgetConfig);
router.put('/widgets/:id', authorize('dashboard', 'update'), controller.saveWidgetConfig);
router.delete('/widgets/:id', authorize('dashboard', 'delete'), controller.deleteWidget);

module.exports = router;
