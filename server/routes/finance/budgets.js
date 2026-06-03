const router = require('express').Router();
const controller = require('../../controllers/finance/budgetController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', authenticate, authorize('budgets', 'read'), controller.list);
router.get('/:id', authenticate, authorize('budgets', 'read'), controller.getById);
router.post('/', authenticate, authorize('budgets', 'create'), controller.create);
router.put('/:id', authenticate, authorize('budgets', 'update'), controller.update);
router.post('/:id/approve', authenticate, authorize('budgets', 'approve'), controller.approve);

module.exports = router;
