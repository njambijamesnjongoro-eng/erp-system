const router = require('express').Router();
const controller = require('../../controllers/admin/settingsController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', authorize('system_settings', 'read'), controller.getSettings);
router.get('/categories', authorize('system_settings', 'read'), controller.getCategories);
router.get('/company', authorize('system_settings', 'read'), controller.getCompanyInfo);
router.get('/security-policy', authorize('system_settings', 'read'), controller.getSecurityPolicy);
router.get('/email-config', authorize('system_settings', 'read'), controller.getEmailConfig);
router.get('/:key', authorize('system_settings', 'read'), controller.getSetting);
router.put('/', authorize('system_settings', 'update'), controller.updateSettings);

module.exports = router;
