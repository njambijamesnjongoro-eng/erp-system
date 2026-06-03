const router = require('express').Router();
const controller = require('../../controllers/procurement/purchaseOrderController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', authorize('purchase_orders', 'read'), controller.list);
router.get('/by-request/:requestId', authorize('purchase_orders', 'read'), controller.getByRequest);
router.get('/:id', authorize('purchase_orders', 'read'), controller.getById);
router.post('/', authorize('purchase_orders', 'create'), controller.create);
router.put('/:id', authorize('purchase_orders', 'update'), controller.update);
router.post('/:id/approve', authorize('purchase_orders', 'approve'), controller.approve);
router.post('/:id/send', authorize('purchase_orders', 'update'), controller.send);
router.post('/:id/cancel', authorize('purchase_orders', 'delete'), controller.cancel);

module.exports = router;
