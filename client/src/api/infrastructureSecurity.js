import api from './axios';

const withParams = (params) => {
  const filtered = Object.entries(params || {}).filter(([_, v]) => v !== undefined && v !== '' && v !== null);
  const qs = filtered.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return qs ? `?${qs}` : '';
};

export const infrastructureSecurityApi = {
  // Dashboard
  getDashboard: () => api.get('/infrastructure/dashboard'),

  // Servers
  getServers: (params) => api.get(`/infrastructure/servers${withParams(params)}`),
  getServerById: (serverId) => api.get(`/infrastructure/servers/${serverId}`),
  createServer: (data) => api.post('/infrastructure/servers', data),
  updateServer: (serverId, data) => api.put(`/infrastructure/servers/${serverId}`, data),
  deleteServer: (serverId) => api.delete(`/infrastructure/servers/${serverId}`),
  getServerHealth: (serverId) => api.get(`/infrastructure/servers/${serverId}/health`),
  getServerSecurityScore: (serverId) => api.get(`/infrastructure/servers/${serverId}/security-score`),

  // Containers
  getContainers: (params) => api.get(`/infrastructure/containers${withParams(params)}`),
  createContainer: (data) => api.post('/infrastructure/containers', data),
  scanContainerImage: (containerId) => api.post(`/infrastructure/containers/${containerId}/`),

  // Deployments
  getDeployments: (params) => api.get(`/infrastructure/deployments${withParams(params)}`),
  getDeploymentById: (deploymentId) => api.get(`/infrastructure/deployments/${deploymentId}`),
  createDeployment: (data) => api.post('/infrastructure/deployments', data),
  approveDeployment: (deploymentId) => api.post(`/infrastructure/deployments/${deploymentId}/approve`),
  deployVersion: (deploymentId) => api.post(`/infrastructure/deployments/${deploymentId}/deploy`),
  rollbackDeployment: (deploymentId, reason) => api.post(`/infrastructure/deployments/${deploymentId}/rollback`, { reason }),
  getDeploymentAudit: (params) => api.get(`/infrastructure/deployments/audit/logs${withParams(params)}`),

  // Firewall
  getFirewallRules: (params) => api.get(`/infrastructure/firewall/rules${withParams(params)}`),
  getFirewallRuleById: (ruleId) => api.get(`/infrastructure/firewall/rules/${ruleId}`),
  createFirewallRule: (data) => api.post('/infrastructure/firewall/rules', data),
  updateFirewallRule: (ruleId, data) => api.put(`/infrastructure/firewall/rules/${ruleId}`, data),
  deleteFirewallRule: (ruleId) => api.delete(`/infrastructure/firewall/rules/${ruleId}`),
  getFirewallLogs: (params) => api.get(`/infrastructure/firewall/logs${withParams(params)}`),
  getFirewallAnalytics: () => api.get('/infrastructure/firewall/analytics'),

  // SSL
  getCertificates: (params) => api.get(`/infrastructure/ssl-certificates${withParams(params)}`),
  getCertificateById: (certId) => api.get(`/infrastructure/ssl-certificates/${certId}`),
  createCertificate: (data) => api.post('/infrastructure/ssl-certificates', data),
  renewCertificate: (certId) => api.post(`/infrastructure/ssl-certificates/${certId}/renew`),
  checkCertificateExpiry: () => api.post('/infrastructure/ssl-certificates/check-expiry'),

  // Vulnerabilities
  getVulnerabilities: (params) => api.get(`/infrastructure/vulnerabilities${withParams(params)}`),
  getVulnerabilityStats: () => api.get('/infrastructure/vulnerabilities/stats'),
  getVulnerabilityById: (vulnId) => api.get(`/infrastructure/vulnerabilities/${vulnId}`),
  createVulnerability: (data) => api.post('/infrastructure/vulnerabilities', data),
  updateVulnerability: (vulnId, data) => api.put(`/infrastructure/vulnerabilities/${vulnId}`, data),

  // Backups
  getBackups: (params) => api.get(`/infrastructure/backups${withParams(params)}`),
  getBackupById: (backupId) => api.get(`/infrastructure/backups/${backupId}`),
  createBackup: (data) => api.post('/infrastructure/backups', data),
  verifyBackup: (backupId) => api.post(`/infrastructure/backups/${backupId}/verify`),
  restoreBackup: (backupId) => api.post(`/infrastructure/backups/${backupId}/restore`),
  getRecoveryRecords: (params) => api.get(`/infrastructure/recovery-records${withParams(params)}`),
  createRecoveryRecord: (data) => api.post('/infrastructure/recovery-records', data),

  // Secrets
  getSecrets: (params) => api.get(`/infrastructure/secrets${withParams(params)}`),
  getSecretById: (secretId) => api.get(`/infrastructure/secrets/${secretId}`),
  createSecret: (data) => api.post('/infrastructure/secrets', data),
  rotateSecret: (secretId) => api.post(`/infrastructure/secrets/${secretId}/rotate`),
  deleteSecret: (secretId) => api.delete(`/infrastructure/secrets/${secretId}`),

  // Monitoring
  getMetrics: (params) => api.get(`/infrastructure/metrics${withParams(params)}`),
  recordMetric: (data) => api.post('/infrastructure/metrics', data),
  getAlerts: (params) => api.get(`/infrastructure/alerts${withParams(params)}`),
  getAlertStats: () => api.get('/infrastructure/alerts/stats'),
  createAlert: (data) => api.post('/infrastructure/alerts', data),
  acknowledgeAlert: (alertId) => api.post(`/infrastructure/alerts/${alertId}/acknowledge`),
  resolveAlert: (alertId) => api.post(`/infrastructure/alerts/${alertId}/resolve`),

  // Dependencies
  getDependencies: (params) => api.get(`/infrastructure/dependencies${withParams(params)}`),
  scanDependencies: () => api.post('/infrastructure/dependencies/scan'),
  updateDependency: (id, data) => api.put(`/infrastructure/dependencies/${id}`, data),

  // Cloud
  getCloudResources: (params) => api.get(`/infrastructure/cloud-resources${withParams(params)}`),
  getCloudSecurityScore: () => api.get('/infrastructure/cloud-resources/security-score'),
  getCloudResourceById: (resourceId) => api.get(`/infrastructure/cloud-resources/${resourceId}`),
  createCloudResource: (data) => api.post('/infrastructure/cloud-resources', data),

  // Incidents
  getIncidents: (params) => api.get(`/infrastructure/incidents${withParams(params)}`),
  getIncidentById: (incidentId) => api.get(`/infrastructure/incidents/${incidentId}`),
  createIncident: (data) => api.post('/infrastructure/incidents', data),
  updateIncidentStatus: (incidentId, data) => api.put(`/infrastructure/incidents/${incidentId}/status`, data),

  // Audit Logs
  getAuditLogs: (params) => api.get(`/infrastructure/audit-logs${withParams(params)}`),

  // Network Logs
  getNetworkLogs: (params) => api.get(`/infrastructure/network-logs${withParams(params)}`),
  getSuspiciousNetworkActivity: () => api.get('/infrastructure/network-logs/suspicious'),

  // Security Benchmarks
  getSecurityBenchmarks: () => api.get('/infrastructure/security-benchmarks'),
};
