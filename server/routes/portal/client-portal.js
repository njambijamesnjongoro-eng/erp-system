const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const clientPortalController = require('../../controllers/portal/clientPortalController');

// Public routes (no JWT needed)
router.post('/login', clientPortalController.login);
router.post('/register', clientPortalController.register);

// Protected routes
router.put('/profile', authenticate, authorize('client_portal', 'update'), clientPortalController.updateProfile);
router.get('/invoices', authenticate, authorize('client_portal', 'read'), clientPortalController.getInvoices);
router.get('/tickets', authenticate, authorize('client_portal', 'read'), clientPortalController.getTickets);
router.get('/documents', authenticate, authorize('client_portal', 'read'), clientPortalController.getDocuments);

module.exports = router;
