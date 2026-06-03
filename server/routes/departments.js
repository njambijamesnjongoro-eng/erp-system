const router = require('express').Router();
const departmentController = require('../controllers/departmentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', departmentController.list);
router.get('/:id', departmentController.getById);
router.post('/', authorize('System Admin', 'CEO'), departmentController.create);
router.put('/:id', authorize('System Admin', 'CEO'), departmentController.update);
router.delete('/:id', authorize('System Admin'), departmentController.remove);

module.exports = router;
