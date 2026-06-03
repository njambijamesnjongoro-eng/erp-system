const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const messageController = require('../../controllers/portal/messageController');

router.get('/sent', authenticate, authorize('internal_messages', 'read'), messageController.getSent);
router.get('/received', authenticate, authorize('internal_messages', 'read'), messageController.getReceived);
router.get('/unread-count', authenticate, authorize('internal_messages', 'read'), messageController.getUnreadCount);
router.post('/', authenticate, authorize('internal_messages', 'create'), messageController.send);
router.post('/broadcast', authenticate, authorize('internal_messages', 'create'), messageController.sendBroadcast);
router.put('/:id/read', authenticate, authorize('internal_messages', 'update'), messageController.markRead);

module.exports = router;
