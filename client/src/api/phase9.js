import api from './axios';

const withParams = (params) => {
  const filtered = Object.entries(params || {}).filter(([_, v]) => v !== undefined && v !== '' && v !== null);
  const qs = filtered.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return qs ? `?${qs}` : '';
};

export const phase9Api = {
  // Command Center
  getCommandCenter: () => api.get('/phase9/command-center'),

  // Zero Trust
  calculateTrustScore: (userId) => api.post(`/phase9/trust/calculate/${userId}`),
  getTrustScores: (params) => api.get(`/phase9/trust/scores${withParams(params)}`),
  continuousVerify: (data) => api.post('/phase9/trust/verify', data),

  // Biometric
  enrollBiometric: (data) => api.post('/phase9/biometric/enroll', data),
  verifyBiometric: (data) => api.post('/phase9/biometric/verify', data),
  getBiometricProfiles: (params) => api.get(`/phase9/biometric/profiles${withParams(params)}`),
  revokeBiometric: (userId) => api.delete(`/phase9/biometric/${userId}`),

  // Hardware Keys
  registerHardwareKey: (data) => api.post('/phase9/hardware-keys/register', data),
  getHardwareKeys: (params) => api.get(`/phase9/hardware-keys${withParams(params)}`),
  verifyHardwareKey: (data) => api.post('/phase9/hardware-keys/verify', data),
  revokeHardwareKey: (keySerial) => api.delete(`/phase9/hardware-keys/${keySerial}`),

  // PAM
  getPamSessions: (params) => api.get(`/phase9/pam/sessions${withParams(params)}`),
  createPamSession: (data) => api.post('/phase9/pam/sessions', data),
  terminatePamSession: (sessionId) => api.post(`/phase9/pam/sessions/${sessionId}/terminate`),
  getPamApprovals: (params) => api.get(`/phase9/pam/approvals${withParams(params)}`),
  createPamApproval: (data) => api.post('/phase9/pam/approvals', data),
  approvePamRequest: (requestId, data) => api.put(`/phase9/pam/approvals/${requestId}`, data),

  // JIT
  getJitRequests: (params) => api.get(`/phase9/jit-requests${withParams(params)}`),
  requestJitAccess: (data) => api.post('/phase9/jit-requests', data),
  approveJitRequest: (requestId) => api.post(`/phase9/jit-requests/${requestId}/approve`),
  checkExpiredJit: () => api.post('/phase9/jit-requests/check-expired'),

  // DLP
  getDlpRules: (params) => api.get(`/phase9/dlp/rules${withParams(params)}`),
  createDlpRule: (data) => api.post('/phase9/dlp/rules', data),
  updateDlpRule: (ruleId, data) => api.put(`/phase9/dlp/rules/${ruleId}`, data),
  getDlpEvents: (params) => api.get(`/phase9/dlp/events${withParams(params)}`),
  getDlpStats: () => api.get('/phase9/dlp/events/stats'),
  detectDlpEvent: (data) => api.post('/phase9/dlp/events', data),
  updateDlpEventStatus: (eventId, status) => api.put(`/phase9/dlp/events/${eventId}/status`, { status }),

  // Sensitive Data
  getSensitiveData: (params) => api.get(`/phase9/sensitive-data${withParams(params)}`),
  discoverSensitiveData: (data) => api.post('/phase9/sensitive-data', data),
  runDiscoveryScan: () => api.post('/phase9/sensitive-data/scan'),

  // DRM
  getDrmDocuments: (params) => api.get(`/phase9/drm/documents${withParams(params)}`),
  createDrmDocument: (data) => api.post('/phase9/drm/documents', data),
  accessDrmDocument: (documentId) => api.get(`/phase9/drm/documents/${documentId}`),
  revokeDrmDocument: (documentId) => api.post(`/phase9/drm/documents/${documentId}/revoke`),

  // Session Recordings
  getSessionRecordings: (params) => api.get(`/phase9/session-recordings${withParams(params)}`),
  startSessionRecording: (data) => api.post('/phase9/session-recordings/start', data),

  // SIEM
  getSiemEvents: (params) => api.get(`/phase9/siem/events${withParams(params)}`),
  getSiemStats: () => api.get('/phase9/siem/events/stats'),
  ingestSiemEvent: (data) => api.post('/phase9/siem/events', data),
  correlateSiem: () => api.post('/phase9/siem/correlate'),
  getSiemCorrelations: (params) => api.get(`/phase9/siem/correlations${withParams(params)}`),

  // SOAR
  getSoarPlaybooks: (params) => api.get(`/phase9/soar/playbooks${withParams(params)}`),
  createSoarPlaybook: (data) => api.post('/phase9/soar/playbooks', data),
  getSoarExecutions: (params) => api.get(`/phase9/soar/executions${withParams(params)}`),
  autoSoarExecution: (data) => api.post('/phase9/soar/execute', data),

  // Identity Governance
  getIdentityReviews: (params) => api.get(`/phase9/identity/reviews${withParams(params)}`),
  createIdentityReview: (data) => api.post('/phase9/identity/reviews', data),
  approveIdentityReview: (reviewId, data) => api.put(`/phase9/identity/reviews/${reviewId}`, data),

  // Executive Protection
  getExecutiveProtection: (params) => api.get(`/phase9/executive-protection${withParams(params)}`),
  createExecutiveProtection: (data) => api.post('/phase9/executive-protection', data),
  updateExecutiveProtection: (userId, data) => api.put(`/phase9/executive-protection/${userId}`, data),

  // Deception
  getDeceptionAssets: (params) => api.get(`/phase9/deception/assets${withParams(params)}`),
  createDeceptionAsset: (data) => api.post('/phase9/deception/assets', data),
  triggerDeceptionAsset: (assetId, data) => api.post(`/phase9/deception/assets/${assetId}/trigger`, data),

  // Insider Threats
  getInsiderThreats: (params) => api.get(`/phase9/insider-threats${withParams(params)}`),
  createInsiderThreat: (data) => api.post('/phase9/insider-threats', data),
  updateInsiderThreat: (caseId, data) => api.put(`/phase9/insider-threats/${caseId}`, data),

  // Executive Vault
  getVaultItems: (params) => api.get(`/phase9/vault/items${withParams(params)}`),
  createVaultItem: (data) => api.post('/phase9/vault/items', data),
  accessVaultItem: (itemId) => api.get(`/phase9/vault/items/${itemId}`),
  archiveVaultItem: (itemId) => api.post(`/phase9/vault/items/${itemId}/archive`),

  // Compliance
  getComplianceMapping: (params) => api.get(`/phase9/compliance/mapping${withParams(params)}`),
  updateComplianceControl: (id, data) => api.put(`/phase9/compliance/mapping/${id}`, data),

  // Threat Hunting
  getThreatHunts: (params) => api.get(`/phase9/threat-hunts${withParams(params)}`),
  createThreatHunt: (data) => api.post('/phase9/threat-hunts', data),
  updateThreatHunt: (huntId, data) => api.put(`/phase9/threat-hunts/${huntId}`, data),

  // Security Scores
  getSecurityScores: (params) => api.get(`/phase9/security-scores${withParams(params)}`),
  calculateSecurityScores: () => api.post('/phase9/security-scores/calculate'),

  // Cyber Resilience
  getResiliencePlans: (params) => api.get(`/phase9/resilience/plans${withParams(params)}`),
  createResiliencePlan: (data) => api.post('/phase9/resilience/plans', data),
  testResiliencePlan: (planId) => api.post(`/phase9/resilience/plans/${planId}/test`),

  // Reports
  getReports: (params) => api.get(`/phase9/reports${withParams(params)}`),
  generateReport: (data) => api.post('/phase9/reports', data),
  generateBoardReport: () => api.post('/phase9/reports/board'),
  generateExecutiveReport: () => api.post('/phase9/reports/executive'),

  // Incident Response
  getIncidentResponsePlans: (params) => api.get(`/phase9/incident-response/plans${withParams(params)}`),
};
