import api from './axios';

// ESS Portal Service
export const essPortalService = {
  getProfile: () => api.get('/portal/ess/profile'),
  updateProfile: (data) => api.put('/portal/ess/profile', data),
  getPayslips: () => api.get('/portal/ess/payslips'),
  getLeaveBalances: () => api.get('/portal/ess/leave-balances'),
  getAssets: () => api.get('/portal/ess/assets'),
  getAttendance: (params) => api.get('/portal/ess/attendance', { params }),
  getTrainings: () => api.get('/portal/ess/trainings'),
  getNotifications: () => api.get('/portal/ess/notifications'),
  markNotificationRead: (id) => api.put(`/portal/ess/notifications/${id}/read`),
};

// Client Portal Service
export const clientPortalService = {
  login: (credentials) => api.post('/portal/client/login', credentials),
  register: (data) => api.post('/portal/client/register', data),
  updateProfile: (data) => api.put('/portal/client/profile', data),
  getInvoices: () => api.get('/portal/client/invoices'),
  getTickets: () => api.get('/portal/client/tickets'),
  getDocuments: () => api.get('/portal/client/documents'),
};

// Vendor Portal Service
export const vendorPortalService = {
  login: (credentials) => api.post('/portal/vendor/login', credentials),
  getPurchaseOrders: () => api.get('/portal/vendor/purchase-orders'),
  getQuotations: () => api.get('/portal/vendor/quotations'),
  submitQuotation: (data) => api.post('/portal/vendor/quotations', data),
  getDeliveries: () => api.get('/portal/vendor/deliveries'),
  updateProfile: (data) => api.put('/portal/vendor/profile', data),
};

// Support Tickets Service
export const ticketService = {
  getAll: (params) => api.get('/portal/tickets', { params }),
  getStats: () => api.get('/portal/tickets/stats'),
  getById: (id) => api.get(`/portal/tickets/${id}`),
  create: (data) => api.post('/portal/tickets', data),
  updateStatus: (id, data) => api.put(`/portal/tickets/${id}/status`, data),
  assign: (id, data) => api.put(`/portal/tickets/${id}/assign`, data),
  getMessages: (id) => api.get(`/portal/tickets/${id}/messages`),
  addMessage: (id, data) => api.post(`/portal/tickets/${id}/messages`, data),
  uploadAttachment: (id, formData) => api.post(`/portal/tickets/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/portal/tickets/${id}`),
};

// Announcements Service
export const announcementService = {
  getAll: (params) => api.get('/portal/announcements', { params }),
  getById: (id) => api.get(`/portal/announcements/${id}`),
  create: (data) => api.post('/portal/announcements', data),
  markRead: (id) => api.put(`/portal/announcements/${id}/read`),
  delete: (id) => api.delete(`/portal/announcements/${id}`),
};

// Messages Service
export const messageService = {
  getSent: (params) => api.get('/portal/messages/sent', { params }),
  getReceived: (params) => api.get('/portal/messages/received', { params }),
  getUnreadCount: () => api.get('/portal/messages/unread-count'),
  send: (data) => api.post('/portal/messages', data),
  sendBroadcast: (data) => api.post('/portal/messages/broadcast', data),
  markRead: (id) => api.put(`/portal/messages/${id}/read`),
};

// Calendar Service
export const calendarService = {
  getAll: (params) => api.get('/portal/calendar', { params }),
  getUpcoming: (params) => api.get('/portal/calendar/upcoming', { params }),
  getStats: () => api.get('/portal/calendar/stats'),
  getById: (id) => api.get(`/portal/calendar/${id}`),
  create: (data) => api.post('/portal/calendar', data),
  update: (id, data) => api.put(`/portal/calendar/${id}`, data),
  delete: (id) => api.delete(`/portal/calendar/${id}`),
  addParticipant: (eventId, data) => api.post(`/portal/calendar/${eventId}/participants`, data),
  updateParticipantResponse: (eventId, participantId, data) => api.put(`/portal/calendar/${eventId}/participants/${participantId}`, data),
  removeParticipant: (eventId, participantId) => api.delete(`/portal/calendar/${eventId}/participants/${participantId}`),
};

// Integrations Service
export const integrationService = {
  getAll: (params) => api.get('/portal/integrations', { params }),
  getById: (id) => api.get(`/portal/integrations/${id}`),
  create: (data) => api.post('/portal/integrations', data),
  update: (id, data) => api.put(`/portal/integrations/${id}`, data),
  toggle: (id) => api.put(`/portal/integrations/${id}/toggle`),
  delete: (id) => api.delete(`/portal/integrations/${id}`),
  getLogs: (id, params) => api.get(`/portal/integrations/${id}/logs`, { params }),
  getStats: (id) => api.get(`/portal/integrations/${id}/stats`),
  getWebhooks: () => api.get('/portal/integrations/webhooks'),
  createWebhook: (data) => api.post('/portal/integrations/webhooks', data),
  updateWebhook: (id, data) => api.put(`/portal/integrations/webhooks/${id}`, data),
  deleteWebhook: (id) => api.delete(`/portal/integrations/webhooks/${id}`),
  getWebhookDeliveries: (id) => api.get(`/portal/integrations/webhooks/${id}/deliveries`),
};

// Payments Service
export const paymentService = {
  getAll: (params) => api.get('/portal/payments', { params }),
  getStats: () => api.get('/portal/payments/stats'),
  getById: (id) => api.get(`/portal/payments/${id}`),
  create: (data) => api.post('/portal/payments', data),
  processMpesa: (data) => api.post('/portal/payments/mpesa', data),
  updateStatus: (id, data) => api.put(`/portal/payments/${id}/status`, data),
  getByReference: (type, id) => api.get(`/portal/payments/reference/${type}/${id}`),
};
