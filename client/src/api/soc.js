import api from './axios';

export const socApi = {
  getDashboard: () => api.get('/soc/dashboard'),
  getSecurityScore: () => api.get('/soc/security-score'),
  getLiveFeed: () => api.get('/soc/live-feed'),
  detectEvent: (data) => api.post('/soc/detect', data),

  getAlerts: (params) => api.get('/soc/alerts', { params }),
  getAlertStats: () => api.get('/soc/alerts/stats'),
  acknowledgeAlert: (id) => api.post(`/soc/alerts/${id}/acknowledge`),
  assignAlert: (id, assigneeId) => api.post(`/soc/alerts/${id}/assign`, { assigneeId }),
  resolveAlert: (id, notes) => api.post(`/soc/alerts/${id}/resolve`, { notes }),

  getIncidents: (params) => api.get('/soc/incidents', { params }),
  getIncidentStats: () => api.get('/soc/incidents/stats'),
  getIncident: (id) => api.get(`/soc/incidents/${id}`),
  createIncident: (data) => api.post('/soc/incidents', data),
  updateIncident: (id, data) => api.put(`/soc/incidents/${id}`, data),
  addCaseEntry: (id, data) => api.post(`/soc/incidents/${id}/cases`, data),

  calculateUserRisk: (userId) => api.post(`/soc/user-risk/${userId}/calculate`),
  getUserRiskHistory: (userId) => api.get(`/soc/user-risk/${userId}/history`),
  getAllUserRisks: (params) => api.get('/soc/user-risks', { params }),
  getRiskOverview: () => api.get('/soc/user-risk/overview'),

  getCorrelations: (params) => api.get('/soc/correlations', { params }),
  evaluateCorrelation: (events) => api.post('/soc/correlations/evaluate', { events }),

  getThreatIOCs: (params) => api.get('/soc/threat-iocs', { params }),
  addThreatIOC: (data) => api.post('/soc/threat-iocs', data),
  deactivateIOC: (id) => api.post(`/soc/threat-iocs/${id}/deactivate`),

  getThreatRecords: (params) => api.get('/soc/threat-records', { params }),
  getThreatStats: () => api.get('/soc/threat-records/stats'),

  getAttackEvents: (params) => api.get('/soc/attacks', { params }),
  getAttackStats: () => api.get('/soc/attacks/stats'),
  blockIP: (ip) => api.post(`/soc/attacks/block-ip/${ip}`),

  getNotifications: (params) => api.get('/soc/notifications', { params }),
  getUnreadCount: () => api.get('/soc/notifications/unread-count'),
  markNotificationRead: (id) => api.post(`/soc/notifications/${id}/read`),
  markAllRead: () => api.post('/soc/notifications/read-all'),

  getReports: (params) => api.get('/soc/reports', { params }),
  generateReport: (data) => api.post('/soc/reports/generate', data),
};
