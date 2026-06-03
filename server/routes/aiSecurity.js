const router = require('express').Router();
const aiCtrl = require('../controllers/aiSecurityController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Dashboard
router.get('/dashboard', aiCtrl.getDashboard);

// Fraud Detection
router.get('/fraud-detections', aiCtrl.getFraudDetections);
router.get('/fraud-detections/stats', aiCtrl.getFraudStats);
router.post('/fraud-detections', aiCtrl.recordFraudDetection);
router.post('/fraud-detections/run-ghost-employees', aiCtrl.runGhostEmployeeDetection);
router.post('/fraud-detections/run-duplicate-payments', aiCtrl.runDuplicatePaymentDetection);

// Behavior Analytics
router.post('/behavior-events', aiCtrl.recordBehaviorEvent);
router.post('/behavior/profiles/:userId/analyze', aiCtrl.analyzeUserBehavior);
router.get('/behavior/profiles', aiCtrl.getUserBehaviorProfiles);

// Anomaly Detection
router.get('/anomalies', aiCtrl.getAnomalyEvents);
router.post('/anomalies', aiCtrl.recordAnomaly);
router.post('/anomalies/run-payroll', aiCtrl.runPayrollAnomalyDetection);

// Risk Scoring
router.post('/risk/calculate/:userId', aiCtrl.calculateUserRiskScore);
router.get('/risk/scores', aiCtrl.getRiskScores);
router.get('/risk/overview', aiCtrl.getRiskOverview);

// Predictions
router.get('/predictions', aiCtrl.getPredictions);
router.post('/predictions', aiCtrl.generatePrediction);
router.post('/predictions/run', aiCtrl.runPredictions);

// Recommendations
router.get('/recommendations', aiCtrl.getRecommendations);
router.get('/recommendations/stats', aiCtrl.getRecommendationStats);

// Insider Threats
router.get('/insider-threats', aiCtrl.getInsiderThreats);
router.post('/insider-threats', aiCtrl.recordInsiderThreat);
router.post('/insider-threats/run-detection', aiCtrl.runInsiderThreatDetection);

// Threat Correlation
router.get('/correlations', aiCtrl.getThreatCorrelations);
router.post('/correlations/run', aiCtrl.runCorrelation);

// Vendor Risk
router.get('/vendor-risks', aiCtrl.getVendorRiskProfiles);

// Automation
router.get('/automation', aiCtrl.getAutomationActions);
router.post('/automation', aiCtrl.createAutomationAction);

// Investigation Assistant
router.post('/investigation/summary', aiCtrl.generateInvestigationSummary);

// Heatmaps
router.get('/heatmaps', aiCtrl.getHeatmaps);
router.post('/heatmaps/calculate', aiCtrl.calculateHeatmaps);

// Run All Detections
router.post('/run-all', aiCtrl.runAllDetections);

module.exports = router;
