const router = require('express').Router();
const controller = require('../../controllers/admin/apiManagementController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', authorize('api_keys', 'read'), controller.getApiKeys);
router.post('/', authorize('api_keys', 'create'), controller.createApiKey);
router.get('/usage', authorize('api_keys', 'read'), controller.getApiUsage);
router.get('/logs', authorize('system_logs', 'read'), controller.getApiLogs);
router.put('/:id', authorize('api_keys', 'update'), controller.updateApiKey);
router.delete('/:id', authorize('api_keys', 'delete'), controller.revokeApiKey);

module.exports = router;
