const router = require('express').Router();
const ctrl = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', authorize('System Admin', 'CEO', 'HR Officer', 'Manager', 'Auditor'), ctrl.list);
router.get('/summary', authorize('System Admin', 'CEO', 'HR Officer', 'Manager'), ctrl.getSummary);
router.get('/:id', authorize('System Admin', 'CEO', 'HR Officer', 'Manager'), ctrl.getById);
router.get('/today/:employeeId', ctrl.getTodayStatus);
router.post('/clock-in', authorize('System Admin', 'CEO', 'HR Officer', 'Manager', 'Employee'), ctrl.clockIn);
router.post('/clock-out', authorize('System Admin', 'CEO', 'HR Officer', 'Manager', 'Employee'), ctrl.clockOut);

module.exports = router;
