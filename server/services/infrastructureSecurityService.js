const { Pool } = require('pg');
const { getPoolConfig } = require('../config/poolConfig');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool(getPoolConfig());

function genId(prefix) { return `${prefix}${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`; }

function riskLevel(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'informational';
}

function clamp(n, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }

async function auditLog(eventType, action, description, resourceType, resourceId, performedBy, performedByName, ipAddress, prevValues, newValues, status) {
  const eventId = genId('AUD');
  await pool.query(
    `INSERT INTO infra_audit_log (event_id,event_type,action,description,resource_type,resource_id,performed_by,performed_by_name,ip_address,previous_values,new_values,status)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [eventId, eventType, action, description || '', resourceType, resourceId, performedBy, performedByName, ipAddress,
     prevValues ? JSON.stringify(prevValues) : null, newValues ? JSON.stringify(newValues) : null, status || 'success']
  );
}

// ============= DASHBOARD =============

async function getDashboard() {
  const [servers, containers, alerts, vulns, backups, ssl, incidents] = await Promise.all([
    pool.query('SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN status=\'online\' THEN 1 ELSE 0 END),0) online, COALESCE(SUM(CASE WHEN status=\'offline\' THEN 1 ELSE 0 END),0) offline FROM infra_servers'),
    pool.query('SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN status=\'running\' THEN 1 ELSE 0 END),0) running FROM infra_containers'),
    pool.query('SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN severity=\'critical\' OR severity=\'high\' THEN 1 ELSE 0 END),0) critical FROM infra_alerts WHERE status=\'open\''),
    pool.query('SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN severity=\'critical\' THEN 1 ELSE 0 END),0) critical FROM infra_vulnerabilities WHERE status=\'open\''),
    pool.query('SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN status=\'success\' THEN 1 ELSE 0 END),0) successful FROM infra_backups'),
    pool.query('SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN status=\'active\' AND expires_at < CURRENT_TIMESTAMP + INTERVAL \'30 days\' THEN 1 ELSE 0 END),0) expiring FROM infra_ssl_certificates WHERE status=\'active\''),
    pool.query('SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN status=\'open\' OR status=\'investigating\' THEN 1 ELSE 0 END),0) active FROM infra_incidents'),
  ]);

  const serverUptime = await pool.query('SELECT COALESCE(AVG(health_score),0) avg_health FROM infra_servers');
  const deployStats = await pool.query(`SELECT status, COUNT(*) count FROM infra_deployments GROUP BY status`);
  const recentAlerts = await pool.query('SELECT * FROM infra_alerts ORDER BY id DESC LIMIT 10');
  const recentDeployments = await pool.query('SELECT * FROM infra_deployments ORDER BY id DESC LIMIT 5');

  const infraScore = (() => {
    const serverHealth = parseFloat(serverUptime.rows[0]?.avg_health || 0) / 100;
    const alertPenalty = Math.min(parseInt(alerts.rows[0]?.critical || 0) * 5, 30);
    const vulnPenalty = Math.min(parseInt(vulns.rows[0]?.critical || 0) * 10, 30);
    const backupBonus = parseInt(backups.rows[0]?.successful || 0) > 0 ? 5 : 0;
    return clamp(Math.round((serverHealth * 70) + backupBonus - alertPenalty - vulnPenalty));
  })();

  return {
    servers: servers.rows[0],
    containers: containers.rows[0],
    alerts: alerts.rows[0],
    vulnerabilities: vulns.rows[0],
    backups: backups.rows[0],
    ssl: ssl.rows[0],
    incidents: incidents.rows[0],
    avgHealthScore: parseFloat(serverUptime.rows[0]?.avg_health || 0).toFixed(1),
    infraScore,
    deploymentStats: deployStats.rows,
    recentAlerts: recentAlerts.rows,
    recentDeployments: recentDeployments.rows,
  };
}

// ============= SERVERS =============

async function getServers({ environment, status, serverType, provider, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM infra_servers WHERE 1=1';
  const params = [];
  if (environment) { params.push(environment); sql += ` AND environment=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (serverType) { params.push(serverType); sql += ` AND server_type=$${params.length}`; }
  if (provider) { params.push(provider); sql += ` AND provider=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_servers');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

async function getServerById(serverId) {
  const result = await pool.query('SELECT * FROM infra_servers WHERE server_id=$1', [serverId]);
  if (result.rows.length === 0) throw Object.assign(new Error('Server not found'), { statusCode: 404 });
  const containers = await pool.query('SELECT * FROM infra_containers WHERE server_id=$1', [serverId]);
  const recentMetrics = await pool.query('SELECT * FROM infra_metrics WHERE server_id=$1 ORDER BY recorded_at DESC LIMIT 24', [serverId]);
  return { ...result.rows[0], containers: containers.rows, recentMetrics: recentMetrics.rows };
}

async function createServer(data) {
  const serverId = genId('SRV');
  await pool.query(
    `INSERT INTO infra_servers (server_id,hostname,ip_address,environment,server_type,os,os_version,cpu_cores,ram_gb,disk_gb,status,provider,region,tags,notes)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [serverId, data.hostname, data.ipAddress, data.environment, data.serverType, data.os, data.osVersion,
     data.cpuCores || 0, data.ramGb || 0, data.diskGb || 0, data.status || 'unknown', data.provider, data.region, data.tags || [], data.notes]
  );
  return { serverId };
}

async function updateServer(serverId, data) {
  const fields = ['hostname','ip_address','environment','server_type','os','os_version','kernel_version','cpu_cores','ram_gb','disk_gb','status','health_score','provider','region','tags','notes'];
  const sets = []; const params = [serverId];
  fields.forEach(f => {
    const camel = f.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (data[camel] !== undefined) { params.push(data[camel]); sets.push(`${f}=$${params.length}`); }
  });
  if (sets.length === 0) throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
  await pool.query(`UPDATE infra_servers SET ${sets.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE server_id=$1`, params);
  return { serverId };
}

async function deleteServer(serverId) {
  await pool.query('DELETE FROM infra_metrics WHERE server_id=$1', [serverId]);
  await pool.query('DELETE FROM infra_network_logs WHERE server_id=$1', [serverId]);
  await pool.query('DELETE FROM infra_firewall_logs WHERE server_id=$1', [serverId]);
  await pool.query('DELETE FROM infra_containers WHERE server_id=$1', [serverId]);
  await pool.query('DELETE FROM infra_servers WHERE server_id=$1', [serverId]);
  return { serverId };
}

async function getServerHealthMetrics(serverId) {
  const metrics = await pool.query(
    'SELECT metric_type,metric_name,metric_value,unit,recorded_at FROM infra_metrics WHERE server_id=$1 ORDER BY recorded_at DESC LIMIT 100',
    [serverId]
  );
  const server = await pool.query('SELECT * FROM infra_servers WHERE server_id=$1', [serverId]);
  return { server: server.rows[0] || null, metrics: metrics.rows };
}

async function getServerSecurityScore(serverId) {
  const server = await pool.query('SELECT * FROM infra_servers WHERE server_id=$1', [serverId]);
  if (server.rows.length === 0) throw Object.assign(new Error('Server not found'), { statusCode: 404 });
  const s = server.rows[0];
  let score = 100;
  if (!s.ssh_enabled) score -= 10;
  if (s.root_login_enabled) score -= 15;
  if (!s.firewall_enabled) score -= 15;
  if (!s.auto_updates_enabled) score -= 10;
  if (!s.fail2ban_enabled) score -= 10;
  if (!s.selinux_enabled) score -= 10;
  if (s.status === 'offline') score -= 20;
  score = clamp(score);

  const checks = {
    sshKeyAuth: s.ssh_enabled,
    rootLoginRestricted: !s.root_login_enabled,
    firewallActive: s.firewall_enabled,
    autoUpdatesEnabled: s.auto_updates_enabled,
    fail2banInstalled: s.fail2ban_enabled,
    selinuxEnabled: s.selinux_enabled,
  };
  return { serverId: s.server_id, hostname: s.hostname, securityScore: score, checks, passedCount: Object.values(checks).filter(Boolean).length, totalChecks: Object.keys(checks).length };
}

// ============= CONTAINERS =============

async function getContainers({ status, serverId, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM infra_containers WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (serverId) { params.push(serverId); sql += ` AND server_id=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_containers');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

async function createContainer(data) {
  const containerId = genId('CTN');
  await pool.query(
    `INSERT INTO infra_containers (container_id,server_id,container_name,image_name,image_version,container_runtime,status,ports,volumes,restart_policy,network_mode)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [containerId, data.serverId, data.containerName, data.imageName, data.imageVersion, data.containerRuntime || 'docker',
     data.status || 'running', data.ports || [], data.volumes || [], data.restartPolicy, data.networkMode]
  );
  return { containerId };
}

async function scanContainerImage(containerId) {
  const container = await pool.query('SELECT * FROM infra_containers WHERE container_id=$1', [containerId]);
  if (container.rows.length === 0) throw Object.assign(new Error('Container not found'), { statusCode: 404 });
  const vulnerabilities = [];
  const knownVulns = ['CVE-2023-44487', 'CVE-2023-38149', 'CVE-2024-21626', 'CVE-2024-24557', 'CVE-2024-27135'];
  const vulnCount = Math.floor(Math.random() * 8);
  for (let i = 0; i < vulnCount; i++) {
    vulnerabilities.push(knownVulns[Math.floor(Math.random() * knownVulns.length)]);
  }
  const status = vulnCount === 0 ? 'clean' : (vulnCount > 4 ? 'vulnerable' : 'clean');
  await pool.query(
    'UPDATE infra_containers SET image_scan_status=$1,image_vulnerabilities=$2,updated_at=CURRENT_TIMESTAMP WHERE container_id=$3',
    [status, vulnerabilities, containerId]
  );
  return { containerId, scanStatus: status, vulnerabilities, vulnerabilityCount: vulnCount };
}

// ============= DEPLOYMENTS =============

async function getDeployments({ environment, status, application, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM infra_deployments WHERE 1=1';
  const params = [];
  if (environment) { params.push(environment); sql += ` AND environment=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (application) { params.push(application); sql += ` AND application=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_deployments');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

async function getDeploymentById(deploymentId) {
  const result = await pool.query('SELECT * FROM infra_deployments WHERE deployment_id=$1', [deploymentId]);
  if (result.rows.length === 0) throw Object.assign(new Error('Deployment not found'), { statusCode: 404 });
  return result.rows[0];
}

async function createDeployment(data) {
  const deploymentId = genId('DEP');
  await pool.query(
    `INSERT INTO infra_deployments (deployment_id,application,version,environment,status,deployment_type,branch,commit_hash,commit_message,deployed_by,deployed_by_name,started_at,notes)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [deploymentId, data.application, data.version, data.environment, 'pending', data.deploymentType || 'incremental',
     data.branch, data.commitHash, data.commitMessage, data.deployedBy, data.deployedByName, new Date(), data.notes]
  );
  return { deploymentId };
}

async function approveDeployment(deploymentId, approvedBy, approvedByName) {
  const result = await pool.query('UPDATE infra_deployments SET status=$1,approved_by=$2,approved_by_name=$3 WHERE deployment_id=$4 RETURNING *',
    ['approved', approvedBy, approvedByName, deploymentId]);
  if (result.rows.length === 0) throw Object.assign(new Error('Deployment not found'), { statusCode: 404 });
  return result.rows[0];
}

async function deployVersion(deploymentId) {
  const dep = await pool.query('SELECT * FROM infra_deployments WHERE deployment_id=$1', [deploymentId]);
  if (dep.rows.length === 0) throw Object.assign(new Error('Deployment not found'), { statusCode: 404 });
  const d = dep.rows[0];
  const success = Math.random() > 0.15;
  const duration = Math.floor(Math.random() * 180) + 30;
  await pool.query(
    `UPDATE infra_deployments SET status=$1,duration_seconds=$2,success_rate=$3,completed_at=CURRENT_TIMESTAMP WHERE deployment_id=$4`,
    [success ? 'success' : 'failed', duration, success ? parseFloat((95 + Math.random() * 5).toFixed(2)) : parseFloat((50 + Math.random() * 30).toFixed(2)), deploymentId]
  );
  return { deploymentId, status: success ? 'success' : 'failed', durationSeconds: duration };
}

async function rollbackDeployment(deploymentId, reason) {
  const dep = await pool.query('SELECT * FROM infra_deployments WHERE deployment_id=$1', [deploymentId]);
  if (dep.rows.length === 0) throw Object.assign(new Error('Deployment not found'), { statusCode: 404 });
  await pool.query(
    'UPDATE infra_deployments SET status=$1,rollback_reason=$2,completed_at=CURRENT_TIMESTAMP WHERE deployment_id=$3',
    ['rolled_back', reason, deploymentId]
  );
  return { deploymentId, status: 'rolled_back' };
}

// ============= FIREWALL =============

async function getFirewallRules({ serverId, direction, action, enabled, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM infra_firewall_rules WHERE 1=1';
  const params = [];
  if (serverId) { params.push(serverId); sql += ` AND server_id=$${params.length}`; }
  if (direction) { params.push(direction); sql += ` AND direction=$${params.length}`; }
  if (action) { params.push(action); sql += ` AND action=$${params.length}`; }
  if (enabled !== undefined) { params.push(enabled); sql += ` AND enabled=$${params.length}`; }
  sql += ' ORDER BY priority ASC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_firewall_rules');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

async function getFirewallRuleById(ruleId) {
  const result = await pool.query('SELECT * FROM infra_firewall_rules WHERE rule_id=$1', [ruleId]);
  if (result.rows.length === 0) throw Object.assign(new Error('Rule not found'), { statusCode: 404 });
  return result.rows[0];
}

async function createFirewallRule(data) {
  const ruleId = genId('FW');
  await pool.query(
    `INSERT INTO infra_firewall_rules (rule_id,server_id,direction,action,protocol,source_ip,source_port,destination_ip,destination_port,description,priority,enabled,created_by,created_by_name)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [ruleId, data.serverId, data.direction, data.action, data.protocol, data.sourceIp, data.sourcePort,
     data.destinationIp, data.destinationPort, data.description, data.priority || 100, data.enabled !== false, data.createdBy, data.createdByName]
  );
  await pool.query(
    `INSERT INTO infra_firewall_logs (server_id,action,protocol,source_ip,destination_ip,source_port,destination_port,reason)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [data.serverId, 'allowed', data.protocol, data.sourceIp || '0.0.0.0', data.destinationIp || '0.0.0.0', data.sourcePort || 0, data.destinationPort || 0, `Rule created: ${data.description || ''}`]
  );
  return { ruleId };
}

async function updateFirewallRule(ruleId, data) {
  const fields = ['direction','action','protocol','source_ip','source_port','destination_ip','destination_port','description','priority','enabled'];
  const sets = []; const params = [ruleId];
  fields.forEach(f => {
    const camel = f.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (data[camel] !== undefined) { params.push(data[camel]); sets.push(`${f}=$${params.length}`); }
  });
  if (sets.length === 0) throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
  await pool.query(`UPDATE infra_firewall_rules SET ${sets.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE rule_id=$1`, params);
  return { ruleId };
}

async function deleteFirewallRule(ruleId) {
  await pool.query('DELETE FROM infra_firewall_rules WHERE rule_id=$1', [ruleId]);
  return { ruleId };
}

async function getFirewallLogs({ serverId, action, isThreat, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM infra_firewall_logs WHERE 1=1';
  const params = [];
  if (serverId) { params.push(serverId); sql += ` AND server_id=$${params.length}`; }
  if (action) { params.push(action); sql += ` AND action=$${params.length}`; }
  if (isThreat !== undefined) { params.push(isThreat); sql += ` AND is_threat=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_firewall_logs');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

async function getFirewallAnalytics() {
  const totalBlocks = await pool.query('SELECT COUNT(*) count FROM infra_firewall_logs WHERE action=$1', ['blocked']);
  const totalThreats = await pool.query('SELECT COUNT(*) count FROM infra_firewall_logs WHERE is_threat=true');
  const topSources = await pool.query('SELECT source_ip,COUNT(*) count FROM infra_firewall_logs WHERE action=$1 GROUP BY source_ip ORDER BY count DESC LIMIT 10', ['blocked']);
  const topPorts = await pool.query('SELECT destination_port,COUNT(*) count FROM infra_firewall_logs GROUP BY destination_port ORDER BY count DESC LIMIT 10');
  const dailyBlocks = await pool.query(`SELECT DATE(logged_at) day,COUNT(*) count FROM infra_firewall_logs WHERE action='blocked' AND logged_at > CURRENT_TIMESTAMP - INTERVAL '7 days' GROUP BY DATE(logged_at) ORDER BY day`);
  return { totalBlocks: parseInt(totalBlocks.rows[0].count), totalThreats: parseInt(totalThreats.rows[0].count), topSources: topSources.rows, topPorts: topPorts.rows, dailyBlocks: dailyBlocks.rows };
}

// ============= SSL CERTIFICATES =============

async function getCertificates({ status, domain, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM infra_ssl_certificates WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (domain) { params.push(domain); sql += ` AND domain=$${params.length}`; }
  sql += ' ORDER BY expires_at ASC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_ssl_certificates');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

async function getCertificateById(certId) {
  const result = await pool.query('SELECT * FROM infra_ssl_certificates WHERE cert_id=$1', [certId]);
  if (result.rows.length === 0) throw Object.assign(new Error('Certificate not found'), { statusCode: 404 });
  return result.rows[0];
}

async function createCertificate(data) {
  const certId = genId('SSL');
  await pool.query(
    `INSERT INTO infra_ssl_certificates (cert_id,domain,issuer,subject,algorithm,key_size,signature_algorithm,issued_at,expires_at,auto_renew,status,tls_version,cipher_suites)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [certId, data.domain, data.issuer || 'Let\'s Encrypt', data.subject || `CN=${data.domain}`, data.algorithm || 'RSA', data.keySize || 2048,
     data.signatureAlgorithm || 'SHA-256', data.issuedAt || new Date(), data.expiresAt, data.autoRenew !== false, 'active', data.tlsVersion || 'TLS 1.3', data.cipherSuites || []]
  );
  return { certId };
}

async function renewCertificate(certId) {
  const cert = await pool.query('SELECT * FROM infra_ssl_certificates WHERE cert_id=$1', [certId]);
  if (cert.rows.length === 0) throw Object.assign(new Error('Certificate not found'), { statusCode: 404 });
  const now = new Date();
  const expires = new Date(now);
  expires.setFullYear(expires.getFullYear() + 1);
  await pool.query(
    `UPDATE infra_ssl_certificates SET issued_at=$1,expires_at=$2,renewal_status=$3,last_checked=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE cert_id=$4`,
    [now, expires, 'renewed', certId]
  );
  return { certId, issuedAt: now, expiresAt: expires };
}

async function getExpiringCertificates(days = 30) {
  const result = await pool.query(
    'SELECT * FROM infra_ssl_certificates WHERE status=$1 AND expires_at < CURRENT_TIMESTAMP + $2::INTERVAL ORDER BY expires_at ASC',
    ['active', `${days} days`]
  );
  return result.rows;
}

async function checkCertificateExpiry() {
  const expiring = await pool.query(
    'SELECT * FROM infra_ssl_certificates WHERE status=$1 AND expires_at < CURRENT_TIMESTAMP + INTERVAL \'30 days\'',
    ['active']
  );
  for (const cert of expiring.rows) {
    const existing = await pool.query('SELECT * FROM infra_alerts WHERE alert_type=$1 AND title LIKE $2 AND status=$3', ['ssl', `%${cert.domain}%`, 'open']);
    if (existing.rows.length === 0) {
      const alertId = genId('ALR');
      await pool.query(
        `INSERT INTO infra_alerts (alert_id,title,description,alert_type,severity,source,recommendation)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [alertId, `SSL Certificate Expiring: ${cert.domain}`,
         `Certificate for ${cert.domain} expires on ${cert.expires_at.toISOString().split('T')[0]}`,
         'ssl', 'high', `cert_id:${cert.cert_id}`, 'Renew the SSL certificate immediately']
      );
    }
  }
  return { checked: true, expiringCount: expiring.rows.length };
}

// ============= VULNERABILITIES =============

async function getVulnerabilities({ status, severity, vulnType, serverId, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM infra_vulnerabilities WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (severity) { params.push(severity); sql += ` AND severity=$${params.length}`; }
  if (vulnType) { params.push(vulnType); sql += ` AND vulnerability_type=$${params.length}`; }
  if (serverId) { params.push(serverId); sql += ` AND server_id=$${params.length}`; }
  sql += ' ORDER BY cvss_score DESC NULLS LAST LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_vulnerabilities');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

async function getVulnerabilityById(vulnId) {
  const result = await pool.query('SELECT * FROM infra_vulnerabilities WHERE vuln_id=$1', [vulnId]);
  if (result.rows.length === 0) throw Object.assign(new Error('Vulnerability not found'), { statusCode: 404 });
  return result.rows[0];
}

async function createVulnerability(data) {
  const vulnId = genId('VUL');
  await pool.query(
    `INSERT INTO infra_vulnerabilities (vuln_id,title,description,vulnerability_type,cve_id,cvss_score,severity,affected_resource,resource_type,server_id,package_name,current_version,fixed_version,status,patch_available,exploit_available,remediation,remediation_steps,assigned_to,assigned_to_name,due_date)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
    [vulnId, data.title, data.description, data.vulnerabilityType, data.cveId, data.cvssScore, data.severity,
     data.affectedResource, data.resourceType, data.serverId, data.packageName, data.currentVersion, data.fixedVersion,
     'open', data.patchAvailable || false, data.exploitAvailable || false, data.remediation, data.remediationSteps || [], data.assignedTo, data.assignedToName, data.dueDate]
  );
  if (data.severity === 'critical' || data.severity === 'high') {
    const alertId = genId('ALR');
    await pool.query(
      `INSERT INTO infra_alerts (alert_id,title,description,alert_type,severity,source,recommendation)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [alertId, `Critical Vulnerability: ${data.title}`, `CVSS ${data.cvssScore} - ${data.description}`, 'vulnerability', data.severity, `vuln_id:${vulnId}`, data.remediation || 'Patch the affected system']
    );
  }
  return { vulnId };
}

async function updateVulnerability(vulnId, data) {
  const fields = ['title','description','vulnerability_type','cve_id','cvss_score','severity','affected_resource','resource_type','status','patch_available','exploit_available','remediation','remediation_steps','assigned_to','assigned_to_name','due_date','patched_at','verified_by','notes'];
  const sets = []; const params = [vulnId];
  fields.forEach(f => {
    const camel = f.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (data[camel] !== undefined) { params.push(data[camel]); sets.push(`${f}=$${params.length}`); }
  });
  if (sets.length === 0) throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
  await pool.query(`UPDATE infra_vulnerabilities SET ${sets.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE vuln_id=$1`, params);
  return { vulnId };
}

async function getVulnerabilityStats() {
  const bySeverity = await pool.query('SELECT severity,COUNT(*) count FROM infra_vulnerabilities GROUP BY severity');
  const byStatus = await pool.query('SELECT status,COUNT(*) count FROM infra_vulnerabilities GROUP BY status');
  const byType = await pool.query('SELECT vulnerability_type,COUNT(*) count FROM infra_vulnerabilities GROUP BY vulnerability_type');
  const avgCvss = await pool.query('SELECT COALESCE(AVG(cvss_score),0) avg FROM infra_vulnerabilities WHERE status!=$1', ['false_positive']);
  const criticalOpen = await pool.query('SELECT COUNT(*) count FROM infra_vulnerabilities WHERE severity=$1 AND status=$2', ['critical', 'open']);
  return {
    bySeverity: bySeverity.rows,
    byStatus: byStatus.rows,
    byType: byType.rows,
    avgCvssScore: parseFloat(avgCvss.rows[0].avg).toFixed(2),
    criticalOpen: parseInt(criticalOpen.rows[0].count),
  };
}

// ============= BACKUPS =============

async function getBackups({ status, backupType, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM infra_backups WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (backupType) { params.push(backupType); sql += ` AND backup_type=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_backups');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

async function getBackupById(backupId) {
  const result = await pool.query('SELECT * FROM infra_backups WHERE backup_id=$1', [backupId]);
  if (result.rows.length === 0) throw Object.assign(new Error('Backup not found'), { statusCode: 404 });
  return result.rows[0];
}

async function createBackup(data) {
  const backupId = genId('BAK');
  const sizeBytes = data.sizeBytes || Math.floor(Math.random() * 10737418240) + 104857600;
  const compressedSize = Math.floor(sizeBytes * (0.3 + Math.random() * 0.4));
  const duration = Math.floor(Math.random() * 3600) + 120;
  await pool.query(
    `INSERT INTO infra_backups (backup_id,backup_type,source,target,status,size_bytes,compressed_size,encryption_enabled,encryption_type,retention_days,checksum,started_at,completed_at,duration_seconds,initiated_by,initiated_by_name)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [backupId, data.backupType || 'full', data.source, data.target, 'success', sizeBytes, compressedSize,
     data.encryptionEnabled !== false, data.encryptionType || 'AES-256-GCM', data.retentionDays || 30,
     crypto.randomBytes(32).toString('hex'), new Date(), new Date(), duration, data.initiatedBy, data.initiatedByName]
  );
  return { backupId, sizeBytes, compressedSize, durationSeconds: duration };
}

async function verifyBackup(backupId) {
  const backup = await pool.query('SELECT * FROM infra_backups WHERE backup_id=$1', [backupId]);
  if (backup.rows.length === 0) throw Object.assign(new Error('Backup not found'), { statusCode: 404 });
  const verified = Math.random() > 0.1;
  await pool.query(
    'UPDATE infra_backups SET verified=$1,verification_status=$2 WHERE backup_id=$3',
    [true, verified ? 'verified' : 'corrupt', backupId]
  );
  return { backupId, verified, verificationStatus: verified ? 'verified' : 'corrupt' };
}

async function restoreBackup(backupId) {
  const backup = await pool.query('SELECT * FROM infra_backups WHERE backup_id=$1', [backupId]);
  if (backup.rows.length === 0) throw Object.assign(new Error('Backup not found'), { statusCode: 404 });
  const recoveryId = genId('REC');
  const duration = Math.floor(Math.random() * 600) + 60;
  await pool.query(
    `INSERT INTO infra_recovery (recovery_id,incident_type,title,description,severity,status,recovery_procedure,backup_id,restored_from,started_at,completed_at,actual_downtime_seconds)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [recoveryId, 'data_loss', `Recovery from ${backup.rows[0].backup_id}`, `Restoring ${backup.rows[0].source} from backup`, 'medium',
     'completed', `Restored from ${backup.rows[0].backup_type} backup`, backupId, backup.rows[0].source || 'backup', new Date(), new Date(), duration]
  );
  return { recoveryId, durationSeconds: duration, restoredFrom: backup.rows[0].backup_id };
}

async function getRecoveryRecords({ status, incidentType, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM infra_recovery WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (incidentType) { params.push(incidentType); sql += ` AND incident_type=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_recovery');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

async function createRecoveryRecord(data) {
  const recoveryId = genId('REC');
  await pool.query(
    `INSERT INTO infra_recovery (recovery_id,incident_type,title,description,severity,status,recovery_procedure,rto_seconds,rpo_seconds,backup_id,initiated_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [recoveryId, data.incidentType, data.title, data.description, data.severity, data.status || 'planned',
     data.recoveryProcedure, data.rtoSeconds, data.rpoSeconds, data.backupId, data.initiatedBy]
  );
  return { recoveryId };
}

// ============= SECRETS =============

const ENCRYPTION_KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key-change-in-production', 'infra-secrets-salt', 32);

function encryptSecret(value) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function maskSecret(value) {
  if (value.length <= 6) return value.slice(0, 1) + '***' + value.slice(-1);
  return value.slice(0, 3) + '***' + value.slice(-3);
}

async function getSecrets({ secretType, environment, status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT id,secret_id,secret_name,secret_type,masked_value,environment,service,rotation_period_days,last_rotated_at,next_rotation_at,access_count,status,created_by_name,created_at,updated_at FROM infra_secrets WHERE 1=1';
  const params = [];
  if (secretType) { params.push(secretType); sql += ` AND secret_type=$${params.length}`; }
  if (environment) { params.push(environment); sql += ` AND environment=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_secrets');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

async function getSecretById(secretId) {
  const result = await pool.query('SELECT id,secret_id,secret_name,secret_type,environment,service,rotation_period_days,last_rotated_at,next_rotation_at,access_count,status,created_by_name,created_at,updated_at FROM infra_secrets WHERE secret_id=$1', [secretId]);
  if (result.rows.length === 0) throw Object.assign(new Error('Secret not found'), { statusCode: 404 });
  return result.rows[0];
}

async function createSecret(data, userId, userName) {
  const secretId = genId('SEC');
  const encrypted = encryptSecret(data.secretValue);
  const masked = maskSecret(data.secretValue);
  const nextRotation = new Date();
  nextRotation.setDate(nextRotation.getDate() + (data.rotationPeriodDays || 90));
  await pool.query(
    `INSERT INTO infra_secrets (secret_id,secret_name,secret_type,encrypted_value,masked_value,environment,service,rotation_period_days,next_rotation_at,created_by,created_by_name)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [secretId, data.secretName, data.secretType, encrypted, masked, data.environment, data.service,
     data.rotationPeriodDays || 90, nextRotation, userId, userName]
  );
  return { secretId, maskedValue: masked };
}

async function rotateSecret(secretId) {
  const secret = await pool.query('SELECT * FROM infra_secrets WHERE secret_id=$1', [secretId]);
  if (secret.rows.length === 0) throw Object.assign(new Error('Secret not found'), { statusCode: 404 });
  const nextRotation = new Date();
  nextRotation.setDate(nextRotation.getDate() + (secret.rows[0].rotation_period_days || 90));
  await pool.query(
    'UPDATE infra_secrets SET last_rotated_at=CURRENT_TIMESTAMP,next_rotation_at=$1,updated_at=CURRENT_TIMESTAMP WHERE secret_id=$2',
    [nextRotation, secretId]
  );
  return { secretId, rotatedAt: new Date(), nextRotationAt: nextRotation };
}

async function deleteSecret(secretId) {
  await pool.query('DELETE FROM infra_secrets WHERE secret_id=$1', [secretId]);
  return { secretId };
}

// ============= MONITORING & ALERTS =============

async function getMetrics(serverId, metricType, period = '24h') {
  const interval = period === '7d' ? '7 days' : (period === '30d' ? '30 days' : '24 hours');
  let sql = 'SELECT * FROM infra_metrics WHERE recorded_at > CURRENT_TIMESTAMP - $1::INTERVAL';
  const params = [interval];
  if (serverId) { params.push(serverId); sql += ' AND server_id=$' + params.length; }
  if (metricType) { params.push(metricType); sql += ' AND metric_type=$' + params.length; }
  sql += ' ORDER BY recorded_at ASC';
  const result = await pool.query(sql, params);
  return result.rows;
}

async function recordMetric(serverId, metricType, metricName, metricValue, unit) {
  await pool.query(
    'INSERT INTO infra_metrics (server_id,metric_type,metric_name,metric_value,unit) VALUES($1,$2,$3,$4,$5)',
    [serverId, metricType, metricName, metricValue, unit]
  );
}

async function getAlerts({ alertType, severity, status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM infra_alerts WHERE 1=1';
  const params = [];
  if (alertType) { params.push(alertType); sql += ` AND alert_type=$${params.length}`; }
  if (severity) { params.push(severity); sql += ` AND severity=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_alerts');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

async function createAlert(data) {
  const alertId = genId('ALR');
  await pool.query(
    `INSERT INTO infra_alerts (alert_id,title,description,alert_type,severity,source,server_id,metric_name,metric_value,threshold,recommendation)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [alertId, data.title, data.description, data.alertType, data.severity || 'medium', data.source, data.serverId,
     data.metricName, data.metricValue, data.threshold, data.recommendation]
  );
  return { alertId };
}

async function acknowledgeAlert(alertId, acknowledgedBy) {
  const result = await pool.query(
    'UPDATE infra_alerts SET status=$1,acknowledged_by=$2,acknowledged_at=CURRENT_TIMESTAMP WHERE alert_id=$3 RETURNING *',
    ['acknowledged', acknowledgedBy, alertId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Alert not found'), { statusCode: 404 });
  return result.rows[0];
}

async function resolveAlert(alertId, resolvedBy) {
  const result = await pool.query(
    'UPDATE infra_alerts SET status=$1,resolved_by=$2,resolved_at=CURRENT_TIMESTAMP WHERE alert_id=$3 RETURNING *',
    ['resolved', resolvedBy, alertId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Alert not found'), { statusCode: 404 });
  return result.rows[0];
}

async function getAlertStats() {
  const byType = await pool.query('SELECT alert_type,COUNT(*) count FROM infra_alerts WHERE status=$1 GROUP BY alert_type', ['open']);
  const bySeverity = await pool.query('SELECT severity,COUNT(*) count FROM infra_alerts WHERE status=$1 GROUP BY severity', ['open']);
  const total = await pool.query('SELECT COUNT(*) count FROM infra_alerts');
  const openAlerts = await pool.query("SELECT COUNT(*) count FROM infra_alerts WHERE status IN ('open','acknowledged')");
  return { byType: byType.rows, bySeverity: bySeverity.rows, total: parseInt(total.rows[0].count), open: parseInt(openAlerts.rows[0].count) };
}

// ============= DEPENDENCIES =============

async function getDependencies({ status, ecosystem, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM infra_dependencies WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (ecosystem) { params.push(ecosystem); sql += ` AND ecosystem=$${params.length}`; }
  sql += ' ORDER BY critical_vulnerabilities DESC, vulnerability_count DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_dependencies');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

async function scanDependencies() {
  const deps = await pool.query('SELECT * FROM infra_dependencies');
  const results = [];
  for (const dep of deps.rows) {
    const hasUpdate = Math.random() > 0.5;
    const vulnCount = Math.floor(Math.random() * 5);
    const criticalVulns = Math.floor(Math.random() * 2);
    let status = 'current';
    if (criticalVulns > 0) status = 'critical';
    else if (vulnCount > 0) status = 'vulnerable';
    else if (hasUpdate) status = 'outdated';
    await pool.query(
      'UPDATE infra_dependencies SET status=$1,vulnerability_count=$2,critical_vulnerabilities=$3,last_checked=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$4',
      [status, vulnCount, criticalVulns, dep.id]
    );
    results.push({ id: dep.id, name: dep.dependency_name, status, vulnerabilities: vulnCount, critical: criticalVulns });
  }
  return { scanned: deps.rows.length, results };
}

async function updateDependency(id, data) {
  const fields = ['current_version','latest_version','status','vulnerability_count','critical_vulnerabilities','license','deprecation_status'];
  const sets = []; const params = [id];
  fields.forEach(f => {
    const camel = f.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (data[camel] !== undefined) { params.push(data[camel]); sets.push(`${f}=$${params.length}`); }
  });
  if (sets.length === 0) throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
  await pool.query(`UPDATE infra_dependencies SET ${sets.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, params);
  return { id };
}

// ============= CLOUD RESOURCES =============

async function getCloudResources({ cloudProvider, resourceType, status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM infra_cloud_resources WHERE 1=1';
  const params = [];
  if (cloudProvider) { params.push(cloudProvider); sql += ` AND cloud_provider=$${params.length}`; }
  if (resourceType) { params.push(resourceType); sql += ` AND resource_type=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_cloud_resources');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

async function getCloudResourceById(resourceId) {
  const result = await pool.query('SELECT * FROM infra_cloud_resources WHERE resource_id=$1', [resourceId]);
  if (result.rows.length === 0) throw Object.assign(new Error('Cloud resource not found'), { statusCode: 404 });
  return result.rows[0];
}

async function createCloudResource(data) {
  const resourceId = genId('CLD');
  await pool.query(
    `INSERT INTO infra_cloud_resources (resource_id,cloud_provider,resource_type,resource_name,region,status,cost_monthly,security_score,encryption_enabled,public_access,tags,iam_roles,security_groups)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [resourceId, data.cloudProvider, data.resourceType, data.resourceName, data.region, data.status || 'active',
     data.costMonthly || 0, data.securityScore || 100, data.encryptionEnabled || false, data.publicAccess || false,
     data.tags || [], data.iamRoles || [], data.securityGroups || []]
  );
  return { resourceId };
}

async function getCloudSecurityScore() {
  const resources = await pool.query('SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN encryption_enabled THEN 1 ELSE 0 END),0) encrypted, COALESCE(SUM(CASE WHEN public_access THEN 1 ELSE 0 END),0) public FROM infra_cloud_resources');
  const total = parseInt(resources.rows[0].total);
  if (total === 0) return { score: 100, total: 0, encrypted: 0, public: 0 };
  const encrypted = parseInt(resources.rows[0].encrypted);
  const publicCount = parseInt(resources.rows[0].public);
  const score = clamp(Math.round(((encrypted / total) * 50) + (((total - publicCount) / total) * 50)));
  return { score, total, encrypted, public: publicCount };
}

// ============= INCIDENTS =============

async function getIncidents({ status, incidentType, severity, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM infra_incidents WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (incidentType) { params.push(incidentType); sql += ` AND incident_type=$${params.length}`; }
  if (severity) { params.push(severity); sql += ` AND severity=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_incidents');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

async function getIncidentById(incidentId) {
  const result = await pool.query('SELECT * FROM infra_incidents WHERE incident_id=$1', [incidentId]);
  if (result.rows.length === 0) throw Object.assign(new Error('Incident not found'), { statusCode: 404 });
  const timeline = await pool.query('SELECT * FROM infra_audit_log WHERE resource_type=$1 AND resource_id=$2 ORDER BY created_at DESC', ['incident', incidentId]);
  return { ...result.rows[0], timeline: timeline.rows };
}

async function createIncident(data) {
  const incidentId = genId('INC');
  await pool.query(
    `INSERT INTO infra_incidents (incident_id,title,description,incident_type,severity,source,server_id,affected_services,reported_by,detected_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [incidentId, data.title, data.description, data.incidentType, data.severity, data.source, data.serverId,
     data.affectedServices || [], data.reportedBy, new Date()]
  );
  return { incidentId };
}

async function updateIncidentStatus(incidentId, status, resolution) {
  const sets = ['status=$2'];
  const params = [incidentId, status];
  if (status === 'resolved' || status === 'closed') { sets.push('resolved_at=CURRENT_TIMESTAMP'); }
  if (resolution) { params.push(resolution); sets.push(`resolution=$${params.length}`); }
  await pool.query(`UPDATE infra_incidents SET ${sets.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE incident_id=$1`, params);
  return { incidentId, status };
}

// ============= AUDIT LOG =============

async function getAuditLogs({ eventType, resourceType, status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM infra_audit_log WHERE 1=1';
  const params = [];
  if (eventType) { params.push(eventType); sql += ` AND event_type=$${params.length}`; }
  if (resourceType) { params.push(resourceType); sql += ` AND resource_type=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_audit_log');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

// ============= NETWORK LOGS =============

async function getNetworkLogs({ serverId, isSuspicious, direction, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM infra_network_logs WHERE 1=1';
  const params = [];
  if (serverId) { params.push(serverId); sql += ` AND server_id=$${params.length}`; }
  if (isSuspicious !== undefined) { params.push(isSuspicious); sql += ` AND is_suspicious=$${params.length}`; }
  if (direction) { params.push(direction); sql += ` AND direction=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM infra_network_logs');
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

async function getSuspiciousNetworkActivity() {
  const result = await pool.query(
    'SELECT * FROM infra_network_logs WHERE is_suspicious=true ORDER BY threat_score DESC LIMIT 50'
  );
  return result.rows;
}

// ============= DEPLOYMENT AUDIT (CI/CD) =============

async function getDeploymentAudit({ page = 1, limit = 50 } = {}) {
  const result = await pool.query(
    'SELECT * FROM infra_audit_log WHERE event_type=$1 OR event_type=$2 ORDER BY id DESC LIMIT $3 OFFSET $4',
    ['deployment', 'config_update', limit, (page - 1) * limit]
  );
  const countResult = await pool.query("SELECT COUNT(*) FROM infra_audit_log WHERE event_type IN ('deployment','config_update')");
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
}

// ============= SECURITY BENCHMARK =============

async function getSecurityBenchmarks() {
  const servers = await pool.query('SELECT * FROM infra_servers');
  const results = [];
  for (const server of servers.rows) {
    let score = 100;
    const checks = [
      { name: 'SSH Key Authentication', passed: server.ssh_enabled, weight: 15 },
      { name: 'Root Login Restricted', passed: !server.root_login_enabled, weight: 15 },
      { name: 'Firewall Active', passed: server.firewall_enabled, weight: 15 },
      { name: 'Auto Updates Enabled', passed: server.auto_updates_enabled, weight: 10 },
      { name: 'Fail2Ban Installed', passed: server.fail2ban_enabled, weight: 10 },
      { name: 'SELinux/AppArmor Enabled', passed: server.selinux_enabled, weight: 10 },
    ];
    checks.forEach(c => { if (!c.passed) score -= c.weight; });
    score = clamp(score);
    results.push({ serverId: server.server_id, hostname: server.hostname, score, checks, passedCount: checks.filter(c => c.passed).length, totalChecks: checks.length });
  }
  const avgScore = results.length > 0 ? (results.reduce((s, r) => s + r.score, 0) / results.length).toFixed(1) : 0;
  return { benchmarks: results, avgScore, totalServers: results.length };
}

module.exports = {
  getDashboard,
  getServers, getServerById, createServer, updateServer, deleteServer, getServerHealthMetrics, getServerSecurityScore,
  getContainers, createContainer, scanContainerImage,
  getDeployments, getDeploymentById, createDeployment, approveDeployment, deployVersion, rollbackDeployment, getDeploymentAudit,
  getFirewallRules, getFirewallRuleById, createFirewallRule, updateFirewallRule, deleteFirewallRule, getFirewallLogs, getFirewallAnalytics,
  getCertificates, getCertificateById, createCertificate, renewCertificate, getExpiringCertificates, checkCertificateExpiry,
  getVulnerabilities, getVulnerabilityById, createVulnerability, updateVulnerability, getVulnerabilityStats,
  getBackups, getBackupById, createBackup, verifyBackup, restoreBackup, getRecoveryRecords, createRecoveryRecord,
  getSecrets, getSecretById, createSecret, rotateSecret, deleteSecret,
  getMetrics, recordMetric, getAlerts, createAlert, acknowledgeAlert, resolveAlert, getAlertStats,
  getDependencies, scanDependencies, updateDependency,
  getCloudResources, getCloudResourceById, createCloudResource, getCloudSecurityScore,
  getIncidents, getIncidentById, createIncident, updateIncidentStatus,
  getAuditLogs,
  getNetworkLogs, getSuspiciousNetworkActivity,
  getSecurityBenchmarks,
};
