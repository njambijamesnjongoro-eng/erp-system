import api from './axios';

export const companiesService = {
  getAll: (params) => api.get('/enterprise/companies', { params }),
  getById: (id) => api.get(`/enterprise/companies/${id}`),
  create: (data) => api.post('/enterprise/companies', data),
  update: (id, data) => api.put(`/enterprise/companies/${id}`, data),
  toggle: (id, data) => api.patch(`/enterprise/companies/${id}/toggle`, data),
  delete: (id) => api.delete(`/enterprise/companies/${id}`),
  getStats: () => api.get('/enterprise/companies/stats'),
};

export const branchesService = {
  getAll: (params) => api.get('/enterprise/branches', { params }),
  getById: (id) => api.get(`/enterprise/branches/${id}`),
  create: (data) => api.post('/enterprise/branches', data),
  update: (id, data) => api.put(`/enterprise/branches/${id}`, data),
  delete: (id) => api.delete(`/enterprise/branches/${id}`),
  assignManager: (id, data) => api.patch(`/enterprise/branches/${id}/assign-manager`, data),
};

export const companyUsersService = {
  getAll: (params) => api.get('/enterprise/company-users', { params }),
  assign: (data) => api.post('/enterprise/company-users', data),
  remove: (id) => api.delete(`/enterprise/company-users/${id}`),
};

export const complianceService = {
  getFrameworks: (params) => api.get('/enterprise/compliance/frameworks', { params }),
  getFrameworkById: (id) => api.get(`/enterprise/compliance/frameworks/${id}`),
  createFramework: (data) => api.post('/enterprise/compliance/frameworks', data),
  deleteFramework: (id) => api.delete(`/enterprise/compliance/frameworks/${id}`),
  getRequirements: (params) => api.get('/enterprise/compliance/requirements', { params }),
  createRequirement: (data) => api.post('/enterprise/compliance/requirements', data),
  updateRequirement: (id, data) => api.put(`/enterprise/compliance/requirements/${id}`, data),
  deleteRequirement: (id) => api.delete(`/enterprise/compliance/requirements/${id}`),
  getAudits: (params) => api.get('/enterprise/compliance/audits', { params }),
  createAudit: (data) => api.post('/enterprise/compliance/audits', data),
  updateAudit: (id, data) => api.put(`/enterprise/compliance/audits/${id}`, data),
  getStats: (params) => api.get('/enterprise/compliance/stats', { params }),
  getDashboard: (params) => api.get('/enterprise/compliance/dashboard', { params }),
};

export const aiService = {
  getAnalyses: (params) => api.get('/enterprise/ai/analyses', { params }),
  getAnalysisById: (id) => api.get(`/enterprise/ai/analyses/${id}`),
  createAnalysis: (data) => api.post('/enterprise/ai/analyses', data),
  actionAnalysis: (id) => api.patch(`/enterprise/ai/analyses/${id}/action`),
  detectAnomalies: (data) => api.post('/enterprise/ai/detect-anomalies', data),
  predictMaintenance: (data) => api.post('/enterprise/ai/predict-maintenance', data),
  procurementAnomalies: (data) => api.post('/enterprise/ai/procurement-anomalies', data),
  payrollAnomalies: (data) => api.post('/enterprise/ai/payroll-anomalies', data),
  generateInsights: (data) => api.post('/enterprise/ai/generate-insights', data),
  getModels: (params) => api.get('/enterprise/ai/models', { params }),
  createModel: (data) => api.post('/enterprise/ai/models', data),
  updateModel: (id, data) => api.put(`/enterprise/ai/models/${id}`, data),
  trainModel: (id) => api.post(`/enterprise/ai/models/${id}/train`),
  deleteModel: (id) => api.delete(`/enterprise/ai/models/${id}`),
  getStats: (params) => api.get('/enterprise/ai/stats', { params }),
};

