const router = require('express').Router();
const ctrl = require('../controllers/performanceController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', authorize('System Admin', 'CEO', 'HR Officer', 'Manager', 'Auditor'), ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', authorize('System Admin', 'CEO', 'HR Officer', 'Manager'), ctrl.create);
router.put('/:id', authorize('System Admin', 'CEO', 'HR Officer', 'Manager'), ctrl.update);
router.delete('/:id', authorize('System Admin', 'CEO'), ctrl.remove);

module.exports = router;
