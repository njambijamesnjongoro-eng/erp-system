const router = require('express').Router();
const controller = require('../../controllers/procurement/warehouseController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', authorize('warehouses', 'read'), controller.list);
router.get('/:id', authorize('warehouses', 'read'), controller.getById);
router.get('/:id/bins', authorize('warehouse_bins', 'read'), controller.getBins);
router.get('/:id/stock', authorize('inventory_items', 'read'), controller.getStockByWarehouse);
router.post('/', authorize('warehouses', 'create'), controller.create);
router.post('/:id/bins', authorize('warehouse_bins', 'create'), controller.createBin);
router.put('/:id', authorize('warehouses', 'update'), controller.update);
router.put('/:id/bins/:binId', authorize('warehouse_bins', 'update'), controller.updateBin);

module.exports = router;
