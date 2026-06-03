const router = require('express').Router();
const controller = require('../../controllers/finance/taxController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', authenticate, authorize('taxes', 'read'), controller.list);
router.post('/', authenticate, authorize('taxes', 'create'), controller.create);
router.post('/:id/pay', authenticate, authorize('taxes', 'update'), controller.pay);

module.exports = router;
