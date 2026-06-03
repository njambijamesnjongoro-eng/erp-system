const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const integrationController = require('../../controllers/portal/integrationController');

router.get('/', authenticate, authorize('integrations', 'read'), integrationController.getAll);
router.get('/stats', authenticate, authorize('integrations', 'read'), integrationController.getStats);
router.get('/webhooks', authenticate, authorize('webhooks', 'read'), integrationController.getWebhooks);
router.get('/webhooks/:id/deliveries', authenticate, authorize('webhooks', 'read'), integrationController.getWebhookDeliveries);
router.post('/webhooks', authenticate, authorize('webhooks', 'create'), integrationController.createWebhook);
router.put('/webhooks/:id', authenticate, authorize('webhooks', 'update'), integrationController.updateWebhook);
router.delete('/webhooks/:id', authenticate, authorize('webhooks', 'delete'), integrationController.deleteWebhook);
router.get('/:id', authenticate, authorize('integrations', 'read'), integrationController.getById);
router.get('/:id/logs', authenticate, authorize('integrations', 'read'), integrationController.getLogs);
router.post('/', authenticate, authorize('integrations', 'create'), integrationController.create);
router.put('/:id', authenticate, authorize('integrations', 'update'), integrationController.update);
router.put('/:id/toggle', authenticate, authorize('integrations', 'update'), integrationController.toggle);
router.delete('/:id', authenticate, authorize('integrations', 'delete'), integrationController.delete);

module.exports = router;
