const router = require('express').Router();
const controller = require('../../controllers/assets/vendorController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', authenticate, authorize('vendors', 'read'), controller.list);
router.get('/:id', authenticate, authorize('vendors', 'read'), controller.getById);
router.post('/', authenticate, authorize('vendors', 'create'), controller.create);
router.put('/:id', authenticate, authorize('vendors', 'update'), controller.update);

module.exports = router;
