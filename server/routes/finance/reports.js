const router = require('express').Router();
const controller = require('../../controllers/finance/reportController');
const pdfController = require('../../controllers/finance/reportPdfController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/:type/pdf', authenticate, authorize('reports', 'read'), pdfController.download);
router.get('/profit-loss', authenticate, authorize('reports', 'read'), controller.profitLoss);
router.get('/expenses', authenticate, authorize('reports', 'read'), controller.expenseReport);
router.get('/budgets', authenticate, authorize('reports', 'read'), controller.budgetReport);
router.get('/taxes', authenticate, authorize('reports', 'read'), controller.taxSummary);
router.get('/payroll', authenticate, authorize('reports', 'read'), controller.payrollSummary);
router.get('/balance-sheet', authenticate, authorize('reports', 'read'), controller.balanceSheet);

module.exports = router;
