const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'erp_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

function generateId(prefix) {
  return `${prefix}${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function computeChecksum(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

async function logGovernanceAction({ eventType, action, entityType, entityId, description, performedBy, performedByName, performedByRole, ipAddress, userAgent, previousValues, newValues }) {
  const eventId = generateId('GEV');
  const logData = { eventType, action, entityType, entityId, description, performedBy, performedByName, performedByRole, previousValues, newValues };
  const checksum = computeChecksum(logData);
  try {
    await pool.query(
      `INSERT INTO grc_governance_audit_log (event_id, event_type, action, entity_type, entity_id, description, performed_by, performed_by_name, performed_by_role, ip_address, user_agent, previous_values, new_values, checksum)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [eventId, eventType, action, entityType, entityId, description, performedBy, performedByName, performedByRole, ipAddress, userAgent, previousValues ? JSON.stringify(previousValues) : null, newValues ? JSON.stringify(newValues) : null, checksum]
    );
  } catch (err) { console.error('Governance audit log error:', err.message); }
}

// ============= POLICIES =============

async function createPolicy({ title, description, policyType, category, ownerId, ownerName, department, scope, purpose, content, createdBy, createdByName }) {
  const policyId = generateId('POL');
  await pool.query(
    `INSERT INTO grc_policies (policy_id, title, description, policy_type, category, owner_id, owner_name, department, scope, purpose, content, status, version, created_by, created_by_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft',1,$12,$13)`,
    [policyId, title, description, policyType, category, ownerId, ownerName, department, scope, purpose, content, createdBy, createdByName]
  );
  await pool.query(
    `INSERT INTO grc_policy_versions (policy_id, title, content, version, status, created_by, created_by_name)
     VALUES ($1,$2,$3,1,'draft',$4,$5)`,
    [policyId, title, content, createdBy, createdByName]
  );
  await logGovernanceAction({ eventType: 'policy_change', action: 'CREATE_POLICY', entityType: 'policy', entityId: policyId, description: `Policy created: ${title}`, performedBy: createdBy, performedByName: createdByName });
  return { policyId };
}

async function getPolicies({ type, status, department, search, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM grc_policies WHERE 1=1';
  const params = [];
  if (type) { params.push(type); sql += ` AND policy_type=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (department) { params.push(department); sql += ` AND department=$${params.length}`; }
  if (search) { params.push(`%${search}%`); sql += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length})`; }
  sql += ' ORDER BY updated_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM grc_policies');
  return { data: rows, total: parseInt(countResult.rows[0].count) };
}

async function getPolicy(policyId) {
  const { rows } = await pool.query('SELECT * FROM grc_policies WHERE policy_id=$1', [policyId]);
  if (!rows[0]) throw new Error('Policy not found');
  const versions = await pool.query('SELECT * FROM grc_policy_versions WHERE policy_id=$1 ORDER BY version DESC', [policyId]);
  return { ...rows[0], versions: versions.rows };
}

