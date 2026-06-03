const aiService = require('../services/aiSecurityService');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ============= AI-SOC DASHBOARD =============
exports.getDashboard = wrap(async (req, res) => {
  const data = await aiService.getAISecurityDashboard();
  res.json({ success: true, data });
});

// ============= FRAUD DETECTION =============
exports.getFraudDetections = wrap(async (req, res) => {
  const result = await aiService.getFraudDetections(req.query);
  res.json({ success: true, data: result });
});

exports.getFraudStats = wrap(async (req, res) => {
  const result = await aiService.getFraudStats();
  res.json({ success: true, data: result });
});

exports.runGhostEmployeeDetection = wrap(async (req, res) => {
  const result = await aiService.runGhostEmployeeDetection();
  res.json({ success: true, data: result });
});

exports.runDuplicatePaymentDetection = wrap(async (req, res) => {
  const result = await aiService.runDuplicatePaymentDetection();
  res.json({ success: true, data: result });
});

exports.recordFraudDetection = wrap(async (req, res) => {
  const result = await aiService.detectFraud(req.body);
  res.status(201).json({ success: true, data: result });
});

// ============= BEHAVIOR ANALYTICS =============
exports.recordBehaviorEvent = wrap(async (req, res) => {
  const result = await aiService.recordBehaviorEvent(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.analyzeUserBehavior = wrap(async (req, res) => {
  const result = await aiService.analyzeUserBehavior(req.params.userId);
  res.json({ success: true, data: result });
});

exports.getUserBehaviorProfiles = wrap(async (req, res) => {
  const result = await aiService.getUserBehaviorProfiles(req.query);
  res.json({ success: true, data: result });
});

// ============= ANOMALY DETECTION =============
exports.getAnomalyEvents = wrap(async (req, res) => {
  const result = await aiService.getAnomalyEvents(req.query);
  res.json({ success: true, data: result });
});

exports.runPayrollAnomalyDetection = wrap(async (req, res) => {
  const result = await aiService.runPayrollAnomalyDetection();
  res.json({ success: true, data: result });
});

exports.recordAnomaly = wrap(async (req, res) => {
  const result = await aiService.detectAnomaly(req.body);
  res.status(201).json({ success: true, data: result });
});

// ============= RISK SCORING =============
exports.calculateUserRiskScore = wrap(async (req, res) => {
  const result = await aiService.calculateUserRiskScore(req.params.userId);
  res.json({ success: true, data: result });
});

exports.getRiskScores = wrap(async (req, res) => {
  const result = await aiService.getRiskScores(req.query);
  res.json({ success: true, data: result });
});

exports.getRiskOverview = wrap(async (req, res) => {
  const result = await aiService.getRiskOverview();
  res.json({ success: true, data: result });
});

// ============= PREDICTIONS =============
exports.getPredictions = wrap(async (req, res) => {
  const result = await aiService.getPredictions(req.query);
  res.json({ success: true, data: result });
});

exports.generatePrediction = wrap(async (req, res) => {
  const result = await aiService.generatePrediction(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.runPredictions = wrap(async (req, res) => {
  const result = await aiService.runPredictions();
  res.json({ success: true, data: result });
});

// ============= RECOMMENDATIONS =============
exports.getRecommendations = wrap(async (req, res) => {
  const result = await aiService.getRecommendations(req.query);
  res.json({ success: true, data: result });
});

exports.getRecommendationStats = wrap(async (req, res) => {
  const result = await aiService.getRecommendationStats();
  res.json({ success: true, data: result });
});

// ============= INSIDER THREATS =============
exports.getInsiderThreats = wrap(async (req, res) => {
  const result = await aiService.getInsiderThreats(req.query);
  res.json({ success: true, data: result });
});

exports.runInsiderThreatDetection = wrap(async (req, res) => {
  const result = await aiService.runInsiderThreatDetection();
  res.json({ success: true, data: result });
});

exports.recordInsiderThreat = wrap(async (req, res) => {
  const result = await aiService.detectInsiderThreat(req.body);
  res.status(201).json({ success: true, data: result });
});

// ============= THREAT CORRELATION =============
exports.getThreatCorrelations = wrap(async (req, res) => {
  const result = await aiService.getThreatCorrelations(req.query);
  res.json({ success: true, data: result });
});

exports.runCorrelation = wrap(async (req, res) => {
  const result = await aiService.correlateThreats();
  res.json({ success: true, data: result });
});

// ============= VENDOR RISK =============
exports.getVendorRiskProfiles = wrap(async (req, res) => {
  const result = await aiService.getVendorRiskProfiles(req.query);
  res.json({ success: true, data: result });
});

// ============= SECURITY AUTOMATION =============
exports.getAutomationActions = wrap(async (req, res) => {
  const result = await aiService.getAutomationActions(req.query);
  res.json({ success: true, data: result });
});

exports.createAutomationAction = wrap(async (req, res) => {
  const result = await aiService.createAutomationAction(req.body);
  res.status(201).json({ success: true, data: result });
});

// ============= INVESTIGATION ASSISTANT =============
exports.generateInvestigationSummary = wrap(async (req, res) => {
  const result = await aiService.generateInvestigationSummary(req.body);
  res.json({ success: true, data: result });
});

// ============= HEATMAPS =============
exports.getHeatmaps = wrap(async (req, res) => {
  const result = await aiService.getHeatmaps(req.query);
  res.json({ success: true, data: result });
});

exports.calculateHeatmaps = wrap(async (req, res) => {
  const result = await aiService.calculateHeatmaps();
  res.json({ success: true, data: { success: true } });
});

// ============= RUN ALL =============
exports.runAllDetections = wrap(async (req, res) => {
  const result = await aiService.runAllDetections();
  res.json({ success: true, data: result });
});
