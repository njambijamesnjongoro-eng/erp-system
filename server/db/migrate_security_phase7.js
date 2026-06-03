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
-- SECURITY PHASE 7: AI-Powered Security Intelligence Platform
-- ============================================================

-- 1. FRAUD DETECTIONS
CREATE TABLE IF NOT EXISTS ai_fraud_detections (
  id SERIAL PRIMARY KEY,
  detection_id VARCHAR(50) UNIQUE NOT NULL,
  fraud_type VARCHAR(100) NOT NULL,  -- ghost_employee, payroll_fraud, duplicate_payment, procurement_fraud, vendor_collusion, fake_invoice, expense_fraud, asset_misuse, unauthorized_financial_change
  title VARCHAR(500) NOT NULL,
  description TEXT,
  severity VARCHAR(50) DEFAULT 'medium',  -- informational, low, medium, high, critical
  risk_score DECIMAL(5,2) DEFAULT 0,
  confidence DECIMAL(5,2) DEFAULT 0,  -- AI confidence level
  status VARCHAR(50) DEFAULT 'open',  -- open, investigating, confirmed, false_positive, closed
  entity_type VARCHAR(100),  -- user, vendor, invoice, payment, asset
  entity_id VARCHAR(100),
  entity_name VARCHAR(300),
  department VARCHAR(200),
  evidence JSONB,  -- supporting evidence data
  indicators TEXT[],  -- fraud indicators triggered
  amount DECIMAL(15,2),  -- financial impact if applicable
  source_module VARCHAR(100),  -- hr, finance, procurement, payroll
  detected_by VARCHAR(100) DEFAULT 'ai_engine',  -- ai_engine, rule_based, manual
  assigned_to UUID REFERENCES users(id),
  assigned_to_name VARCHAR(200),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. FRAUD CASES
CREATE TABLE IF NOT EXISTS ai_fraud_cases (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  fraud_type VARCHAR(100),
  severity VARCHAR(50),
  status VARCHAR(50) DEFAULT 'open',  -- open, investigating, closed
  lead_investigator_id UUID REFERENCES users(id),
  lead_investigator_name VARCHAR(200),
  related_detections TEXT[],  -- detection_ids
  evidence_summary TEXT,
  findings TEXT,
  conclusion TEXT,
  financial_impact DECIMAL(15,2),
  is_escalated BOOLEAN DEFAULT false,
  escalated_to VARCHAR(200),
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. USER BEHAVIOR PROFILES
CREATE TABLE IF NOT EXISTS ai_user_behavior_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  full_name VARCHAR(200),
  email VARCHAR(200),
  department VARCHAR(200),
  role_name VARCHAR(200),
  baseline_login_hours JSONB,  -- typical login hour distribution
  baseline_access_patterns JSONB,  -- typical module access patterns
  baseline_file_activity JSONB,  -- typical download/upload patterns
  baseline_working_hours JSONB,  -- typical working hours
  baseline_geo_locations JSONB,  -- typical login locations
  baseline_approval_activity JSONB,  -- typical approval patterns
  avg_session_duration INTEGER,  -- seconds
  avg_daily_logins DECIMAL(5,2),
  avg_daily_downloads DECIMAL(5,2),
  avg_daily_uploads DECIMAL(5,2),
  risk_score DECIMAL(5,2) DEFAULT 0,
  risk_level VARCHAR(50) DEFAULT 'low',
  last_analyzed_at TIMESTAMP,
  profile_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  profile_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- 4. BEHAVIOR EVENTS
CREATE TABLE IF NOT EXISTS ai_behavior_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(200),
  department VARCHAR(200),
  event_type VARCHAR(100) NOT NULL,  -- login, logout, file_download, file_upload, data_export, approval, permission_change, sensitive_access
  module VARCHAR(100),
  action VARCHAR(200),
  resource_type VARCHAR(100),
  resource_id VARCHAR(100),
  metadata JSONB,
  ip_address VARCHAR(50),
  device_fingerprint VARCHAR(200),
  geo_location VARCHAR(200),
  session_id VARCHAR(200),
  is_anomalous BOOLEAN DEFAULT false,
  anomaly_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. ANOMALY EVENTS
CREATE TABLE IF NOT EXISTS ai_anomaly_events (
  id SERIAL PRIMARY KEY,
  anomaly_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  anomaly_type VARCHAR(100) NOT NULL,  -- hr_anomaly, finance_anomaly, payroll_anomaly, procurement_anomaly, asset_anomaly, inventory_anomaly, user_activity_anomaly, access_anomaly
  severity VARCHAR(50) DEFAULT 'medium',
  anomaly_score DECIMAL(5,2),
  entity_type VARCHAR(100),
  entity_id VARCHAR(100),
  entity_name VARCHAR(300),
  department VARCHAR(200),
  module VARCHAR(100),
  expected_value TEXT,
  actual_value TEXT,
  deviation_percentage DECIMAL(10,2),
  indicators TEXT[],
  evidence JSONB,
  status VARCHAR(50) DEFAULT 'open',
  assigned_to UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. RISK SCORES (User, Department, Vendor, Company)
CREATE TABLE IF NOT EXISTS ai_risk_scores (
  id SERIAL PRIMARY KEY,
  score_type VARCHAR(50) NOT NULL,  -- user, department, vendor, company
  entity_id VARCHAR(100),
  entity_name VARCHAR(300),
  overall_score DECIMAL(5,2) DEFAULT 0,
  risk_level VARCHAR(50) DEFAULT 'low',
  login_risk DECIMAL(5,2) DEFAULT 0,
  fraud_risk DECIMAL(5,2) DEFAULT 0,
  behavior_risk DECIMAL(5,2) DEFAULT 0,
  compliance_risk DECIMAL(5,2) DEFAULT 0,
  threat_risk DECIMAL(5,2) DEFAULT 0,
  access_risk DECIMAL(5,2) DEFAULT 0,
  factors JSONB,  -- risk factor breakdown
  trend VARCHAR(50) DEFAULT 'stable',  -- increasing, decreasing, stable
  previous_score DECIMAL(5,2),
  score_change DECIMAL(5,2),
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  period_start TIMESTAMP,
  period_end TIMESTAMP
);

-- 7. SECURITY PREDICTIONS
CREATE TABLE IF NOT EXISTS ai_security_predictions (
  id SERIAL PRIMARY KEY,
  prediction_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  prediction_type VARCHAR(100) NOT NULL,  -- security_incident, fraud_attempt, compliance_failure, asset_failure, insider_threat
  predicted_entity_type VARCHAR(100),
  predicted_entity_id VARCHAR(100),
  predicted_entity_name VARCHAR(300),
  probability DECIMAL(5,2),  -- 0-100
  severity VARCHAR(50),
  timeframe VARCHAR(100),  -- next_24h, next_7d, next_30d, next_quarter
  factors TEXT[],
  evidence_summary TEXT,
  recommendation TEXT,
  status VARCHAR(50) DEFAULT 'active',  -- active, realized, false_prediction, expired
  realized_at TIMESTAMP,
  accuracy DECIMAL(5,2),  -- tracked for ML improvement
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. AI RECOMMENDATIONS
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id SERIAL PRIMARY KEY,
  recommendation_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  recommendation_type VARCHAR(100) NOT NULL,  -- enable_mfa, restrict_permissions, review_activity, lock_account, increase_approval, security_training, policy_update
  priority VARCHAR(50) DEFAULT 'medium',  -- low, medium, high, critical
  category VARCHAR(100),  -- authentication, authorization, monitoring, compliance, training
  target_entity_type VARCHAR(100),
  target_entity_id VARCHAR(100),
  target_entity_name VARCHAR(300),
  risk_score DECIMAL(5,2),
  impact TEXT,
  effort VARCHAR(50),  -- low, medium, high
  implementation_steps TEXT[],
  status VARCHAR(50) DEFAULT 'open',  -- open, in_progress, implemented, dismissed
  implemented_at TIMESTAMP,
  dismissed_reason TEXT,
  source VARCHAR(100),  -- ai_engine, manual
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. THREAT CORRELATIONS
CREATE TABLE IF NOT EXISTS ai_threat_correlations (
  id SERIAL PRIMARY KEY,
  correlation_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  correlation_type VARCHAR(100) NOT NULL,  -- attack_chain, behavioral_cluster, temporal_cluster, geo_cluster
  severity VARCHAR(50),
  risk_score DECIMAL(5,2),
  related_events TEXT[],  -- event_ids
  related_anomalies TEXT[],  -- anomaly_ids
  related_detections TEXT[],  -- detection_ids
  entities TEXT[],  -- involved entity IDs
  users TEXT[],  -- involved users
  ip_addresses TEXT[],
  timeline JSONB,
  attack_pattern TEXT,
  recommendation TEXT,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. VENDOR RISK PROFILES
CREATE TABLE IF NOT EXISTS ai_vendor_risk_profiles (
  id SERIAL PRIMARY KEY,
  vendor_id VARCHAR(100) UNIQUE NOT NULL,
  vendor_name VARCHAR(300) NOT NULL,
  risk_score DECIMAL(5,2) DEFAULT 0,
  risk_level VARCHAR(50) DEFAULT 'low',
  invoice_anomaly_score DECIMAL(5,2) DEFAULT 0,
  delivery_anomaly_score DECIMAL(5,2) DEFAULT 0,
  procurement_anomaly_score DECIMAL(5,2) DEFAULT 0,
  contract_risk_score DECIMAL(5,2) DEFAULT 0,
  total_invoice_amount DECIMAL(15,2),
  invoice_count INTEGER DEFAULT 0,
  average_invoice_amount DECIMAL(15,2),
  payment_delay_avg INTEGER,  -- days
  flags TEXT[],  -- risk flags
  last_assessed_at TIMESTAMP,
  profile_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. INSIDER THREATS
CREATE TABLE IF NOT EXISTS ai_insider_threats (
  id SERIAL PRIMARY KEY,
  threat_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  threat_type VARCHAR(100) NOT NULL,  -- excessive_download, unauthorized_export, sensitive_access, privilege_abuse, data_theft, boundary_violation
  severity VARCHAR(50) DEFAULT 'medium',
  risk_score DECIMAL(5,2),
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(200),
  department VARCHAR(200),
  role_name VARCHAR(200),
  indicators TEXT[],
  evidence JSONB,
  resource_accessed TEXT,
  activity_count INTEGER DEFAULT 0,
  time_window_hours INTEGER,
  status VARCHAR(50) DEFAULT 'open',  -- open, investigating, confirmed, false_positive, mitigated
  action_taken TEXT,
  assigned_to UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. SECURITY AUTOMATION ACTIONS
CREATE TABLE IF NOT EXISTS ai_security_automation (
  id SERIAL PRIMARY KEY,
  action_id VARCHAR(50) UNIQUE NOT NULL,
  action_type VARCHAR(100) NOT NULL,  -- account_lock, session_terminate, permission_suspend, device_block, alert_escalate, mfa_challenge
  trigger_source VARCHAR(100),  -- fraud_detection, anomaly_detection, insider_threat, risk_score, prediction
  trigger_id VARCHAR(50),
  trigger_reason TEXT,
  target_entity_type VARCHAR(100),
  target_entity_id VARCHAR(100),
  target_entity_name VARCHAR(300),
  status VARCHAR(50) DEFAULT 'pending',  -- pending, executed, failed, rolled_back
  executed_at TIMESTAMP,
  execution_result TEXT,
  initiated_by VARCHAR(100),  -- ai_engine, manual, rule
  approved_by UUID REFERENCES users(id),
  rollback_action TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. INVESTIGATION ASSISTANT
CREATE TABLE IF NOT EXISTS ai_investigation_assistant (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(50) UNIQUE NOT NULL,
  case_type VARCHAR(100) NOT NULL,  -- fraud, insider_threat, anomaly, security_incident
  case_id VARCHAR(50),
  title VARCHAR(500),
  summary TEXT,
  timeline JSONB,
  key_entities JSONB,
  root_cause_suggestions TEXT[],
  recommended_actions TEXT[],
  evidence_summary TEXT,
  risk_assessment TEXT,
  ai_confidence DECIMAL(5,2),
  generated_by VARCHAR(100) DEFAULT 'ai_engine',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. CONTINUOUS VERIFICATION LOG
CREATE TABLE IF NOT EXISTS ai_continuous_verification (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  session_id VARCHAR(200),
  verification_type VARCHAR(100) NOT NULL,  -- re_auth, mfa_challenge, device_check, behavior_check
  trigger_reason VARCHAR(300),
  risk_score DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'pending',  -- pending, passed, failed, timeout
  verified_at TIMESTAMP,
  ip_address VARCHAR(50),
  device_fingerprint VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. SECURITY HEATMAP DATA
CREATE TABLE IF NOT EXISTS ai_security_heatmaps (
  id SERIAL PRIMARY KEY,
  heatmap_type VARCHAR(100) NOT NULL,  -- user_risk, department_risk, location_threat, threat_concentration
  dimension VARCHAR(200),  -- user_id, department, location, module
  dimension_label VARCHAR(300),
  risk_score DECIMAL(5,2),
  risk_level VARCHAR(50),
  event_count INTEGER DEFAULT 0,
  severity_distribution JSONB,
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_fraud_type ON ai_fraud_detections(fraud_type);
CREATE INDEX IF NOT EXISTS idx_ai_fraud_severity ON ai_fraud_detections(severity);
CREATE INDEX IF NOT EXISTS idx_ai_fraud_status ON ai_fraud_detections(status);
CREATE INDEX IF NOT EXISTS idx_ai_fraud_entity ON ai_fraud_detections(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_behavior_user ON ai_behavior_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_behavior_type ON ai_behavior_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ai_behavior_anomalous ON ai_behavior_events(is_anomalous);
CREATE INDEX IF NOT EXISTS idx_ai_anomaly_type ON ai_anomaly_events(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_ai_anomaly_severity ON ai_anomaly_events(severity);
CREATE INDEX IF NOT EXISTS idx_ai_risk_type ON ai_risk_scores(score_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_type ON ai_security_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_status ON ai_security_predictions(status);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_type ON ai_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_status ON ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ai_threat_correlations_type ON ai_threat_correlations(correlation_type);
CREATE INDEX IF NOT EXISTS idx_ai_insider_user ON ai_insider_threats(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insider_type ON ai_insider_threats(threat_type);
CREATE INDEX IF NOT EXISTS idx_ai_insider_severity ON ai_insider_threats(severity);
CREATE INDEX IF NOT EXISTS idx_ai_automation_status ON ai_security_automation(status);
CREATE INDEX IF NOT EXISTS idx_ai_automation_trigger ON ai_security_automation(trigger_source);
CREATE INDEX IF NOT EXISTS idx_ai_heatmap_type ON ai_security_heatmaps(heatmap_type);

-- Seed fraud detection rules / patterns (for reference)
-- These descriptors help the AI engine categorize detections
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running Security Phase 7 migration (AI Security Intelligence)...');
    await client.query(migration);
    console.log('Phase 7 migration completed successfully.');
    console.log('Tables created: ai_fraud_detections, ai_fraud_cases, ai_user_behavior_profiles, ai_behavior_events, ai_anomaly_events, ai_risk_scores, ai_security_predictions, ai_recommendations, ai_threat_correlations, ai_vendor_risk_profiles, ai_insider_threats, ai_security_automation, ai_investigation_assistant, ai_continuous_verification, ai_security_heatmaps');
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
