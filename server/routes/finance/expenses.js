const router = require('express').Router();
const controller = require('../../controllers/finance/expenseController');
const { authenticate, authorize } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

router.get('/', authenticate, authorize('expenses', 'read'), controller.list);
router.get('/categories', authenticate, authorize('expenses', 'read'), controller.getCategories);
router.get('/:id', authenticate, authorize('expenses', 'read'), controller.getById);
router.post('/', authenticate, authorize('expenses', 'create'), controller.create);
router.put('/:id', authenticate, authorize('expenses', 'update'), controller.update);
router.post('/:id/approve', authenticate, authorize('expenses', 'approve'), controller.approve);
router.post('/:id/reject', authenticate, authorize('expenses', 'update'), controller.reject);
router.post('/:id/receipt', authenticate, authorize('expenses', 'update'), upload.single('receipt'), controller.uploadReceipt);

module.exports = router;
