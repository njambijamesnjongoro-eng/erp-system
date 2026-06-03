const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'erp_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const migration = `
-- ============================================================
-- SECURITY PHASE 8: Enterprise Infrastructure Security
-- ============================================================

-- 1. INFRASTRUCTURE SERVERS
CREATE TABLE IF NOT EXISTS infra_servers (
  id SERIAL PRIMARY KEY,
  server_id VARCHAR(50) UNIQUE NOT NULL,
  hostname VARCHAR(300) NOT NULL,
  ip_address VARCHAR(50),
  environment VARCHAR(100),  -- production, staging, development, testing
  server_type VARCHAR(100),  -- web, app, database, cache, load_balancer, monitoring
  os VARCHAR(200),
  os_version VARCHAR(100),
  kernel_version VARCHAR(100),
  cpu_cores INTEGER DEFAULT 0,
  ram_gb DECIMAL(8,2) DEFAULT 0,
  disk_gb DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'unknown',  -- online, offline, maintenance, degraded, unknown
  health_score DECIMAL(5,2) DEFAULT 100,
  uptime_seconds BIGINT DEFAULT 0,
  last_ping TIMESTAMP,
  cpu_usage DECIMAL(5,2) DEFAULT 0,
  memory_usage DECIMAL(5,2) DEFAULT 0,
  disk_usage DECIMAL(5,2) DEFAULT 0,
  load_average VARCHAR(100),
  running_services TEXT[],
  open_ports TEXT[],
  ssh_enabled BOOLEAN DEFAULT true,
  root_login_enabled BOOLEAN DEFAULT false,
  firewall_enabled BOOLEAN DEFAULT false,
  auto_updates_enabled BOOLEAN DEFAULT false,
  fail2ban_enabled BOOLEAN DEFAULT false,
  selinux_enabled BOOLEAN DEFAULT false,
  provider VARCHAR(100),  -- aws, azure, gcp, on_premise, digital_ocean
  region VARCHAR(200),
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CONTAINERS
CREATE TABLE IF NOT EXISTS infra_containers (
  id SERIAL PRIMARY KEY,
  container_id VARCHAR(50) UNIQUE NOT NULL,
  server_id VARCHAR(50) REFERENCES infra_servers(server_id),
  container_name VARCHAR(300) NOT NULL,
  image_name VARCHAR(300),
  image_version VARCHAR(100),
  container_runtime VARCHAR(100),  -- docker, podman, containerd
  status VARCHAR(50),  -- running, stopped, paused, restarting, unhealthy
  ports TEXT[],  -- port mappings
  volumes TEXT[],
  environment_vars TEXT[],
  resource_limits JSONB,
  health_status VARCHAR(50),  -- healthy, unhealthy, starting
  restart_policy VARCHAR(100),
  network_mode VARCHAR(100),
  image_scan_status VARCHAR(50),  -- pending, clean, vulnerable, failed
  image_vulnerabilities TEXT[],
  cpu_usage DECIMAL(5,2),
  memory_usage DECIMAL(5,2),
  started_at TIMESTAMP,
  last_restart TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. DEPLOYMENTS
CREATE TABLE IF NOT EXISTS infra_deployments (
  id SERIAL PRIMARY KEY,
  deployment_id VARCHAR(50) UNIQUE NOT NULL,
  application VARCHAR(200) NOT NULL,
  version VARCHAR(100),
  environment VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',  -- pending, in_progress, success, failed, rolled_back
  deployment_type VARCHAR(100),  -- full, incremental, hotfix, rollback
  branch VARCHAR(200),
  commit_hash VARCHAR(100),
  commit_message TEXT,
  deployed_by UUID REFERENCES users(id),
  deployed_by_name VARCHAR(200),
  approved_by UUID REFERENCES users(id),
  approved_by_name VARCHAR(200),
  artifacts TEXT[],
  steps JSONB,
  rollback_version VARCHAR(100),
  rollback_reason TEXT,
  duration_seconds INTEGER,
  success_rate DECIMAL(5,2),
  notes TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. SECURITY CONFIGURATIONS
CREATE TABLE IF NOT EXISTS infra_security_configs (
  id SERIAL PRIMARY KEY,
  config_id VARCHAR(50) UNIQUE NOT NULL,
  config_type VARCHAR(100) NOT NULL,  -- ssh, firewall, ssl, docker, nginx, system, database
  server_id VARCHAR(50) REFERENCES infra_servers(server_id),
  config_name VARCHAR(300) NOT NULL,
  config_value TEXT,
  previous_value TEXT,
  status VARCHAR(50) DEFAULT 'active',  -- active, inactive, pending, failed
  validated BOOLEAN DEFAULT false,
  validation_result TEXT,
  changed_by UUID REFERENCES users(id),
  changed_by_name VARCHAR(200),
  changed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. FIREWALL RULES
CREATE TABLE IF NOT EXISTS infra_firewall_rules (
  id SERIAL PRIMARY KEY,
  rule_id VARCHAR(50) UNIQUE NOT NULL,
  server_id VARCHAR(50) REFERENCES infra_servers(server_id),
  direction VARCHAR(50),  -- inbound, outbound
  action VARCHAR(50),  -- allow, deny, reject
  protocol VARCHAR(50),  -- tcp, udp, icmp, any
  source_ip VARCHAR(200),
  source_port VARCHAR(50),
  destination_ip VARCHAR(200),
  destination_port VARCHAR(200),
  description TEXT,
  priority INTEGER DEFAULT 100,
  enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_by_name VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. FIREWALL LOGS
CREATE TABLE IF NOT EXISTS infra_firewall_logs (
  id SERIAL PRIMARY KEY,
  server_id VARCHAR(50) REFERENCES infra_servers(server_id),
  action VARCHAR(50),  -- blocked, allowed, rejected
  protocol VARCHAR(50),
  source_ip VARCHAR(50),
  source_port INTEGER,
  destination_ip VARCHAR(50),
  destination_port INTEGER,
  rule_id VARCHAR(50),
  reason TEXT,
  bytes_sent BIGINT DEFAULT 0,
  country VARCHAR(100),
  is_threat BOOLEAN DEFAULT false,
  threat_type VARCHAR(100),
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. INFRASTRUCTURE ALERTS
CREATE TABLE IF NOT EXISTS infra_alerts (
  id SERIAL PRIMARY KEY,
  alert_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  alert_type VARCHAR(100) NOT NULL,  -- server, container, deployment, firewall, ssl, backup, vulnerability, network
  severity VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'open',  -- open, acknowledged, resolved, dismissed
  source VARCHAR(200),
  server_id VARCHAR(50) REFERENCES infra_servers(server_id),
  metric_name VARCHAR(100),
  metric_value TEXT,
  threshold TEXT,
  recommendation TEXT,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. VULNERABILITIES
CREATE TABLE IF NOT EXISTS infra_vulnerabilities (
  id SERIAL PRIMARY KEY,
  vuln_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  vulnerability_type VARCHAR(100),  -- cve, misconfiguration, outdated_package, weak_cipher, exposed_secret
  cve_id VARCHAR(50),
  cvss_score DECIMAL(4,2),
  severity VARCHAR(50),  -- critical, high, medium, low, info
  affected_resource VARCHAR(300),
  resource_type VARCHAR(100),  -- server, container, package, config, endpoint
  server_id VARCHAR(50) REFERENCES infra_servers(server_id),
  package_name VARCHAR(300),
  current_version VARCHAR(100),
  fixed_version VARCHAR(100),
  status VARCHAR(50) DEFAULT 'open',  -- open, in_progress, patched, mitigated, false_positive
  patch_available BOOLEAN DEFAULT false,
  exploit_available BOOLEAN DEFAULT false,
  remediation TEXT,
  remediation_steps TEXT[],
  assigned_to UUID REFERENCES users(id),
  assigned_to_name VARCHAR(200),
  due_date TIMESTAMP,
  patched_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. BACKUPS
CREATE TABLE IF NOT EXISTS infra_backups (
  id SERIAL PRIMARY KEY,
  backup_id VARCHAR(50) UNIQUE NOT NULL,
  backup_type VARCHAR(100) NOT NULL,  -- full, incremental, differential
  source VARCHAR(300) NOT NULL,
  target VARCHAR(300),
  status VARCHAR(50) DEFAULT 'pending',  -- pending, running, success, failed, cancelled
  size_bytes BIGINT DEFAULT 0,
  compressed_size BIGINT DEFAULT 0,
  file_count INTEGER DEFAULT 0,
  encryption_enabled BOOLEAN DEFAULT false,
  encryption_type VARCHAR(100),
  verified BOOLEAN DEFAULT false,
  verification_status VARCHAR(50),
  retention_days INTEGER DEFAULT 30,
  expires_at TIMESTAMP,
  checksum VARCHAR(100),
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  initiated_by UUID REFERENCES users(id),
  initiated_by_name VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. RECOVERY RECORDS
CREATE TABLE IF NOT EXISTS infra_recovery (
  id SERIAL PRIMARY KEY,
  recovery_id VARCHAR(50) UNIQUE NOT NULL,
  incident_type VARCHAR(100) NOT NULL,  -- server_failure, data_loss, security_breach, service_outage, disaster
  title VARCHAR(500) NOT NULL,
  description TEXT,
  severity VARCHAR(50),
  status VARCHAR(50) DEFAULT 'planned',  -- planned, in_progress, completed, failed
  recovery_procedure TEXT,
  actual_steps TEXT,
  rto_seconds INTEGER,  -- Recovery Time Objective
  rpo_seconds INTEGER,  -- Recovery Point Objective
  actual_downtime_seconds INTEGER,
  data_loss_amount VARCHAR(100),
  backup_id VARCHAR(50),
  restored_from VARCHAR(300),
  tested BOOLEAN DEFAULT false,
  test_result TEXT,
  lessons_learned TEXT,
  initiated_by UUID REFERENCES users(id),
  completed_by UUID REFERENCES users(id),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. SSL CERTIFICATES
CREATE TABLE IF NOT EXISTS infra_ssl_certificates (
  id SERIAL PRIMARY KEY,
  cert_id VARCHAR(50) UNIQUE NOT NULL,
  domain VARCHAR(300) NOT NULL,
  issuer VARCHAR(300),
  subject VARCHAR(300),
  serial_number VARCHAR(200),
  algorithm VARCHAR(100),
  key_size INTEGER,
  signature_algorithm VARCHAR(100),
  issued_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  days_remaining INTEGER DEFAULT 0,
  auto_renew BOOLEAN DEFAULT false,
  renewal_status VARCHAR(50),  -- pending, in_progress, renewed, failed
  certificate_fingerprint VARCHAR(100),
  tls_version VARCHAR(50),
  cipher_suites TEXT[],
  status VARCHAR(50) DEFAULT 'active',  -- active, expired, revoked, pending_renewal
  server_id VARCHAR(50) REFERENCES infra_servers(server_id),
  monitored BOOLEAN DEFAULT true,
  last_checked TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. CLOUD RESOURCES
CREATE TABLE IF NOT EXISTS infra_cloud_resources (
  id SERIAL PRIMARY KEY,
  resource_id VARCHAR(50) UNIQUE NOT NULL,
  cloud_provider VARCHAR(100) NOT NULL,  -- aws, azure, gcp
  resource_type VARCHAR(200) NOT NULL,  -- ec2, s3, rds, lambda, vpc, iam, load_balancer
  resource_name VARCHAR(300),
  region VARCHAR(200),
  status VARCHAR(100),
  cost_monthly DECIMAL(12,2),
  security_score DECIMAL(5,2),
  encryption_enabled BOOLEAN DEFAULT false,
  public_access BOOLEAN DEFAULT false,
  tags TEXT[],
  iam_roles TEXT[],
  security_groups TEXT[],
  last_audited TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. SECRETS MANAGEMENT
CREATE TABLE IF NOT EXISTS infra_secrets (
  id SERIAL PRIMARY KEY,
  secret_id VARCHAR(50) UNIQUE NOT NULL,
  secret_name VARCHAR(300) NOT NULL,
  secret_type VARCHAR(100) NOT NULL,  -- jwt, db_credential, api_key, smtp, encryption_key
  encrypted_value TEXT NOT NULL,
  masked_value VARCHAR(50),  -- for display (e.g., "abc***xyz")
  environment VARCHAR(100),
  service VARCHAR(200),
  rotation_period_days INTEGER DEFAULT 90,
  last_rotated_at TIMESTAMP,
  next_rotation_at TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',  -- active, expired, revoked
  created_by UUID REFERENCES users(id),
  created_by_name VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. DEPENDENCY TRACKING
CREATE TABLE IF NOT EXISTS infra_dependencies (
  id SERIAL PRIMARY KEY,
  dependency_name VARCHAR(300) NOT NULL,
  current_version VARCHAR(100),
  latest_version VARCHAR(100),
  package_manager VARCHAR(100),  -- npm, pip, maven, nuget
  ecosystem VARCHAR(100),  -- node, python, java, dotnet
  status VARCHAR(50) DEFAULT 'current',  -- current, outdated, vulnerable, critical
  vulnerability_count INTEGER DEFAULT 0,
  critical_vulnerabilities INTEGER DEFAULT 0,
  license VARCHAR(200),
  deprecation_status VARCHAR(100),
  last_checked TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. INFRASTRUCTURE INCIDENTS
CREATE TABLE IF NOT EXISTS infra_incidents (
  id SERIAL PRIMARY KEY,
  incident_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  incident_type VARCHAR(100) NOT NULL,  -- infrastructure_failure, security_incident, service_outage, performance_degradation
  severity VARCHAR(50),
  status VARCHAR(50) DEFAULT 'open',  -- open, investigating, mitigated, resolved, closed
  source VARCHAR(200),
  server_id VARCHAR(50) REFERENCES infra_servers(server_id),
  affected_services TEXT[],
  root_cause TEXT,
  resolution TEXT,
  downtime_minutes INTEGER DEFAULT 0,
  impact_description TEXT,
  lessons_learned TEXT,
  action_items TEXT[],
  detected_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  reported_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. INFRASTRUCTURE METRICS
CREATE TABLE IF NOT EXISTS infra_metrics (
  id SERIAL PRIMARY KEY,
  server_id VARCHAR(50) REFERENCES infra_servers(server_id),
  metric_type VARCHAR(100) NOT NULL,  -- cpu, memory, disk, network, database, api
  metric_name VARCHAR(200),
  metric_value DECIMAL(15,4),
  unit VARCHAR(50),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. INFRASTRUCTURE AUDIT LOG
CREATE TABLE IF NOT EXISTS infra_audit_log (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(50) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,  -- server_change, firewall_change, deployment, config_update, backup_action, secret_access
  action VARCHAR(200) NOT NULL,
  description TEXT,
  resource_type VARCHAR(100),
  resource_id VARCHAR(50),
  performed_by UUID REFERENCES users(id),
  performed_by_name VARCHAR(200),
  ip_address VARCHAR(50),
  previous_values JSONB,
  new_values JSONB,
  status VARCHAR(50),  -- success, failure, blocked
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. NETWORK TRAFFIC LOGS
CREATE TABLE IF NOT EXISTS infra_network_logs (
  id SERIAL PRIMARY KEY,
  server_id VARCHAR(50) REFERENCES infra_servers(server_id),
  direction VARCHAR(50),  -- inbound, outbound
  protocol VARCHAR(50),
  source_ip VARCHAR(50),
  source_port INTEGER,
  destination_ip VARCHAR(50),
  destination_port INTEGER,
  bytes_transferred BIGINT DEFAULT 0,
  packets_count INTEGER DEFAULT 0,
  duration_ms INTEGER,
  is_suspicious BOOLEAN DEFAULT false,
  threat_score DECIMAL(5,2),
  country VARCHAR(100),
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_infra_servers_env ON infra_servers(environment);
CREATE INDEX IF NOT EXISTS idx_infra_servers_status ON infra_servers(status);
CREATE INDEX IF NOT EXISTS idx_infra_containers_server ON infra_containers(server_id);
CREATE INDEX IF NOT EXISTS idx_infra_containers_status ON infra_containers(status);
CREATE INDEX IF NOT EXISTS idx_infra_deployments_env ON infra_deployments(environment);
CREATE INDEX IF NOT EXISTS idx_infra_deployments_status ON infra_deployments(status);
CREATE INDEX IF NOT EXISTS idx_infra_firewall_rules_server ON infra_firewall_rules(server_id);
CREATE INDEX IF NOT EXISTS idx_infra_firewall_logs_server ON infra_firewall_logs(server_id);
CREATE INDEX IF NOT EXISTS idx_infra_firewall_logs_threat ON infra_firewall_logs(is_threat);
CREATE INDEX IF NOT EXISTS idx_infra_alerts_type ON infra_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_infra_alerts_status ON infra_alerts(status);
CREATE INDEX IF NOT EXISTS idx_infra_alerts_server ON infra_alerts(server_id);
CREATE INDEX IF NOT EXISTS idx_infra_vulnerabilities_type ON infra_vulnerabilities(vulnerability_type);
CREATE INDEX IF NOT EXISTS idx_infra_vulnerabilities_status ON infra_vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_infra_vulnerabilities_severity ON infra_vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_infra_backups_status ON infra_backups(status);
CREATE INDEX IF NOT EXISTS idx_infra_backups_type ON infra_backups(backup_type);
CREATE INDEX IF NOT EXISTS idx_infra_ssl_status ON infra_ssl_certificates(status);
CREATE INDEX IF NOT EXISTS idx_infra_ssl_expiry ON infra_ssl_certificates(expires_at);
CREATE INDEX IF NOT EXISTS idx_infra_cloud_provider ON infra_cloud_resources(cloud_provider);
CREATE INDEX IF NOT EXISTS idx_infra_secrets_type ON infra_secrets(secret_type);
CREATE INDEX IF NOT EXISTS idx_infra_secrets_status ON infra_secrets(status);
CREATE INDEX IF NOT EXISTS idx_infra_dependencies_status ON infra_dependencies(status);
CREATE INDEX IF NOT EXISTS idx_infra_incidents_status ON infra_incidents(status);
CREATE INDEX IF NOT EXISTS idx_infra_metrics_server ON infra_metrics(server_id);
CREATE INDEX IF NOT EXISTS idx_infra_metrics_type ON infra_metrics(metric_type, recorded_at);
CREATE INDEX IF NOT EXISTS idx_infra_audit_event ON infra_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_infra_network_suspicious ON infra_network_logs(is_suspicious);

-- Seed SSL certificate monitoring
INSERT INTO infra_ssl_certificates (cert_id, domain, issuer, subject, algorithm, key_size, issued_at, expires_at, auto_renew, tls_version, cipher_suites, status)
VALUES
('SSL001', 'erp.example.com', 'Let''s Encrypt', 'CN=erp.example.com', 'RSA', 2048, CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP + INTERVAL '270 days', true, 'TLS 1.3', ARRAY['TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256'], 'active'),
('SSL002', 'api.erp.example.com', 'Let''s Encrypt', 'CN=api.erp.example.com', 'RSA', 2048, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP + INTERVAL '300 days', true, 'TLS 1.3', ARRAY['TLS_AES_256_GCM_SHA384'], 'active'),
('SSL003', 'admin.erp.example.com', 'DigiCert', 'CN=admin.erp.example.com', 'ECDSA', 256, CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP + INTERVAL '275 days', true, 'TLS 1.3', ARRAY['TLS_AES_256_GCM_SHA384', 'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384'], 'active')
ON CONFLICT (cert_id) DO NOTHING;

-- Seed dependency tracking
INSERT INTO infra_dependencies (dependency_name, current_version, latest_version, package_manager, ecosystem, status, vulnerability_count, critical_vulnerabilities)
VALUES
('express', '4.18.2', '4.21.0', 'npm', 'node', 'outdated', 3, 1),
('pg', '8.11.3', '8.13.0', 'npm', 'node', 'outdated', 1, 0),
('react', '18.2.0', '18.3.1', 'npm', 'node', 'outdated', 0, 0),
('helmet', '7.1.0', '8.0.0', 'npm', 'node', 'outdated', 1, 0),
('jsonwebtoken', '9.0.2', '9.0.2', 'npm', 'node', 'current', 0, 0)
ON CONFLICT DO NOTHING;

-- Seed infrastructure alerts
INSERT INTO infra_alerts (alert_id, title, description, alert_type, severity, status, recommendation)
VALUES
('ALR001', 'SSL Certificate Expiring Soon', 'Certificate for admin.erp.example.com expires in 30 days', 'ssl', 'high', 'open', 'Renew SSL certificate for admin.erp.example.com'),
('ALR002', 'Outdated Dependencies Found', '5 packages have available updates with known vulnerabilities', 'vulnerability', 'medium', 'open', 'Run npm audit and update vulnerable packages'),
('ALR003', 'No Recent Backups', 'No full backup performed in the last 7 days', 'backup', 'high', 'open', 'Schedule and run a full backup immediately')
ON CONFLICT (alert_id) DO NOTHING;

-- Seed server
INSERT INTO infra_servers (server_id, hostname, ip_address, environment, server_type, os, status, cpu_usage, memory_usage, disk_usage, ssh_enabled, firewall_enabled, auto_updates_enabled, fail2ban_enabled, provider, region, tags)
VALUES
('SRV001', 'erp-api-prod-01', '10.0.1.10', 'production', 'app', 'Ubuntu 22.04 LTS', 'online', 45.2, 62.8, 55.0, true, true, true, true, 'aws', 'us-east-1', ARRAY['production', 'api', 'primary']),
('SRV002', 'erp-db-prod-01', '10.0.1.20', 'production', 'database', 'Ubuntu 22.04 LTS', 'online', 30.1, 75.3, 68.0, false, true, true, true, 'aws', 'us-east-1', ARRAY['production', 'database', 'postgresql']),
('SRV003', 'erp-cache-prod-01', '10.0.1.30', 'production', 'cache', 'Ubuntu 22.04 LTS', 'online', 22.5, 45.0, 30.0, false, true, true, false, 'aws', 'us-east-1', ARRAY['production', 'cache', 'redis'])
ON CONFLICT (server_id) DO NOTHING;
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running Security Phase 8 migration (Infrastructure Security)...');
    await client.query(migration);
    console.log('Phase 8 migration completed successfully.');
    console.log('Tables created: infra_servers, infra_containers, infra_deployments, infra_security_configs, infra_firewall_rules, infra_firewall_logs, infra_alerts, infra_vulnerabilities, infra_backups, infra_recovery, infra_ssl_certificates, infra_cloud_resources, infra_secrets, infra_dependencies, infra_incidents, infra_metrics, infra_audit_log, infra_network_logs');
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