export const workflowService = {
  getAll: (params) => api.get('/enterprise/workflows/definitions', { params }),
  getById: (id) => api.get(`/enterprise/workflows/definitions/${id}`),
  create: (data) => api.post('/enterprise/workflows/definitions', data),
  update: (id, data) => api.put(`/enterprise/workflows/definitions/${id}`, data),
  delete: (id) => api.delete(`/enterprise/workflows/definitions/${id}`),
  trigger: (id, data) => api.post(`/enterprise/workflows/definitions/${id}/trigger`, data),
  getInstances: (params) => api.get('/enterprise/workflows/instances', { params }),
  getInstanceById: (id) => api.get(`/enterprise/workflows/instances/${id}`),
  approveStep: (id, data) => api.post(`/enterprise/workflows/instances/${id}/approve`, data),
  rejectStep: (id, data) => api.post(`/enterprise/workflows/instances/${id}/reject`, data),
  getStats: (params) => api.get('/enterprise/workflows/stats', { params }),
};

export const riskService = {
  getAll: (params) => api.get('/enterprise/risks', { params }),
  getById: (id) => api.get(`/enterprise/risks/${id}`),
  create: (data) => api.post('/enterprise/risks', data),
  update: (id, data) => api.put(`/enterprise/risks/${id}`, data),
  delete: (id) => api.delete(`/enterprise/risks/${id}`),
  getStats: (params) => api.get('/enterprise/risks/stats', { params }),
  getDashboard: (params) => api.get('/enterprise/risks/dashboard', { params }),
};

export const policyService = {
  getAll: (params) => api.get('/enterprise/policies', { params }),
  getById: (id) => api.get(`/enterprise/policies/${id}`),
  create: (data) => api.post('/enterprise/policies', data),
  update: (id, data) => api.put(`/enterprise/policies/${id}`, data),
  delete: (id) => api.delete(`/enterprise/policies/${id}`),
  publish: (id) => api.post(`/enterprise/policies/${id}/publish`),
  acknowledge: (id) => api.post(`/enterprise/policies/${id}/acknowledge`),
  getAcknowledgements: (id) => api.get(`/enterprise/policies/${id}/acknowledgements`),
  getMyAcknowledgements: () => api.get('/enterprise/policies/my-acknowledgements'),
  getStats: (params) => api.get('/enterprise/policies/stats', { params }),
};

export const enterpriseSettingsService = {
  getApiKeys: (params) => api.get('/enterprise/settings/api-keys', { params }),
  createApiKey: (data) => api.post('/enterprise/settings/api-keys', data),
  revokeApiKey: (id) => api.post(`/enterprise/settings/api-keys/${id}/revoke`),
  deleteApiKey: (id) => api.delete(`/enterprise/settings/api-keys/${id}`),
  getApiLogs: (id, params) => api.get(`/enterprise/settings/api-keys/${id}/logs`, { params }),
  getApiUsageStats: (params) => api.get('/enterprise/settings/api-keys/usage-stats', { params }),
  getGovernanceRules: (params) => api.get('/enterprise/settings/governance', { params }),
  createGovernanceRule: (data) => api.post('/enterprise/settings/governance', data),
  updateGovernanceRule: (id, data) => api.put(`/enterprise/settings/governance/${id}`, data),
  deleteGovernanceRule: (id) => api.delete(`/enterprise/settings/governance/${id}`),
  getOrchestrationRules: (params) => api.get('/enterprise/settings/orchestration', { params }),
  createOrchestrationRule: (data) => api.post('/enterprise/settings/orchestration', data),
  updateOrchestrationRule: (id, data) => api.put(`/enterprise/settings/orchestration/${id}`, data),
  deleteOrchestrationRule: (id) => api.delete(`/enterprise/settings/orchestration/${id}`),
  search: (data) => api.post('/enterprise/settings/search', data),
  reindex: (data) => api.post('/enterprise/settings/search/reindex', data),
};
