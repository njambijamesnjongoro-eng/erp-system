const router = require('express').Router();
const controller = require('../../controllers/procurement/goodsReceiptController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', authorize('goods_received_notes', 'read'), controller.list);
router.get('/by-po/:poId', authorize('goods_received_notes', 'read'), controller.getByPO);
router.get('/:id', authorize('goods_received_notes', 'read'), controller.getById);
router.post('/', authorize('goods_received_notes', 'create'), controller.create);
router.post('/:id/receive', authorize('goods_received_notes', 'update'), controller.receive);
router.post('/:id/discrepancy', authorize('delivery_discrepancies', 'create'), controller.reportDiscrepancy);

module.exports = router;
