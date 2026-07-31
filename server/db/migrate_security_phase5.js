const { Pool } = require('pg');
const { getPoolConfig } = require('../config/poolConfig');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const pool = new Pool(getPoolConfig());

const migration = `
-- =============================================================
-- Security Phase 5: Security Operations Center (SOC)
-- =============================================================

-- 1. Security Alerts
CREATE TABLE IF NOT EXISTS soc_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'medium',
  title VARCHAR(500) NOT NULL,
  description TEXT,
  source VARCHAR(100),
  source_id VARCHAR(200),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  device_id VARCHAR(200),
  file_id UUID,
  geo_country VARCHAR(100),
  geo_city VARCHAR(200),
  action VARCHAR(100),
  resource VARCHAR(200),
  status VARCHAR(50) DEFAULT 'open',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  escalation_level INTEGER DEFAULT 0,
  risk_score DECIMAL(5,2) DEFAULT 0,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Security Incidents
CREATE TABLE IF NOT EXISTS soc_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'medium',
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  related_alerts UUID[] DEFAULT '{}',
  related_users UUID[] DEFAULT '{}',
  related_files UUID[] DEFAULT '{}',
  affected_resources TEXT[] DEFAULT '{}',
  root_cause TEXT,
  resolution TEXT,
  resolution_date TIMESTAMPTZ,
  sla_deadline TIMESTAMPTZ,
  escalation_level INTEGER DEFAULT 0,
  is_closed BOOLEAN DEFAULT false,
  closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Incident Cases (evidence, notes, timeline)
CREATE TABLE IF NOT EXISTS soc_incident_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES soc_incidents(id) ON DELETE CASCADE,
  case_type VARCHAR(50) NOT NULL DEFAULT 'note',
  title VARCHAR(500),
  content TEXT,
  evidence_path TEXT,
  evidence_type VARCHAR(100),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Threat Records (detected attacks)
CREATE TABLE IF NOT EXISTS soc_threat_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  source_ip VARCHAR(45),
  target_user UUID REFERENCES users(id) ON DELETE SET NULL,
  target_resource VARCHAR(500),
  attack_pattern TEXT,
  mitre_technique VARCHAR(200),
  detection_method VARCHAR(100),
  is_automated BOOLEAN DEFAULT true,
  is_blocked BOOLEAN DEFAULT false,
  risk_score DECIMAL(5,2) DEFAULT 0,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. User Risk Scores (snapshot-based)
CREATE TABLE IF NOT EXISTS soc_user_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  overall_score DECIMAL(5,2) DEFAULT 0,
  login_risk DECIMAL(5,2) DEFAULT 0,
  device_risk DECIMAL(5,2) DEFAULT 0,
  location_risk DECIMAL(5,2) DEFAULT 0,
  download_risk DECIMAL(5,2) DEFAULT 0,
  permission_risk DECIMAL(5,2) DEFAULT 0,
  session_risk DECIMAL(5,2) DEFAULT 0,
  risk_level VARCHAR(50) DEFAULT 'low',
  factor_breakdown JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Threat Intelligence
CREATE TABLE IF NOT EXISTS soc_threat_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ioc_type VARCHAR(100) NOT NULL,
  ioc_value VARCHAR(500) NOT NULL,
  threat_type VARCHAR(100),
  severity VARCHAR(50),
  confidence DECIMAL(5,2) DEFAULT 0,
  source VARCHAR(200),
  description TEXT,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  auto_block BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_ioc UNIQUE (ioc_type, ioc_value)
);

-- 7. Event Correlations
CREATE TABLE IF NOT EXISTS soc_event_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_type VARCHAR(100) NOT NULL,
  correlation_pattern VARCHAR(200),
  severity VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  related_event_ids UUID[] DEFAULT '{}',
  related_alert_ids UUID[] DEFAULT '{}',
  threat_chain TEXT[] DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Security Notifications
CREATE TABLE IF NOT EXISTS soc_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  message TEXT,
  channel VARCHAR(50) DEFAULT 'in_app',
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  related_alert_id UUID REFERENCES soc_alerts(id) ON DELETE SET NULL,
  related_incident_id UUID REFERENCES soc_incidents(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Security Reports
CREATE TABLE IF NOT EXISTS soc_security_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  parameters JSONB DEFAULT '{}',
  result_data JSONB DEFAULT '{}',
  file_format VARCHAR(50) DEFAULT 'json',
  file_path TEXT,
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Security Escalation Rules
CREATE TABLE IF NOT EXISTS soc_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(200) NOT NULL,
  alert_type VARCHAR(100),
  severity VARCHAR(50),
  min_risk_score DECIMAL(5,2) DEFAULT 0,
  escalation_level INTEGER NOT NULL,
  assignee_role VARCHAR(100),
  notify_users UUID[] DEFAULT '{}',
  sla_hours INTEGER DEFAULT 24,
  auto_action VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. Security Log Archive (for long-term retention)
CREATE TABLE IF NOT EXISTS soc_log_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type VARCHAR(100) NOT NULL,
  source_table VARCHAR(100),
  source_id UUID,
  severity VARCHAR(50),
  summary TEXT,
  full_data JSONB DEFAULT '{}',
  archived_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  retention_until TIMESTAMPTZ
);

-- 12. Attack Events (raw detection events)
CREATE TABLE IF NOT EXISTS soc_attack_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attack_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  source_ip VARCHAR(45),
  target_user UUID REFERENCES users(id) ON DELETE SET NULL,
  target_endpoint VARCHAR(500),
  http_method VARCHAR(10),
  user_agent TEXT,
  request_count INTEGER DEFAULT 1,
  time_window_seconds INTEGER DEFAULT 60,
  is_blocked BOOLEAN DEFAULT false,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ===================== INDEXES =====================
CREATE INDEX IF NOT EXISTS idx_soc_alerts_type ON soc_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_soc_alerts_severity ON soc_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_soc_alerts_status ON soc_alerts(status);
CREATE INDEX IF NOT EXISTS idx_soc_alerts_user ON soc_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_soc_alerts_assignee ON soc_alerts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_soc_alerts_time ON soc_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_soc_alerts_escalation ON soc_alerts(escalation_level);

CREATE INDEX IF NOT EXISTS idx_soc_incidents_type ON soc_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_soc_incidents_severity ON soc_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_soc_incidents_status ON soc_incidents(status);
CREATE INDEX IF NOT EXISTS idx_soc_incidents_assignee ON soc_incidents(assigned_to);
CREATE INDEX IF NOT EXISTS idx_soc_incidents_time ON soc_incidents(created_at);

CREATE INDEX IF NOT EXISTS idx_soc_cases_incident ON soc_incident_cases(incident_id);
CREATE INDEX IF NOT EXISTS idx_soc_cases_type ON soc_incident_cases(case_type);

CREATE INDEX IF NOT EXISTS idx_soc_threats_type ON soc_threat_records(threat_type);
CREATE INDEX IF NOT EXISTS idx_soc_threats_severity ON soc_threat_records(severity);
CREATE INDEX IF NOT EXISTS idx_soc_threats_ip ON soc_threat_records(source_ip);
CREATE INDEX IF NOT EXISTS idx_soc_threats_time ON soc_threat_records(created_at);

CREATE INDEX IF NOT EXISTS idx_soc_risk_user ON soc_user_risk_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_soc_risk_level ON soc_user_risk_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_soc_risk_time ON soc_user_risk_scores(calculated_at);

CREATE INDEX IF NOT EXISTS idx_soc_ti_type ON soc_threat_intelligence(ioc_type);
CREATE INDEX IF NOT EXISTS idx_soc_ti_value ON soc_threat_intelligence(ioc_value);
CREATE INDEX IF NOT EXISTS idx_soc_ti_active ON soc_threat_intelligence(is_active);

CREATE INDEX IF NOT EXISTS idx_soc_corr_type ON soc_event_correlations(correlation_type);
CREATE INDEX IF NOT EXISTS idx_soc_corr_severity ON soc_event_correlations(severity);

CREATE INDEX IF NOT EXISTS idx_soc_notif_user ON soc_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_soc_notif_read ON soc_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_soc_notif_time ON soc_notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_soc_reports_type ON soc_security_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_soc_reports_time ON soc_security_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_soc_escalation_active ON soc_escalation_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_soc_log_type ON soc_log_archive(log_type);
CREATE INDEX IF NOT EXISTS idx_soc_log_time ON soc_log_archive(archived_at);

CREATE INDEX IF NOT EXISTS idx_soc_attack_type ON soc_attack_events(attack_type);
CREATE INDEX IF NOT EXISTS idx_soc_attack_ip ON soc_attack_events(source_ip);
CREATE INDEX IF NOT EXISTS idx_soc_attack_time ON soc_attack_events(created_at);

-- Seed escalation rules
INSERT INTO soc_escalation_rules (rule_name, alert_type, severity, min_risk_score, escalation_level, assignee_role, sla_hours, auto_action) VALUES
  ('Critical Alert - Auto Escalate', NULL, 'critical', 0.8, 4, 'System Admin', 1, 'escalate'),
  ('High Alert - Security Manager', NULL, 'high', 0.6, 3, 'System Admin', 4, 'notify'),
  ('Medium Alert - Security Officer', NULL, 'medium', 0.4, 2, 'Manager', 8, 'notify'),
  ('Low Alert - Monitor', NULL, 'low', 0.2, 1, 'Security Officer', 24, 'log'),
  ('Brute Force - Auto Block', 'brute_force', 'critical', 0.9, 4, 'System Admin', 0, 'block_ip'),
  ('Data Exfil - Auto Lock', 'data_exfiltration', 'critical', 0.9, 4, 'System Admin', 0, 'lock_account')
ON CONFLICT DO NOTHING;

-- Seed threat intelligence (common malicious patterns)
INSERT INTO soc_threat_intelligence (ioc_type, ioc_value, threat_type, severity, confidence, description, auto_block) VALUES
  ('pattern', 'brute_force_login', 'credential_attack', 'critical', 0.95, 'Multiple failed login attempts from same IP', true),
  ('pattern', 'credential_stuffing', 'credential_attack', 'critical', 0.90, 'Rapid login attempts with different usernames', true),
  ('pattern', 'session_hijack', 'session_attack', 'critical', 0.85, 'Session token reuse from different IP/location', true),
  ('pattern', 'api_abuse', 'api_attack', 'high', 0.80, 'Excessive API calls from single source', true),
  ('pattern', 'data_exfiltration', 'data_theft', 'critical', 0.85, 'Massive data export detected', true),
  ('pattern', 'privilege_escalation', 'insider_threat', 'high', 0.75, 'Unauthorized privilege change attempt', true)
ON CONFLICT (ioc_type, ioc_value) DO NOTHING;
`;

async function run() {
  const client = await pool.connect();
  try {
    console.log('Starting Security Phase 5 (SOC) migration...');
    await client.query(migration);
    console.log('SOC migration completed');
    console.log('Tables: soc_alerts, soc_incidents, soc_incident_cases, soc_threat_records,');
    console.log('  soc_user_risk_scores, soc_threat_intelligence, soc_event_correlations,');
    console.log('  soc_notifications, soc_security_reports, soc_escalation_rules,');
    console.log('  soc_log_archive, soc_attack_events');
    console.log('Seeded: 6 escalation rules, 6 threat intelligence patterns');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
