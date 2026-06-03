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
-- SECURITY PHASE 6: Enterprise GRC, Audit, Policy, Access Review
-- ============================================================

-- 1. POLICIES & POLICY VERSIONS
CREATE TABLE IF NOT EXISTS grc_policies (
  id SERIAL PRIMARY KEY,
  policy_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  policy_type VARCHAR(100) NOT NULL,  -- hr, security, it, procurement, finance, data_privacy
  category VARCHAR(100),
  owner_id UUID REFERENCES users(id),
  owner_name VARCHAR(200),
  department VARCHAR(200),
  scope TEXT,
  purpose TEXT,
  content TEXT,
  status VARCHAR(50) DEFAULT 'draft',  -- draft, pending_approval, published, retired
  version INTEGER DEFAULT 1,
  is_current_version BOOLEAN DEFAULT true,
  effective_date TIMESTAMP,
  expiry_date TIMESTAMP,
  published_date TIMESTAMP,
  retired_date TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_by_name VARCHAR(200),
  updated_by UUID REFERENCES users(id),
  approval_status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, rejected
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grc_policy_versions (
  id SERIAL PRIMARY KEY,
  policy_id VARCHAR(50) REFERENCES grc_policies(policy_id),
  title VARCHAR(500) NOT NULL,
  content TEXT,
  version INTEGER NOT NULL,
  change_summary TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_by_name VARCHAR(200),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. POLICY ACKNOWLEDGMENTS
CREATE TABLE IF NOT EXISTS grc_policy_acknowledgments (
  id SERIAL PRIMARY KEY,
  policy_id VARCHAR(50) REFERENCES grc_policies(policy_id),
  user_id UUID REFERENCES users(id),
  employee_name VARCHAR(200),
  department VARCHAR(200),
  policy_version INTEGER,
  acknowledged BOOLEAN DEFAULT false,
  accepted_at TIMESTAMP,
  ip_address VARCHAR(50),
  user_agent TEXT,
  signature_type VARCHAR(50),  -- electronic, digital, manual
  acknowledged_content TEXT,
  is_re_acknowledgment BOOLEAN DEFAULT false,
  previous_acknowledgment_id INTEGER REFERENCES grc_policy_acknowledgments(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(policy_id, user_id, policy_version)
);

-- 3. AUDITS
CREATE TABLE IF NOT EXISTS grc_audits (
  id SERIAL PRIMARY KEY,
  audit_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  audit_type VARCHAR(100) NOT NULL,  -- internal, external, financial, security, hr, procurement
  scope TEXT,
  objectives TEXT,
  scope_departments TEXT[],
  status VARCHAR(50) DEFAULT 'planned',  -- planned, in_progress, completed, cancelled
  priority VARCHAR(50) DEFAULT 'medium',  -- low, medium, high, critical
  lead_auditor_id UUID REFERENCES users(id),
  lead_auditor_name VARCHAR(200),
  audit_team TEXT[],
  scheduled_start_date TIMESTAMP,
  scheduled_end_date TIMESTAMP,
  actual_start_date TIMESTAMP,
  actual_end_date TIMESTAMP,
  audited_entity VARCHAR(300),
  regulatory_reference VARCHAR(300),
  findings_count INTEGER DEFAULT 0,
  critical_findings INTEGER DEFAULT 0,
  high_findings INTEGER DEFAULT 0,
  medium_findings INTEGER DEFAULT 0,
  low_findings INTEGER DEFAULT 0,
  overall_rating VARCHAR(50),  -- excellent, good, satisfactory, needs_improvement, poor
  summary TEXT,
  report_url TEXT,
  created_by UUID REFERENCES users(id),
  created_by_name VARCHAR(200),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. AUDIT FINDINGS
CREATE TABLE IF NOT EXISTS grc_audit_findings (
  id SERIAL PRIMARY KEY,
  audit_id VARCHAR(50) REFERENCES grc_audits(audit_id),
  finding_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  severity VARCHAR(50) NOT NULL,  -- critical, high, medium, low, informational
  finding_type VARCHAR(100),  -- control_gap, non_compliance, process_gap, policy_violation, security_issue
  category VARCHAR(100),
  root_cause TEXT,
  impact TEXT,
  recommendation TEXT,
  status VARCHAR(50) DEFAULT 'open',  -- open, in_progress, resolved, verified, closed
  assigned_to UUID REFERENCES users(id),
  assigned_to_name VARCHAR(200),
  due_date TIMESTAMP,
  resolved_date TIMESTAMP,
  resolution_notes TEXT,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  evidence_links TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. CORRECTIVE ACTIONS
CREATE TABLE IF NOT EXISTS grc_corrective_actions (
  id SERIAL PRIMARY KEY,
  action_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  source_type VARCHAR(100),  -- audit_finding, security_finding, compliance_gap, policy_violation, risk_finding
  source_id VARCHAR(50),
  source_reference VARCHAR(300),
  severity VARCHAR(50),
  category VARCHAR(100),
  action_type VARCHAR(100),  -- corrective, preventive, remedial
  status VARCHAR(50) DEFAULT 'open',  -- open, in_progress, completed, verified, closed
  priority VARCHAR(50) DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id),
  assigned_to_name VARCHAR(200),
  due_date TIMESTAMP,
  completed_date TIMESTAMP,
  completion_notes TEXT,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  verification_notes TEXT,
  effectiveness_rating VARCHAR(50),
  evidence_links TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. RISK REGISTER
CREATE TABLE IF NOT EXISTS grc_risks (
  id SERIAL PRIMARY KEY,
  risk_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  risk_category VARCHAR(100) NOT NULL,  -- operational, financial, security, compliance, procurement, vendor, strategic, reputational
  sub_category VARCHAR(100),
  risk_source TEXT,
  department VARCHAR(200),
  owner_id UUID REFERENCES users(id),
  owner_name VARCHAR(200),
  inherent_likelihood INTEGER CHECK (inherent_likelihood BETWEEN 1 AND 5),
  inherent_impact INTEGER CHECK (inherent_impact BETWEEN 1 AND 5),
  inherent_risk_score DECIMAL(5,2),
  inherent_risk_level VARCHAR(50),  -- low, medium, high, critical
  residual_likelihood INTEGER CHECK (residual_likelihood BETWEEN 1 AND 5),
  residual_impact INTEGER CHECK (residual_impact BETWEEN 1 AND 5),
  residual_risk_score DECIMAL(5,2),
  residual_risk_level VARCHAR(50),
  target_likelihood INTEGER CHECK (target_likelihood BETWEEN 1 AND 5),
  target_impact INTEGER CHECK (target_impact BETWEEN 1 AND 5),
  target_risk_score DECIMAL(5,2),
  target_risk_level VARCHAR(50),
  status VARCHAR(50) DEFAULT 'identified',  -- identified, assessed, mitigated, monitored, closed
  treatment_strategy VARCHAR(100),  -- accept, mitigate, transfer, avoid
  mitigation_plan TEXT,
  mitigation_progress DECIMAL(5,2) DEFAULT 0,
  contingency_plan TEXT,
  control_effectiveness VARCHAR(50),  -- effective, partially_effective, ineffective
  is_tolerable BOOLEAN DEFAULT false,
  review_frequency VARCHAR(50),  -- monthly, quarterly, annually
  last_reviewed_at TIMESTAMP,
  next_review_date TIMESTAMP,
  tags TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. RISK ASSESSMENTS
CREATE TABLE IF NOT EXISTS grc_risk_assessments (
  id SERIAL PRIMARY KEY,
  assessment_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  risk_id VARCHAR(50) REFERENCES grc_risks(risk_id),
  assessment_type VARCHAR(100) DEFAULT 'periodic',  -- initial, periodic, ad_hoc, closure
  likelihood_score INTEGER CHECK (likelihood_score BETWEEN 1 AND 5),
  impact_score INTEGER CHECK (impact_score BETWEEN 1 AND 5),
  risk_score DECIMAL(5,2),
  risk_level VARCHAR(50),
  assessment_notes TEXT,
  control_assessment TEXT,
  assessor_id UUID REFERENCES users(id),
  assessor_name VARCHAR(200),
  assessed_at TIMESTAMP,
  next_assessment_date TIMESTAMP,
  findings TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. COMPLIANCE OBLIGATIONS
CREATE TABLE IF NOT EXISTS grc_compliance_obligations (
  id SERIAL PRIMARY KEY,
  obligation_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  obligation_type VARCHAR(100) NOT NULL,  -- tax, hr, payroll, insurance, procurement, data_protection, regulatory, licensing
  regulation_name VARCHAR(300),
  regulatory_body VARCHAR(300),
  jurisdiction VARCHAR(200),
  category VARCHAR(100),
  owner_id UUID REFERENCES users(id),
  owner_name VARCHAR(200),
  department VARCHAR(200),
  status VARCHAR(50) DEFAULT 'active',  -- active, pending, expired, non_compliant, under_review
  compliance_status VARCHAR(50) DEFAULT 'unknown',  -- compliant, non_compliant, partially_compliant, unknown, not_applicable
  compliance_score DECIMAL(5,2),
  last_assessed_at TIMESTAMP,
  next_assessment_date TIMESTAMP,
  due_date TIMESTAMP,
  reminder_days INTEGER DEFAULT 30,
  escalation_level INTEGER DEFAULT 0,
  evidence_required BOOLEAN DEFAULT false,
  evidence_links TEXT[],
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. COMPLIANCE RECORDS
CREATE TABLE IF NOT EXISTS grc_compliance_records (
  id SERIAL PRIMARY KEY,
  obligation_id VARCHAR(50) REFERENCES grc_compliance_obligations(obligation_id),
  record_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',  -- pending, in_progress, completed, failed
  score DECIMAL(5,2),
  assessed_by UUID REFERENCES users(id),
  assessed_by_name VARCHAR(200),
  assessed_at TIMESTAMP,
  findings TEXT,
  evidence_links TEXT[],
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. ACCESS REVIEWS & CERTIFICATIONS
CREATE TABLE IF NOT EXISTS grc_access_reviews (
  id SERIAL PRIMARY KEY,
  review_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  review_type VARCHAR(100) NOT NULL,  -- quarterly, annual, ad_hoc, triggered
  scope VARCHAR(300),
  status VARCHAR(50) DEFAULT 'planned',  -- planned, in_progress, completed, cancelled
  department VARCHAR(200),
  reviewer_id UUID REFERENCES users(id),
  reviewer_name VARCHAR(200),
  manager_id UUID REFERENCES users(id),
  manager_name VARCHAR(200),
  scheduled_start_date TIMESTAMP,
  scheduled_end_date TIMESTAMP,
  actual_start_date TIMESTAMP,
  actual_end_date TIMESTAMP,
  total_users INTEGER DEFAULT 0,
  reviewed_users INTEGER DEFAULT 0,
  flagged_users INTEGER DEFAULT 0,
  revoked_access INTEGER DEFAULT 0,
  findings TEXT[],
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. ACCESS REVIEW ENTRIES
CREATE TABLE IF NOT EXISTS grc_access_review_entries (
  id SERIAL PRIMARY KEY,
  review_id VARCHAR(50) REFERENCES grc_access_reviews(review_id),
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(200),
  user_email VARCHAR(200),
  department VARCHAR(200),
  role_name VARCHAR(200),
  current_permissions TEXT[],
  access_justification TEXT,
  review_decision VARCHAR(50) DEFAULT 'pending',  -- pending, approved, revoked, modified, flagged
  reviewer_id UUID REFERENCES users(id),
  reviewer_name VARCHAR(200),
  review_notes TEXT,
  reviewed_at TIMESTAMP,
  certification_status VARCHAR(50) DEFAULT 'uncertified',  -- certified, uncertified, pending_review
  certified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. SEGREGATION OF DUTIES (SoD) RULES
CREATE TABLE IF NOT EXISTS grc_sod_rules (
  id SERIAL PRIMARY KEY,
  rule_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  conflict_type VARCHAR(100) NOT NULL,  -- role_based, permission_based, function_based
  conflicting_permission_a VARCHAR(200),
  conflicting_permission_b VARCHAR(200),
  conflicting_role_a VARCHAR(200),
  conflicting_role_b VARCHAR(200),
  risk_level VARCHAR(50) DEFAULT 'high',  -- low, medium, high, critical
  mitigation_control TEXT,
  is_active BOOLEAN DEFAULT true,
  department VARCHAR(200),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. SoD VIOLATIONS
CREATE TABLE IF NOT EXISTS grc_sod_violations (
  id SERIAL PRIMARY KEY,
  violation_id VARCHAR(50) UNIQUE NOT NULL,
  rule_id VARCHAR(50) REFERENCES grc_sod_rules(rule_id),
  rule_title VARCHAR(500),
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(200),
  user_email VARCHAR(200),
  role_name VARCHAR(200),
  department VARCHAR(200),
  permission_a VARCHAR(200),
  permission_b VARCHAR(200),
  conflict_type VARCHAR(100),
  severity VARCHAR(50),
  status VARCHAR(50) DEFAULT 'open',  -- open, investigating, mitigated, accepted, closed
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  mitigation_action TEXT,
  exception_approved BOOLEAN DEFAULT false,
  exception_approved_by UUID REFERENCES users(id),
  exception_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. INVESTIGATIONS
CREATE TABLE IF NOT EXISTS grc_investigations (
  id SERIAL PRIMARY KEY,
  investigation_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  investigation_type VARCHAR(100) NOT NULL,  -- compliance, audit, policy_violation, security_violation, hr_issue, fraud
  source_type VARCHAR(100),  -- alert, report, finding, complaint
  source_id VARCHAR(50),
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'open',  -- open, in_progress, under_review, completed, closed
  lead_investigator_id UUID REFERENCES users(id),
  lead_investigator_name VARCHAR(200),
  investigation_team TEXT[],
  findings TEXT,
  conclusion TEXT,
  recommendations TEXT,
  evidence_summary TEXT,
  severity VARCHAR(50),
  outcome VARCHAR(200),
  closure_notes TEXT,
  confidentiality_level VARCHAR(50) DEFAULT 'confidential',  -- public, internal, confidential, restricted
  opened_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_date TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. INVESTIGATION EVIDENCE
CREATE TABLE IF NOT EXISTS grc_investigation_evidence (
  id SERIAL PRIMARY KEY,
  investigation_id VARCHAR(50) REFERENCES grc_investigations(investigation_id),
  title VARCHAR(500),
  evidence_type VARCHAR(100),  -- document, screenshot, log, email, statement, other
  description TEXT,
  file_url TEXT,
  evidence_data JSONB,
  submitted_by UUID REFERENCES users(id),
  submitted_by_name VARCHAR(200),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_key_evidence BOOLEAN DEFAULT false
);

-- 16. GOVERNANCE REPORTS
CREATE TABLE IF NOT EXISTS grc_governance_reports (
  id SERIAL PRIMARY KEY,
  report_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  report_type VARCHAR(100) NOT NULL,  -- compliance, audit, risk, policy, access_review, sod, governance_summary
  report_format VARCHAR(50),  -- pdf, excel, csv, html
  scope TEXT,
  parameters JSONB,
  summary JSONB,
  status VARCHAR(50) DEFAULT 'generated',
  generated_by UUID REFERENCES users(id),
  generated_by_name VARCHAR(200),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  file_url TEXT,
  is_scheduled BOOLEAN DEFAULT false,
  schedule_frequency VARCHAR(50),
  next_generation TIMESTAMP
);

-- 17. LEGAL HOLDS
CREATE TABLE IF NOT EXISTS grc_legal_holds (
  id SERIAL PRIMARY KEY,
  hold_id VARCHAR(50) UNIQUE NOT NULL,
  case_name VARCHAR(500) NOT NULL,
  case_number VARCHAR(200),
  description TEXT,
  legal_authority VARCHAR(300),
  issued_by VARCHAR(300),
  custodian VARCHAR(300),
  scope TEXT,
  status VARCHAR(50) DEFAULT 'active',  -- active, released, expired
  issued_date TIMESTAMP,
  release_date TIMESTAMP,
  expiry_date TIMESTAMP,
  preservation_notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. RECORD RETENTION POLICIES
CREATE TABLE IF NOT EXISTS grc_retention_policies (
  id SERIAL PRIMARY KEY,
  policy_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  record_type VARCHAR(200) NOT NULL,
  description TEXT,
  retention_period_days INTEGER,
  retention_period VARCHAR(100),
  disposition_action VARCHAR(100),  -- delete, archive, transfer
  legal_hold_applicable BOOLEAN DEFAULT false,
  regulatory_reference VARCHAR(300),
  department VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. APPROVAL WORKFLOWS
CREATE TABLE IF NOT EXISTS grc_approval_workflows (
  id SERIAL PRIMARY KEY,
  workflow_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  workflow_type VARCHAR(100) NOT NULL,  -- permission_change, policy_update, payroll_release, vendor_onboarding, data_export
  status VARCHAR(50) DEFAULT 'pending',  -- pending, in_progress, approved, rejected, cancelled
  priority VARCHAR(50) DEFAULT 'medium',
  requester_id UUID REFERENCES users(id),
  requester_name VARCHAR(200),
  request_data JSONB,
  current_level INTEGER DEFAULT 1,
  total_levels INTEGER DEFAULT 1,
  approval_chain JSONB,
  expiry_date TIMESTAMP,
  notes TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20. APPROVAL WORKFLOW ACTIONS
CREATE TABLE IF NOT EXISTS grc_approval_actions (
  id SERIAL PRIMARY KEY,
  workflow_id VARCHAR(50) REFERENCES grc_approval_workflows(workflow_id),
  level INTEGER NOT NULL,
  approver_id UUID REFERENCES users(id),
  approver_name VARCHAR(200),
  action VARCHAR(50),  -- pending, approved, rejected, escalated
  comments TEXT,
  acted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 21. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS grc_notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  notification_type VARCHAR(100) NOT NULL,  -- policy_update, audit_schedule, compliance_deadline, access_review, risk_review, approval_required
  title VARCHAR(500) NOT NULL,
  message TEXT,
  priority VARCHAR(50) DEFAULT 'normal',
  channel VARCHAR(50) DEFAULT 'in_app',  -- in_app, email, sms, all
  status VARCHAR(50) DEFAULT 'pending',  -- pending, sent, read, dismissed
  reference_type VARCHAR(100),
  reference_id VARCHAR(50),
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 22. GOVERNANCE AUDIT LOG (Immutable)
CREATE TABLE IF NOT EXISTS grc_governance_audit_log (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(50) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,  -- policy_change, audit_activity, risk_update, compliance_action, governance_approval
  action VARCHAR(200) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(50),
  description TEXT,
  performed_by UUID REFERENCES users(id),
  performed_by_name VARCHAR(200),
  performed_by_role VARCHAR(200),
  ip_address VARCHAR(50),
  user_agent TEXT,
  previous_values JSONB,
  new_values JSONB,
  checksum VARCHAR(64),  -- SHA-256 hash for tamper detection
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 23. COMPLIANCE SCORE SNAPSHOTS
CREATE TABLE IF NOT EXISTS grc_compliance_scores (
  id SERIAL PRIMARY KEY,
  score_type VARCHAR(50) NOT NULL,  -- organization, department, employee
  entity_id VARCHAR(50),
  entity_name VARCHAR(200),
  compliance_score DECIMAL(5,2),
  policy_acceptance_rate DECIMAL(5,2),
  audit_findings_rate DECIMAL(5,2),
  risk_exposure_score DECIMAL(5,2),
  access_review_completion DECIMAL(5,2),
  training_completion_rate DECIMAL(5,2),
  overall_grade VARCHAR(10),  -- A, B, C, D, F
  total_policies INTEGER DEFAULT 0,
  accepted_policies INTEGER DEFAULT 0,
  open_findings INTEGER DEFAULT 0,
  open_risks INTEGER DEFAULT 0,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  period_start TIMESTAMP,
  period_end TIMESTAMP
);

-- 24. COMPLIANCE CALENDAR
CREATE TABLE IF NOT EXISTS grc_compliance_calendar (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  event_type VARCHAR(100) NOT NULL,  -- deadline, audit, review, renewal, reporting, training
  event_date TIMESTAMP NOT NULL,
  reminder_days INTEGER DEFAULT 30,
  escalation_days INTEGER DEFAULT 7,
  status VARCHAR(50) DEFAULT 'upcoming',  -- upcoming, due, overdue, completed, cancelled
  assigned_to UUID REFERENCES users(id),
  assigned_to_name VARCHAR(200),
  department VARCHAR(200),
  obligation_id VARCHAR(50),
  completed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grc_policies_type ON grc_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_grc_policies_status ON grc_policies(status);
CREATE INDEX IF NOT EXISTS idx_grc_policies_owner ON grc_policies(owner_id);
CREATE INDEX IF NOT EXISTS idx_grc_policy_versions_policy ON grc_policy_versions(policy_id);
CREATE INDEX IF NOT EXISTS idx_grc_policy_ack_user ON grc_policy_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_grc_policy_ack_policy ON grc_policy_acknowledgments(policy_id);
CREATE INDEX IF NOT EXISTS idx_grc_policy_ack_status ON grc_policy_acknowledgments(acknowledged);
CREATE INDEX IF NOT EXISTS idx_grc_audits_type ON grc_audits(audit_type);
CREATE INDEX IF NOT EXISTS idx_grc_audits_status ON grc_audits(status);
CREATE INDEX IF NOT EXISTS idx_grc_audits_lead ON grc_audits(lead_auditor_id);
CREATE INDEX IF NOT EXISTS idx_grc_audit_findings_audit ON grc_audit_findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_grc_audit_findings_status ON grc_audit_findings(status);
CREATE INDEX IF NOT EXISTS idx_grc_audit_findings_severity ON grc_audit_findings(severity);
CREATE INDEX IF NOT EXISTS idx_grc_corrective_actions_source ON grc_corrective_actions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_grc_corrective_actions_status ON grc_corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_grc_risks_category ON grc_risks(risk_category);
CREATE INDEX IF NOT EXISTS idx_grc_risks_level ON grc_risks(residual_risk_level);
CREATE INDEX IF NOT EXISTS idx_grc_risks_owner ON grc_risks(owner_id);
CREATE INDEX IF NOT EXISTS idx_grc_risk_assessments_risk ON grc_risk_assessments(risk_id);
CREATE INDEX IF NOT EXISTS idx_grc_compliance_obligations_type ON grc_compliance_obligations(obligation_type);
CREATE INDEX IF NOT EXISTS idx_grc_compliance_obligations_status ON grc_compliance_obligations(status);
CREATE INDEX IF NOT EXISTS idx_grc_compliance_records_obligation ON grc_compliance_records(obligation_id);
CREATE INDEX IF NOT EXISTS idx_grc_access_reviews_status ON grc_access_reviews(status);
CREATE INDEX IF NOT EXISTS idx_grc_access_review_entries_review ON grc_access_review_entries(review_id);
CREATE INDEX IF NOT EXISTS idx_grc_access_review_entries_user ON grc_access_review_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_grc_sod_rules_active ON grc_sod_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_grc_sod_violations_status ON grc_sod_violations(status);
CREATE INDEX IF NOT EXISTS idx_grc_sod_violations_user ON grc_sod_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_grc_investigations_status ON grc_investigations(status);
CREATE INDEX IF NOT EXISTS idx_grc_investigations_type ON grc_investigations(investigation_type);
CREATE INDEX IF NOT EXISTS idx_grc_investigation_evidence_inv ON grc_investigation_evidence(investigation_id);
CREATE INDEX IF NOT EXISTS idx_grc_governance_reports_type ON grc_governance_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_grc_legal_holds_status ON grc_legal_holds(status);
CREATE INDEX IF NOT EXISTS idx_grc_retention_policies_active ON grc_retention_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_grc_approval_workflows_status ON grc_approval_workflows(status);
CREATE INDEX IF NOT EXISTS idx_grc_approval_workflows_type ON grc_approval_workflows(workflow_type);
CREATE INDEX IF NOT EXISTS idx_grc_approval_actions_workflow ON grc_approval_actions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_grc_notifications_user ON grc_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_grc_notifications_status ON grc_notifications(status);
CREATE INDEX IF NOT EXISTS idx_grc_gov_audit_log_type ON grc_governance_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_grc_gov_audit_log_entity ON grc_governance_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_grc_gov_audit_log_performed ON grc_governance_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_grc_compliance_scores_type ON grc_compliance_scores(score_type);
CREATE INDEX IF NOT EXISTS idx_grc_compliance_calendar_date ON grc_compliance_calendar(event_date);
CREATE INDEX IF NOT EXISTS idx_grc_compliance_calendar_status ON grc_compliance_calendar(status);

-- Seed SOD Rules
INSERT INTO grc_sod_rules (rule_id, title, description, conflict_type, conflicting_permission_a, conflicting_permission_b, risk_level, department) VALUES
('SOD001', 'Payroll Creation & Approval', 'Same user cannot both create and approve payroll', 'function_based', 'payroll_create', 'payroll_approve', 'critical', 'Finance'),
('SOD002', 'Procurement Creation & Approval', 'Same user cannot both create and approve purchase orders', 'function_based', 'procurement_create', 'procurement_approve', 'critical', 'Procurement'),
('SOD003', 'User Creation & Permission Approval', 'Same user cannot create users and approve their permissions', 'function_based', 'user_create', 'permission_approve', 'critical', 'Admin'),
('SOD004', 'Payment Initiation & Approval', 'Same user cannot initiate and approve payments', 'function_based', 'payment_initiate', 'payment_approve', 'critical', 'Finance'),
('SOD005', 'Vendor Registration & Approval', 'Same user cannot register and approve vendors', 'function_based', 'vendor_create', 'vendor_approve', 'high', 'Procurement'),
('SOD006', 'Budget Creation & Approval', 'Same user cannot create and approve budgets', 'function_based', 'budget_create', 'budget_approve', 'high', 'Finance'),
('SOD007', 'Inventory Adjustment & Audit', 'Same user cannot adjust inventory and audit it', 'function_based', 'inventory_adjust', 'inventory_audit', 'high', 'Inventory'),
('SOD008', 'Expense Submission & Approval', 'Same user cannot submit and approve expenses', 'function_based', 'expense_submit', 'expense_approve', 'medium', 'Finance')
ON CONFLICT (rule_id) DO NOTHING;

-- Seed Retention Policies
INSERT INTO grc_retention_policies (policy_id, title, record_type, retention_period_days, disposition_action, department) VALUES
('RET001', 'Employee Records', 'HR Records', 2555, 'archive', 'HR'),
('RET002', 'Payroll Records', 'Payroll', 1825, 'archive', 'Finance'),
('RET003', 'Financial Transactions', 'Finance', 2555, 'archive', 'Finance'),
('RET004', 'Audit Records', 'Audit', 3650, 'archive', 'Admin'),
('RET005', 'Tax Records', 'Tax', 2555, 'archive', 'Finance'),
('RET006', 'Contract Documents', 'Legal', 3650, 'archive', 'Legal'),
('RET007', 'Email Communications', 'Communications', 730, 'delete', 'All'),
('RET008', 'System Logs', 'IT', 365, 'delete', 'IT')
ON CONFLICT (policy_id) DO NOTHING;

-- Seed Compliance Calendar Events
INSERT INTO grc_compliance_calendar (event_id, title, description, event_type, event_date, reminder_days, status, department) VALUES
('CAL001', 'Quarterly Tax Filing', 'Quarterly corporate tax return submission', 'deadline', CURRENT_TIMESTAMP + INTERVAL '30 days', 30, 'upcoming', 'Finance'),
('CAL002', 'Insurance Renewal', 'Annual insurance policy renewal', 'renewal', CURRENT_TIMESTAMP + INTERVAL '45 days', 30, 'upcoming', 'Admin'),
('CAL003', 'Annual Audit', 'Annual financial audit by external auditors', 'audit', CURRENT_TIMESTAMP + INTERVAL '90 days', 60, 'upcoming', 'Finance'),
('CAL004', 'SOC 2 Certification Renewal', 'Annual SOC 2 Type II certification renewal', 'renewal', CURRENT_TIMESTAMP + INTERVAL '120 days', 60, 'upcoming', 'Admin'),
('CAL005', 'Quarterly Access Review', 'Quarterly user access review and certification', 'review', CURRENT_TIMESTAMP + INTERVAL '14 days', 14, 'upcoming', 'Admin'),
('CAL006', 'GDPR Compliance Report', 'Annual GDPR compliance report submission', 'reporting', CURRENT_TIMESTAMP + INTERVAL '180 days', 60, 'upcoming', 'Admin'),
('CAL007', 'Employee Training Completion', 'Annual security awareness training deadline', 'training', CURRENT_TIMESTAMP + INTERVAL '60 days', 30, 'upcoming', 'HR'),
('CAL008', 'Data Protection Impact Assessment', 'Annual DPIA review and update', 'review', CURRENT_TIMESTAMP + INTERVAL '90 days', 45, 'upcoming', 'Admin')
ON CONFLICT (event_id) DO NOTHING;

-- Initial seed data for compliance obligations
INSERT INTO grc_compliance_obligations (obligation_id, title, description, obligation_type, regulation_name, regulatory_body, department, status, compliance_status, due_date, reminder_days) VALUES
('OBS001', 'Corporate Tax Filing', 'Annual corporate income tax return filing', 'tax', 'Internal Revenue Code', 'IRS', 'Finance', 'active', 'compliant', CURRENT_TIMESTAMP + INTERVAL '90 days', 45),
('OBS002', 'Payroll Tax Withholding', 'Monthly payroll tax withholding and remittance', 'payroll', 'Employment Tax Regulations', 'IRS', 'Finance', 'active', 'compliant', CURRENT_TIMESTAMP + INTERVAL '30 days', 15),
('OBS003', 'Employee Data Protection', 'GDPR compliance for employee personal data', 'data_protection', 'GDPR', 'Data Protection Authority', 'HR', 'active', 'compliant', CURRENT_TIMESTAMP + INTERVAL '180 days', 60),
('OBS004', 'Workplace Safety Compliance', 'OSHA workplace safety standards compliance', 'hr', 'Occupational Safety and Health Act', 'OSHA', 'HR', 'active', 'compliant', CURRENT_TIMESTAMP + INTERVAL '90 days', 30),
('OBS005', 'Financial Reporting', 'GAAP-compliant financial reporting', 'regulatory', 'GAAP Standards', 'SEC', 'Finance', 'active', 'compliant', CURRENT_TIMESTAMP + INTERVAL '90 days', 45),
('OBS006', 'Insurance Coverage', 'Required business insurance coverage maintenance', 'insurance', 'Insurance Regulations', 'State Insurance Dept', 'Admin', 'active', 'compliant', CURRENT_TIMESTAMP + INTERVAL '45 days', 30),
('OBS007', 'Procurement Compliance', 'Fair procurement practices compliance', 'procurement', 'Procurement Regulations', 'Regulatory Authority', 'Procurement', 'active', 'compliant', CURRENT_TIMESTAMP + INTERVAL '120 days', 45),
('OBS008', 'Data Breach Notification', 'Timely data breach notification compliance', 'data_protection', 'Data Breach Notification Laws', 'Data Protection Authority', 'Admin', 'active', 'compliant', CURRENT_TIMESTAMP + INTERVAL '365 days', 30)
ON CONFLICT (obligation_id) DO NOTHING;

-- Seed a compliance score snapshot
INSERT INTO grc_compliance_scores (score_type, entity_id, entity_name, compliance_score, policy_acceptance_rate, audit_findings_rate, risk_exposure_score, access_review_completion, overall_grade, total_policies, accepted_policies, open_findings, open_risks, period_start, period_end)
VALUES ('organization', 'ORG001', 'Enterprise ERP', 78.5, 72.0, 15.0, 35.0, 60.0, 'B', 25, 18, 12, 8, DATE_TRUNC('month', CURRENT_TIMESTAMP), DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month' - INTERVAL '1 day');
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running Security Phase 6 migration (GRC)...');
    await client.query(migration);
    console.log('Phase 6 migration completed successfully.');
    console.log('Tables created: grc_policies, grc_policy_versions, grc_policy_acknowledgments, grc_audits, grc_audit_findings, grc_corrective_actions, grc_risks, grc_risk_assessments, grc_compliance_obligations, grc_compliance_records, grc_access_reviews, grc_access_review_entries, grc_sod_rules, grc_sod_violations, grc_investigations, grc_investigation_evidence, grc_governance_reports, grc_legal_holds, grc_retention_policies, grc_approval_workflows, grc_approval_actions, grc_notifications, grc_governance_audit_log, grc_compliance_scores, grc_compliance_calendar');
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
