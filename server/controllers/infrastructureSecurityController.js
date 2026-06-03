const infraService = require('../services/infrastructureSecurityService');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ============= DASHBOARD =============
exports.getDashboard = wrap(async (req, res) => {
  const data = await infraService.getDashboard();
  res.json({ success: true, data });
});

// ============= SERVERS =============
exports.getServers = wrap(async (req, res) => {
  const result = await infraService.getServers(req.query);
  res.json({ success: true, data: result });
});

exports.getServerById = wrap(async (req, res) => {
  const data = await infraService.getServerById(req.params.serverId);
  res.json({ success: true, data });
});

exports.createServer = wrap(async (req, res) => {
  const result = await infraService.createServer(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.updateServer = wrap(async (req, res) => {
  const result = await infraService.updateServer(req.params.serverId, req.body);
  res.json({ success: true, data: result });
});

exports.deleteServer = wrap(async (req, res) => {
  await infraService.deleteServer(req.params.serverId);
  res.json({ success: true, data: { serverId: req.params.serverId } });
});

exports.getServerHealthMetrics = wrap(async (req, res) => {
  const data = await infraService.getServerHealthMetrics(req.params.serverId);
  res.json({ success: true, data });
});

exports.getServerSecurityScore = wrap(async (req, res) => {
  const data = await infraService.getServerSecurityScore(req.params.serverId);
  res.json({ success: true, data });
});

// ============= CONTAINERS =============
exports.getContainers = wrap(async (req, res) => {
  const result = await infraService.getContainers(req.query);
  res.json({ success: true, data: result });
});

exports.createContainer = wrap(async (req, res) => {
  const result = await infraService.createContainer(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.scanContainerImage = wrap(async (req, res) => {
  const result = await infraService.scanContainerImage(req.params.containerId);
  res.json({ success: true, data: result });
});

// ============= DEPLOYMENTS =============
exports.getDeployments = wrap(async (req, res) => {
  const result = await infraService.getDeployments(req.query);
  res.json({ success: true, data: result });
});

exports.getDeploymentById = wrap(async (req, res) => {
  const data = await infraService.getDeploymentById(req.params.deploymentId);
  res.json({ success: true, data });
});

exports.createDeployment = wrap(async (req, res) => {
  const result = await infraService.createDeployment(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.approveDeployment = wrap(async (req, res) => {
  const result = await infraService.approveDeployment(req.params.deploymentId, req.user?.id, req.user?.name);
  res.json({ success: true, data: result });
});

exports.deployVersion = wrap(async (req, res) => {
  const result = await infraService.deployVersion(req.params.deploymentId);
  res.json({ success: true, data: result });
});

exports.rollbackDeployment = wrap(async (req, res) => {
  const result = await infraService.rollbackDeployment(req.params.deploymentId, req.body.reason);
  res.json({ success: true, data: result });
});

exports.getDeploymentAudit = wrap(async (req, res) => {
  const result = await infraService.getDeploymentAudit(req.query);
  res.json({ success: true, data: result });
});

// ============= FIREWALL =============
exports.getFirewallRules = wrap(async (req, res) => {
  const result = await infraService.getFirewallRules(req.query);
  res.json({ success: true, data: result });
});

exports.getFirewallRuleById = wrap(async (req, res) => {
  const data = await infraService.getFirewallRuleById(req.params.ruleId);
  res.json({ success: true, data });
});

exports.createFirewallRule = wrap(async (req, res) => {
  const result = await infraService.createFirewallRule(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.updateFirewallRule = wrap(async (req, res) => {
  const result = await infraService.updateFirewallRule(req.params.ruleId, req.body);
  res.json({ success: true, data: result });
});

exports.deleteFirewallRule = wrap(async (req, res) => {
  await infraService.deleteFirewallRule(req.params.ruleId);
  res.json({ success: true, data: { ruleId: req.params.ruleId } });
});

exports.getFirewallLogs = wrap(async (req, res) => {
  const result = await infraService.getFirewallLogs(req.query);
  res.json({ success: true, data: result });
});

exports.getFirewallAnalytics = wrap(async (req, res) => {
  const data = await infraService.getFirewallAnalytics();
  res.json({ success: true, data });
});

// ============= SSL =============
exports.getCertificates = wrap(async (req, res) => {
  const result = await infraService.getCertificates(req.query);
  res.json({ success: true, data: result });
});

exports.getCertificateById = wrap(async (req, res) => {
  const data = await infraService.getCertificateById(req.params.certId);
  res.json({ success: true, data });
});

exports.createCertificate = wrap(async (req, res) => {
  const result = await infraService.createCertificate(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.renewCertificate = wrap(async (req, res) => {
  const result = await infraService.renewCertificate(req.params.certId);
  res.json({ success: true, data: result });
});

exports.checkCertificateExpiry = wrap(async (req, res) => {
  const data = await infraService.checkCertificateExpiry();
  res.json({ success: true, data });
});

// ============= VULNERABILITIES =============
exports.getVulnerabilities = wrap(async (req, res) => {
  const result = await infraService.getVulnerabilities(req.query);
  res.json({ success: true, data: result });
});

exports.getVulnerabilityById = wrap(async (req, res) => {
  const data = await infraService.getVulnerabilityById(req.params.vulnId);
  res.json({ success: true, data });
});

exports.createVulnerability = wrap(async (req, res) => {
  const result = await infraService.createVulnerability(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.updateVulnerability = wrap(async (req, res) => {
  const result = await infraService.updateVulnerability(req.params.vulnId, req.body);
  res.json({ success: true, data: result });
});

exports.getVulnerabilityStats = wrap(async (req, res) => {
  const data = await infraService.getVulnerabilityStats();
  res.json({ success: true, data });
});

// ============= BACKUPS =============
exports.getBackups = wrap(async (req, res) => {
  const result = await infraService.getBackups(req.query);
  res.json({ success: true, data: result });
});

exports.getBackupById = wrap(async (req, res) => {
  const data = await infraService.getBackupById(req.params.backupId);
  res.json({ success: true, data });
});

exports.createBackup = wrap(async (req, res) => {
  const result = await infraService.createBackup(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.verifyBackup = wrap(async (req, res) => {
  const result = await infraService.verifyBackup(req.params.backupId);
  res.json({ success: true, data: result });
});

exports.restoreBackup = wrap(async (req, res) => {
  const result = await infraService.restoreBackup(req.params.backupId);
  res.json({ success: true, data: result });
});

exports.getRecoveryRecords = wrap(async (req, res) => {
  const result = await infraService.getRecoveryRecords(req.query);
  res.json({ success: true, data: result });
});

exports.createRecoveryRecord = wrap(async (req, res) => {
  const result = await infraService.createRecoveryRecord(req.body);
  res.status(201).json({ success: true, data: result });
});

// ============= SECRETS =============
exports.getSecrets = wrap(async (req, res) => {
  const result = await infraService.getSecrets(req.query);
  res.json({ success: true, data: result });
});

exports.getSecretById = wrap(async (req, res) => {
  const data = await infraService.getSecretById(req.params.secretId);
  res.json({ success: true, data });
});

exports.createSecret = wrap(async (req, res) => {
  const result = await infraService.createSecret(req.body, req.user?.id, req.user?.name);
  res.status(201).json({ success: true, data: result });
});

exports.rotateSecret = wrap(async (req, res) => {
  const result = await infraService.rotateSecret(req.params.secretId);
  res.json({ success: true, data: result });
});

exports.deleteSecret = wrap(async (req, res) => {
  await infraService.deleteSecret(req.params.secretId);
  res.json({ success: true, data: { secretId: req.params.secretId } });
});

// ============= MONITORING & ALERTS =============
exports.getMetrics = wrap(async (req, res) => {
  const data = await infraService.getMetrics(req.query.serverId, req.query.metricType, req.query.period);
  res.json({ success: true, data });
});

exports.recordMetric = wrap(async (req, res) => {
  const result = await infraService.recordMetric(req.body.serverId, req.body.metricType, req.body.metricName, req.body.metricValue, req.body.unit);
  res.status(201).json({ success: true, data: result });
});

exports.getAlerts = wrap(async (req, res) => {
  const result = await infraService.getAlerts(req.query);
  res.json({ success: true, data: result });
});

exports.createAlert = wrap(async (req, res) => {
  const result = await infraService.createAlert(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.acknowledgeAlert = wrap(async (req, res) => {
  const result = await infraService.acknowledgeAlert(req.params.alertId, req.user?.id);
  res.json({ success: true, data: result });
});

exports.resolveAlert = wrap(async (req, res) => {
  const result = await infraService.resolveAlert(req.params.alertId, req.user?.id);
  res.json({ success: true, data: result });
});

exports.getAlertStats = wrap(async (req, res) => {
  const data = await infraService.getAlertStats();
  res.json({ success: true, data });
});

// ============= DEPENDENCIES =============
exports.getDependencies = wrap(async (req, res) => {
  const result = await infraService.getDependencies(req.query);
  res.json({ success: true, data: result });
});

exports.scanDependencies = wrap(async (req, res) => {
  const result = await infraService.scanDependencies();
  res.json({ success: true, data: result });
});

exports.updateDependency = wrap(async (req, res) => {
  const result = await infraService.updateDependency(parseInt(req.params.id), req.body);
  res.json({ success: true, data: result });
});

// ============= CLOUD =============
exports.getCloudResources = wrap(async (req, res) => {
  const result = await infraService.getCloudResources(req.query);
  res.json({ success: true, data: result });
});

exports.getCloudResourceById = wrap(async (req, res) => {
  const data = await infraService.getCloudResourceById(req.params.resourceId);
  res.json({ success: true, data });
});

exports.createCloudResource = wrap(async (req, res) => {
  const result = await infraService.createCloudResource(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.getCloudSecurityScore = wrap(async (req, res) => {
  const data = await infraService.getCloudSecurityScore();
  res.json({ success: true, data });
});

// ============= INCIDENTS =============
exports.getIncidents = wrap(async (req, res) => {
  const result = await infraService.getIncidents(req.query);
  res.json({ success: true, data: result });
});

exports.getIncidentById = wrap(async (req, res) => {
  const data = await infraService.getIncidentById(req.params.incidentId);
  res.json({ success: true, data });
});

exports.createIncident = wrap(async (req, res) => {
  const result = await infraService.createIncident(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.updateIncidentStatus = wrap(async (req, res) => {
  const result = await infraService.updateIncidentStatus(req.params.incidentId, req.body.status, req.body.resolution);
  res.json({ success: true, data: result });
});

// ============= AUDIT LOGS =============
exports.getAuditLogs = wrap(async (req, res) => {
  const result = await infraService.getAuditLogs(req.query);
  res.json({ success: true, data: result });
});

// ============= NETWORK LOGS =============
exports.getNetworkLogs = wrap(async (req, res) => {
  const result = await infraService.getNetworkLogs(req.query);
  res.json({ success: true, data: result });
});

exports.getSuspiciousNetworkActivity = wrap(async (req, res) => {
  const data = await infraService.getSuspiciousNetworkActivity();
  res.json({ success: true, data });
});

// ============= SECURITY BENCHMARKS =============
exports.getSecurityBenchmarks = wrap(async (req, res) => {
  const data = await infraService.getSecurityBenchmarks();
  res.json({ success: true, data });
});
