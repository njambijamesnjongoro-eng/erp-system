const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const announcementController = require('../../controllers/portal/announcementController');

router.get('/', authenticate, authorize('announcements', 'read'), announcementController.getAll);
router.get('/:id', authenticate, authorize('announcements', 'read'), announcementController.getById);
router.post('/', authenticate, authorize('announcements', 'create'), announcementController.create);
router.put('/:id/read', authenticate, authorize('announcements', 'update'), announcementController.markRead);
router.delete('/:id', authenticate, authorize('announcements', 'delete'), announcementController.delete);

module.exports = router;
