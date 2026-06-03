const router = require('express').Router();
const controller = require('../../controllers/finance/accountController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/chart', authenticate, authorize('accounts', 'read'), controller.getChartOfAccounts);
router.post('/chart', authenticate, authorize('accounts', 'create'), controller.createAccount);
router.get('/transactions', authenticate, authorize('transactions', 'read'), controller.listTransactions);
router.post('/transactions', authenticate, authorize('transactions', 'create'), controller.createTransaction);
router.get('/invoices', authenticate, authorize('invoices', 'read'), controller.listInvoices);
router.post('/invoices', authenticate, authorize('invoices', 'create'), controller.createInvoice);

module.exports = router;
