const router = require('express').Router();
const ctrl = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const upload = require('../middleware/upload');

router.use(authenticate);

router.get('/', authorize('System Admin', 'CEO', 'HR Officer', 'Manager', 'Auditor'), ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/upload', authorize('System Admin', 'CEO', 'HR Officer'), upload.single('file'), ctrl.upload);
router.patch('/:id/verify', authorize('System Admin', 'CEO', 'HR Officer'), ctrl.verify);
router.delete('/:id', authorize('System Admin', 'CEO', 'HR Officer'), ctrl.remove);

module.exports = router;
