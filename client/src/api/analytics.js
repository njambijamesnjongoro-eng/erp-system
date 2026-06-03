import api from './axios';

export const dashboardService = {
  getExecutiveSummary: () => api.get('/analytics/dashboard/stats'),
  getEmployeeStats: () => api.get('/analytics/dashboard/employee-stats'),
  getFinancialStats: () => api.get('/analytics/dashboard/financial-stats'),
  getAssetStats: () => api.get('/analytics/dashboard/asset-stats'),
  getProcurementStats: () => api.get('/analytics/dashboard/procurement-stats'),
  getComplianceStats: () => api.get('/analytics/dashboard/compliance-stats'),
  getKpiCards: () => api.get('/analytics/dashboard/kpi-cards'),
  getWidgetData: (params) => api.get('/analytics/dashboard/widget-data', { params }),
  getWidgets: () => api.get('/analytics/dashboard/widgets'),
  saveWidget: (data) => api.post('/analytics/dashboard/widgets', data),
  updateWidget: (id, data) => api.put(`/analytics/dashboard/widgets/${id}`, data),
  deleteWidget: (id) => api.delete(`/analytics/dashboard/widgets/${id}`),
};

export const analyticsService = {
  getRevenueTrends: (params) => api.get('/analytics/analytics/revenue-trends', { params }),
  getDepartmentComparison: (params) => api.get('/analytics/analytics/department-comparison', { params }),
  getYearOverYear: (params) => api.get('/analytics/analytics/year-over-year', { params }),
  getKpiRecords: (params) => api.get('/analytics/analytics/kpi-records', { params }),
  recordKpi: (data) => api.post('/analytics/analytics/kpi-records', data),
};

export const notificationService = {
  getNotifications: (params) => api.get('/analytics/notifications', { params }),
  getUnreadCount: () => api.get('/analytics/notifications/unread-count'),
  markAsRead: (id) => api.put(`/analytics/notifications/${id}/read`),
  markAllAsRead: () => api.put('/analytics/notifications/read-all'),
  archiveNotification: (id) => api.put(`/analytics/notifications/${id}/archive`),
  deleteNotification: (id) => api.delete(`/analytics/notifications/${id}`),
  getPreferences: () => api.get('/analytics/notifications/preferences'),
  updatePreferences: (data) => api.put('/analytics/notifications/preferences', data),
};

export const reportService = {
  getDefinitions: () => api.get('/analytics/reports/definitions'),
  generateReport: (data) => api.post('/analytics/reports/generate', data),
  getReports: (params) => api.get('/analytics/reports', { params }),
  getReportById: (id) => api.get(`/analytics/reports/${id}`),
  deleteReport: (id) => api.delete(`/analytics/reports/${id}`),
  getSchedules: () => api.get('/analytics/reports/schedules'),
  createSchedule: (data) => api.post('/analytics/reports/schedules', data),
  updateSchedule: (id, data) => api.put(`/analytics/reports/schedules/${id}`, data),
  deleteSchedule: (id) => api.delete(`/analytics/reports/schedules/${id}`),
  getTemplates: (params) => api.get('/analytics/reports/templates', { params }),
  getTemplateById: (id) => api.get(`/analytics/reports/templates/${id}`),
  createTemplate: (data) => api.post('/analytics/reports/templates', data),
  updateTemplate: (id, data) => api.put(`/analytics/reports/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/analytics/reports/templates/${id}`),
  sendEmail: (data) => api.post('/analytics/reports/send-email', data),
  getEmailLogs: (params) => api.get('/analytics/reports/email-logs', { params }),
};

export const auditLogService = {
  getActivityFeed: (params) => api.get('/analytics/audit-logs/activity', { params }),
  getAuditTrail: (entityType, entityId) => api.get(`/analytics/audit-logs/${entityType}/${entityId}`),
  getSystemLogs: (params) => api.get('/analytics/audit-logs/system-logs', { params }),
  getComplianceRecords: (params) => api.get('/analytics/audit-logs/compliance', { params }),
  exportAuditLogs: (params) => api.get('/analytics/audit-logs/export', { params }),
  getLoginHistory: (params) => api.get('/analytics/audit-logs/login-history', { params }),
};

export const biService = {
  getInsights: (params) => api.get('/analytics/bi-insights', { params }),
  generateInsights: () => api.post('/analytics/bi-insights/generate'),
  getRecommendations: () => api.get('/analytics/bi-insights/recommendations'),
  dismissInsight: (id) => api.put(`/analytics/bi-insights/${id}/dismiss`),
  resolveInsight: (id) => api.put(`/analytics/bi-insights/${id}/resolve`),
};

export const systemMonitorService = {
  getHealth: () => api.get('/analytics/system-monitor/health'),
  getPerformance: () => api.get('/analytics/system-monitor/performance'),
  getUserActivity: (params) => api.get('/analytics/system-monitor/user-activity', { params }),
  getErrors: (params) => api.get('/analytics/system-monitor/errors', { params }),
  getActiveUsers: () => api.get('/analytics/system-monitor/active-users'),
};
