const router = require('express').Router();
const ctrl = require('../controllers/leaveController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/types', ctrl.listLeaveTypes);
router.get('/requests', authorize('System Admin', 'CEO', 'HR Officer', 'Manager', 'Auditor'), ctrl.listRequests);
router.get('/requests/:id', ctrl.getRequestById);
router.get('/balances', ctrl.getBalances);
router.post('/requests', authorize('System Admin', 'CEO', 'HR Officer', 'Manager', 'Employee'), ctrl.createRequest);
router.post('/balances/init', authorize('System Admin', 'CEO', 'HR Officer'), ctrl.initBalances);
router.patch('/requests/:id/approve', authorize('System Admin', 'CEO', 'HR Officer', 'Manager'), ctrl.approveRequest);

module.exports = router;
