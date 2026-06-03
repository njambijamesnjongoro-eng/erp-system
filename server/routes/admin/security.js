const router = require('express').Router();
const controller = require('../../controllers/admin/securityController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/events', authorize('security_events', 'read'), controller.getSecurityEvents);
router.get('/summary', authorize('security_events', 'read'), controller.getSecuritySummary);
router.post('/detect', authorize('security_events', 'create'), controller.detectThreats);
router.get('/login-attempts', authorize('security_events', 'read'), controller.getLoginAttempts);
router.get('/blacklist', authorize('security_events', 'read'), controller.getBlacklist);
router.post('/blacklist', authorize('security_events', 'create'), controller.addToBlacklist);
router.delete('/blacklist/:id', authorize('security_events', 'delete'), controller.removeFromBlacklist);
router.get('/whitelist', authorize('security_events', 'read'), controller.getWhitelist);
router.post('/whitelist', authorize('security_events', 'create'), controller.addToWhitelist);
router.delete('/whitelist/:id', authorize('security_events', 'delete'), controller.removeFromWhitelist);
router.get('/events/:id', authorize('security_events', 'read'), controller.getSecurityEvent);
router.put('/events/:id/resolve', authorize('security_events', 'update'), controller.resolveSecurityEvent);

module.exports = router;
