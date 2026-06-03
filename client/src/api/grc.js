import api from './axios';

const withParams = (params) => {
  const filtered = Object.entries(params || {}).filter(([_, v]) => v !== undefined && v !== '' && v !== null);
  const qs = filtered.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return qs ? `?${qs}` : '';
};

export const grcApi = {
  // Dashboard
  getDashboard: () => api.get('/grc/dashboard'),

  // Policies
  createPolicy: (data) => api.post('/grc/policies', data),
  getPolicies: (params) => api.get(`/grc/policies${withParams(params)}`),
  getPolicy: (id) => api.get(`/grc/policies/${id}`),
  updatePolicy: (id, data) => api.put(`/grc/policies/${id}`, data),
  publishPolicy: (id) => api.post(`/grc/policies/${id}/publish`),
  acknowledgePolicy: (id) => api.post(`/grc/policies/${id}/acknowledge`),
  getPolicyAckStatus: (id) => api.get(`/grc/policies/${id}/acknowledgments`),

  // Audits
  createAudit: (data) => api.post('/grc/audits', data),
  getAudits: (params) => api.get(`/grc/audits${withParams(params)}`),
  getAudit: (id) => api.get(`/grc/audits/${id}`),
  updateAudit: (id, data) => api.put(`/grc/audits/${id}`, data),
  createAuditFinding: (auditId, data) => api.post(`/grc/audits/${auditId}/findings`, data),
  updateAuditFinding: (id, data) => api.put(`/grc/findings/${id}`, data),

  // Corrective Actions
  createCorrectiveAction: (data) => api.post('/grc/corrective-actions', data),
  getCorrectiveActions: (params) => api.get(`/grc/corrective-actions${withParams(params)}`),

  // Risks
  createRisk: (data) => api.post('/grc/risks', data),
  getRisks: (params) => api.get(`/grc/risks${withParams(params)}`),
  getRisk: (id) => api.get(`/grc/risks/${id}`),
  updateRisk: (id, data) => api.put(`/grc/risks/${id}`, data),
  createRiskAssessment: (data) => api.post('/grc/risk-assessments', data),

  // Compliance
  getComplianceObligations: (params) => api.get(`/grc/compliance-obligations${withParams(params)}`),
  updateComplianceObligation: (id, data) => api.put(`/grc/compliance-obligations/${id}`, data),

  // Access Reviews
  createAccessReview: (data) => api.post('/grc/access-reviews', data),
  getAccessReviews: (params) => api.get(`/grc/access-reviews${withParams(params)}`),
  getAccessReview: (id) => api.get(`/grc/access-reviews/${id}`),
  updateAccessReviewEntry: (entryId, data) => api.put(`/grc/access-review-entries/${entryId}`, data),

  // SoD
  getSodRules: (params) => api.get(`/grc/sod-rules${withParams(params)}`),
  checkSodViolation: (data) => api.post('/grc/sod/check-violation', data),
  getSodViolations: (params) => api.get(`/grc/sod-violations${withParams(params)}`),

  // Investigations
  createInvestigation: (data) => api.post('/grc/investigations', data),
  getInvestigations: (params) => api.get(`/grc/investigations${withParams(params)}`),
  getInvestigation: (id) => api.get(`/grc/investigations/${id}`),
  addInvestigationEvidence: (id, data) => api.post(`/grc/investigations/${id}/evidence`, data),

  // Reports
  generateReport: (data) => api.post('/grc/reports/generate', data),
  getReports: (params) => api.get(`/grc/reports${withParams(params)}`),

  // Approval Workflows
  createApprovalWorkflow: (data) => api.post('/grc/approval-workflows', data),
  processApprovalAction: (workflowId, data) => api.post(`/grc/approval-workflows/${workflowId}/action`, data),

  // Compliance Score
  calculateComplianceScore: (data) => api.post('/grc/compliance-score/calculate', data),

  // Notifications
  createNotification: (data) => api.post('/grc/notifications', data),
  getNotifications: (params) => api.get(`/grc/notifications${withParams(params)}`),

  // Audit Log
  getAuditLog: (params) => api.get(`/grc/audit-log${withParams(params)}`),

  // Legal Holds
  createLegalHold: (data) => api.post('/grc/legal-holds', data),
  getLegalHolds: (params) => api.get(`/grc/legal-holds${withParams(params)}`),

  // Compliance Calendar
  getComplianceCalendar: (params) => api.get(`/grc/compliance-calendar${withParams(params)}`),

  // Retention Policies
  getRetentionPolicies: (params) => api.get(`/grc/retention-policies${withParams(params)}`),
};
