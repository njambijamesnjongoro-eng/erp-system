const router = require('express').Router();
const employeeController = require('../controllers/employeeController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const upload = require('../middleware/upload');

router.use(authenticate);

router.get('/', authorize('System Admin', 'CEO', 'HR Officer', 'Manager', 'Finance Officer', 'Auditor'), employeeController.list);
router.get('/:id', authorize('System Admin', 'CEO', 'HR Officer', 'Manager', 'Finance Officer', 'Auditor'), employeeController.getById);
router.post('/', authorize('System Admin', 'CEO', 'HR Officer'), employeeController.create);
router.put('/:id', authorize('System Admin', 'CEO', 'HR Officer'), employeeController.update);
router.delete('/:id', authorize('System Admin', 'CEO'), employeeController.remove);
router.post('/:id/photo', authorize('System Admin', 'CEO', 'HR Officer'), upload.single('photo'), employeeController.uploadPhoto);

module.exports = router;
