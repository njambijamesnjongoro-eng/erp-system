const router = require('express').Router();
const controller = require('../../controllers/analytics/notificationController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', authorize('notifications', 'read'), controller.getNotifications);
router.get('/unread-count', authorize('notifications', 'read'), controller.getUnreadCount);
router.get('/preferences', authorize('notifications', 'read'), controller.getPreferences);
router.put('/preferences', authorize('notifications', 'update'), controller.updatePreferences);
router.put('/read-all', authorize('notifications', 'update'), controller.markAllAsRead);
router.put('/:id/read', authorize('notifications', 'update'), controller.markAsRead);
router.put('/:id/archive', authorize('notifications', 'update'), controller.archiveNotification);
router.delete('/:id', authorize('notifications', 'delete'), controller.deleteNotification);

module.exports = router;
