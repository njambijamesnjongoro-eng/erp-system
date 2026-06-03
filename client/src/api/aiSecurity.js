import api from './axios';

const withParams = (params) => {
  const filtered = Object.entries(params || {}).filter(([_, v]) => v !== undefined && v !== '' && v !== null);
  const qs = filtered.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return qs ? `?${qs}` : '';
};

export const aiSecurityApi = {
  // Dashboard
  getDashboard: () => api.get('/ai-security/dashboard'),

  // Fraud
  getFraudDetections: (params) => api.get(`/ai-security/fraud-detections${withParams(params)}`),
  getFraudStats: () => api.get('/ai-security/fraud-detections/stats'),
  recordFraudDetection: (data) => api.post('/ai-security/fraud-detections', data),
  runGhostEmployeeDetection: () => api.post('/ai-security/fraud-detections/run-ghost-employees'),
  runDuplicatePaymentDetection: () => api.post('/ai-security/fraud-detections/run-duplicate-payments'),

  // Behavior
  recordBehaviorEvent: (data) => api.post('/ai-security/behavior-events', data),
  analyzeUserBehavior: (userId) => api.post(`/ai-security/behavior/profiles/${userId}/analyze`),
  getUserBehaviorProfiles: (params) => api.get(`/ai-security/behavior/profiles${withParams(params)}`),

  // Anomalies
  getAnomalies: (params) => api.get(`/ai-security/anomalies${withParams(params)}`),
  recordAnomaly: (data) => api.post('/ai-security/anomalies', data),
  runPayrollAnomalyDetection: () => api.post('/ai-security/anomalies/run-payroll'),

  // Risk
  calculateUserRisk: (userId) => api.post(`/ai-security/risk/calculate/${userId}`),
  getRiskScores: (params) => api.get(`/ai-security/risk/scores${withParams(params)}`),
  getRiskOverview: () => api.get('/ai-security/risk/overview'),

  // Predictions
  getPredictions: (params) => api.get(`/ai-security/predictions${withParams(params)}`),
  generatePrediction: (data) => api.post('/ai-security/predictions', data),
  runPredictions: () => api.post('/ai-security/predictions/run'),

  // Recommendations
  getRecommendations: (params) => api.get(`/ai-security/recommendations${withParams(params)}`),
  getRecommendationStats: () => api.get('/ai-security/recommendations/stats'),

  // Insider Threats
  getInsiderThreats: (params) => api.get(`/ai-security/insider-threats${withParams(params)}`),
  runInsiderThreatDetection: () => api.post('/ai-security/insider-threats/run-detection'),

  // Correlations
  getCorrelations: (params) => api.get(`/ai-security/correlations${withParams(params)}`),
  runCorrelation: () => api.post('/ai-security/correlations/run'),

  // Vendor Risk
  getVendorRisks: (params) => api.get(`/ai-security/vendor-risks${withParams(params)}`),

  // Automation
  getAutomation: (params) => api.get(`/ai-security/automation${withParams(params)}`),

  // Investigation
  generateInvestigationSummary: (data) => api.post('/ai-security/investigation/summary', data),

  // Heatmaps
  getHeatmaps: (params) => api.get(`/ai-security/heatmaps${withParams(params)}`),
  calculateHeatmaps: () => api.post('/ai-security/heatmaps/calculate'),

  // Run All
  runAllDetections: () => api.post('/ai-security/run-all'),
};
