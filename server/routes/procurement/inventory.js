const router = require('express').Router();
const controller = require('../../controllers/procurement/inventoryController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', authorize('inventory_items', 'read'), controller.list);
router.get('/categories', authorize('inventory_categories', 'read'), controller.getCategories);
router.get('/stock-value', authorize('inventory_items', 'read'), controller.getStockValue);
router.get('/low-stock', authorize('inventory_items', 'read'), controller.getLowStock);
router.get('/:id', authorize('inventory_items', 'read'), controller.getById);
router.get('/:id/movements', authorize('inventory_items', 'read'), controller.getMovements);
router.post('/', authorize('inventory_items', 'create'), controller.create);
router.post('/categories', authorize('inventory_categories', 'create'), controller.createCategory);
router.post('/movements', authorize('procurement_stock_movements', 'create'), controller.recordMovement);
router.put('/:id', authorize('inventory_items', 'update'), controller.update);
router.delete('/:id', authorize('inventory_items', 'delete'), controller.delete);

module.exports = router;
