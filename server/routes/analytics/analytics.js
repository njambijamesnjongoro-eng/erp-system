const router = require('express').Router();
const controller = require('../../controllers/analytics/analyticsController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/revenue-trends', authorize('analytics', 'read'), controller.getRevenueTrends);
router.get('/department-comparison', authorize('analytics', 'read'), controller.getDepartmentComparison);
router.get('/year-over-year', authorize('analytics', 'read'), controller.getYearOverYear);
router.get('/kpi-records', authorize('analytics', 'read'), controller.getKpiRecords);
router.post('/kpi-records', authorize('analytics', 'create'), controller.recordKpi);

module.exports = router;
