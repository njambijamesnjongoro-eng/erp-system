const router = require('express').Router();
const ctrl = require('../controllers/insuranceController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', authorize('System Admin', 'CEO', 'HR Officer', 'Auditor'), ctrl.list);
router.get('/expiring', authorize('System Admin', 'CEO', 'HR Officer'), ctrl.getExpiring);
router.get('/:id', authorize('System Admin', 'CEO', 'HR Officer', 'Employee'), ctrl.getById);
router.post('/', authorize('System Admin', 'CEO', 'HR Officer'), ctrl.create);
router.put('/:id', authorize('System Admin', 'CEO', 'HR Officer'), ctrl.update);
router.delete('/:id', authorize('System Admin', 'CEO'), ctrl.remove);

module.exports = router;
