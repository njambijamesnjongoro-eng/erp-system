const router = require('express').Router();
const infraCtrl = require('../controllers/infrastructureSecurityController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Dashboard
router.get('/dashboard', infraCtrl.getDashboard);

// Servers
router.get('/servers', infraCtrl.getServers);
router.get('/servers/:serverId', infraCtrl.getServerById);
router.post('/servers', infraCtrl.createServer);
router.put('/servers/:serverId', infraCtrl.updateServer);
router.delete('/servers/:serverId', infraCtrl.deleteServer);
router.get('/servers/:serverId/health', infraCtrl.getServerHealthMetrics);
router.get('/servers/:serverId/security-score', infraCtrl.getServerSecurityScore);

// Containers
router.get('/containers', infraCtrl.getContainers);
router.post('/containers', infraCtrl.createContainer);
router.post('/containers/:containerId/scan', infraCtrl.scanContainerImage);

// Deployments
router.get('/deployments', infraCtrl.getDeployments);
router.get('/deployments/:deploymentId', infraCtrl.getDeploymentById);
router.post('/deployments', infraCtrl.createDeployment);
router.post('/deployments/:deploymentId/approve', infraCtrl.approveDeployment);
router.post('/deployments/:deploymentId/deploy', infraCtrl.deployVersion);
router.post('/deployments/:deploymentId/rollback', infraCtrl.rollbackDeployment);
router.get('/deployments/audit/logs', infraCtrl.getDeploymentAudit);

// Firewall
router.get('/firewall/rules', infraCtrl.getFirewallRules);
router.get('/firewall/rules/:ruleId', infraCtrl.getFirewallRuleById);
router.post('/firewall/rules', infraCtrl.createFirewallRule);
router.put('/firewall/rules/:ruleId', infraCtrl.updateFirewallRule);
router.delete('/firewall/rules/:ruleId', infraCtrl.deleteFirewallRule);
router.get('/firewall/logs', infraCtrl.getFirewallLogs);
router.get('/firewall/analytics', infraCtrl.getFirewallAnalytics);

// SSL Certificates
router.get('/ssl-certificates', infraCtrl.getCertificates);
router.get('/ssl-certificates/:certId', infraCtrl.getCertificateById);
router.post('/ssl-certificates', infraCtrl.createCertificate);
router.post('/ssl-certificates/:certId/renew', infraCtrl.renewCertificate);
router.post('/ssl-certificates/check-expiry', infraCtrl.checkCertificateExpiry);

// Vulnerabilities
router.get('/vulnerabilities', infraCtrl.getVulnerabilities);
router.get('/vulnerabilities/stats', infraCtrl.getVulnerabilityStats);
router.get('/vulnerabilities/:vulnId', infraCtrl.getVulnerabilityById);
router.post('/vulnerabilities', infraCtrl.createVulnerability);
router.put('/vulnerabilities/:vulnId', infraCtrl.updateVulnerability);

// Backups
router.get('/backups', infraCtrl.getBackups);
router.get('/backups/:backupId', infraCtrl.getBackupById);
router.post('/backups', infraCtrl.createBackup);
router.post('/backups/:backupId/verify', infraCtrl.verifyBackup);
router.post('/backups/:backupId/restore', infraCtrl.restoreBackup);
router.get('/recovery-records', infraCtrl.getRecoveryRecords);
router.post('/recovery-records', infraCtrl.createRecoveryRecord);

// Secrets
router.get('/secrets', infraCtrl.getSecrets);
router.get('/secrets/:secretId', infraCtrl.getSecretById);
router.post('/secrets', infraCtrl.createSecret);
router.post('/secrets/:secretId/rotate', infraCtrl.rotateSecret);
router.delete('/secrets/:secretId', infraCtrl.deleteSecret);

// Monitoring & Alerts
router.get('/metrics', infraCtrl.getMetrics);
router.post('/metrics', infraCtrl.recordMetric);
router.get('/alerts', infraCtrl.getAlerts);
router.get('/alerts/stats', infraCtrl.getAlertStats);
router.post('/alerts', infraCtrl.createAlert);
router.post('/alerts/:alertId/acknowledge', infraCtrl.acknowledgeAlert);
router.post('/alerts/:alertId/resolve', infraCtrl.resolveAlert);

// Dependencies
router.get('/dependencies', infraCtrl.getDependencies);
router.post('/dependencies/scan', infraCtrl.scanDependencies);
router.put('/dependencies/:id', infraCtrl.updateDependency);

// Cloud Resources
router.get('/cloud-resources', infraCtrl.getCloudResources);
router.get('/cloud-resources/security-score', infraCtrl.getCloudSecurityScore);
router.get('/cloud-resources/:resourceId', infraCtrl.getCloudResourceById);
router.post('/cloud-resources', infraCtrl.createCloudResource);

// Incidents
router.get('/incidents', infraCtrl.getIncidents);
router.get('/incidents/:incidentId', infraCtrl.getIncidentById);
router.post('/incidents', infraCtrl.createIncident);
router.put('/incidents/:incidentId/status', infraCtrl.updateIncidentStatus);

// Audit Logs
router.get('/audit-logs', infraCtrl.getAuditLogs);

// Network Logs
router.get('/network-logs', infraCtrl.getNetworkLogs);
router.get('/network-logs/suspicious', infraCtrl.getSuspiciousNetworkActivity);

// Security Benchmarks
router.get('/security-benchmarks', infraCtrl.getSecurityBenchmarks);

module.exports = router;
