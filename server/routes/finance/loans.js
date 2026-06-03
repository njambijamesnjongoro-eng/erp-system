const router = require('express').Router();
const controller = require('../../controllers/finance/loanController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', authenticate, authorize('loans', 'read'), controller.list);
router.get('/:id', authenticate, authorize('loans', 'read'), controller.getById);
router.post('/', authenticate, authorize('loans', 'create'), controller.create);
router.post('/:id/pay', authenticate, authorize('loans', 'update'), controller.makePayment);

router.get('/employee/list', authenticate, authorize('loans', 'read'), controller.listEmployeeLoans);
router.post('/employee', authenticate, authorize('loans', 'create'), controller.createEmployeeLoan);

module.exports = router;
