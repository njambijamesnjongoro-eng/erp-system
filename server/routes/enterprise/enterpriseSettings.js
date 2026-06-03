const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('../../controllers/enterprise/enterpriseSettingsController');

router.get('/api-keys/usage-stats', authenticate, authorize('api_keys', 'read'), ctrl.getApiUsageStats);
router.get('/api-keys', authenticate, authorize('api_keys', 'read'), ctrl.getApiKeys);
router.get('/api-keys/:id', authenticate, authorize('api_keys', 'read'), ctrl.getApiKeyById);
router.post('/api-keys', authenticate, authorize('api_keys', 'create'), ctrl.createApiKey);
router.put('/api-keys/:id', authenticate, authorize('api_keys', 'update'), ctrl.updateApiKey);
router.post('/api-keys/:id/revoke', authenticate, authorize('api_keys', 'update'), ctrl.revokeApiKey);
router.delete('/api-keys/:id', authenticate, authorize('api_keys', 'delete'), ctrl.deleteApiKey);
router.get('/api-keys/:id/logs', authenticate, authorize('api_keys', 'read'), ctrl.getApiLogs);

router.get('/governance', authenticate, authorize('enterprise_settings', 'read'), ctrl.getGovernanceRules);
router.get('/governance/:id', authenticate, authorize('enterprise_settings', 'read'), ctrl.getGovernanceRuleById);
router.post('/governance', authenticate, authorize('enterprise_settings', 'create'), ctrl.createGovernanceRule);
router.put('/governance/:id', authenticate, authorize('enterprise_settings', 'update'), ctrl.updateGovernanceRule);
router.delete('/governance/:id', authenticate, authorize('enterprise_settings', 'delete'), ctrl.deleteGovernanceRule);

router.get('/orchestration', authenticate, authorize('enterprise_settings', 'read'), ctrl.getOrchestrationRules);
router.get('/orchestration/:id', authenticate, authorize('enterprise_settings', 'read'), ctrl.getOrchestrationRuleById);
router.post('/orchestration', authenticate, authorize('enterprise_settings', 'create'), ctrl.createOrchestrationRule);
router.put('/orchestration/:id', authenticate, authorize('enterprise_settings', 'update'), ctrl.updateOrchestrationRule);
router.delete('/orchestration/:id', authenticate, authorize('enterprise_settings', 'delete'), ctrl.deleteOrchestrationRule);

router.post('/search', authenticate, authorize('enterprise_settings', 'create'), ctrl.search);
router.post('/search/reindex', authenticate, authorize('enterprise_settings', 'update'), ctrl.reindexModule);

module.exports = router;
