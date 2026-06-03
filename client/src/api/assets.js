import api from './axios';

export const assetService = {
  list: (params) => api.get('/assets', { params }),
  getById: (id) => api.get(`/assets/${id}`),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  getCategories: () => api.get('/assets/categories'),
  createCategory: (data) => api.post('/assets/categories', data),
  uploadDocument: (id, formData) => api.post(`/assets/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  runDepreciation: (id) => api.post(`/assets/${id}/depreciation`),
  getDisposals: () => api.get('/assets/disposals'),
  createDisposal: (data) => api.post('/assets/disposals', data),
  approveDisposal: (id) => api.post(`/assets/disposals/${id}/approve`),
};

export const assignmentService = {
  list: (params) => api.get('/assets/assignments', { params }),
  getTransfers: () => api.get('/assets/assignments/transfers'),
  checkout: (data) => api.post('/assets/assignments/checkout', data),
  checkin: (id, data) => api.post(`/assets/assignments/${id}/checkin`, data),
  transfer: (assetId, data) => api.post(`/assets/assignments/${assetId}/transfer`, data),
};

export const fleetService = {
  list: (params) => api.get('/assets/fleet', { params }),
  getById: (id) => api.get(`/assets/fleet/${id}`),
  create: (data) => api.post('/assets/fleet', data),
  update: (id, data) => api.put(`/assets/fleet/${id}`, data),
  addFuel: (id, data) => api.post(`/assets/fleet/${id}/fuel`, data),
  addTrip: (id, data) => api.post(`/assets/fleet/${id}/trips`, data),
  getFuelLogs: (params) => api.get('/assets/fleet/fuel', { params }),
  getTrips: (params) => api.get('/assets/fleet/trips', { params }),
  getFuelAnalytics: (params) => api.get('/assets/fleet/analytics/fuel', { params }),
  getMileageAnalytics: () => api.get('/assets/fleet/analytics/mileage'),
};

export const maintenanceService = {
  list: (params) => api.get('/assets/maintenance', { params }),
  getById: (id) => api.get(`/assets/maintenance/${id}`),
  create: (data) => api.post('/assets/maintenance', data),
  update: (id, data) => api.put(`/assets/maintenance/${id}`, data),
  updateStatus: (id, data) => api.patch(`/assets/maintenance/${id}/status`, data),
  approve: (id) => api.post(`/assets/maintenance/${id}/approve`),
  getOverdue: () => api.get('/assets/maintenance/overdue'),
  getUpcoming: (params) => api.get('/assets/maintenance/upcoming', { params }),
  getServiceAlerts: () => api.get('/assets/maintenance/service-alerts'),
  getCosts: (params) => api.get('/assets/maintenance/costs', { params }),
};

export const insuranceService = {
  list: (params) => api.get('/assets/insurance', { params }),
  getById: (id) => api.get(`/assets/insurance/${id}`),
  create: (data) => api.post('/assets/insurance', data),
  update: (id, data) => api.put(`/assets/insurance/${id}`, data),
  getExpiring: () => api.get('/assets/insurance/expiring'),
  getClaims: (params) => api.get('/assets/insurance/claims', { params }),
  createClaim: (policyId, data) => api.post(`/assets/insurance/${policyId}/claims`, data),
  updateClaim: (policyId, claimId, data) => api.patch(`/assets/insurance/${policyId}/claims/${claimId}`, data),
};

export const sparePartService = {
  list: (params) => api.get('/assets/spare-parts', { params }),
  getById: (id) => api.get(`/assets/spare-parts/${id}`),
  create: (data) => api.post('/assets/spare-parts', data),
  update: (id, data) => api.put(`/assets/spare-parts/${id}`, data),
  addStock: (id, data) => api.post(`/assets/spare-parts/${id}/stock-in`, data),
  removeStock: (id, data) => api.post(`/assets/spare-parts/${id}/stock-out`, data),
  getLowStock: () => api.get('/assets/spare-parts/low-stock'),
};

export const vendorService = {
  list: () => api.get('/assets/vendors'),
  getById: (id) => api.get(`/assets/vendors/${id}`),
  create: (data) => api.post('/assets/vendors', data),
  update: (id, data) => api.put(`/assets/vendors/${id}`, data),
};

export const assetDashboardService = {
  getStats: () => api.get('/assets/dashboard'),
};
