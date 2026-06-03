const router = require('express').Router();
const controller = require('../../controllers/assets/assetController');
const { authenticate, authorize } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

router.get('/', authenticate, authorize('assets', 'read'), controller.list);
router.get('/categories', authenticate, authorize('asset_categories', 'read'), controller.getCategories);
router.get('/disposals', authenticate, authorize('asset_disposal', 'read'), controller.getDisposals);
router.get('/:id', authenticate, authorize('assets', 'read'), controller.getById);
router.post('/', authenticate, authorize('assets', 'create'), controller.create);
router.put('/:id', authenticate, authorize('assets', 'update'), controller.update);
router.post('/:id/documents', authenticate, authorize('asset_documents', 'create'), upload.single('file'), controller.uploadDocument);
router.post('/:id/depreciation', authenticate, authorize('depreciation', 'create'), controller.runDepreciation);

router.post('/categories', authenticate, authorize('asset_categories', 'create'), controller.createCategory);
router.post('/disposals', authenticate, authorize('asset_disposal', 'create'), controller.createDisposal);
router.post('/disposals/:id/approve', authenticate, authorize('asset_disposal', 'approve'), controller.approveDisposal);

module.exports = router;
