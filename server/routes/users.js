const router = require('express').Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { authorize, checkPermission } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', authorize('System Admin', 'CEO', 'HR Officer', 'Manager', 'Auditor'), userController.list);
router.get('/:id', authorize('System Admin', 'CEO', 'HR Officer', 'Manager', 'Auditor'), userController.getById);
router.put('/:id', authorize('System Admin', 'CEO'), userController.update);
router.patch('/:id/toggle-active', authorize('System Admin', 'CEO'), userController.toggleActive);

module.exports = router;
