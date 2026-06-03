const router = require('express').Router();
const controller = require('../../controllers/finance/payrollController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/periods', authenticate, authorize('payroll', 'read'), controller.list);
router.get('/periods/:id', authenticate, authorize('payroll', 'read'), controller.getPeriod);
router.post('/periods', authenticate, authorize('payroll', 'create'), controller.createPeriod);
router.post('/periods/:id/process', authenticate, authorize('payroll', 'update'), controller.processPayroll);
router.post('/periods/:id/approve', authenticate, authorize('payroll', 'approve'), controller.approvePayroll);
router.post('/periods/:id/close', authenticate, authorize('payroll', 'update'), controller.closePeriod);

router.get('/salary-structures', authenticate, authorize('payroll', 'read'), controller.getSalaryStructures);
router.post('/salary-structures', authenticate, authorize('payroll', 'create'), controller.createSalaryStructure);

router.get('/payslips', authenticate, authorize('payslips', 'read'), controller.getPayslips);

module.exports = router;
