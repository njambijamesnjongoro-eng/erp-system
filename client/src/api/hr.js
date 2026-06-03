import api from './axios';

// ----- EMPLOYEES -----
export const employeeService = {
  list: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  remove: (id) => api.delete(`/employees/${id}`),
  uploadPhoto: (id, formData) => api.post(`/employees/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ----- ATTENDANCE -----
export const attendanceService = {
  list: (params) => api.get('/attendance', { params }),
  getById: (id) => api.get(`/attendance/${id}`),
  getTodayStatus: (employeeId) => api.get(`/attendance/today/${employeeId}`),
  getSummary: (params) => api.get('/attendance/summary', { params }),
  clockIn: (employeeId) => api.post('/attendance/clock-in', { employeeId }),
  clockOut: (employeeId) => api.post('/attendance/clock-out', { employeeId }),
};

// ----- LEAVE -----
export const leaveService = {
  getTypes: () => api.get('/leave/types'),
  listRequests: (params) => api.get('/leave/requests', { params }),
  getRequest: (id) => api.get(`/leave/requests/${id}`),
  createRequest: (data) => api.post('/leave/requests', data),
  approveRequest: (id, data) => api.patch(`/leave/requests/${id}/approve`, data),
  getBalances: (params) => api.get('/leave/balances', { params }),
  initBalances: (data) => api.post('/leave/balances/init', data),
};

// ----- INSURANCE -----
export const insuranceService = {
  list: (params) => api.get('/insurance', { params }),
  getById: (id) => api.get(`/insurance/${id}`),
  create: (data) => api.post('/insurance', data),
  update: (id, data) => api.put(`/insurance/${id}`, data),
  remove: (id) => api.delete(`/insurance/${id}`),
  getExpiring: (params) => api.get('/insurance/expiring', { params }),
};

// ----- TRAINING -----
export const trainingService = {
  listPrograms: () => api.get('/training/programs'),
  createProgram: (data) => api.post('/training/programs', data),
  listEmployeeTraining: (params) => api.get('/training/employee-training', { params }),
  createEmployeeTraining: (data) => api.post('/training/employee-training', data),
  updateEmployeeTraining: (id, data) => api.put(`/training/employee-training/${id}`, data),
  listCertifications: (params) => api.get('/training/certifications', { params }),
  createCertification: (data) => api.post('/training/certifications', data),
};

// ----- PERFORMANCE -----
export const performanceService = {
  list: (params) => api.get('/performance', { params }),
  getById: (id) => api.get(`/performance/${id}`),
  create: (data) => api.post('/performance', data),
  update: (id, data) => api.put(`/performance/${id}`, data),
  remove: (id) => api.delete(`/performance/${id}`),
};

// ----- DOCUMENTS -----
export const documentService = {
  list: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  verify: (id, verifiedBy) => api.patch(`/documents/${id}/verify`, { verifiedBy }),
  remove: (id) => api.delete(`/documents/${id}`),
};

// ----- ONBOARDING -----
export const onboardingService = {
  getTasks: (employeeId) => api.get(`/onboarding/tasks/${employeeId}`),
  createTask: (data) => api.post('/onboarding/tasks', data),
  completeTask: (id) => api.patch(`/onboarding/tasks/${id}/complete`),
  removeTask: (id) => api.delete(`/onboarding/tasks/${id}`),
};

// ----- HR DASHBOARD -----
export const hrDashboardService = {
  getOverview: () => api.get('/hr/dashboard/overview'),
};

// ----- DEPARTMENTS -----
export const departmentService = {
  list: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  remove: (id) => api.delete(`/departments/${id}`),
};

// ----- USERS -----
export const userService = {
  list: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  toggleActive: (id) => api.patch(`/users/${id}/toggle-active`),
};
