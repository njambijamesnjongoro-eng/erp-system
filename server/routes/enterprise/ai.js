const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('../../controllers/enterprise/aiController');

router.get('/analyses', authenticate, authorize('ai_analytics', 'read'), ctrl.getAnalyses);
router.get('/analyses/:id', authenticate, authorize('ai_analytics', 'read'), ctrl.getAnalysisById);
router.post('/analyses', authenticate, authorize('ai_analytics', 'create'), ctrl.createAnalysis);
router.patch('/analyses/:id/action', authenticate, authorize('ai_analytics', 'update'), ctrl.actionAnalysis);

router.post('/detect-anomalies', authenticate, authorize('ai_analytics', 'create'), ctrl.detectAnomalies);
router.post('/predict-maintenance', authenticate, authorize('ai_analytics', 'create'), ctrl.predictMaintenance);
router.post('/procurement-anomalies', authenticate, authorize('ai_analytics', 'create'), ctrl.detectProcurementAnomalies);
router.post('/payroll-anomalies', authenticate, authorize('ai_analytics', 'create'), ctrl.detectPayrollAnomalies);
router.post('/generate-insights', authenticate, authorize('ai_analytics', 'create'), ctrl.generateInsights);

router.get('/models', authenticate, authorize('ai_models', 'read'), ctrl.getModels);
router.get('/models/:id', authenticate, authorize('ai_models', 'read'), ctrl.getModelById);
router.post('/models', authenticate, authorize('ai_models', 'create'), ctrl.createModel);
router.put('/models/:id', authenticate, authorize('ai_models', 'update'), ctrl.updateModel);
router.post('/models/:id/train', authenticate, authorize('ai_models', 'update'), ctrl.trainModel);
router.delete('/models/:id', authenticate, authorize('ai_models', 'delete'), ctrl.deleteModel);

router.get('/stats', authenticate, authorize('ai_analytics', 'read'), ctrl.getAIStats);

module.exports = router;
