import api from './axios';

export const securityPhase2Api = {
  // MFA
  getMFAStatus: () => api.get('/security-phase2/mfa/status'),
  setupTOTP: () => api.post('/security-phase2/mfa/setup-totp'),
  verifyAndEnableTOTP: (token) => api.post('/security-phase2/mfa/verify-enable-totp', { token }),
  sendEmailOTP: (purpose) => api.post('/security-phase2/mfa/send-otp', { purpose }),
  verifyEmailOTP: (otpCode, purpose) => api.post('/security-phase2/mfa/verify-otp', { otpCode, purpose }),
  enableEmailOTP: () => api.post('/security-phase2/mfa/enable-email-otp'),
  disableMFA: (otpCode) => api.post('/security-phase2/mfa/disable', { otpCode }),
  generateBackupCodes: () => api.post('/security-phase2/mfa/backup-codes'),

  // Devices
  getDevices: () => api.get('/security-phase2/devices'),
  approveDevice: (id) => api.post(`/security-phase2/devices/${id}/approve`),
  revokeDevice: (id) => api.delete(`/security-phase2/devices/${id}`),

  // Login History & Geo
  getLoginHistory: (limit) => api.get('/security-phase2/login-history', { params: { limit } }),
  getGeoStats: () => api.get('/security-phase2/geo-stats'),

  // Risk
  getRiskSummary: () => api.get('/security-phase2/risk/summary'),
  getSuspiciousActivities: (limit) => api.get('/security-phase2/risk/suspicious-activities', { params: { limit } }),
  resolveSuspiciousActivity: (id) => api.post(`/security-phase2/risk/suspicious-activities/${id}/resolve`),

  // Alerts
  getAlerts: (unread, limit) => api.get('/security-phase2/alerts', { params: { unread, limit } }),
  getUnreadAlertCount: () => api.get('/security-phase2/alerts/unread-count'),
  markAlertRead: (id) => api.put(`/security-phase2/alerts/${id}/read`),
  markAllAlertsRead: () => api.put('/security-phase2/alerts/read-all'),

  // Analytics
  getLoginStats: (days) => api.get('/security-phase2/analytics/login-stats', { params: { days } }),
  getDeviceAnalytics: () => api.get('/security-phase2/analytics/device-analytics'),
  getGeoAnalytics: () => api.get('/security-phase2/analytics/geo-analytics'),
  getRiskHeatmap: () => api.get('/security-phase2/analytics/risk-heatmap'),
  getGlobalLoginStats: () => api.get('/security-phase2/analytics/global-stats'),
};
