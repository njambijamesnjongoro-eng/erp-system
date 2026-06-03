import api from './axios';

export const financeDashboardService = {
  getStats: () => api.get('/finance/dashboard'),
};

export const payrollService = {
  listPeriods: (params) => api.get('/finance/payroll/periods', { params }),
  getPeriod: (id) => api.get(`/finance/payroll/periods/${id}`),
  createPeriod: (data) => api.post('/finance/payroll/periods', data),
  processPayroll: (id) => api.post(`/finance/payroll/periods/${id}/process`),
  approvePayroll: (id) => api.post(`/finance/payroll/periods/${id}/approve`),
  closePeriod: (id) => api.post(`/finance/payroll/periods/${id}/close`),
  getSalaryStructures: () => api.get('/finance/payroll/salary-structures'),
  createSalaryStructure: (data) => api.post('/finance/payroll/salary-structures', data),
  getPayslips: (params) => api.get('/finance/payroll/payslips', { params }),
};

export const expenseService = {
  list: (params) => api.get('/finance/expenses', { params }),
  getById: (id) => api.get(`/finance/expenses/${id}`),
  create: (data) => api.post('/finance/expenses', data),
  update: (id, data) => api.put(`/finance/expenses/${id}`, data),
  approve: (id) => api.post(`/finance/expenses/${id}/approve`),
  reject: (id, data) => api.post(`/finance/expenses/${id}/reject`, data),
  getCategories: () => api.get('/finance/expenses/categories'),
  uploadReceipt: (id, formData) => api.post(`/finance/expenses/${id}/receipt`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const budgetService = {
  list: (params) => api.get('/finance/budgets', { params }),
  getById: (id) => api.get(`/finance/budgets/${id}`),
  create: (data) => api.post('/finance/budgets', data),
  update: (id, data) => api.put(`/finance/budgets/${id}`, data),
  approve: (id) => api.post(`/finance/budgets/${id}/approve`),
};

export const taxService = {
  list: (params) => api.get('/finance/taxes', { params }),
  create: (data) => api.post('/finance/taxes', data),
  pay: (id, data) => api.post(`/finance/taxes/${id}/pay`, data),
};

export const loanService = {
  list: (params) => api.get('/finance/loans', { params }),
  getById: (id) => api.get(`/finance/loans/${id}`),
  create: (data) => api.post('/finance/loans', data),
  makePayment: (id, data) => api.post(`/finance/loans/${id}/pay`, data),
  listEmployee: () => api.get('/finance/loans/employee/list'),
  createEmployee: (data) => api.post('/finance/loans/employee', data),
};

export const accountService = {
  getChart: () => api.get('/finance/accounts/chart'),
  createAccount: (data) => api.post('/finance/accounts/chart', data),
  listTransactions: (params) => api.get('/finance/accounts/transactions', { params }),
  createTransaction: (data) => api.post('/finance/accounts/transactions', data),
  listInvoices: (params) => api.get('/finance/accounts/invoices', { params }),
  createInvoice: (data) => api.post('/finance/accounts/invoices', data),
};

export const reportService = {
  profitLoss: (params) => api.get('/finance/reports/profit-loss', { params }),
  expenseReport: (params) => api.get('/finance/reports/expenses', { params }),
  budgetReport: (params) => api.get('/finance/reports/budgets', { params }),
  taxSummary: (params) => api.get('/finance/reports/taxes', { params }),
  payrollSummary: (params) => api.get('/finance/reports/payroll', { params }),
  balanceSheet: () => api.get('/finance/reports/balance-sheet'),
};
