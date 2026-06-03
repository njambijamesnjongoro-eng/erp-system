const router = require('express').Router();
const controller = require('../../controllers/procurement/procurementController');
const { authenticate, authorize } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

router.use(authenticate);

router.get('/', authorize('procurement_requests', 'read'), controller.list);
router.get('/categories', authorize('procurement_categories', 'read'), controller.getCategories);
router.get('/:id', authorize('procurement_requests', 'read'), controller.getById);
router.get('/:id/attachments', authorize('procurement_requests', 'read'), controller.getAttachments);
router.post('/', authorize('procurement_requests', 'create'), controller.create);
router.post('/:id/submit', authorize('procurement_requests', 'update'), controller.submit);
router.post('/:id/attachments', authorize('procurement_requests', 'create'), upload.single('file'), controller.uploadAttachment);
router.put('/:id', authorize('procurement_requests', 'update'), controller.update);
router.delete('/:id', authorize('procurement_requests', 'delete'), controller.delete);

module.exports = router;
