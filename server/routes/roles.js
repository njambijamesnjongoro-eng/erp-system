const router = require('express').Router();
const roleController = require('../controllers/roleController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', authorize('System Admin', 'CEO', 'HR Officer', 'Auditor'), roleController.list);
router.get('/:id', authorize('System Admin', 'CEO', 'HR Officer', 'Auditor'), roleController.getById);
router.post('/', authorize('System Admin'), roleController.create);
router.put('/:id', authorize('System Admin'), roleController.update);
router.delete('/:id', authorize('System Admin'), roleController.remove);
router.put('/:id/permissions', authorize('System Admin'), roleController.assignPermissions);

module.exports = router;
