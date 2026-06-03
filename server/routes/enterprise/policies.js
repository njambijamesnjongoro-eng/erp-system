const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('../../controllers/enterprise/policyController');

router.get('/my-acknowledgements', authenticate, authorize('policies', 'read'), ctrl.getEmployeeAcknowledgements);
router.get('/stats', authenticate, authorize('policies', 'read'), ctrl.getPolicyStats);
router.get('/', authenticate, authorize('policies', 'read'), ctrl.getPolicies);
router.get('/:id', authenticate, authorize('policies', 'read'), ctrl.getPolicyById);
router.post('/', authenticate, authorize('policies', 'create'), ctrl.createPolicy);
router.put('/:id', authenticate, authorize('policies', 'update'), ctrl.updatePolicy);
router.delete('/:id', authenticate, authorize('policies', 'delete'), ctrl.deletePolicy);
router.post('/:id/publish', authenticate, authorize('policies', 'update'), ctrl.publishPolicy);
router.post('/:id/acknowledge', authenticate, authorize('policies', 'update'), ctrl.acknowledgePolicy);
router.get('/:id/acknowledgements', authenticate, authorize('policies', 'read'), ctrl.getPolicyAcknowledgements);

module.exports = router;
