const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const vendorPortalController = require('../../controllers/portal/vendorPortalController');

router.post('/login', vendorPortalController.login);
router.get('/purchase-orders', authenticate, authorize('supplier_portal', 'read'), vendorPortalController.getPurchaseOrders);
router.get('/quotations', authenticate, authorize('supplier_portal', 'read'), vendorPortalController.getQuotations);
router.post('/quotations', authenticate, authorize('supplier_portal', 'create'), vendorPortalController.submitQuotation);
router.get('/deliveries', authenticate, authorize('supplier_portal', 'read'), vendorPortalController.getDeliveries);
router.put('/profile', authenticate, authorize('supplier_portal', 'update'), vendorPortalController.updateProfile);

module.exports = router;