async function updatePolicy(policyId, updates, userId, userName) {
  const old = await pool.query('SELECT * FROM grc_policies WHERE policy_id=$1', [policyId]);
  if (!old.rows[0]) throw new Error('Policy not found');
  const fields = [];
  const params = [policyId];
  let idx = 2;
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined && ['title', 'description', 'content', 'category', 'scope', 'purpose', 'status', 'owner_id', 'owner_name', 'department', 'effective_date', 'expiry_date'].includes(k)) {
      fields.push(`${k}=$${idx}`);
      params.push(v);
      idx++;
    }
  }
  if (fields.length) {
    fields.push('updated_at=CURRENT_TIMESTAMP');
    await pool.query(`UPDATE grc_policies SET ${fields.join(',')} WHERE policy_id=$1`, params);
  }
  if (updates.content) {
    const verResult = await pool.query('SELECT MAX(version) as v FROM grc_policy_versions WHERE policy_id=$1', [policyId]);
    const newVer = (verResult.rows[0].v || 0) + 1;
    await pool.query(
      `INSERT INTO grc_policy_versions (policy_id, title, content, version, status, created_by, created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [policyId, updates.title || old.rows[0].title, updates.content, newVer, updates.status || old.rows[0].status, userId, userName]
    );
  }
  await logGovernanceAction({ eventType: 'policy_change', action: 'UPDATE_POLICY', entityType: 'policy', entityId: policyId, description: `Policy updated: ${updates.title || old.rows[0].title}`, performedBy: userId, performedByName: userName, previousValues: old.rows[0], newValues: updates });
  return { success: true };
}

async function publishPolicy(policyId, userId, userName) {
  const old = await pool.query('SELECT * FROM grc_policies WHERE policy_id=$1', [policyId]);
  if (!old.rows[0]) throw new Error('Policy not found');
  await pool.query(
    `UPDATE grc_policies SET status='published', published_date=CURRENT_TIMESTAMP, approval_status='approved', approved_by=$2, approved_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE policy_id=$1`,
    [policyId, userId]
  );
  await pool.query(
    `UPDATE grc_policy_versions SET status='published', approved_by=$2, approved_at=CURRENT_TIMESTAMP WHERE policy_id=$1 AND version=$3`,
    [policyId, userId, old.rows[0].version]
  );
  await logGovernanceAction({ eventType: 'policy_change', action: 'PUBLISH_POLICY', entityType: 'policy', entityId: policyId, description: `Policy published: ${old.rows[0].title}`, performedBy: userId, performedByName: userName });
  return { success: true };
}

// ============= POLICY ACKNOWLEDGMENTS =============

async function acknowledgePolicy(policyId, userId, employeeName, department, ipAddress, userAgent) {
  const policy = await pool.query('SELECT * FROM grc_policies WHERE policy_id=$1', [policyId]);
  if (!policy.rows[0]) throw new Error('Policy not found');
  const existing = await pool.query(
    'SELECT * FROM grc_policy_acknowledgments WHERE policy_id=$1 AND user_id=$2 AND policy_version=$3',
    [policyId, userId, policy.rows[0].version]
  );
  if (existing.rows[0]) throw new Error('Already acknowledged this version');
  const prev = await pool.query(
    'SELECT id FROM grc_policy_acknowledgments WHERE policy_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 1',
    [policyId, userId]
  );
  await pool.query(
    `INSERT INTO grc_policy_acknowledgments (policy_id, user_id, employee_name, department, policy_version, acknowledged, accepted_at, ip_address, user_agent, signature_type, is_re_acknowledgment, previous_acknowledgment_id)
     VALUES ($1,$2,$3,$4,$5,true,CURRENT_TIMESTAMP,$6,$7,'electronic',${prev.rows[0] ? 'true' : 'false'},${prev.rows[0] ? '$8' : 'NULL'})`,
    prev.rows[0] ? [policyId, userId, employeeName, department, policy.rows[0].version, ipAddress, userAgent, prev.rows[0].id] : [policyId, userId, employeeName, department, policy.rows[0].version, ipAddress, userAgent]
  );
  return { success: true };
}

async function getPolicyAcknowledgmentStatus(policyId) {
  const total = await pool.query('SELECT COUNT(DISTINCT id) as c FROM users');
  const ackd = await pool.query('SELECT COUNT(DISTINCT user_id) as c FROM grc_policy_acknowledgments WHERE policy_id=$1 AND acknowledged=true', [policyId]);
  const details = await pool.query(
    `SELECT a.*, u.full_name, u.email, d.name as department_name
     FROM grc_policy_acknowledgments a LEFT JOIN users u ON a.user_id=u.id LEFT JOIN departments d ON u.department_id=d.id
     WHERE a.policy_id=$1 ORDER BY a.accepted_at DESC`, [policyId]
  );
  return { totalUsers: parseInt(total.rows[0].c), acknowledged: parseInt(ackd.rows[0].c), rate: total.rows[0].c > 0 ? ((parseInt(ackd.rows[0].c) / parseInt(total.rows[0].c)) * 100).toFixed(1) : 0, acknowledgments: details.rows };
}

// ============= AUDITS =============

async function createAudit({ title, auditType, scope, objectives, scopeDepartments, priority, leadAuditorId, leadAuditorName, auditTeam, scheduledStartDate, scheduledEndDate, auditedEntity, regulatoryReference, createdBy, createdByName }) {
  const auditId = generateId('AUD');
  await pool.query(
    `INSERT INTO grc_audits (audit_id, title, audit_type, scope, objectives, scope_departments, priority, lead_auditor_id, lead_auditor_name, audit_team, scheduled_start_date, scheduled_end_date, audited_entity, regulatory_reference, created_by, created_by_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [auditId, title, auditType, scope, objectives, scopeDepartments || [], priority, leadAuditorId, leadAuditorName, auditTeam || [], scheduledStartDate, scheduledEndDate, auditedEntity, regulatoryReference, createdBy, createdByName]
  );
  await logGovernanceAction({ eventType: 'audit_activity', action: 'CREATE_AUDIT', entityType: 'audit', entityId: auditId, description: `Audit created: ${title}`, performedBy: createdBy, performedByName: createdByName });
  return { auditId };
}

async function getAudits({ type, status, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM grc_audits WHERE 1=1';
  const params = [];
  if (type) { params.push(type); sql += ` AND audit_type=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM grc_audits');
  return { data: rows, total: parseInt(countResult.rows[0].count) };
}

async function getAudit(auditId) {
  const { rows } = await pool.query('SELECT * FROM grc_audits WHERE audit_id=$1', [auditId]);
  if (!rows[0]) throw new Error('Audit not found');
  const findings = await pool.query('SELECT * FROM grc_audit_findings WHERE audit_id=$1 ORDER BY severity DESC, created_at DESC', [auditId]);
  return { ...rows[0], findings: findings.rows };
}

async function updateAudit(auditId, updates, userId, userName) {
  const old = await pool.query('SELECT * FROM grc_audits WHERE audit_id=$1', [auditId]);
  if (!old.rows[0]) throw new Error('Audit not found');
  const fields = [];
  const params = [auditId];
  let idx = 2;
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined && ['title', 'scope', 'objectives', 'priority', 'status', 'actual_start_date', 'actual_end_date', 'summary', 'overall_rating', 'report_url'].includes(k)) {
      fields.push(`${k}=$${idx}`);
      params.push(v);
      idx++;
    }
  }
  if (fields.length) {
    fields.push('updated_at=CURRENT_TIMESTAMP');
    await pool.query(`UPDATE grc_audits SET ${fields.join(',')} WHERE audit_id=$1`, params);
  }
  await logGovernanceAction({ eventType: 'audit_activity', action: 'UPDATE_AUDIT', entityType: 'audit', entityId: auditId, description: `Audit updated: ${updates.title || old.rows[0].title}`, performedBy: userId, performedByName: userName });
  return { success: true };
}

// ============= AUDIT FINDINGS =============

async function createAuditFinding({ auditId, title, description, severity, findingType, category, rootCause, impact, recommendation, assignedTo, assignedToName, dueDate, createdBy }) {
  const findingId = generateId('FND');
  await pool.query(
    `INSERT INTO grc_audit_findings (audit_id, finding_id, title, description, severity, finding_type, category, root_cause, impact, recommendation, assigned_to, assigned_to_name, due_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [auditId, findingId, title, description, severity, findingType, category, rootCause, impact, recommendation, assignedTo, assignedToName, dueDate, createdBy]
  );
  // Update counts
  const counts = await pool.query(
    `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE severity='critical') as crit, COUNT(*) FILTER (WHERE severity='high') as high,
            COUNT(*) FILTER (WHERE severity='medium') as med, COUNT(*) FILTER (WHERE severity='low') as low
     FROM grc_audit_findings WHERE audit_id=$1`, [auditId]
  );
  await pool.query(
    `UPDATE grc_audits SET findings_count=$2, critical_findings=$3, high_findings=$4, medium_findings=$5, low_findings=$6 WHERE audit_id=$1`,
    [auditId, parseInt(counts.rows[0].total), parseInt(counts.rows[0].crit), parseInt(counts.rows[0].high), parseInt(counts.rows[0].med), parseInt(counts.rows[0].low)]
  );
  return { findingId };
}

async function updateAuditFinding(findingId, updates, userId) {
  const fields = [];
  const params = [findingId];
  let idx = 2;
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined && ['status', 'assigned_to', 'assigned_to_name', 'due_date', 'resolution_notes', 'verified_by', 'verified_at', 'severity'].includes(k)) {
      fields.push(`${k}=$${idx}`);
      params.push(v);
      idx++;
    }
  }
  if (fields.length) {
    fields.push('updated_at=CURRENT_TIMESTAMP');
    await pool.query(`UPDATE grc_audit_findings SET ${fields.join(',')} WHERE finding_id=$1`, params);
  }
  return { success: true };
}

// ============= CORRECTIVE ACTIONS =============

async function createCorrectiveAction({ title, description, sourceType, sourceId, sourceReference, severity, category, actionType, assignedTo, assignedToName, dueDate, createdBy, createdByName }) {
  const actionId = generateId('CAP');
  await pool.query(
    `INSERT INTO grc_corrective_actions (action_id, title, description, source_type, source_id, source_reference, severity, category, action_type, assigned_to, assigned_to_name, due_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [actionId, title, description, sourceType, sourceId, sourceReference, severity, category, actionType, assignedTo, assignedToName, dueDate, createdBy]
  );
  await logGovernanceAction({ eventType: 'governance_approval', action: 'CREATE_CORRECTIVE_ACTION', entityType: 'corrective_action', entityId: actionId, description: `Corrective action created: ${title}`, performedBy: createdBy, performedByName: createdByName });
  return { actionId };
}

async function getCorrectiveActions({ sourceType, status, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM grc_corrective_actions WHERE 1=1';
  const params = [];
  if (sourceType) { params.push(sourceType); sql += ` AND source_type=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM grc_corrective_actions');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

// ============= RISKS =============

async function createRisk({ title, description, riskCategory, subCategory, department, ownerId, ownerName, inherentLikelihood, inherentImpact, treatmentStrategy, mitigationPlan, contingencyPlan, reviewFrequency, createdBy }) {
  const riskId = generateId('RSK');
  const inherentRiskScore = ((inherentLikelihood || 1) * (inherentImpact || 1) / 25) * 100;
  const inherentRiskLevel = inherentRiskScore >= 75 ? 'critical' : inherentRiskScore >= 50 ? 'high' : inherentRiskScore >= 25 ? 'medium' : 'low';
  await pool.query(
    `INSERT INTO grc_risks (risk_id, title, description, risk_category, sub_category, department, owner_id, owner_name,
     inherent_likelihood, inherent_impact, inherent_risk_score, inherent_risk_level, treatment_strategy, mitigation_plan, contingency_plan, review_frequency, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [riskId, title, description, riskCategory, subCategory, department, ownerId, ownerName,
     inherentLikelihood, inherentImpact, inherentRiskScore, inherentRiskLevel, treatmentStrategy, mitigationPlan, contingencyPlan, reviewFrequency, createdBy]
  );
  return { riskId, inherentRiskScore, inherentRiskLevel };
}

async function getRisks({ category, level, status, department, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM grc_risks WHERE 1=1';
  const params = [];
  if (category) { params.push(category); sql += ` AND risk_category=$${params.length}`; }
  if (level) { params.push(level); sql += ` AND residual_risk_level=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (department) { params.push(department); sql += ` AND department=$${params.length}`; }
  sql += ' ORDER BY inherent_risk_score DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM grc_risks');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

async function getRisk(riskId) {
  const { rows } = await pool.query('SELECT * FROM grc_risks WHERE risk_id=$1', [riskId]);
  if (!rows[0]) throw new Error('Risk not found');
  const assessments = await pool.query('SELECT * FROM grc_risk_assessments WHERE risk_id=$1 ORDER BY assessed_at DESC', [riskId]);
  return { ...rows[0], assessments: assessments.rows };
}

async function updateRisk(riskId, updates, userId) {
  const fields = [];
  const params = [riskId];
  let idx = 2;
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined && ['title', 'description', 'status', 'residual_likelihood', 'residual_impact', 'mitigation_plan', 'mitigation_progress', 'contingency_plan', 'treatment_strategy', 'owner_id', 'owner_name', 'next_review_date', 'control_effectiveness', 'is_tolerable'].includes(k)) {
      if ((k === 'residual_likelihood' || k === 'residual_impact') && v) {
        const current = await pool.query('SELECT residual_risk_score FROM grc_risks WHERE risk_id=$1', [riskId]);
        const score = ((k === 'residual_likelihood' ? v : (updates.residual_likelihood || 1)) * (k === 'residual_impact' ? v : (updates.residual_impact || 1)) / 25) * 100;
        const level = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
        fields.push(`${k}=$${idx}`, `residual_risk_score=${score}`, `residual_risk_level='${level}'`);
        idx++;
        continue;
      }
      fields.push(`${k}=$${idx}`);
      params.push(v);
      idx++;
    }
  }
  if (fields.length) {
    fields.push('updated_at=CURRENT_TIMESTAMP');
    await pool.query(`UPDATE grc_risks SET ${fields.join(',')} WHERE risk_id=$1`, params);
  }
  return { success: true };
}

// ============= RISK ASSESSMENTS =============

async function createRiskAssessment({ riskId, title, assessmentType, likelihoodScore, impactScore, assessmentNotes, controlAssessment, assessorId, assessorName, nextAssessmentDate }) {
  const assessmentId = generateId('RAS');
  const riskScore = (likelihoodScore * impactScore / 25) * 100;
  const riskLevel = riskScore >= 75 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';
  await pool.query(
    `INSERT INTO grc_risk_assessments (assessment_id, title, risk_id, assessment_type, likelihood_score, impact_score, risk_score, risk_level, assessment_notes, control_assessment, assessor_id, assessor_name, assessed_at, next_assessment_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,CURRENT_TIMESTAMP,$13)`,
    [assessmentId, title, riskId, assessmentType, likelihoodScore, impactScore, riskScore, riskLevel, assessmentNotes, controlAssessment, assessorId, assessorName, nextAssessmentDate]
  );
  // Update risk with residual scores
  await pool.query(
    `UPDATE grc_risks SET residual_likelihood=$2, residual_impact=$3, residual_risk_score=$4, residual_risk_level=$5, last_reviewed_at=CURRENT_TIMESTAMP, next_review_date=$6 WHERE risk_id=$1`,
    [riskId, likelihoodScore, impactScore, riskScore, riskLevel, nextAssessmentDate]
  );
  return { assessmentId, riskScore, riskLevel };
}

// ============= COMPLIANCE =============

async function getComplianceObligations({ type, status, department, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM grc_compliance_obligations WHERE 1=1';
  const params = [];
  if (type) { params.push(type); sql += ` AND obligation_type=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (department) { params.push(department); sql += ` AND department=$${params.length}`; }
  sql += ' ORDER BY due_date ASC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM grc_compliance_obligations');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

async function updateComplianceObligation(obligationId, updates) {
  const fields = [];
  const params = [obligationId];
  let idx = 2;
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined && ['compliance_status', 'compliance_score', 'status', 'evidence_links', 'notes', 'next_assessment_date', 'last_assessed_at'].includes(k)) {
      fields.push(`${k}=$${idx}`);
      params.push(v);
      idx++;
    }
  }
  if (fields.length) await pool.query(`UPDATE grc_compliance_obligations SET ${fields.join(',')} WHERE obligation_id=$1`, params);
  return { success: true };
}

// ============= ACCESS REVIEWS =============

async function createAccessReview({ title, reviewType, scope, department, reviewerId, reviewerName, managerId, managerName, scheduledStartDate, scheduledEndDate, createdBy }) {
  const reviewId = generateId('REV');
  await pool.query(
    `INSERT INTO grc_access_reviews (review_id, title, review_type, scope, department, reviewer_id, reviewer_name, manager_id, manager_name, scheduled_start_date, scheduled_end_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [reviewId, title, reviewType, scope, department, reviewerId, reviewerName, managerId, managerName, scheduledStartDate, scheduledEndDate, createdBy]
  );
  // Populate entries from users
  await pool.query(
    `INSERT INTO grc_access_review_entries (review_id, user_id, user_name, user_email, department, role_name)
     SELECT $1, u.id, u.full_name, u.email, d.name, u.role_name
     FROM users u LEFT JOIN departments d ON u.department_id=d.id`,
    [reviewId]
  );
  await pool.query('UPDATE grc_access_reviews SET total_users=(SELECT COUNT(*) FROM grc_access_review_entries WHERE review_id=$1) WHERE review_id=$1', [reviewId]);
  return { reviewId };
}

async function getAccessReviews({ status, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM grc_access_reviews WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM grc_access_reviews');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

async function getAccessReview(reviewId) {
  const { rows } = await pool.query('SELECT * FROM grc_access_reviews WHERE review_id=$1', [reviewId]);
  if (!rows[0]) throw new Error('Access review not found');
  const entries = await pool.query('SELECT * FROM grc_access_review_entries WHERE review_id=$1 ORDER BY user_name', [reviewId]);
  return { ...rows[0], entries: entries.rows };
}

async function updateAccessReviewEntry(entryId, { reviewDecision, reviewNotes, reviewerId, reviewerName }) {
  await pool.query(
    `UPDATE grc_access_review_entries SET review_decision=$2, review_notes=$3, reviewer_id=$4, reviewer_name=$5, reviewed_at=CURRENT_TIMESTAMP WHERE id=$1`,
    [entryId, reviewDecision, reviewNotes, reviewerId, reviewerName]
  );
  return { success: true };
}

// ============= SOD =============

async function getSodRules({ active, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM grc_sod_rules WHERE 1=1';
  const params = [];
  if (active !== undefined) { params.push(active); sql += ` AND is_active=$${params.length}`; }
  sql += ' ORDER BY risk_level DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM grc_sod_rules');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

async function checkSodViolations(userId, permission) {
  const rules = await pool.query(
    `SELECT * FROM grc_sod_rules WHERE is_active=true AND (conflicting_permission_a=$1 OR conflicting_permission_b=$1)`,
    [permission]
  );
  const violations = [];
  for (const rule of rules.rows) {
    const otherPerm = rule.conflicting_permission_a === permission ? rule.conflicting_permission_b : rule.conflicting_permission_a;
    const userPerms = await pool.query(
      `SELECT permission_name FROM user_permissions WHERE user_id=$1 AND permission_name=$2`,
      [userId, otherPerm]
    );
    if (userPerms.rows.length > 0) {
      const userInfo = await pool.query('SELECT full_name, email, role_name FROM users WHERE id=$1', [userId]);
      const violationId = generateId('SOV');
      await pool.query(
        `INSERT INTO grc_sod_violations (violation_id, rule_id, rule_title, user_id, user_name, user_email, role_name, permission_a, permission_b, conflict_type, severity)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [violationId, rule.rule_id, rule.title, userId, userInfo.rows[0]?.full_name, userInfo.rows[0]?.email, userInfo.rows[0]?.role_name, permission, otherPerm, rule.conflict_type, rule.risk_level]
      );
      violations.push({ violationId, rule, otherPerm });
    }
  }
  return violations;
}

async function getSodViolations({ status, severity, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM grc_sod_violations WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (severity) { params.push(severity); sql += ` AND severity=$${params.length}`; }
  sql += ' ORDER BY discovered_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM grc_sod_violations');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

// ============= INVESTIGATIONS =============

async function createInvestigation({ title, description, investigationType, sourceType, sourceId, priority, leadInvestigatorId, leadInvestigatorName, investigationTeam, severity, confidentialityLevel, createdBy }) {
  const investigationId = generateId('INV');
  await pool.query(
    `INSERT INTO grc_investigations (investigation_id, title, description, investigation_type, source_type, source_id, priority, lead_investigator_id, lead_investigator_name, investigation_team, severity, confidentiality_level, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [investigationId, title, description, investigationType, sourceType, sourceId, priority, leadInvestigatorId, leadInvestigatorName, investigationTeam || [], severity, confidentialityLevel, createdBy]
  );
  return { investigationId };
}

async function getInvestigations({ type, status, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM grc_investigations WHERE 1=1';
  const params = [];
  if (type) { params.push(type); sql += ` AND investigation_type=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM grc_investigations');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

async function getInvestigation(investigationId) {
  const { rows } = await pool.query('SELECT * FROM grc_investigations WHERE investigation_id=$1', [investigationId]);
  if (!rows[0]) throw new Error('Investigation not found');
  const evidence = await pool.query('SELECT * FROM grc_investigation_evidence WHERE investigation_id=$1 ORDER BY submitted_at DESC', [investigationId]);
  return { ...rows[0], evidence: evidence.rows };
}

async function addInvestigationEvidence({ investigationId, title, evidenceType, description, fileUrl, evidenceData, submittedBy, submittedByName, isKeyEvidence }) {
  await pool.query(
    `INSERT INTO grc_investigation_evidence (investigation_id, title, evidence_type, description, file_url, evidence_data, submitted_by, submitted_by_name, is_key_evidence)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [investigationId, title, evidenceType, description, fileUrl, evidenceData ? JSON.stringify(evidenceData) : null, submittedBy, submittedByName, isKeyEvidence || false]
  );
  return { success: true };
}

// ============= GOVERNANCE REPORTS =============

async function generateGovernanceReport({ reportType, title, scope, parameters, periodStart, periodEnd, generatedBy, generatedByName }) {
  const reportId = generateId('RPT');
  let summary = {};
  let rows = [];

  switch (reportType) {
    case 'compliance': {
      const obligations = await pool.query('SELECT compliance_status, COUNT(*) as c FROM grc_compliance_obligations GROUP BY compliance_status');
      summary = { obligations: obligations.rows };
      rows = (await pool.query('SELECT * FROM grc_compliance_obligations')).rows;
      break;
    }
    case 'audit': {
      const audits = await pool.query('SELECT status, COUNT(*) as c FROM grc_audits GROUP BY status');
      const findings = await pool.query('SELECT severity, COUNT(*) as c FROM grc_audit_findings GROUP BY severity');
      summary = { audits: audits.rows, findings: findings.rows };
      rows = (await pool.query('SELECT * FROM grc_audits ORDER BY created_at DESC')).rows;
      break;
    }
    case 'risk': {
      const risks = await pool.query('SELECT residual_risk_level, COUNT(*) as c FROM grc_risks GROUP BY residual_risk_level');
      const categories = await pool.query('SELECT risk_category, COUNT(*) as c FROM grc_risks GROUP BY risk_category');
      summary = { risks: risks.rows, categories: categories.rows };
      rows = (await pool.query('SELECT * FROM grc_risks ORDER BY inherent_risk_score DESC')).rows;
      break;
    }
    case 'policy': {
      const policies = await pool.query('SELECT status, COUNT(*) as c FROM grc_policies GROUP BY status');
      const types = await pool.query('SELECT policy_type, COUNT(*) as c FROM grc_policies GROUP BY policy_type');
      summary = { policies: policies.rows, types: types.rows };
      rows = (await pool.query('SELECT * FROM grc_policies ORDER BY updated_at DESC')).rows;
      break;
    }
    case 'access_review': {
      const reviews = await pool.query('SELECT status, COUNT(*) as c FROM grc_access_reviews GROUP BY status');
      summary = { reviews: reviews.rows };
      rows = (await pool.query('SELECT * FROM grc_access_review_entries WHERE review_decision=$$1', ['flagged'])).rows;
      break;
    }
    case 'sod': {
      const violations = await pool.query('SELECT status, COUNT(*) as c FROM grc_sod_violations GROUP BY status');
      summary = { violations: violations.rows };
      rows = (await pool.query('SELECT * FROM grc_sod_violations ORDER BY discovered_at DESC')).rows;
      break;
    }
    case 'governance_summary': {
      const policyCount = await pool.query('SELECT COUNT(*) as c FROM grc_policies');
      const auditCount = await pool.query('SELECT COUNT(*) as c FROM grc_audits');
      const riskCount = await pool.query('SELECT COUNT(*) as c FROM grc_risks');
      const violationCount = await pool.query('SELECT COUNT(*) as c FROM grc_sod_violations');
      const investigationCount = await pool.query('SELECT COUNT(*) as c FROM grc_investigations');
      const complianceCount = await pool.query('SELECT COUNT(*) as c FROM grc_compliance_obligations WHERE compliance_status=$1', ['compliant']);
      const totalCompliance = await pool.query('SELECT COUNT(*) as c FROM grc_compliance_obligations');
      const score = await pool.query('SELECT * FROM grc_compliance_scores WHERE score_type=$1 ORDER BY calculated_at DESC LIMIT 1', ['organization']);
      summary = {
        totalPolicies: parseInt(policyCount.rows[0].c),
        totalAudits: parseInt(auditCount.rows[0].c),
        totalRisks: parseInt(riskCount.rows[0].c),
        totalSodViolations: parseInt(violationCount.rows[0].c),
        totalInvestigations: parseInt(investigationCount.rows[0].c),
        complianceRate: totalCompliance.rows[0].c > 0 ? ((parseInt(complianceCount.rows[0].c) / parseInt(totalCompliance.rows[0].c)) * 100).toFixed(1) : 0,
        complianceScore: score.rows[0] || null
      };
      break;
    }
  }

  await pool.query(
    `INSERT INTO grc_governance_reports (report_id, title, report_type, scope, parameters, summary, generated_by, generated_by_name, period_start, period_end)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [reportId, title, reportType, scope, parameters ? JSON.stringify(parameters) : null, JSON.stringify(summary), generatedBy, generatedByName, periodStart, periodEnd]
  );
  return { reportId, summary, rows };
}

async function getGovernanceReports({ type, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM grc_governance_reports WHERE 1=1';
  const params = [];
  if (type) { params.push(type); sql += ` AND report_type=$${params.length}`; }
  sql += ' ORDER BY generated_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM grc_governance_reports');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

// ============= APPROVAL WORKFLOWS =============

async function createApprovalWorkflow({ workflowType, title, requesterId, requesterName, requestData, approvalChain, totalLevels, notes }) {
  const workflowId = generateId('APW');
  await pool.query(
    `INSERT INTO grc_approval_workflows (workflow_id, title, workflow_type, requester_id, requester_name, request_data, approval_chain, total_levels, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [workflowId, title, workflowType, requesterId, requesterName, requestData ? JSON.stringify(requestData) : null, approvalChain ? JSON.stringify(approvalChain) : null, totalLevels || 1, notes]
  );
  await logGovernanceAction({ eventType: 'governance_approval', action: 'CREATE_WORKFLOW', entityType: 'approval_workflow', entityId: workflowId, description: `Approval workflow created: ${title}`, performedBy: requesterId, performedByName: requesterName });
  return { workflowId };
}

async function processApprovalAction(workflowId, { level, approverId, approverName, action, comments }) {
  const workflow = await pool.query('SELECT * FROM grc_approval_workflows WHERE workflow_id=$1', [workflowId]);
  if (!workflow.rows[0]) throw new Error('Workflow not found');
  await pool.query(
    `INSERT INTO grc_approval_actions (workflow_id, level, approver_id, approver_name, action, comments, acted_at)
     VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)`,
    [workflowId, level, approverId, approverName, action, comments]
  );
  if (action === 'approved') {
    if (level >= (workflow.rows[0].total_levels || 1)) {
      await pool.query('UPDATE grc_approval_workflows SET status=$2, completed_at=CURRENT_TIMESTAMP WHERE workflow_id=$1', [workflowId, 'approved']);
    } else {
      await pool.query('UPDATE grc_approval_workflows SET current_level=$2 WHERE workflow_id=$1', [workflowId, level + 1]);
    }
  } else if (action === 'rejected') {
    await pool.query('UPDATE grc_approval_workflows SET status=$2, completed_at=CURRENT_TIMESTAMP WHERE workflow_id=$1', [workflowId, 'rejected']);
  }
  await logGovernanceAction({ eventType: 'governance_approval', action: `WORKFLOW_${action.toUpperCase()}`, entityType: 'approval_workflow', entityId: workflowId, description: `Workflow ${action}: level ${level} by ${approverName}`, performedBy: approverId, performedByName: approverName });
  return { success: true };
}

// ============= COMPLIANCE SCORES =============

async function calculateComplianceScore({ scoreType, entityId, entityName, periodStart, periodEnd }) {
  const policyAck = await pool.query(
    'SELECT COUNT(DISTINCT user_id) as ackd FROM grc_policy_acknowledgments WHERE acknowledged=true'
  );
  const totalUsers = await pool.query('SELECT COUNT(*) as c FROM users');
  const acceptanceRate = totalUsers.rows[0].c > 0 ? (parseInt(policyAck.rows[0].ackd) / parseInt(totalUsers.rows[0].c)) * 100 : 0;

  const findings = await pool.query("SELECT COUNT(*) as c FROM grc_audit_findings WHERE status NOT IN ('closed','resolved')");
  const openFindings = parseInt(findings.rows[0].c);

  const risks = await pool.query("SELECT COUNT(*) as c FROM grc_risks WHERE residual_risk_level IN ('high','critical')");
  const openRisks = parseInt(risks.rows[0].c);

  const reviews = await pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE review_decision!='pending') as done FROM grc_access_review_entries");
  const reviewCompletion = reviews.rows[0].total > 0 ? (parseInt(reviews.rows[0].done) / parseInt(reviews.rows[0].total)) * 100 : 0;

  const totalPolicies = await pool.query('SELECT COUNT(*) as c FROM grc_policies');
  const acceptedPolicies = await pool.query('SELECT COUNT(DISTINCT policy_id) as c FROM grc_policy_acknowledgments');
  const policyAcceptance = totalPolicies.rows[0].c > 0 ? (parseInt(acceptedPolicies.rows[0].c) / parseInt(totalPolicies.rows[0].c)) * 100 : 0;

  const riskExposure = (openRisks / Math.max(openRisks + 1, 1)) * 100;

  const complianceScore = Math.max(0, Math.min(100,
    (acceptanceRate * 0.2) +
    (Math.max(0, 100 - (openFindings * 5)) * 0.25) +
    (Math.max(0, 100 - riskExposure) * 0.2) +
    (reviewCompletion * 0.2) +
    (policyAcceptance * 0.15)
  ));

  const grade = complianceScore >= 90 ? 'A' : complianceScore >= 80 ? 'B' : complianceScore >= 70 ? 'C' : complianceScore >= 60 ? 'D' : 'F';

  await pool.query(
    `INSERT INTO grc_compliance_scores (score_type, entity_id, entity_name, compliance_score, policy_acceptance_rate, audit_findings_rate, risk_exposure_score, access_review_completion, overall_grade, total_policies, accepted_policies, open_findings, open_risks, period_start, period_end)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [scoreType, entityId, entityName, Math.round(complianceScore * 100) / 100, Math.round(acceptanceRate * 100) / 100, Math.round((openFindings / Math.max(totalUsers.rows[0].c, 1)) * 100 * 100) / 100,
     Math.round(riskExposure * 100) / 100, Math.round(reviewCompletion * 100) / 100, grade, parseInt(totalPolicies.rows[0].c), parseInt(acceptedPolicies.rows[0].c), openFindings, openRisks, periodStart, periodEnd]
  );

  return { complianceScore, grade, acceptanceRate, openFindings, openRisks, reviewCompletion, policyAcceptance };
}

// ============= NOTIFICATIONS =============

async function createNotification({ userId, notificationType, title, message, priority, channel, referenceType, referenceId }) {
  await pool.query(
    `INSERT INTO grc_notifications (user_id, notification_type, title, message, priority, channel, reference_type, reference_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [userId, notificationType, title, message, priority || 'normal', channel || 'in_app', referenceType, referenceId]
  );
  return { success: true };
}

async function getNotifications({ userId, status, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM grc_notifications WHERE user_id=$1';
  const params = [userId];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM grc_notifications WHERE user_id=$1', [userId]);
  return { data: rows, total: parseInt(count.rows[0].count) };
}

// ============= DASHBOARD =============

async function getGRCDashboard() {
  const policies = await pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='published') as published, COUNT(*) FILTER (WHERE status='draft') as draft FROM grc_policies");
  const audits = await pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='in_progress') as in_progress, COUNT(*) FILTER (WHERE status='completed') as completed FROM grc_audits");
  const risks = await pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE residual_risk_level='critical') as critical, COUNT(*) FILTER (WHERE residual_risk_level='high') as high FROM grc_risks");
  const sodViolations = await pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='open') as open FROM grc_sod_violations");
  const investigations = await pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status NOT IN ('completed','closed')) as open FROM grc_investigations");
  const compliance = await pool.query("SELECT compliance_status, COUNT(*) as c FROM grc_compliance_obligations GROUP BY compliance_status");
  const score = await pool.query("SELECT * FROM grc_compliance_scores WHERE score_type='organization' ORDER BY calculated_at DESC LIMIT 1");
  const reviews = await pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status IN ('planned','in_progress')) as pending FROM grc_access_reviews");
  const auditLog = await pool.query('SELECT * FROM grc_governance_audit_log ORDER BY created_at DESC LIMIT 20');
  const calendar = await pool.query("SELECT * FROM grc_compliance_calendar WHERE status='upcoming' ORDER BY event_date ASC LIMIT 10");

  return {
    policies: policies.rows[0],
    audits: audits.rows[0],
    risks: risks.rows[0],
    sodViolations: sodViolations.rows[0],
    investigations: investigations.rows[0],
    compliance,
    complianceScore: score.rows[0] || null,
    accessReviews: reviews.rows[0],
    recentActivity: auditLog.rows,
    upcomingEvents: calendar.rows
  };
}

// ============= AUDIT TRAIL =============

async function getGovernanceAuditLog({ eventType, entityType, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM grc_governance_audit_log WHERE 1=1';
  const params = [];
  if (eventType) { params.push(eventType); sql += ` AND event_type=$${params.length}`; }
  if (entityType) { params.push(entityType); sql += ` AND entity_type=$${params.length}`; }
  sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM grc_governance_audit_log');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

// ============= LEGAL HOLDS =============

async function createLegalHold({ caseName, caseNumber, description, legalAuthority, custodian, scope, issuedDate, expiryDate, createdBy }) {
  const holdId = generateId('HLD');
  await pool.query(
    `INSERT INTO grc_legal_holds (hold_id, case_name, case_number, description, legal_authority, custodian, scope, issued_date, expiry_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [holdId, caseName, caseNumber, description, legalAuthority, custodian, scope, issuedDate, expiryDate, createdBy]
  );
  return { holdId };
}

async function getLegalHolds({ status, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM grc_legal_holds WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM grc_legal_holds');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

// ============= COMPLIANCE CALENDAR =============

async function getComplianceCalendar({ status, month, year, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM grc_compliance_calendar WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (month && year) {
    sql += ` AND EXTRACT(MONTH FROM event_date)=$${params.length + 1} AND EXTRACT(YEAR FROM event_date)=$${params.length + 2}`;
    params.push(month, year);
  }
  sql += ' ORDER BY event_date ASC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM grc_compliance_calendar');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

// ============= RETENTION POLICIES =============

async function getRetentionPolicies({ department, active, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM grc_retention_policies WHERE 1=1';
  const params = [];
  if (department) { params.push(department); sql += ` AND department=$${params.length}`; }
  if (active !== undefined) { params.push(active); sql += ` AND is_active=$${params.length}`; }
  sql += ' ORDER BY title ASC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM grc_retention_policies');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

module.exports = {
  // Policies
  createPolicy, getPolicies, getPolicy, updatePolicy, publishPolicy,
  // Policy Acknowledgments
  acknowledgePolicy, getPolicyAcknowledgmentStatus,
  // Audits
  createAudit, getAudits, getAudit, updateAudit,
  // Audit Findings
  createAuditFinding, updateAuditFinding,
  // Corrective Actions
  createCorrectiveAction, getCorrectiveActions,
  // Risks
  createRisk, getRisks, getRisk, updateRisk,
  // Risk Assessments
  createRiskAssessment,
  // Compliance
  getComplianceObligations, updateComplianceObligation,
  // Access Reviews
  createAccessReview, getAccessReviews, getAccessReview, updateAccessReviewEntry,
  // SoD
  getSodRules, checkSodViolations, getSodViolations,
  // Investigations
  createInvestigation, getInvestigations, getInvestigation, addInvestigationEvidence,
  // Governance Reports
  generateGovernanceReport, getGovernanceReports,
  // Approval Workflows
  createApprovalWorkflow, processApprovalAction,
  // Compliance Scores
  calculateComplianceScore,
  // Notifications
  createNotification, getNotifications,
  // Dashboard
  getGRCDashboard,
  // Audit Trail
  getGovernanceAuditLog,
  // Legal Holds
  createLegalHold, getLegalHolds,
  // Compliance Calendar
  getComplianceCalendar,
  // Retention
  getRetentionPolicies,
  // Logging
  logGovernanceAction,
};
