const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('../../controllers/enterprise/complianceController');

router.get('/frameworks', authenticate, authorize('compliance_frameworks', 'read'), ctrl.getFrameworks);
router.get('/frameworks/:id', authenticate, authorize('compliance_frameworks', 'read'), ctrl.getFrameworkById);
router.post('/frameworks', authenticate, authorize('compliance_frameworks', 'create'), ctrl.createFramework);
router.put('/frameworks/:id', authenticate, authorize('compliance_frameworks', 'update'), ctrl.updateFramework);
router.delete('/frameworks/:id', authenticate, authorize('compliance_frameworks', 'delete'), ctrl.deleteFramework);

router.get('/requirements', authenticate, authorize('compliance_requirements', 'read'), ctrl.getRequirements);
router.get('/requirements/:id', authenticate, authorize('compliance_requirements', 'read'), ctrl.getRequirementById);
router.post('/requirements', authenticate, authorize('compliance_requirements', 'create'), ctrl.createRequirement);
router.put('/requirements/:id', authenticate, authorize('compliance_requirements', 'update'), ctrl.updateRequirement);
router.delete('/requirements/:id', authenticate, authorize('compliance_requirements', 'delete'), ctrl.deleteRequirement);

router.get('/audits', authenticate, authorize('compliance_audits', 'read'), ctrl.getAudits);
router.get('/audits/:id', authenticate, authorize('compliance_audits', 'read'), ctrl.getAuditById);
router.post('/audits', authenticate, authorize('compliance_audits', 'create'), ctrl.createAudit);
router.put('/audits/:id', authenticate, authorize('compliance_audits', 'update'), ctrl.updateAudit);
router.delete('/audits/:id', authenticate, authorize('compliance_audits', 'delete'), ctrl.deleteAudit);

router.get('/stats', authenticate, authorize('compliance_frameworks', 'read'), ctrl.getComplianceStats);
router.get('/dashboard', authenticate, authorize('compliance_frameworks', 'read'), ctrl.getComplianceDashboard);

module.exports = router;
