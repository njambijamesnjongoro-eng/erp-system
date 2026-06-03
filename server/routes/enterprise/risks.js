const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('../../controllers/enterprise/riskController');

router.get('/dashboard', authenticate, authorize('risk_assessments', 'read'), ctrl.getRiskDashboard);
router.get('/stats', authenticate, authorize('risk_assessments', 'read'), ctrl.getRiskStats);
router.get('/', authenticate, authorize('risk_assessments', 'read'), ctrl.getRiskAssessments);
router.get('/:id', authenticate, authorize('risk_assessments', 'read'), ctrl.getRiskAssessmentById);
router.post('/', authenticate, authorize('risk_assessments', 'create'), ctrl.createRiskAssessment);
router.put('/:id', authenticate, authorize('risk_assessments', 'update'), ctrl.updateRiskAssessment);
router.delete('/:id', authenticate, authorize('risk_assessments', 'delete'), ctrl.deleteRiskAssessment);

module.exports = router;
