import api from './axios';

export const fileSecurityApi = {
  // Dashboard
  getDashboard: () => api.get('/file-security/dashboard'),

  // Upload
  uploadFile: (formData) => api.post('/file-security/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => e,
  }),

  // Files
  listFiles: (params) => api.get('/file-security/files', { params }),
  getFile: (id) => api.get(`/file-security/files/${id}`),
  updateFile: (id, data) => api.put(`/file-security/files/${id}`, data),
  deleteFile: (id) => api.delete(`/file-security/files/${id}`),

  // Download / Preview
  downloadFile: (id) => api.get(`/file-security/download/${id}`, { responseType: 'blob' }),
  previewFile: (id) => api.get(`/file-security/preview/${id}`, { responseType: 'blob' }),
  signedDownload: (token) => api.get(`/file-security/download/token/${token}`, { responseType: 'blob' }),

  // Tokens
  generateToken: (fileId, data) => api.post(`/file-security/files/${fileId}/token`, data),

  // Sharing
  shareFile: (fileId, data) => api.post(`/file-security/files/${fileId}/share`, data),
  revokeShare: (shareId) => api.post(`/file-security/shares/${shareId}/revoke`),
  accessShared: (token) => api.get(`/file-security/shared/access/${token}`, { responseType: 'blob' }),
  getMyShares: () => api.get('/file-security/my-shares'),
  getShareAnalytics: () => api.get('/file-security/share-analytics'),

  // Access Logs
  getAccessLogs: (params) => api.get('/file-security/access-logs', { params }),

  // DLP
  getDLPAlerts: (params) => api.get('/file-security/dlp/alerts', { params }),
  resolveDLPAlert: (id) => api.post(`/file-security/dlp/alerts/${id}/resolve`),
  getDLPStats: () => api.get('/file-security/dlp/stats'),

  // Classifications
  getClassifications: () => api.get('/file-security/classifications'),
  updateClassification: (id, data) => api.put(`/file-security/classifications/${id}`, data),

  // Scans
  getScanHistory: (fileId) => api.get(`/file-security/scans/${fileId}`),
  getScanStats: () => api.get('/file-security/scan-stats'),

  // Storage
  getStorageAnalytics: () => api.get('/file-security/storage-analytics'),

  // Watermarks
  getWatermarkLogs: (fileId) => api.get(`/file-security/watermarks/${fileId}`),
};
