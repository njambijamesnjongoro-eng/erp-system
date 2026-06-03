import api from './axios';

export const procurementService = {
  list: (params) => api.get('/procurement/requests', { params }),
  getById: (id) => api.get(`/procurement/requests/${id}`),
  create: (data) => api.post('/procurement/requests', data),
  update: (id, data) => api.put(`/procurement/requests/${id}`, data),
  delete: (id) => api.delete(`/procurement/requests/${id}`),
  submit: (id) => api.post(`/procurement/requests/${id}/submit`),
  getCategories: () => api.get('/procurement/requests/categories'),
  getAttachments: (id) => api.get(`/procurement/requests/${id}/attachments`),
  uploadAttachment: (id, formData) => api.post(`/procurement/requests/${id}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const approvalService = {
  getPending: () => api.get('/procurement/approvals/pending'),
  getMyApprovals: (params) => api.get('/procurement/approvals', { params }),
  getHistory: (requestId) => api.get(`/procurement/approvals/history/${requestId}`),
  approve: (id, data) => api.post(`/procurement/approvals/${id}/approve`, data),
  reject: (id, data) => api.post(`/procurement/approvals/${id}/reject`, data),
};

export const supplierService = {
  list: (params) => api.get('/procurement/suppliers', { params }),
  getById: (id) => api.get(`/procurement/suppliers/${id}`),
  create: (data) => api.post('/procurement/suppliers', data),
  update: (id, data) => api.put(`/procurement/suppliers/${id}`, data),
  blacklist: (id, data) => api.put(`/procurement/suppliers/${id}/blacklist`, data),
  whitelist: (id) => api.put(`/procurement/suppliers/${id}/whitelist`),
  getContracts: (id) => api.get(`/procurement/suppliers/${id}/contracts`),
  createContract: (id, data) => api.post(`/procurement/suppliers/${id}/contracts`, data),
  getPerformance: (id) => api.get(`/procurement/suppliers/${id}/performance`),
  rateSupplier: (id, data) => api.post(`/procurement/suppliers/${id}/rate`, data),
  getExpiringContracts: (params) => api.get('/procurement/suppliers/expiring-contracts', { params }),
};

export const purchaseOrderService = {
  list: (params) => api.get('/procurement/purchase-orders', { params }),
  getById: (id) => api.get(`/procurement/purchase-orders/${id}`),
  create: (data) => api.post('/procurement/purchase-orders', data),
  update: (id, data) => api.put(`/procurement/purchase-orders/${id}`, data),
  approve: (id, data) => api.post(`/procurement/purchase-orders/${id}/approve`, data),
  send: (id) => api.post(`/procurement/purchase-orders/${id}/send`),
  cancel: (id, data) => api.post(`/procurement/purchase-orders/${id}/cancel`, data),
  getByRequest: (requestId) => api.get(`/procurement/purchase-orders/by-request/${requestId}`),
};

export const inventoryService = {
  list: (params) => api.get('/procurement/inventory', { params }),
  getById: (id) => api.get(`/procurement/inventory/${id}`),
  create: (data) => api.post('/procurement/inventory', data),
  update: (id, data) => api.put(`/procurement/inventory/${id}`, data),
  delete: (id) => api.delete(`/procurement/inventory/${id}`),
  getCategories: () => api.get('/procurement/inventory/categories'),
  createCategory: (data) => api.post('/procurement/inventory/categories', data),
  getStockValue: () => api.get('/procurement/inventory/stock-value'),
  getLowStock: () => api.get('/procurement/inventory/low-stock'),
  getMovements: (id, params) => api.get(`/procurement/inventory/${id}/movements`, { params }),
  recordMovement: (data) => api.post('/procurement/inventory/movements', data),
};

export const warehouseService = {
  list: (params) => api.get('/procurement/warehouses', { params }),
  getById: (id) => api.get(`/procurement/warehouses/${id}`),
  create: (data) => api.post('/procurement/warehouses', data),
  update: (id, data) => api.put(`/procurement/warehouses/${id}`, data),
  getBins: (id) => api.get(`/procurement/warehouses/${id}/bins`),
  createBin: (id, data) => api.post(`/procurement/warehouses/${id}/bins`, data),
  updateBin: (id, binId, data) => api.put(`/procurement/warehouses/${id}/bins/${binId}`, data),
  getStockByWarehouse: (id) => api.get(`/procurement/warehouses/${id}/stock`),
};

export const goodsReceiptService = {
  list: (params) => api.get('/procurement/goods-receipt', { params }),
  getById: (id) => api.get(`/procurement/goods-receipt/${id}`),
  create: (data) => api.post('/procurement/goods-receipt', data),
  receive: (id, data) => api.post(`/procurement/goods-receipt/${id}/receive`, data),
  getByPO: (poId) => api.get(`/procurement/goods-receipt/by-po/${poId}`),
  reportDiscrepancy: (id, data) => api.post(`/procurement/goods-receipt/${id}/discrepancy`, data),
};

export const procurementDashboardService = {
  getStats: () => api.get('/procurement/dashboard/stats'),
  getRequestsByStatus: () => api.get('/procurement/dashboard/requests-by-status'),
  getSpendingByDepartment: () => api.get('/procurement/dashboard/spending-by-department'),
  getMonthlyTrend: () => api.get('/procurement/dashboard/monthly-trend'),
  getTopSuppliers: () => api.get('/procurement/dashboard/top-suppliers'),
  getPendingApprovalsCount: () => api.get('/procurement/dashboard/pending-approvals-count'),
};
