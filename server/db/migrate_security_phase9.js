const { Pool } = require('pg');
const { getPoolConfig } = require('../config/poolConfig');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool(getPoolConfig());

const migration = `
-- ============================================================
-- SECURITY PHASE 9: Enterprise Ultimate Security
-- Zero Trust | Biometric | PAM | DLP | SIEM | SOAR | Executive
-- ============================================================

-- 1. ZERO TRUST SCORES
CREATE TABLE IF NOT EXISTS phase9_trust_scores (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  trust_score DECIMAL(5,2) DEFAULT 50,
  risk_level VARCHAR(50),
  device_trust DECIMAL(5,2),
  session_trust DECIMAL(5,2),
  behavior_trust DECIMAL(5,2),
  location_trust DECIMAL(5,2),
  last_verified_at TIMESTAMP,
  requires_reauth BOOLEAN DEFAULT false,
  reauth_reason TEXT,
  factors JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. BIOMETRIC PROFILES
CREATE TABLE IF NOT EXISTS phase9_biometric_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) UNIQUE,
  biometric_type VARCHAR(50) NOT NULL,  -- fingerprint, facial, voice, behavioral
  biometric_data_hash VARCHAR(500) NOT NULL,
  biometric_metadata JSONB,
  enrollment_status VARCHAR(50) DEFAULT 'pending',  -- pending, enrolled, failed, revoked
  enrolled_at TIMESTAMP,
  last_verified_at TIMESTAMP,
  verification_count INTEGER DEFAULT 0,
  recovery_method VARCHAR(200),
  recovery_phone VARCHAR(50),
  recovery_email VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. HARDWARE SECURITY KEYS
CREATE TABLE IF NOT EXISTS phase9_hardware_keys (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  key_type VARCHAR(50) NOT NULL,  -- yubikey, fido2, smart_card, security_token
  key_serial VARCHAR(200) UNIQUE NOT NULL,
  key_label VARCHAR(300),
  public_key TEXT,
  credential_id TEXT,
  attestation_type VARCHAR(100),
  aaguid VARCHAR(100),
  is_backup BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. PRIVILEGED ACCESS MANAGEMENT SESSIONS
CREATE TABLE IF NOT EXISTS phase9_pam_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(200),
  privileged_role VARCHAR(100),
  target_system VARCHAR(300),
  target_type VARCHAR(100),  -- database, server, application, api
  access_level VARCHAR(100),  -- read, write, admin, sysadmin
  status VARCHAR(50) DEFAULT 'pending',  -- pending, active, completed, terminated, expired
  session_token TEXT,
  session_recording TEXT,
  commands_executed TEXT[],
  data_accessed TEXT[],
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  duration_seconds INTEGER,
  approved_by UUID REFERENCES users(id),
  approved_by_name VARCHAR(200),
  justification TEXT,
  ip_address VARCHAR(50),
  risk_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. PRIVILEGED ACCESS APPROVALS
CREATE TABLE IF NOT EXISTS phase9_pam_approvals (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(200),
  approver_id UUID REFERENCES users(id),
  approver_name VARCHAR(200),
  access_type VARCHAR(200),
  target_system VARCHAR(300),
  justification TEXT,
  urgency VARCHAR(50),  -- standard, urgent, emergency
  status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, denied, expired
  approved_at TIMESTAMP,
  expires_at TIMESTAMP,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. JIT ACCESS REQUESTS
CREATE TABLE IF NOT EXISTS phase9_jit_requests (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(200),
  resource_type VARCHAR(200),
  resource_name VARCHAR(300),
  permission_level VARCHAR(100),
  justification TEXT,
  duration_minutes INTEGER,
  status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, active, expired, denied, revoked
  approved_by UUID REFERENCES users(id),
  approved_by_name VARCHAR(200),
  granted_at TIMESTAMP,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  auto_expired BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. DLP RULES
CREATE TABLE IF NOT EXISTS phase9_dlp_rules (
  id SERIAL PRIMARY KEY,
  rule_id VARCHAR(50) UNIQUE NOT NULL,
  rule_name VARCHAR(300) NOT NULL,
  description TEXT,
  rule_type VARCHAR(100) NOT NULL,  -- data_export, email, screenshot, print, copy_paste, file_upload
  pattern TEXT,
  regex_pattern TEXT,
  data_classification VARCHAR(100),  -- pii, financial, confidential, executive, payroll
  severity VARCHAR(50) DEFAULT 'medium',
  action VARCHAR(50) DEFAULT 'alert',  -- alert, block, quarantine, notify_executive
  enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. DLP EVENTS
CREATE TABLE IF NOT EXISTS phase9_dlp_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(50) UNIQUE NOT NULL,
  rule_id VARCHAR(50) REFERENCES phase9_dlp_rules(rule_id),
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(200),
  event_type VARCHAR(100),
  severity VARCHAR(50),
  data_classification VARCHAR(100),
  data_details TEXT,
  source_application VARCHAR(200),
  source_ip VARCHAR(50),
  content_preview TEXT,
  action_taken VARCHAR(50),  -- allowed, blocked, alerted
  status VARCHAR(50) DEFAULT 'open',  -- open, investigating, resolved, dismissed
  risk_score DECIMAL(5,2),
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. SENSITIVE DATA DISCOVERY
CREATE TABLE IF NOT EXISTS phase9_sensitive_data (
  id SERIAL PRIMARY KEY,
  record_id VARCHAR(50) UNIQUE NOT NULL,
  data_type VARCHAR(100) NOT NULL,  -- employee_id, tax_number, bank_account, payroll, contract, executive_doc
  classification VARCHAR(100),  -- public, internal, confidential, restricted, critical
  location VARCHAR(500),
  table_name VARCHAR(200),
  column_name VARCHAR(200),
  record_count INTEGER,
  risk_score DECIMAL(5,2),
  discovered_by VARCHAR(200),
  discovered_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'identified',  -- identified, labeled, remediated, monitored
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. DRM PROTECTED DOCUMENTS
CREATE TABLE IF NOT EXISTS phase9_drm_documents (
  id SERIAL PRIMARY KEY,
  document_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  document_type VARCHAR(100),  -- contract, payroll, executive_report, financial, board_doc
  file_path VARCHAR(500),
  encrypted_path VARCHAR(500),
  encryption_key_hash VARCHAR(200),
  owner_id UUID REFERENCES users(id),
  owner_name VARCHAR(200),
  view_only BOOLEAN DEFAULT true,
  print_allowed BOOLEAN DEFAULT false,
  copy_allowed BOOLEAN DEFAULT false,
  screenshot_allowed BOOLEAN DEFAULT false,
  download_allowed BOOLEAN DEFAULT false,
  expires_at TIMESTAMP,
  watermark_text VARCHAR(500),
  status VARCHAR(50) DEFAULT 'active',  -- active, expired, revoked
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. SESSION RECORDINGS
CREATE TABLE IF NOT EXISTS phase9_session_recordings (
  id SERIAL PRIMARY KEY,
  recording_id VARCHAR(50) UNIQUE NOT NULL,
  session_id VARCHAR(50),
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(200),
  session_type VARCHAR(100),  -- admin, privileged, sensitive_transaction
  recording_data TEXT,
  recording_duration_seconds INTEGER,
  commands_log TEXT[],
  screenshots TEXT[],
  keystroke_log TEXT,
  risk_events JSONB,
  status VARCHAR(50) DEFAULT 'completed',
  playback_url TEXT,
  file_size_bytes BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. SIEM EVENTS
CREATE TABLE IF NOT EXISTS phase9_siem_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(50) UNIQUE NOT NULL,
  event_source VARCHAR(200),  -- auth, api, server, database, security, network
  event_type VARCHAR(200),
  event_category VARCHAR(100),  -- authentication, access, threat, compliance, system
  severity VARCHAR(50),
  title VARCHAR(500),
  description TEXT,
  source_ip VARCHAR(50),
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(200),
  affected_resource VARCHAR(300),
  raw_data JSONB,
  normalized_data JSONB,
  correlation_id VARCHAR(50),
  is_correlated BOOLEAN DEFAULT false,
  threat_score DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'new',  -- new, analyzing, escalated, resolved, archived
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. SIEM CORRELATIONS
CREATE TABLE IF NOT EXISTS phase9_siem_correlations (
  id SERIAL PRIMARY KEY,
  correlation_id VARCHAR(50) UNIQUE NOT NULL,
  correlation_name VARCHAR(300),
  correlation_type VARCHAR(100),  -- time_based, sequence_based, aggregation, threshold
  event_ids TEXT[],
  related_events INTEGER,
  threat_score DECIMAL(5,2),
  threat_type VARCHAR(200),
  description TEXT,
  recommendation TEXT,
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. SOAR PLAYBOOKS
CREATE TABLE IF NOT EXISTS phase9_soar_playbooks (
  id SERIAL PRIMARY KEY,
  playbook_id VARCHAR(50) UNIQUE NOT NULL,
  playbook_name VARCHAR(300) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(100),  -- siem_event, dlp_event, threat_detected, insider_threat
  trigger_conditions JSONB,
  steps JSONB,
  auto_execute BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'active',  -- active, inactive, draft
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. SOAR EXECUTIONS
CREATE TABLE IF NOT EXISTS phase9_soar_executions (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(50) UNIQUE NOT NULL,
  playbook_id VARCHAR(50) REFERENCES phase9_soar_playbooks(playbook_id),
  playbook_name VARCHAR(300),
  triggered_by VARCHAR(200),
  trigger_event_id VARCHAR(50),
  trigger_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'running',  -- running, completed, failed, partial
  steps_completed INTEGER DEFAULT 0,
  steps_total INTEGER DEFAULT 0,
  execution_log TEXT[],
  result TEXT,
  duration_seconds INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. IDENTITY GOVERNANCE
CREATE TABLE IF NOT EXISTS phase9_identity_governance (
  id SERIAL PRIMARY KEY,
  review_id VARCHAR(50) UNIQUE NOT NULL,
  review_type VARCHAR(100),  -- joiner, mover, leaver, certification, periodic
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(200),
  user_email VARCHAR(200),
  department VARCHAR(200),
  user_role VARCHAR(200),
  new_user_role VARCHAR(200),
  status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, denied, completed
  risk_score DECIMAL(5,2),
  reviewer_id UUID REFERENCES users(id),
  reviewer_name VARCHAR(200),
  reviewed_at TIMESTAMP,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. EXECUTIVE PROTECTION
CREATE TABLE IF NOT EXISTS phase9_executive_protection (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) UNIQUE,
  user_name VARCHAR(200),
  executive_title VARCHAR(200),
  protection_level VARCHAR(50) DEFAULT 'standard',  -- standard, enhanced, maximum
  biometric_required BOOLEAN DEFAULT true,
  hardware_key_required BOOLEAN DEFAULT false,
  session_monitoring BOOLEAN DEFAULT true,
  login_alert BOOLEAN DEFAULT true,
  data_access_alert BOOLEAN DEFAULT true,
  high_risk_geo_alert BOOLEAN DEFAULT true,
  unusual_time_alert BOOLEAN DEFAULT true,
  notification_email VARCHAR(200),
  notification_phone VARCHAR(50),
  authorized_proxies TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. DECEPTION ASSETS (Honey)
CREATE TABLE IF NOT EXISTS phase9_deception_assets (
  id SERIAL PRIMARY KEY,
  asset_id VARCHAR(50) UNIQUE NOT NULL,
  asset_type VARCHAR(100),  -- honey_account, honey_file, honey_record, honey_credential, honey_database
  asset_name VARCHAR(300),
  description TEXT,
  honeytoken VARCHAR(500),
  bait_value TEXT,
  deployment_location VARCHAR(500),
  status VARCHAR(50) DEFAULT 'active',  -- active, triggered, retired
  triggered_at TIMESTAMP,
  triggered_by VARCHAR(200),
  triggered_ip VARCHAR(50),
  alert_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. INSIDER THREAT CASES
CREATE TABLE IF NOT EXISTS phase9_insider_threats (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(200),
  department VARCHAR(200),
  threat_type VARCHAR(100),  -- data_exfiltration, privilege_abuse, executive_access, suspicious_export
  severity VARCHAR(50),
  risk_score DECIMAL(5,2),
  indicators TEXT[],
  evidence TEXT[],
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',  -- open, investigating, confirmed, false_positive, remediated
  assigned_to UUID REFERENCES users(id),
  assigned_to_name VARCHAR(200),
  investigation_notes TEXT,
  resolution TEXT,
  detected_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20. EXECUTIVE VAULT ITEMS
CREATE TABLE IF NOT EXISTS phase9_vault_items (
  id SERIAL PRIMARY KEY,
  item_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  item_type VARCHAR(100),  -- contract, executive_report, strategic_doc, board_doc, financial_report
  classification VARCHAR(100),  -- confidential, restricted, critical
  encrypted_content TEXT,
  encrypted_file_path VARCHAR(500),
  checksum VARCHAR(200),
  owner_id UUID REFERENCES users(id),
  owner_name VARCHAR(200),
  access_required_approval BOOLEAN DEFAULT true,
  watermark_user_info BOOLEAN DEFAULT true,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active',  -- active, archived, destroyed
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 21. COMPLIANCE READINESS
CREATE TABLE IF NOT EXISTS phase9_compliance_mapping (
  id SERIAL PRIMARY KEY,
  standard VARCHAR(200) NOT NULL,  -- GDPR, SOX, PCI-DSS, HIPAA, ISO27001, SOC2
  control_id VARCHAR(100),
  control_name VARCHAR(300),
  description TEXT,
  implemented BOOLEAN DEFAULT false,
  evidence TEXT,
  tested_date TIMESTAMP,
  tested_by UUID REFERENCES users(id),
  test_result TEXT,
  status VARCHAR(50) DEFAULT 'not_implemented',  -- not_implemented, in_progress, implemented, tested, compliant
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 22. THREAT HUNTING CASES
CREATE TABLE IF NOT EXISTS phase9_threat_hunts (
  id SERIAL PRIMARY KEY,
  hunt_id VARCHAR(50) UNIQUE NOT NULL,
  hunt_name VARCHAR(300) NOT NULL,
  description TEXT,
  hypothesis TEXT,
  threat_type VARCHAR(200),
  ioc_indicators TEXT[],
  search_queries JSONB,
  affected_systems TEXT[],
  findings TEXT,
  severity VARCHAR(50),
  status VARCHAR(50) DEFAULT 'draft',  -- draft, active, completed, closed
  assigned_to UUID REFERENCES users(id),
  assigned_to_name VARCHAR(200),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 23. SECURITY SCORES & MATURITY
CREATE TABLE IF NOT EXISTS phase9_security_scores (
  id SERIAL PRIMARY KEY,
  score_type VARCHAR(100) NOT NULL,  -- overall, department, executive, compliance, dlp, pam
  score_name VARCHAR(300),
  score_value DECIMAL(5,2),
  previous_score DECIMAL(5,2),
  trend VARCHAR(50),  -- improving, declining, stable
  category_scores JSONB,
  department VARCHAR(200),
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 24. CYBER RESILIENCE PLANS
CREATE TABLE IF NOT EXISTS phase9_cyber_resilience (
  id SERIAL PRIMARY KEY,
  plan_id VARCHAR(50) UNIQUE NOT NULL,
  plan_name VARCHAR(300) NOT NULL,
  plan_type VARCHAR(100) NOT NULL,  -- ransomware, data_breach, infrastructure_failure, cyber_attack, crisis
  description TEXT,
  severity VARCHAR(50),
  recovery_steps TEXT[],
  recovery_time_objective INTEGER,  -- in minutes
  recovery_point_objective INTEGER,  -- in minutes
  tested BOOLEAN DEFAULT false,
  last_tested TIMESTAMP,
  test_result TEXT,
  responsible_team TEXT[],
  stakeholders TEXT[],
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 25. SECURITY REPORTS
CREATE TABLE IF NOT EXISTS phase9_security_reports (
  id SERIAL PRIMARY KEY,
  report_id VARCHAR(50) UNIQUE NOT NULL,
  report_name VARCHAR(300) NOT NULL,
  report_type VARCHAR(100),  -- board, executive, posture, risk, compliance
  report_format VARCHAR(50),  -- pdf, excel, csv
  report_data JSONB,
  generated_by UUID REFERENCES users(id),
  generated_by_name VARCHAR(200),
  generated_at TIMESTAMP,
  file_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 26. CONTINUOUS VERIFICATION LOGS
CREATE TABLE IF NOT EXISTS phase9_continuous_verification (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  verification_type VARCHAR(100),  -- identity, device, session, network, behavior
  verification_result VARCHAR(50),  -- passed, failed, challenged, timeout
  trust_score DECIMAL(5,2),
  risk_factors JSONB,
  action_taken VARCHAR(100),  -- allowed, reauth_required, mfa_challenge, terminated
  ip_address VARCHAR(50),
  device_fingerprint VARCHAR(200),
  location VARCHAR(200),
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 27. INCIDENT RESPONSE PLANS
CREATE TABLE IF NOT EXISTS phase9_incident_response (
  id SERIAL PRIMARY KEY,
  plan_id VARCHAR(50) UNIQUE NOT NULL,
  plan_name VARCHAR(300) NOT NULL,
  incident_type VARCHAR(200),
  severity VARCHAR(50),
  response_steps TEXT[],
  escalation_matrix JSONB,
  communication_plan TEXT,
  legal_notification_required BOOLEAN DEFAULT false,
  regulatory_notification_required BOOLEAN DEFAULT false,
  notification_timeline_hours INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_p9_trust_user ON phase9_trust_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_p9_biometric_user ON phase9_biometric_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_p9_hardware_user ON phase9_hardware_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_p9_pam_user ON phase9_pam_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_p9_pam_status ON phase9_pam_sessions(status);
CREATE INDEX IF NOT EXISTS idx_p9_pam_approvals_user ON phase9_pam_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_p9_jit_user ON phase9_jit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_p9_jit_status ON phase9_jit_requests(status);
CREATE INDEX IF NOT EXISTS idx_p9_dlp_rules_type ON phase9_dlp_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_p9_dlp_events_user ON phase9_dlp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_p9_dlp_events_severity ON phase9_dlp_events(severity);
CREATE INDEX IF NOT EXISTS idx_p9_sensitive_type ON phase9_sensitive_data(data_type);
CREATE INDEX IF NOT EXISTS idx_p9_drm_owner ON phase9_drm_documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_p9_session_user ON phase9_session_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_p9_siem_source ON phase9_siem_events(event_source);
CREATE INDEX IF NOT EXISTS idx_p9_siem_severity ON phase9_siem_events(severity);
CREATE INDEX IF NOT EXISTS idx_p9_siem_correlated ON phase9_siem_events(is_correlated);
CREATE INDEX IF NOT EXISTS idx_p9_soar_playbook_status ON phase9_soar_playbooks(status);
CREATE INDEX IF NOT EXISTS idx_p9_soar_exec_status ON phase9_soar_executions(status);
CREATE INDEX IF NOT EXISTS idx_p9_identity_user ON phase9_identity_governance(user_id);
CREATE INDEX IF NOT EXISTS idx_p9_executive_user ON phase9_executive_protection(user_id);
CREATE INDEX IF NOT EXISTS idx_p9_deception_status ON phase9_deception_assets(status);
CREATE INDEX IF NOT EXISTS idx_p9_insider_user ON phase9_insider_threats(user_id);
CREATE INDEX IF NOT EXISTS idx_p9_insider_status ON phase9_insider_threats(status);
CREATE INDEX IF NOT EXISTS idx_p9_vault_owner ON phase9_vault_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_p9_compliance_standard ON phase9_compliance_mapping(standard);
CREATE INDEX IF NOT EXISTS idx_p9_threat_status ON phase9_threat_hunts(status);
CREATE INDEX IF NOT EXISTS idx_p9_scores_type ON phase9_security_scores(score_type);
CREATE INDEX IF NOT EXISTS idx_p9_resilience_type ON phase9_cyber_resilience(plan_type);
CREATE INDEX IF NOT EXISTS idx_p9_verification_user ON phase9_continuous_verification(user_id);

-- SEED DATA: DLP Rules
INSERT INTO phase9_dlp_rules (rule_id, rule_name, description, rule_type, data_classification, severity, action, enabled) VALUES
('DLP001', 'Block Salary Export', 'Prevent unauthorized export of salary/payroll data', 'data_export', 'payroll', 'critical', 'block', true),
('DLP002', 'Alert Customer Data Export', 'Alert on large customer data exports', 'data_export', 'pii', 'high', 'alert', true),
('DLP003', 'Block Confidential Document Upload', 'Block upload of confidential documents to external sites', 'file_upload', 'confidential', 'high', 'block', true),
('DLP004', 'Alert Executive Data Access', 'Alert on executive data access by non-executives', 'data_export', 'executive', 'critical', 'notify_executive', true),
('DLP005', 'Monitor Print of Financial Docs', 'Monitor and alert on printing financial documents', 'print', 'financial', 'medium', 'alert', true),
('DLP006', 'Block Screenshot of Payroll', 'Block screenshot attempts on payroll data', 'screenshot', 'payroll', 'high', 'block', true)
ON CONFLICT (rule_id) DO NOTHING;

-- SEED DATA: Security Scores
INSERT INTO phase9_security_scores (score_type, score_name, score_value, previous_score, trend) VALUES
('overall', 'Overall Security Maturity', 72.5, 68.0, 'improving'),
('executive', 'Executive Protection Score', 85.0, 82.0, 'improving'),
('compliance', 'Compliance Readiness', 68.0, 65.0, 'improving'),
('dlp', 'DLP Effectiveness', 78.0, 75.0, 'improving'),
('pam', 'PAM Maturity', 70.0, 65.0, 'improving')
ON CONFLICT DO NOTHING;

-- SEED DATA: Compliance Mapping
INSERT INTO phase9_compliance_mapping (standard, control_id, control_name, description, implemented, status) VALUES
('GDPR', 'GDPR-17', 'Data Protection by Design', 'Implement data protection measures by design and default', true, 'implemented'),
('SOX', 'SOX-302', 'Corporate Responsibility', 'Certify financial reports and internal controls', false, 'in_progress'),
('PCI-DSS', 'PCI-4.1', 'Access Control', 'Restrict access to cardholder data', true, 'compliant'),
('HIPAA', 'HIPAA-164.312', 'Access Controls', 'Implement technical policies for electronic PHI access', true, 'implemented'),
('ISO27001', 'ISO-A.9', 'Access Control', 'Control access to information and assets', true, 'implemented'),
('SOC2', 'SOC2-CC6', 'Logical and Physical Access', 'Restrict logical access to systems', false, 'in_progress')
ON CONFLICT DO NOTHING;

-- SEED DATA: SOAR Playbooks
INSERT INTO phase9_soar_playbooks (playbook_id, playbook_name, description, trigger_type, steps, auto_execute) VALUES
('SOAR001', 'Account Lockdown on Threat', 'Automatically lock account and terminate sessions on critical threat detection',
 'siem_event',
 '[{"step":1,"action":"lock_account","description":"Lock user account"},{"step":2,"action":"terminate_sessions","description":"Terminate all active sessions"},{"step":3,"action":"notify_security","description":"Notify security team"},{"step":4,"action":"log_incident","description":"Create security incident record"}]'::jsonb,
 true)
ON CONFLICT (playbook_id) DO NOTHING;

-- SEED DATA: Cyber Resilience Plans
INSERT INTO phase9_cyber_resilience (plan_id, plan_name, plan_type, description, recovery_steps, recovery_time_objective, recovery_point_objective, responsible_team, stakeholders) VALUES
('RES001', 'Ransomware Recovery Plan', 'ransomware', 'Complete recovery plan for ransomware attacks', ARRAY['Isolate affected systems', 'Identify ransomware variant', 'Restore from clean backups', 'Scan all systems', 'Reset all credentials', 'Restore services from backups'], 240, 60, ARRAY['IT Security', 'System Administration', 'Executive Team'], ARRAY['CEO', 'CTO', 'Security Officer']),
('RES002', 'Data Breach Response Plan', 'data_breach', 'Response plan for data breaches', ARRAY['Contain the breach', 'Assess data exposure', 'Notify affected parties', 'Engage legal counsel', 'File regulatory reports', 'Implement remediation'], 120, 30, ARRAY['Security Team', 'Legal', 'PR Team'], ARRAY['CEO', 'CFO', 'Legal Counsel'])
ON CONFLICT (plan_id) DO NOTHING;

-- SEED DATA: Incident Response Plans
INSERT INTO phase9_incident_response (plan_id, plan_name, incident_type, severity, response_steps, escalation_matrix, legal_notification_required, regulatory_notification_required, notification_timeline_hours) VALUES
('IRP001', 'Critical Security Incident Response', 'security_breach', 'critical',
 ARRAY['Immediate containment', 'Evidence preservation', 'Initial assessment', 'Escalation to CISO', 'Legal notification', 'Regulatory filing', 'Root cause analysis', 'Remediation', 'Post-incident review'],
 '{"level1":"Security Analyst","level2":"Security Manager","level3":"CISO","level4":"CEO"}'::jsonb, true, true, 72)
ON CONFLICT (plan_id) DO NOTHING;
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running Security Phase 9 migration (Enterprise Ultimate Security)...');
    await client.query(migration);
    console.log('Phase 9 migration completed successfully.');
    console.log('27 tables created.');
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
