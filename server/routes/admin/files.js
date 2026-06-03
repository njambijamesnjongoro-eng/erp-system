const router = require('express').Router();
const controller = require('../../controllers/admin/fileController');
const { authenticate, authorize } = require('../../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.use(authenticate);

router.get('/', authorize('file_storage', 'read'), controller.listFiles);
router.get('/stats', authorize('file_storage', 'read'), controller.getStorageStats);
router.post('/upload', authorize('file_storage', 'create'), upload.single('file'), controller.uploadFile);
router.get('/:id', authorize('file_storage', 'read'), controller.getFile);
router.get('/:id/download', authorize('file_storage', 'read'), controller.getFile);
router.delete('/:id', authorize('file_storage', 'delete'), controller.deleteFile);

module.exports = router;
