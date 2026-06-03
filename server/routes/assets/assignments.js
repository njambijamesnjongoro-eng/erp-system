const router = require('express').Router();
const controller = require('../../controllers/assets/assignmentController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', authenticate, authorize('asset_assignments', 'read'), controller.list);
router.get('/transfers', authenticate, authorize('asset_transfers', 'read'), controller.getTransfers);
router.post('/checkout', authenticate, authorize('asset_assignments', 'create'), controller.checkout);
router.post('/:id/checkin', authenticate, authorize('asset_assignments', 'update'), controller.checkin);
router.post('/:asset_id/transfer', authenticate, authorize('asset_transfers', 'create'), controller.transfer);

module.exports = router;
