const { Pool } = require('pg');
const { getPoolConfig } = require('../config/poolConfig');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool(getPoolConfig());

const schema = `
-- ============================================================
-- COMPANIES (Multi-company / Multi-tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_code VARCHAR(50) NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  tax_id VARCHAR(100),
  registration_number VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  logo_url VARCHAR(500),
  branding_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  subscription_plan VARCHAR(50) DEFAULT 'enterprise',
  subscription_start TIMESTAMP,
  subscription_end TIMESTAMP,
  max_users INTEGER DEFAULT 100,
  max_branches INTEGER DEFAULT 10,
  storage_limit BIGINT DEFAULT 1073741824,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BRANCHES (Branch/Regional management)
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_code VARCHAR(50) NOT NULL,
  branch_name VARCHAR(255) NOT NULL,
  branch_type VARCHAR(50) DEFAULT 'office',
  parent_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  manager_id UUID REFERENCES employee_profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  opening_date DATE,
  timezone VARCHAR(50) DEFAULT 'UTC',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, branch_code)
);

-- ============================================================
-- COMPANY USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS company_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  is_company_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, company_id)
);

-- ============================================================
-- COMPLIANCE FRAMEWORKS
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_frameworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  version VARCHAR(20) DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- COMPLIANCE REQUIREMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  framework_id UUID NOT NULL REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
  requirement_code VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  risk_level VARCHAR(20) DEFAULT 'medium',
  due_date DATE,
  assigned_to UUID REFERENCES employee_profiles(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending',
  score DECIMAL(5,2) DEFAULT 0,
  evidence_required BOOLEAN DEFAULT false,
  evidence_url TEXT[],
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES employee_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- COMPLIANCE AUDITS
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  framework_id UUID REFERENCES compliance_frameworks(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  audit_type VARCHAR(50) NOT NULL,
  auditor_name VARCHAR(255),
  audit_date DATE,
  score DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'scheduled',
  findings TEXT,
  recommendations TEXT,
  remedial_actions TEXT,
  next_audit_date DATE,
  created_by UUID REFERENCES employee_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- AI ANALYTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  analysis_type VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  confidence_score DECIMAL(5,2),
  severity VARCHAR(20),
  data_source TEXT,
  input_data JSONB,
  result_data JSONB,
  recommendations JSONB,
  is_actioned BOOLEAN DEFAULT false,
  actioned_by UUID REFERENCES employee_profiles(id) ON DELETE SET NULL,
  actioned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- ============================================================
-- AI MODELS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  model_type VARCHAR(100) NOT NULL,
  target_variable VARCHAR(255),
  features JSONB,
  parameters JSONB,
  accuracy DECIMAL(5,2),
  training_status VARCHAR(50) DEFAULT 'untrained',
  last_trained_at TIMESTAMP,
  next_training_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- WORKFLOW DEFINITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL,
  trigger_config JSONB,
  steps JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES employee_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- WORKFLOW INSTANCES
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  reference_type VARCHAR(100),
  reference_id UUID,
  status VARCHAR(50) DEFAULT 'pending',
  current_step INTEGER DEFAULT 0,
  steps_data JSONB,
  initiated_by UUID REFERENCES employee_profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- RISK ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  risk_type VARCHAR(100) NOT NULL,
  description TEXT,
  probability VARCHAR(20) DEFAULT 'medium',
  impact VARCHAR(20) DEFAULT 'medium',
  risk_score INTEGER,
  status VARCHAR(50) DEFAULT 'identified',
  mitigation_strategy TEXT,
  contingency_plan TEXT,
  owner_id UUID REFERENCES employee_profiles(id) ON DELETE SET NULL,
  review_date DATE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES employee_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- POLICIES
-- ============================================================
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  policy_code VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'draft',
  effective_date DATE,
  expiry_date DATE,
  approved_by UUID REFERENCES employee_profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  created_by UUID REFERENCES employee_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- POLICY ACKNOWLEDGEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_acknowledgements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(policy_id, employee_id)
);

-- ============================================================
-- FORECAST RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS forecast_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  forecast_type VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL,
  period VARCHAR(20),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  predicted_value DECIMAL(15,2),
  actual_value DECIMAL(15,2),
  confidence_lower DECIMAL(15,2),
  confidence_upper DECIMAL(15,2),
  accuracy DECIMAL(5,2),
  model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
  features_used JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ENTERPRISE SEARCH INDEX
-- ============================================================
CREATE TABLE IF NOT EXISTS enterprise_search_index (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  keywords TEXT[],
  tags TEXT[],
  url VARCHAR(500),
  search_vector TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- API GATEWAY KEYS
-- ============================================================
CREATE TABLE IF NOT EXISTS api_gateway_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) NOT NULL UNIQUE,
  api_secret VARCHAR(255),
  permissions JSONB DEFAULT '[]',
  ip_whitelist TEXT[],
  rate_limit INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- API GATEWAY LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS api_gateway_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID REFERENCES api_gateway_keys(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  response_time_ms INTEGER,
  request_body TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- DATA GOVERNANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS data_governance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  entity_type VARCHAR(100) NOT NULL,
  retention_days INTEGER NOT NULL,
  legal_hold BOOLEAN DEFAULT false,
  legal_hold_reason TEXT,
  archive_after_days INTEGER,
  purge_after_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, entity_type)
);

-- ============================================================
-- NOTIFICATION ORCHESTRATOR
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_orchestrator (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  trigger_event VARCHAR(100) NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  channels TEXT[] NOT NULL,
  escalation_minutes INTEGER,
  escalation_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  template_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_branches_company ON branches(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_company ON compliance_frameworks(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_framework ON compliance_requirements(framework_id);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_status ON compliance_requirements(status);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_company ON compliance_audits(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_company ON ai_analytics(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_type ON ai_analytics(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_module ON ai_analytics(module);
CREATE INDEX IF NOT EXISTS idx_ai_models_company ON ai_models(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_company ON workflow_definitions(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow ON workflow_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_company ON risk_assessments(company_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_type ON risk_assessments(risk_type);
CREATE INDEX IF NOT EXISTS idx_policies_company ON policies(company_id);
CREATE INDEX IF NOT EXISTS idx_policy_acknowledgements_employee ON policy_acknowledgements(employee_id);
CREATE INDEX IF NOT EXISTS idx_forecast_records_company ON forecast_records(company_id);
CREATE INDEX IF NOT EXISTS idx_forecast_records_type ON forecast_records(forecast_type);
CREATE INDEX IF NOT EXISTS idx_enterprise_search_company ON enterprise_search_index(company_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_search_entity ON enterprise_search_index(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_api_gateway_keys_company ON api_gateway_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_api_gateway_logs_key ON api_gateway_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_gateway_logs_company ON api_gateway_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_data_governance_company ON data_governance(company_id);
CREATE INDEX IF NOT EXISTS idx_notification_orchestrator_company ON notification_orchestrator(company_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_search_vector ON enterprise_search_index USING gin(to_tsvector('english', search_vector));
`;

async function migrate() {
  try {
    console.log('Running Enterprise AI/Compliance/Multi-Company/Scaling module migration...');
    await pool.query(schema);
    console.log('Enterprise AI/Compliance/Multi-Company/Scaling module migration completed successfully.');
    console.log('Tables: companies, branches, company_users, compliance_frameworks, compliance_requirements, compliance_audits, ai_analytics, ai_models, workflow_definitions, workflow_instances, risk_assessments, policies, policy_acknowledgements, forecast_records, enterprise_search_index, api_gateway_keys, api_gateway_logs, data_governance, notification_orchestrator');
    process.exit(0);
  } catch (err) {
    console.error('Enterprise AI/Compliance/Multi-Company/Scaling module migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
