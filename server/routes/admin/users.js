const router = require('express').Router();
const controller = require('../../controllers/admin/userManagementController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/login-history', authorize('system_logs', 'read'), controller.getLoginHistory);
router.get('/active-sessions', authorize('user_sessions', 'read'), controller.getUserSessions);
router.get('/', authorize('system_settings', 'read'), controller.listUsers);
router.post('/', authorize('system_settings', 'create'), controller.createUser);
router.get('/:id', authorize('system_settings', 'read'), controller.getUser);
router.put('/:id', authorize('system_settings', 'update'), controller.updateUser);
router.delete('/:id', authorize('system_settings', 'delete'), controller.deleteUser);
router.put('/:id/activate', authorize('system_settings', 'update'), controller.activateUser);
router.put('/:id/deactivate', authorize('system_settings', 'update'), controller.deactivateUser);
router.put('/:id/lock', authorize('system_settings', 'update'), controller.lockUser);
router.put('/:id/unlock', authorize('system_settings', 'update'), controller.unlockUser);
router.get('/:id/sessions', authorize('user_sessions', 'read'), controller.getUserSessions);
router.delete('/:id/sessions/:sessionId', authorize('user_sessions', 'delete'), controller.terminateUserSession);
router.post('/:id/force-logout', authorize('user_sessions', 'delete'), controller.forceLogout);

module.exports = router;
