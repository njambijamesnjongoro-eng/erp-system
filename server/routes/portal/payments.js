const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const paymentController = require('../../controllers/portal/paymentController');

router.get('/', authenticate, authorize('payment_transactions', 'read'), paymentController.getAll);
router.get('/stats', authenticate, authorize('payment_transactions', 'read'), paymentController.getStats);
router.get('/reference/:type/:id', authenticate, authorize('payment_transactions', 'read'), paymentController.getByReference);
router.get('/:id', authenticate, authorize('payment_transactions', 'read'), paymentController.getById);
router.post('/', authenticate, authorize('payment_transactions', 'create'), paymentController.create);
router.post('/mpesa', authenticate, authorize('payment_transactions', 'create'), paymentController.processMpesa);
router.put('/:id/status', authenticate, authorize('payment_transactions', 'update'), paymentController.updateStatus);

module.exports = router;
