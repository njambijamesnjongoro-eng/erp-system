const router = require('express').Router();
const controller = require('../../controllers/assets/sparePartController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', authenticate, authorize('spare_parts', 'read'), controller.list);
router.get('/low-stock', authenticate, authorize('spare_parts', 'read'), controller.getLowStock);
router.get('/:id', authenticate, authorize('spare_parts', 'read'), controller.getById);
router.post('/', authenticate, authorize('spare_parts', 'create'), controller.create);
router.put('/:id', authenticate, authorize('spare_parts', 'update'), controller.update);
router.post('/:id/stock-in', authenticate, authorize('stock_movements', 'create'), controller.addStock);
router.post('/:id/stock-out', authenticate, authorize('stock_movements', 'create'), controller.removeStock);

module.exports = router;
