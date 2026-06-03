const router = require('express').Router();
const controller = require('../../controllers/procurement/supplierController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', authorize('procurement_suppliers', 'read'), controller.list);
router.get('/expiring-contracts', authorize('procurement_suppliers', 'read'), controller.getExpiringContracts);
router.get('/:id', authorize('procurement_suppliers', 'read'), controller.getById);
router.get('/:id/contracts', authorize('supplier_contracts', 'read'), controller.getContracts);
router.get('/:id/performance', authorize('supplier_performance', 'read'), controller.getPerformance);
router.post('/', authorize('procurement_suppliers', 'create'), controller.create);
router.post('/:id/contracts', authorize('supplier_contracts', 'create'), controller.createContract);
router.post('/:id/rate', authorize('supplier_performance', 'create'), controller.rateSupplier);
router.put('/:id', authorize('procurement_suppliers', 'update'), controller.update);
router.put('/:id/blacklist', authorize('procurement_suppliers', 'update'), controller.blacklist);
router.put('/:id/whitelist', authorize('procurement_suppliers', 'update'), controller.whitelist);

module.exports = router;
