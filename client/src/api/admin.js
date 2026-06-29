import api from './axios';

export const systemDashboardService = {
  getOverview: () => api.get('/admin/dashboard/overview'),
  getStats: () => api.get('/admin/dashboard/stats'),
};

export const userManagementService = {
  list: (params) => api.get('/admin/users', { params }),
  getById: (id) => api.get(`/admin/users/${id}`),
  create: (data) => api.post('/admin/users', data),
  update: (id, data) => api.put(`/admin/users/${id}`, data),
  delete: (id, params) => api.delete(`/admin/users/${id}`, { params }),
  activate: (id) => api.put(`/admin/users/${id}/activate`),
  deactivate: (id) => api.put(`/admin/users/${id}/deactivate`),
  lock: (id) => api.put(`/admin/users/${id}/lock`),
  unlock: (id) => api.put(`/admin/users/${id}/unlock`),
  getSessions: (id) => api.get(`/admin/users/${id}/sessions`),
  terminateSession: (userId, sessionId) => api.delete(`/admin/users/${userId}/sessions/${sessionId}`),
  forceLogout: (id) => api.post(`/admin/users/${id}/force-logout`),
  getLoginHistory: (params) => api.get('/admin/users/login-history', { params }),
  getActiveSessions: () => api.get('/admin/users/active-sessions'),
};

export const securityService = {
  getEvents: (params) => api.get('/admin/security/events', { params }),
  getEvent: (id) => api.get(`/admin/security/events/${id}`),
  resolveEvent: (id) => api.put(`/admin/security/events/${id}/resolve`),
  getSummary: () => api.get('/admin/security/summary'),
  detectThreats: () => api.post('/admin/security/detect'),
  getLoginAttempts: (params) => api.get('/admin/security/login-attempts', { params }),
  getBlacklist: () => api.get('/admin/security/blacklist'),
  addToBlacklist: (data) => api.post('/admin/security/blacklist', data),
  removeFromBlacklist: (id) => api.delete(`/admin/security/blacklist/${id}`),
  getWhitelist: () => api.get('/admin/security/whitelist'),
  addToWhitelist: (data) => api.post('/admin/security/whitelist', data),
  removeFromWhitelist: (id) => api.delete(`/admin/security/whitelist/${id}`),
};

export const backupService = {
  list: (params) => api.get('/admin/backups', { params }),
  getById: (id) => api.get(`/admin/backups/${id}`),
  create: (data) => api.post('/admin/backups', data),
  restore: (id) => api.post(`/admin/backups/${id}/restore`),
  verify: (id) => api.post(`/admin/backups/${id}/verify`),
  delete: (id) => api.delete(`/admin/backups/${id}`),
  getStats: () => api.get('/admin/backups/stats'),
  getSchedules: () => api.get('/admin/backups/schedules'),
  createSchedule: (data) => api.post('/admin/backups/schedules', data),
  updateSchedule: (id, data) => api.put(`/admin/backups/schedules/${id}`, data),
  deleteSchedule: (id) => api.delete(`/admin/backups/schedules/${id}`),
  runSchedule: (id) => api.post(`/admin/backups/schedules/${id}/run`),
};

export const settingsService = {
  getSettings: (params) => api.get('/admin/settings', { params }),
  getSetting: (key) => api.get(`/admin/settings/${key}`),
  updateSettings: (data) => api.put('/admin/settings', data),
  getCategories: () => api.get('/admin/settings/categories'),
  getCompanyInfo: () => api.get('/admin/settings/company'),
  getSecurityPolicy: () => api.get('/admin/settings/security-policy'),
  getEmailConfig: () => api.get('/admin/settings/email-config'),
};

export const apiKeyService = {
  list: (params) => api.get('/admin/api-keys', { params }),
  create: (data) => api.post('/admin/api-keys', data),
  update: (id, data) => api.put(`/admin/api-keys/${id}`, data),
  revoke: (id) => api.delete(`/admin/api-keys/${id}`),
  getUsage: (params) => api.get('/admin/api-keys/usage', { params }),
  getLogs: (params) => api.get('/admin/api-keys/logs', { params }),
};

export const auditService = {
  getLogs: (params) => api.get('/admin/audit', { params }),
  getLog: (id) => api.get(`/admin/audit/${id}`),
  getSummary: () => api.get('/admin/audit/summary'),
  exportLogs: (params) => api.get('/admin/audit/export', { params }),
  verifyIntegrity: () => api.get('/admin/audit/verify'),
};

export const fileService = {
  list: (params) => api.get('/admin/files', { params }),
  getStats: () => api.get('/admin/files/stats'),
  upload: (formData) => api.post('/admin/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  download: (id) => api.get(`/admin/files/${id}/download`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/admin/files/${id}`),
};

export const deploymentService = {
  getHealth: () => api.get('/admin/deployment/health'),
  getPerformance: () => api.get('/admin/deployment/performance'),
  getEnvironment: () => api.get('/admin/deployment/environment'),
  getStorage: () => api.get('/admin/deployment/storage'),
};
