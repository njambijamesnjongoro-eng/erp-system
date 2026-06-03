import api from './axios';

export const securityApi = {
  getSessions: () => api.get('/security/sessions'),
  terminateSession: (id) => api.delete(`/security/sessions/${id}`),
  terminateAllSessions: (excludeId) => api.post('/security/sessions/terminate-all', { excludeId }),

  getDevices: () => api.get('/security/devices'),
  removeDevice: (id) => api.delete(`/security/devices/${id}`),

  getEvents: (limit) => api.get('/security/events', { params: { limit } }),
  getDashboardStats: () => api.get('/security/dashboard/stats'),

  getCaptcha: () => api.get('/security/captcha'),
  verifyCaptcha: (token, answer) => api.post('/security/captcha/verify', { token, answer }),
};
