import api from './axios';

export const securityPhase3Api = {
  getDashboard: () => api.get('/security-phase3/dashboard'),
  getOverview: () => api.get('/security-phase3/overview'),
  getHealth: () => api.get('/security-phase3/health'),
  getPerformance: () => api.get('/security-phase3/performance'),

  getAuditLogs: (params) => api.get('/security-phase3/audit-logs', { params }),
  getAuditSummary: () => api.get('/security-phase3/audit-logs/summary'),

  getThreats: (params) => api.get('/security-phase3/threats', { params }),
  resolveThreat: (id) => api.post(`/security-phase3/threats/${id}/resolve`),

  createBackup: () => api.post('/security-phase3/backups'),
  getBackupLogs: () => api.get('/security-phase3/backups'),
  verifyBackup: (id) => api.post(`/security-phase3/backups/${id}/verify`),

  getRateLimits: () => api.get('/security-phase3/rate-limits'),
  getGatewayStats: () => api.get('/security-phase3/gateway'),
  rotateEncryptionKey: (newKeyEnvVar) => api.post('/security-phase3/encryption/rotate', { newKeyEnvVar }),
};
