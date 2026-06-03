const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('../../controllers/enterprise/workflowController');

router.get('/definitions', authenticate, authorize('workflow_definitions', 'read'), ctrl.getWorkflowDefinitions);
router.get('/definitions/:id', authenticate, authorize('workflow_definitions', 'read'), ctrl.getWorkflowDefinitionById);
router.post('/definitions', authenticate, authorize('workflow_definitions', 'create'), ctrl.createWorkflowDefinition);
router.put('/definitions/:id', authenticate, authorize('workflow_definitions', 'update'), ctrl.updateWorkflowDefinition);
router.delete('/definitions/:id', authenticate, authorize('workflow_definitions', 'delete'), ctrl.deleteWorkflowDefinition);
router.post('/definitions/:id/trigger', authenticate, authorize('workflow_definitions', 'update'), ctrl.triggerWorkflow);

router.get('/instances', authenticate, authorize('workflow_definitions', 'read'), ctrl.getWorkflowInstances);
router.get('/instances/:id', authenticate, authorize('workflow_definitions', 'read'), ctrl.getInstanceById);
router.post('/instances/:id/approve', authenticate, authorize('workflow_definitions', 'update'), ctrl.approveStep);
router.post('/instances/:id/reject', authenticate, authorize('workflow_definitions', 'update'), ctrl.rejectStep);

router.get('/stats', authenticate, authorize('workflow_definitions', 'read'), ctrl.getWorkflowStats);

module.exports = router;
