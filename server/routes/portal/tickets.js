const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const ticketController = require('../../controllers/portal/ticketController');

router.get('/', authenticate, authorize('support_tickets', 'read'), ticketController.getAll);
router.get('/stats', authenticate, authorize('support_tickets', 'read'), ticketController.getStats);
router.get('/:id', authenticate, authorize('support_tickets', 'read'), ticketController.getById);
router.post('/', authenticate, authorize('support_tickets', 'create'), ticketController.create);
router.put('/:id/status', authenticate, authorize('support_tickets', 'update'), ticketController.updateStatus);
router.put('/:id/assign', authenticate, authorize('support_tickets', 'update'), ticketController.assignTicket);
router.get('/:id/messages', authenticate, authorize('support_tickets', 'read'), ticketController.getMessages);
router.post('/:id/messages', authenticate, authorize('support_tickets', 'create'), ticketController.addMessage);
router.post('/:id/attachments', authenticate, authorize('support_tickets', 'create'), upload.single('file'), ticketController.uploadAttachment);
router.delete('/:id', authenticate, authorize('support_tickets', 'delete'), ticketController.deleteTicket);

module.exports = router;
