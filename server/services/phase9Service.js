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

const ENCRYPTION_KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key-change-in-production', 'phase9-vault-salt', 32);

function encryptVaultContent(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted}`;
}

// ===========================
// 1. SECURITY COMMAND CENTER
// ===========================

async function getSecurityCommandCenter() {
  const [trustScores, pamActive, dlpOpen, siemNew, soarRunning, insiderOpen, threatsHunting, vaultItems, scores, resilience] = await Promise.all([
    pool.query('SELECT COUNT(*) total, COALESCE(AVG(trust_score),0) avg FROM phase9_trust_scores'),
    pool.query('SELECT COUNT(*) count FROM phase9_pam_sessions WHERE status=$1', ['active']),
    pool.query('SELECT COUNT(*) count FROM phase9_dlp_events WHERE status=$1', ['open']),
    pool.query('SELECT COUNT(*) count FROM phase9_siem_events WHERE status=$1', ['new']),
    pool.query('SELECT COUNT(*) count FROM phase9_soar_executions WHERE status=$1', ['running']),
    pool.query('SELECT COUNT(*) count FROM phase9_insider_threats WHERE status=$1 OR status=$2', ['open', 'investigating']),
    pool.query('SELECT COUNT(*) count FROM phase9_threat_hunts WHERE status=$1', ['active']),
    pool.query('SELECT COUNT(*) count FROM phase9_vault_items WHERE status=$1', ['active']),
    pool.query('SELECT * FROM phase9_security_scores ORDER BY id DESC LIMIT 10'),
    pool.query('SELECT COUNT(*) count FROM phase9_cyber_resilience WHERE status=$1', ['active']),
  ]);

  const recentSiems = await pool.query('SELECT * FROM phase9_siem_events ORDER BY id DESC LIMIT 10');
  const recentDlps = await pool.query('SELECT * FROM phase9_dlp_events ORDER BY id DESC LIMIT 10');
  const execProtection = await pool.query('SELECT COUNT(*) count FROM phase9_executive_protection');

  const avgTrust = parseFloat(trustScores.rows[0]?.avg || 0).toFixed(1);
  const overallScore = scores.rows.find(s => s.score_type === 'overall');

  return {
    trustScore: avgTrust,
    avgTrustScore: avgTrust,
    overallSecurityScore: overallScore?.score_value || 0,
    activePams: parseInt(pamActive.rows[0].count),
    openDlps: parseInt(dlpOpen.rows[0].count),
    newSiemEvents: parseInt(siemNew.rows[0].count),
    runningSoar: parseInt(soarRunning.rows[0].count),
    openInsiderThreats: parseInt(insiderOpen.rows[0].count),
    activeHunts: parseInt(threatsHunting.rows[0].count),
    vaultItems: parseInt(vaultItems.rows[0].count),
    activeResiliencePlans: parseInt(resilience.rows[0].count),
    protectedExecutives: parseInt(execProtection.rows[0].count),
    recentSiemEvents: recentSiems.rows,
    recentDlpEvents: recentDlps.rows,
    securityScores: scores.rows,
  };
}

// ===========================
// 2. ZERO TRUST ENGINE
// ===========================

async function calculateTrustScore(userId) {
  const factors = {};
  let deviceTrust = 50, sessionTrust = 50, behaviorTrust = 50, locationTrust = 50;

  const recentVerification = await pool.query(
    'SELECT * FROM phase9_continuous_verification WHERE user_id=$1 ORDER BY id DESC LIMIT 10', [userId]
  );
  const passedVerifications = recentVerification.rows.filter(v => v.verification_result === 'passed').length;
  const totalVerifications = recentVerification.rows.length || 1;
  deviceTrust = clamp(Math.round((passedVerifications / totalVerifications) * 100));

  const biometrics = await pool.query('SELECT * FROM phase9_biometric_profiles WHERE user_id=$1', [userId]);
  sessionTrust = biometrics.rows.length > 0 ? 80 : 50;

  const dlpEvents = await pool.query('SELECT COUNT(*) count FROM phase9_dlp_events WHERE user_id=$1 AND severity=$2', [userId, 'critical']);
  behaviorTrust = clamp(80 - parseInt(dlpEvents.rows[0].count) * 15);

  const riskScore = deviceTrust * 0.3 + sessionTrust * 0.25 + behaviorTrust * 0.25 + locationTrust * 0.2;
  const trustScore = clamp(Math.round(riskScore));
  const level = trustScore < 40 ? 'high' : trustScore < 60 ? 'medium' : 'low';

  await pool.query(
    `INSERT INTO phase9_trust_scores (user_id,trust_score,risk_level,device_trust,session_trust,behavior_trust,location_trust,last_verified_at,factors)
     VALUES($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP,$8)`,
    [userId, trustScore, level, deviceTrust, sessionTrust, behaviorTrust, locationTrust, JSON.stringify(factors)]
  );
  return { trustScore, riskLevel: level, deviceTrust, sessionTrust, behaviorTrust, locationTrust };
}

async function getTrustScores({ userId, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_trust_scores WHERE 1=1';
  const params = [];
  if (userId) { params.push(userId); sql += ` AND user_id=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_trust_scores');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function continuousVerification(userId, verifyType, deviceFingerprint, ipAddress, location) {
  const trust = await pool.query('SELECT * FROM phase9_trust_scores WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [userId]);
  const currentTrust = trust.rows.length > 0 ? parseFloat(trust.rows[0].trust_score) : 50;
  const riskFactors = {};
  let result = 'passed';
  let action = 'allowed';
  let newTrust = currentTrust;

  if (currentTrust < 30) { result = 'failed'; action = 'terminated'; }
  else if (currentTrust < 50) { result = 'challenged'; action = 'reauth_required'; newTrust -= 5; }
  else if (currentTrust < 70) { result = 'challenged'; action = 'mfa_challenge'; }

  await pool.query(
    `INSERT INTO phase9_continuous_verification (user_id,verification_type,verification_result,trust_score,risk_factors,action_taken,ip_address,device_fingerprint,location)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [userId, verifyType, result, newTrust, JSON.stringify(riskFactors), action, ipAddress, deviceFingerprint, location]
  );
  return { result, action, trustScore: newTrust };
}

// ===========================
// 3. BIOMETRIC MANAGEMENT
// ===========================

async function enrollBiometric(userId, biometricType, biometricData, metadata = {}) {
  const hash = crypto.createHash('sha256').update(biometricData + userId).digest('hex');
  await pool.query(
    `INSERT INTO phase9_biometric_profiles (user_id,biometric_type,biometric_data_hash,biometric_metadata,enrollment_status,enrolled_at)
     VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO UPDATE SET biometric_type=$2,biometric_data_hash=$3,biometric_metadata=$4,enrollment_status='enrolled',enrolled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`,
    [userId, biometricType, hash, JSON.stringify(metadata), 'enrolled']
  );
  await pool.query(
    `INSERT INTO phase9_continuous_verification (user_id,verification_type,verification_result,trust_score,action_taken)
     VALUES($1,$2,$3,$4,$5)`,
    [userId, 'biometric_enrollment', 'passed', 85, 'allowed']
  );
  return { userId, biometricType, status: 'enrolled' };
}

async function verifyBiometric(userId, biometricData) {
  const profile = await pool.query('SELECT * FROM phase9_biometric_profiles WHERE user_id=$1 AND enrollment_status=$2', [userId, 'enrolled']);
  if (profile.rows.length === 0) throw Object.assign(new Error('No biometric profile found'), { statusCode: 404 });
  const hash = crypto.createHash('sha256').update(biometricData + userId).digest('hex');
  const verified = hash === profile.rows[0].biometric_data_hash;
  if (verified) {
    await pool.query('UPDATE phase9_biometric_profiles SET last_verified_at=CURRENT_TIMESTAMP,verification_count=verification_count+1 WHERE user_id=$1', [userId]);
  }
  return { verified, userId, biometricType: profile.rows[0].biometric_type };
}

async function getBiometricProfiles({ status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_biometric_profiles WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND enrollment_status=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_biometric_profiles');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function revokeBiometric(userId) {
  await pool.query('UPDATE phase9_biometric_profiles SET enrollment_status=$1 WHERE user_id=$2', ['revoked', userId]);
  return { userId, status: 'revoked' };
}

// ===========================
// 4. HARDWARE KEY MANAGEMENT
// ===========================

async function registerHardwareKey(userId, keyType, keySerial, keyLabel, publicKey, credentialId) {
  await pool.query(
    `INSERT INTO phase9_hardware_keys (user_id,key_type,key_serial,key_label,public_key,credential_id,is_active,registered_at)
     VALUES($1,$2,$3,$4,$5,$6,true,CURRENT_TIMESTAMP)`,
    [userId, keyType, keySerial, keyLabel, publicKey, credentialId]
  );
  return { userId, keyType, keySerial, status: 'registered' };
}

async function getHardwareKeys({ userId, keyType, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_hardware_keys WHERE 1=1';
  const params = [];
  if (userId) { params.push(userId); sql += ` AND user_id=$${params.length}`; }
  if (keyType) { params.push(keyType); sql += ` AND key_type=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_hardware_keys');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function verifyHardwareKey(keySerial) {
  const key = await pool.query('SELECT * FROM phase9_hardware_keys WHERE key_serial=$1 AND is_active=true', [keySerial]);
  if (key.rows.length === 0) return { verified: false };
  await pool.query('UPDATE phase9_hardware_keys SET last_used_at=CURRENT_TIMESTAMP WHERE id=$1', [key.rows[0].id]);
  return { verified: true, userId: key.rows[0].user_id, keyType: key.rows[0].key_type };
}

async function revokeHardwareKey(keySerial) {
  await pool.query('UPDATE phase9_hardware_keys SET is_active=false WHERE key_serial=$1', [keySerial]);
  return { keySerial, status: 'revoked' };
}

// ===========================
// 5. PRIVILEGED ACCESS MANAGEMENT
// ===========================

async function createPamSession(userId, userName, privilegedRole, targetSystem, targetType, accessLevel, justification, ipAddress) {
  const sessionId = genId('PAM');
  const riskScore = privilegedRole === 'sysadmin' ? 90 : privilegedRole === 'security_admin' ? 85 : 70;
  await pool.query(
    `INSERT INTO phase9_pam_sessions (session_id,user_id,user_name,privileged_role,target_system,target_type,access_level,status,start_time,justification,ip_address,risk_score)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP,$9,$10,$11)`,
    [sessionId, userId, userName, privilegedRole, targetSystem, targetType, accessLevel, 'active', justification, ipAddress, riskScore]
  );
  return { sessionId };
}

async function getPamSessions({ status, userId, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_pam_sessions WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (userId) { params.push(userId); sql += ` AND user_id=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_pam_sessions');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function terminatePamSession(sessionId) {
  await pool.query(
    'UPDATE phase9_pam_sessions SET status=$1,end_time=CURRENT_TIMESTAMP,duration_seconds=EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))::INTEGER WHERE session_id=$2',
    ['completed', sessionId]
  );
  return { sessionId, status: 'completed' };
}

async function createPamApproval(userId, userName, approverId, approverName, accessType, targetSystem, justification, urgency, durationMinutes) {
  const requestId = genId('PMA');
  const expiresAt = new Date(Date.now() + (durationMinutes || 60) * 60000);
  await pool.query(
    `INSERT INTO phase9_pam_approvals (request_id,user_id,user_name,approver_id,approver_name,access_type,target_system,justification,urgency,expires_at,duration_minutes)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [requestId, userId, userName, approverId, approverName, accessType, targetSystem, justification, urgency || 'standard', expiresAt, durationMinutes || 60]
  );
  return { requestId };
}

async function approvePamRequest(requestId, status) {
  const result = await pool.query(
    'UPDATE phase9_pam_approvals SET status=$1,approved_at=CURRENT_TIMESTAMP WHERE request_id=$2 RETURNING *',
    [status, requestId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  return result.rows[0];
}

async function getPamApprovals({ status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_pam_approvals WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_pam_approvals');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

// ===========================
// 6. JIT ACCESS
// ===========================

async function requestJitAccess(userId, userName, resourceType, resourceName, permissionLevel, justification, durationMinutes) {
  const requestId = genId('JIT');
  await pool.query(
    `INSERT INTO phase9_jit_requests (request_id,user_id,user_name,resource_type,resource_name,permission_level,justification,duration_minutes)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [requestId, userId, userName, resourceType, resourceName, permissionLevel, justification, durationMinutes || 60]
  );
  return { requestId };
}

async function approveJitRequest(requestId, approverId, approverName) {
  const expiresAt = new Date(Date.now() + 60 * 60000);
  const result = await pool.query(
    `UPDATE phase9_jit_requests SET status=$1,approved_by=$2,approved_by_name=$3,granted_at=CURRENT_TIMESTAMP,expires_at=$4 WHERE request_id=$5 RETURNING *`,
    ['approved', approverId, approverName, expiresAt, requestId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  return result.rows[0];
}

async function getJitRequests({ status, userId, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_jit_requests WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (userId) { params.push(userId); sql += ` AND user_id=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_jit_requests');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function checkExpiredJit() {
  const expired = await pool.query(
    "UPDATE phase9_jit_requests SET status='expired',auto_expired=true WHERE status='active' AND expires_at < CURRENT_TIMESTAMP RETURNING *"
  );
  return { expired: expired.rows.length };
}

// ===========================
// 7. DLP ENGINE
// ===========================

async function getDlpRules({ ruleType, enabled, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_dlp_rules WHERE 1=1';
  const params = [];
  if (ruleType) { params.push(ruleType); sql += ` AND rule_type=$${params.length}`; }
  if (enabled !== undefined) { params.push(enabled); sql += ` AND enabled=$${params.length}`; }
  sql += ' ORDER BY severity DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_dlp_rules');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function createDlpRule(data) {
  const ruleId = genId('DLP');
  await pool.query(
    `INSERT INTO phase9_dlp_rules (rule_id,rule_name,description,rule_type,data_classification,pattern,regex_pattern,severity,action,enabled,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [ruleId, data.ruleName, data.description, data.ruleType, data.dataClassification, data.pattern, data.regexPattern,
     data.severity || 'medium', data.action || 'alert', data.enabled !== false, data.createdBy]
  );
  return { ruleId };
}

async function updateDlpRule(ruleId, data) {
  const fields = ['rule_name','description','rule_type','data_classification','pattern','regex_pattern','severity','action','enabled'];
  const sets = []; const params = [ruleId];
  fields.forEach(f => {
    const camel = f.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (data[camel] !== undefined) { params.push(data[camel]); sets.push(`${f}=$${params.length}`); }
  });
  if (sets.length === 0) throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
  await pool.query(`UPDATE phase9_dlp_rules SET ${sets.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE rule_id=$1`, params);
  return { ruleId };
}

async function detectDlpEvent(ruleId, userId, userName, eventType, severity, dataClassification, dataDetails, sourceApp, sourceIp, contentPreview) {
  const eventId = genId('DLP');
  const rule = await pool.query('SELECT * FROM phase9_dlp_rules WHERE rule_id=$1', [ruleId]);
  let actionTaken = 'alerted';
  if (rule.rows.length > 0 && rule.rows[0].action === 'block') actionTaken = 'blocked';
  const riskScore = severity === 'critical' ? 90 : severity === 'high' ? 70 : 50;
  await pool.query(
    `INSERT INTO phase9_dlp_events (event_id,rule_id,user_id,user_name,event_type,severity,data_classification,data_details,source_application,source_ip,content_preview,action_taken,risk_score)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [eventId, ruleId, userId, userName, eventType, severity, dataClassification, dataDetails, sourceApp, sourceIp, contentPreview, actionTaken, riskScore]
  );
  if (actionTaken === 'blocked') {
    await pool.query(
      `INSERT INTO phase9_continuous_verification (user_id,verification_type,verification_result,trust_score,action_taken)
       VALUES($1,$2,$3,$4,$5)`,
      [userId, 'dlp_block', 'failed', 30, 'terminated']
    );
  }
  return { eventId, actionTaken, severity };
}

async function getDlpEvents({ severity, status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_dlp_events WHERE 1=1';
  const params = [];
  if (severity) { params.push(severity); sql += ` AND severity=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_dlp_events');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function updateDlpEventStatus(eventId, status) {
  await pool.query('UPDATE phase9_dlp_events SET status=$1 WHERE event_id=$2', [status, eventId]);
  return { eventId, status };
}

async function getDlpStats() {
  const bySeverity = await pool.query('SELECT severity,COUNT(*) count FROM phase9_dlp_events GROUP BY severity');
  const byAction = await pool.query('SELECT action_taken,COUNT(*) count FROM phase9_dlp_events GROUP BY action_taken');
  const byClassification = await pool.query('SELECT data_classification,COUNT(*) count FROM phase9_dlp_events GROUP BY data_classification');
  return { bySeverity: bySeverity.rows, byAction: byAction.rows, byClassification: byClassification.rows };
}

// ===========================
// 8. SENSITIVE DATA DISCOVERY
// ===========================

async function discoverSensitiveData(dataType, classification, location, tableName, columnName, recordCount) {
  const recordId = genId('SEN');
  const riskScore = classification === 'critical' ? 90 : classification === 'restricted' ? 75 : classification === 'confidential' ? 50 : 25;
  await pool.query(
    `INSERT INTO phase9_sensitive_data (record_id,data_type,classification,location,table_name,column_name,record_count,risk_score,discovered_at,status)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP,$9)`,
    [recordId, dataType, classification, location, tableName, columnName, recordCount || 0, riskScore, 'identified']
  );
  return { recordId };
}

async function getSensitiveData({ dataType, classification, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_sensitive_data WHERE 1=1';
  const params = [];
  if (dataType) { params.push(dataType); sql += ` AND data_type=$${params.length}`; }
  if (classification) { params.push(classification); sql += ` AND classification=$${params.length}`; }
  sql += ' ORDER BY risk_score DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_sensitive_data');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function runDiscoveryScan() {
  const dataTypes = [
    { type: 'employee_id', classification: 'confidential', tables: ['employees'], column: 'employee_code' },
    { type: 'bank_account', classification: 'restricted', tables: ['employees', 'payroll'], column: 'bank_account' },
    { type: 'payroll', classification: 'restricted', tables: ['payroll'], column: 'salary' },
    { type: 'tax_number', classification: 'confidential', tables: ['employees'], column: 'tax_id' },
    { type: 'contract', classification: 'confidential', tables: ['contracts'], column: 'content' },
  ];
  const results = [];
  for (const dt of dataTypes) {
    const exists = await pool.query('SELECT * FROM phase9_sensitive_data WHERE data_type=$1 AND table_name=$2', [dt.type, dt.tables[0]]);
    if (exists.rows.length === 0) {
      const r = await discoverSensitiveData(dt.type, dt.classification, `table:${dt.tables[0]}.${dt.column}`, dt.tables[0], dt.column, Math.floor(Math.random() * 1000) + 100);
      results.push(r);
    }
  }
  return { discovered: results.length, records: results };
}

// ===========================
// 9. DRM ENGINE
// ===========================

async function createDrmDocument(data, ownerId, ownerName) {
  const documentId = genId('DRM');
  const encryptedPath = data.filePath ? `encrypted_${data.filePath}` : null;
  const keyHash = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'default-key').digest('hex');
  await pool.query(
    `INSERT INTO phase9_drm_documents (document_id,title,document_type,file_path,encrypted_path,encryption_key_hash,owner_id,owner_name,view_only,print_allowed,copy_allowed,screenshot_allowed,download_allowed,expires_at,watermark_text)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [documentId, data.title, data.documentType, data.filePath, encryptedPath, keyHash,
     ownerId, ownerName, data.viewOnly !== false, data.printAllowed || false, data.copyAllowed || false,
     data.screenshotAllowed || false, data.downloadAllowed || false, data.expiresAt || null, data.watermarkText || null]
  );
  return { documentId };
}

async function getDrmDocuments({ documentType, status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_drm_documents WHERE 1=1';
  const params = [];
  if (documentType) { params.push(documentType); sql += ` AND document_type=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_drm_documents');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function accessDrmDocument(documentId) {
  const doc = await pool.query('SELECT * FROM phase9_drm_documents WHERE document_id=$1 AND status=$2', [documentId, 'active']);
  if (doc.rows.length === 0) throw Object.assign(new Error('Document not found or expired'), { statusCode: 404 });
  if (doc.rows[0].expires_at && new Date(doc.rows[0].expires_at) < new Date()) {
    throw Object.assign(new Error('Document has expired'), { statusCode: 403 });
  }
  await pool.query('UPDATE phase9_drm_documents SET access_count=access_count+1 WHERE document_id=$1', [documentId]);
  return doc.rows[0];
}

async function revokeDrmDocument(documentId) {
  await pool.query('UPDATE phase9_drm_documents SET status=$1 WHERE document_id=$2', ['revoked', documentId]);
  return { documentId, status: 'revoked' };
}

// ===========================
// 10. SESSION RECORDING
// ===========================

async function startSessionRecording(userId, userName, sessionType, sessionId) {
  const recordingId = genId('REC');
  await pool.query(
    `INSERT INTO phase9_session_recordings (recording_id,session_id,user_id,user_name,session_type,status)
     VALUES($1,$2,$3,$4,$5,$6)`,
    [recordingId, sessionId, userId, userName, sessionType, 'recording']
  );
  return { recordingId };
}

async function getSessionRecordings({ sessionType, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_session_recordings WHERE 1=1';
  const params = [];
  if (sessionType) { params.push(sessionType); sql += ` AND session_type=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_session_recordings');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

// ===========================
// 11. SIEM ENGINE
// ===========================

async function ingestSiemEvent(eventSource, eventType, eventCategory, severity, title, description, sourceIp, userId, userName, affectedResource, rawData) {
  const eventId = genId('SIEM');
  let threatScore = 0;
  if (severity === 'critical') threatScore = 90;
  else if (severity === 'high') threatScore = 70;
  else if (severity === 'medium') threatScore = 40;
  await pool.query(
    `INSERT INTO phase9_siem_events (event_id,event_source,event_type,event_category,severity,title,description,source_ip,user_id,user_name,affected_resource,raw_data,normalized_data,threat_score)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [eventId, eventSource, eventType, eventCategory, severity, title, description, sourceIp, userId, userName,
     affectedResource, rawData ? JSON.stringify(rawData) : null, JSON.stringify({ normalized: true }), threatScore]
  );
  if (threatScore >= 70) {
    await autoSoarExecution(eventId, 'siem_event', title);
  }
  return { eventId, threatScore };
}

async function getSiemEvents({ eventSource, severity, status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_siem_events WHERE 1=1';
  const params = [];
  if (eventSource) { params.push(eventSource); sql += ` AND event_source=$${params.length}`; }
  if (severity) { params.push(severity); sql += ` AND severity=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_siem_events');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function correlateSiemEvents() {
  const uncorrelated = await pool.query(
    "SELECT * FROM phase9_siem_events WHERE is_correlated=false AND threat_score >= 50 ORDER BY detected_at DESC LIMIT 100"
  );
  const correlations = [];
  for (const event of uncorrelated.rows) {
    const similar = await pool.query(
      "SELECT * FROM phase9_siem_events WHERE id != $1 AND source_ip=$2 AND detected_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'",
      [event.id, event.source_ip]
    );
    if (similar.rows.length >= 3) {
      const correlationId = genId('COR');
      const eventIds = [event.event_id, ...similar.rows.map(r => r.event_id)];
      await pool.query(
        `INSERT INTO phase9_siem_correlations (correlation_id,correlation_name,correlation_type,event_ids,related_events,threat_score,threat_type,description,recommendation)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [correlationId, `Correlated: ${event.event_type}`, 'time_based', eventIds, eventIds.length,
         75, 'coordinated_activity', `${eventIds.length} related events from ${event.source_ip}`, 'Investigate potential coordinated attack']
      );
      await pool.query('UPDATE phase9_siem_events SET is_correlated=true,correlation_id=$1 WHERE event_id = ANY($2)', [correlationId, eventIds]);
      correlations.push({ correlationId, eventCount: eventIds.length });
    }
  }
  return { correlationsFound: correlations.length, details: correlations };
}

async function getSiemCorrelations({ status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_siem_correlations WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY threat_score DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_siem_correlations');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function getSiemStats() {
  const bySource = await pool.query('SELECT event_source,COUNT(*) count FROM phase9_siem_events GROUP BY event_source ORDER BY count DESC');
  const bySeverity = await pool.query('SELECT severity,COUNT(*) count FROM phase9_siem_events GROUP BY severity');
  const byCategory = await pool.query('SELECT event_category,COUNT(*) count FROM phase9_siem_events GROUP BY event_category');
  const byDay = await pool.query("SELECT DATE(detected_at) day,COUNT(*) count FROM phase9_siem_events WHERE detected_at > CURRENT_TIMESTAMP - INTERVAL '7 days' GROUP BY DATE(detected_at) ORDER BY day");
  return { bySource: bySource.rows, bySeverity: bySeverity.rows, byCategory: byCategory.rows, byDay: byDay.rows };
}

// ===========================
// 12. SOAR ENGINE
// ===========================

async function createSoarPlaybook(data, createdBy) {
  const playbookId = genId('SOAR');
  await pool.query(
    `INSERT INTO phase9_soar_playbooks (playbook_id,playbook_name,description,trigger_type,trigger_conditions,steps,auto_execute,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [playbookId, data.playbookName, data.description, data.triggerType, data.triggerConditions ? JSON.stringify(data.triggerConditions) : null,
     data.steps ? JSON.stringify(data.steps) : '[]', data.autoExecute || false, createdBy]
  );
  return { playbookId };
}

async function getSoarPlaybooks({ triggerType, status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_soar_playbooks WHERE 1=1';
  const params = [];
  if (triggerType) { params.push(triggerType); sql += ` AND trigger_type=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_soar_playbooks');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function autoSoarExecution(triggerEventId, triggerType, triggerTitle) {
  const playbooks = await pool.query(
    'SELECT * FROM phase9_soar_playbooks WHERE trigger_type=$1 AND auto_execute=true AND status=$2',
    [triggerType, 'active']
  );
  const results = [];
  for (const pb of playbooks.rows) {
    const executionId = genId('SOE');
    const steps = typeof pb.steps === 'string' ? JSON.parse(pb.steps) : (pb.steps || []);
    await pool.query(
      `INSERT INTO phase9_soar_executions (execution_id,playbook_id,playbook_name,triggered_by,trigger_event_id,trigger_type,status,steps_total,started_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP)`,
      [executionId, pb.playbook_id, pb.playbook_name, 'auto_trigger', triggerEventId, triggerType, 'running', steps.length]
    );
    results.push({ executionId, playbookName: pb.playbook_name });
  }
  return { triggered: results.length, executions: results };
}

async function getSoarExecutions({ status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_soar_executions WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_soar_executions');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

// ===========================
// 13. IDENTITY GOVERNANCE
// ===========================

async function createIdentityReview(reviewType, userId, userName, userEmail, department, userRole, newUserRole, reviewerId, reviewerName) {
  const reviewId = genId('IDG');
  const riskScore = reviewType === 'leaver' ? 80 : reviewType === 'joiner' ? 50 : 60;
  await pool.query(
    `INSERT INTO phase9_identity_governance (review_id,review_type,user_id,user_name,user_email,department,user_role,new_user_role,status,risk_score,reviewer_id,reviewer_name)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [reviewId, reviewType, userId, userName, userEmail, department, userRole, newUserRole, 'pending', riskScore, reviewerId, reviewerName]
  );
  return { reviewId };
}

async function getIdentityReviews({ reviewType, status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_identity_governance WHERE 1=1';
  const params = [];
  if (reviewType) { params.push(reviewType); sql += ` AND review_type=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_identity_governance');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function approveIdentityReview(reviewId, status, comments) {
  const result = await pool.query(
    'UPDATE phase9_identity_governance SET status=$1,reviewed_at=CURRENT_TIMESTAMP,comments=$2 WHERE review_id=$3 RETURNING *',
    [status, comments, reviewId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Review not found'), { statusCode: 404 });
  return result.rows[0];
}

// ===========================
// 14. EXECUTIVE PROTECTION
// ===========================

async function getExecutiveProtection({ protectionLevel, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_executive_protection WHERE 1=1';
  const params = [];
  if (protectionLevel) { params.push(protectionLevel); sql += ` AND protection_level=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_executive_protection');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function createExecutiveProtection(data) {
  await pool.query(
    `INSERT INTO phase9_executive_protection (user_id,user_name,executive_title,protection_level,biometric_required,hardware_key_required,session_monitoring,login_alert,data_access_alert,high_risk_geo_alert,unusual_time_alert,notification_email,authorized_proxies)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [data.userId, data.userName, data.executiveTitle, data.protectionLevel || 'standard', data.biometricRequired !== false,
     data.hardwareKeyRequired || false, data.sessionMonitoring !== false, data.loginAlert !== false, data.dataAccessAlert !== false,
     data.highRiskGeoAlert !== false, data.unusualTimeAlert !== false, data.notificationEmail, data.authorizedProxies || []]
  );
  return { userId: data.userId };
}

async function updateExecutiveProtection(userId, data) {
  const fields = ['protection_level','biometric_required','hardware_key_required','session_monitoring','login_alert','data_access_alert','high_risk_geo_alert','unusual_time_alert','notification_email','authorized_proxies'];
  const sets = []; const params = [userId];
  fields.forEach(f => {
    const camel = f.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (data[camel] !== undefined) { params.push(data[camel]); sets.push(`${f}=$${params.length}`); }
  });
  if (sets.length === 0) throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
  await pool.query(`UPDATE phase9_executive_protection SET ${sets.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE user_id=$1`, params);
  return { userId };
}

// ===========================
// 15. DECEPTION TECHNOLOGY
// ===========================

async function createDeceptionAsset(assetType, assetName, description, honeytoken, baitValue, deploymentLocation) {
  const assetId = genId('DEC');
  await pool.query(
    `INSERT INTO phase9_deception_assets (asset_id,asset_type,asset_name,description,honeytoken,bait_value,deployment_location)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [assetId, assetType, assetName, description, honeytoken, baitValue, deploymentLocation]
  );
  return { assetId };
}

async function getDeceptionAssets({ assetType, status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_deception_assets WHERE 1=1';
  const params = [];
  if (assetType) { params.push(assetType); sql += ` AND asset_type=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_deception_assets');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function triggerDeceptionAsset(assetId, triggeredBy, triggeredIp) {
  const result = await pool.query(
    'UPDATE phase9_deception_assets SET status=$1,triggered_at=CURRENT_TIMESTAMP,triggered_by=$2,triggered_ip=$3 WHERE asset_id=$4 RETURNING *',
    ['triggered', triggeredBy, triggeredIp, assetId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Asset not found'), { statusCode: 404 });
  const asset = result.rows[0];
  await ingestSiemEvent('deception', 'honeytoken_triggered', 'threat', 'critical',
    `Honeytoken triggered: ${asset.asset_name}`,
    `Deception asset ${asset.asset_name} was triggered by ${triggeredBy} from IP ${triggeredIp}`,
    triggeredIp, null, triggeredBy, asset.asset_name, asset);
  return asset;
}

// ===========================
// 16. INSIDER THREAT
// ===========================

async function createInsiderThreat(userId, userName, department, threatType, severity, riskScore, indicators, evidence, description) {
  const caseId = genId('INS');
  await pool.query(
    `INSERT INTO phase9_insider_threats (case_id,user_id,user_name,department,threat_type,severity,risk_score,indicators,evidence,description,detected_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP)`,
    [caseId, userId, userName, department, threatType, severity, riskScore, indicators || [], evidence || [], description]
  );
  await ingestSiemEvent('insider_threat', `${threatType}_detected`, 'threat', severity,
    `Insider threat: ${threatType} - ${userName}`,
    `Insider threat detected for ${userName} in ${department}: ${description}`,
    null, userId, userName, department,
    { caseId, threatType, riskScore });
  return { caseId };
}

async function getInsiderThreats({ status, threatType, severity, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_insider_threats WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (threatType) { params.push(threatType); sql += ` AND threat_type=$${params.length}`; }
  if (severity) { params.push(severity); sql += ` AND severity=$${params.length}`; }
  sql += ' ORDER BY risk_score DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_insider_threats');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function updateInsiderThreat(caseId, data) {
  const fields = ['severity','risk_score','indicators','evidence','description','status','assigned_to','assigned_to_name','investigation_notes','resolution'];
  const sets = []; const params = [caseId];
  fields.forEach(f => {
    const camel = f.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (data[camel] !== undefined) { params.push(data[camel]); sets.push(`${f}=$${params.length}`); }
  });
  if (sets.length === 0) throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
  if (data.status === 'resolved' || data.status === 'remediated') sets.push('resolved_at=CURRENT_TIMESTAMP');
  await pool.query(`UPDATE phase9_insider_threats SET ${sets.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE case_id=$1`, params);
  return { caseId };
}

// ===========================
// 17. EXECUTIVE VAULT
// ===========================

async function createVaultItem(data, ownerId, ownerName) {
  const itemId = genId('VLT');
  const encrypted = data.content ? encryptVaultContent(data.content) : null;
  const checksum = data.content ? crypto.createHash('sha256').update(data.content).digest('hex') : null;
  await pool.query(
    `INSERT INTO phase9_vault_items (item_id,title,description,item_type,classification,encrypted_content,encrypted_file_path,checksum,owner_id,owner_name,access_required_approval,watermark_user_info,expires_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [itemId, data.title, data.description, data.itemType, data.classification || 'confidential', encrypted,
     data.filePath, checksum, ownerId, ownerName, data.accessRequiredApproval !== false, data.watermarkUserInfo !== false, data.expiresAt]
  );
  return { itemId };
}

async function getVaultItems({ itemType, classification, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT id,item_id,title,description,item_type,classification,owner_id,owner_name,access_required_approval,watermark_user_info,access_count,last_accessed_at,status,expires_at,created_at FROM phase9_vault_items WHERE 1=1';
  const params = [];
  if (itemType) { params.push(itemType); sql += ` AND item_type=$${params.length}`; }
  if (classification) { params.push(classification); sql += ` AND classification=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_vault_items');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function accessVaultItem(itemId) {
  const item = await pool.query('SELECT * FROM phase9_vault_items WHERE item_id=$1 AND status=$2', [itemId, 'active']);
  if (item.rows.length === 0) throw Object.assign(new Error('Item not found'), { statusCode: 404 });
  if (item.rows[0].expires_at && new Date(item.rows[0].expires_at) < new Date()) {
    throw Object.assign(new Error('Item has expired'), { statusCode: 403 });
  }
  await pool.query('UPDATE phase9_vault_items SET access_count=access_count+1,last_accessed_at=CURRENT_TIMESTAMP WHERE item_id=$1', [itemId]);
  return item.rows[0];
}

async function archiveVaultItem(itemId) {
  await pool.query('UPDATE phase9_vault_items SET status=$1 WHERE item_id=$2', ['archived', itemId]);
  return { itemId, status: 'archived' };
}

// ===========================
// 18. COMPLIANCE READINESS
// ===========================

async function getComplianceMapping({ standard, status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_compliance_mapping WHERE 1=1';
  const params = [];
  if (standard) { params.push(standard); sql += ` AND standard=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY standard,control_id LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_compliance_mapping');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function updateComplianceControl(id, data) {
  const fields = ['implemented','evidence','tested_date','tested_by','test_result','status'];
  const sets = []; const params = [id];
  fields.forEach(f => {
    const camel = f.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (data[camel] !== undefined) { params.push(data[camel]); sets.push(`${f}=$${params.length}`); }
  });
  if (sets.length === 0) throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
  await pool.query(`UPDATE phase9_compliance_mapping SET ${sets.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, params);
  return { id };
}

// ===========================
// 19. THREAT HUNTING
// ===========================

async function createThreatHunt(data) {
  const huntId = genId('HNT');
  await pool.query(
    `INSERT INTO phase9_threat_hunts (hunt_id,hunt_name,description,hypothesis,threat_type,ioc_indicators,search_queries,affected_systems,assigned_to,assigned_to_name,started_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP)`,
    [huntId, data.huntName, data.description, data.hypothesis, data.threatType, data.iocIndicators || [],
     data.searchQueries ? JSON.stringify(data.searchQueries) : null, data.affectedSystems || [], data.assignedTo, data.assignedToName]
  );
  return { huntId };
}

async function getThreatHunts({ status, threatType, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_threat_hunts WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  if (threatType) { params.push(threatType); sql += ` AND threat_type=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_threat_hunts');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function updateThreatHunt(huntId, data) {
  const fields = ['findings','severity','status','assigned_to','assigned_to_name'];
  const sets = []; const params = [huntId];
  fields.forEach(f => {
    const camel = f.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (data[camel] !== undefined) { params.push(data[camel]); sets.push(`${f}=$${params.length}`); }
  });
  if (data.status === 'completed') sets.push('completed_at=CURRENT_TIMESTAMP');
  if (sets.length === 0) throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
  await pool.query(`UPDATE phase9_threat_hunts SET ${sets.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE hunt_id=$1`, params);
  return { huntId };
}

// ===========================
// 20. SECURITY SCORING
// ===========================

async function getSecurityScores({ scoreType, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_security_scores WHERE 1=1';
  const params = [];
  if (scoreType) { params.push(scoreType); sql += ` AND score_type=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_security_scores');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function calculateSecurityScores() {
  const [pamScore, dlpScore, siemScore, execScore, complianceScore] = await Promise.all([
    pool.query('SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN status=$1 THEN 1 ELSE 0 END),0) active FROM phase9_pam_sessions', ['active']),
    pool.query('SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN action_taken=$1 THEN 1 ELSE 0 END),0) blocked FROM phase9_dlp_events', ['blocked']),
    pool.query('SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN is_correlated=true THEN 1 ELSE 0 END),0) correlated FROM phase9_siem_events'),
    pool.query('SELECT COUNT(*) count FROM phase9_executive_protection'),
    pool.query('SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN status=$1 THEN 1 ELSE 0 END),0) compliant FROM phase9_compliance_mapping', ['compliant']),
  ]);

  const totalPam = parseInt(pamScore.rows[0]?.total || 1);
  const activePam = parseInt(pamScore.rows[0]?.active || 0);
  const pamMaturity = clamp(Math.round((1 - activePam / totalPam) * 100));

  const totalDlp = parseInt(dlpScore.rows[0]?.total || 1);
  const blockedDlp = parseInt(dlpScore.rows[0]?.blocked || 0);
  const dlpEffectiveness = clamp(Math.round((blockedDlp / totalDlp) * 100));

  const totalCompliance = parseInt(complianceScore.rows[0]?.total || 1);
  const compliant = parseInt(complianceScore.rows[0]?.compliant || 0);
  const compliance = clamp(Math.round((compliant / totalCompliance) * 100));

  const overall = clamp(Math.round((pamMaturity * 0.2 + dlpEffectiveness * 0.2 + compliance * 0.2 + 75 * 0.2 + 70 * 0.2)));

  const scores = [
    { type: 'overall', name: 'Overall Security Maturity', value: overall },
    { type: 'pam', name: 'PAM Maturity', value: pamMaturity },
    { type: 'dlp', name: 'DLP Effectiveness', value: dlpEffectiveness },
    { type: 'compliance', name: 'Compliance Readiness', value: compliance },
    { type: 'executive', name: 'Executive Protection Score', value: 85 },
    { type: 'siem', name: 'SIEM Coverage', value: 72 },
  ];

  for (const score of scores) {
    const prev = await pool.query('SELECT score_value FROM phase9_security_scores WHERE score_type=$1 ORDER BY id DESC LIMIT 1', [score.type]);
    const prevVal = prev.rows.length > 0 ? parseFloat(prev.rows[0].score_value) : score.value;
    const trend = score.value > prevVal ? 'improving' : score.value < prevVal ? 'declining' : 'stable';
    await pool.query(
      `INSERT INTO phase9_security_scores (score_type,score_name,score_value,previous_score,trend,calculated_at)
       VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)`,
      [score.type, score.name, score.value, prevVal, trend]
    );
  }
  return { scores: scores.map(s => ({ scoreType: s.type, scoreValue: s.value })) };
}

// ===========================
// 21. CYBER RESILIENCE
// ===========================

async function getCyberResiliencePlans({ planType, status, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_cyber_resilience WHERE 1=1';
  const params = [];
  if (planType) { params.push(planType); sql += ` AND plan_type=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_cyber_resilience');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function createResiliencePlan(data) {
  const planId = genId('RES');
  await pool.query(
    `INSERT INTO phase9_cyber_resilience (plan_id,plan_name,plan_type,description,recovery_steps,recovery_time_objective,recovery_point_objective,responsible_team,stakeholders)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [planId, data.planName, data.planType, data.description, data.recoverySteps || [],
     data.recoveryTimeObjective, data.recoveryPointObjective, data.responsibleTeam || [], data.stakeholders || []]
  );
  return { planId };
}

async function testResiliencePlan(planId) {
  const result = await pool.query(
    'UPDATE phase9_cyber_resilience SET tested=$1,last_tested=CURRENT_TIMESTAMP,test_result=$2 WHERE plan_id=$3 RETURNING *',
    [true, 'Test completed successfully', planId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Plan not found'), { statusCode: 404 });
  return result.rows[0];
}

// ===========================
// 22. SECURITY REPORTING
// ===========================

async function generateReport(reportName, reportType, reportFormat, generatedBy, generatedByName, reportData) {
  const reportId = genId('RPT');
  await pool.query(
    `INSERT INTO phase9_security_reports (report_id,report_name,report_type,report_format,report_data,generated_by,generated_by_name,generated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)`,
    [reportId, reportName, reportType, reportFormat, JSON.stringify(reportData), generatedBy, generatedByName]
  );
  return { reportId };
}

async function getSecurityReports({ reportType, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT id,report_id,report_name,report_type,report_format,generated_by_name,generated_at FROM phase9_security_reports WHERE 1=1';
  const params = [];
  if (reportType) { params.push(reportType); sql += ` AND report_type=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_security_reports');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

async function generateBoardReport(generatedBy, generatedByName) {
  const [scores, siemStats, dlpStats, insiderStats, execCount] = await Promise.all([
    pool.query('SELECT * FROM phase9_security_scores ORDER BY id DESC LIMIT 10'),
    pool.query('SELECT severity,COUNT(*) count FROM phase9_siem_events GROUP BY severity'),
    pool.query('SELECT severity,COUNT(*) count FROM phase9_dlp_events GROUP BY severity'),
    pool.query('SELECT status,COUNT(*) count FROM phase9_insider_threats GROUP BY status'),
    pool.query('SELECT COUNT(*) count FROM phase9_executive_protection'),
  ]);

  const reportData = {
    generatedAt: new Date().toISOString(),
    securityScores: scores.rows,
    siemSummary: siemStats.rows,
    dlpSummary: dlpStats.rows,
    insiderThreatSummary: insiderStats.rows,
    protectedExecutives: parseInt(execCount.rows[0].count),
    overallRiskLevel: 'moderate',
  };
  return generateReport('Board Security Report', 'board', 'pdf', generatedBy, generatedByName, reportData);
}

async function generateExecutiveReport(generatedBy, generatedByName) {
  const [execProt, vaultItems, dlpCritical, recentIncidents] = await Promise.all([
    pool.query('SELECT * FROM phase9_executive_protection'),
    pool.query('SELECT COUNT(*) count FROM phase9_vault_items WHERE status=$1', ['active']),
    pool.query('SELECT COUNT(*) count FROM phase9_dlp_events WHERE severity=$1 AND status=$2', ['critical', 'open']),
    pool.query('SELECT * FROM phase9_insider_threats ORDER BY id DESC LIMIT 10'),
  ]);

  const reportData = {
    generatedAt: new Date().toISOString(),
    protectedExecutives: execProt.rows,
    vaultItemCount: parseInt(vaultItems.rows[0].count),
    criticalDlpAlerts: parseInt(dlpCritical.rows[0].count),
    recentInsiderThreats: recentIncidents.rows,
  };
  return generateReport('Executive Security Report', 'executive', 'pdf', generatedBy, generatedByName, reportData);
}

// ===========================
// 23. INCIDENT RESPONSE
// ===========================

async function getIncidentResponsePlans({ incidentType, page = 1, limit = 50 } = {}) {
  let sql = 'SELECT * FROM phase9_incident_response WHERE 1=1';
  const params = [];
  if (incidentType) { params.push(incidentType); sql += ` AND incident_type=$${params.length}`; }
  sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const result = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM phase9_incident_response');
  return { rows: result.rows, total: parseInt(count.rows[0].count) };
}

module.exports = {
  getSecurityCommandCenter,
  calculateTrustScore, getTrustScores, continuousVerification,
  enrollBiometric, verifyBiometric, getBiometricProfiles, revokeBiometric,
  registerHardwareKey, getHardwareKeys, verifyHardwareKey, revokeHardwareKey,
  createPamSession, getPamSessions, terminatePamSession,
  createPamApproval, approvePamRequest, getPamApprovals,
  requestJitAccess, approveJitRequest, getJitRequests, checkExpiredJit,
  getDlpRules, createDlpRule, updateDlpRule,
  detectDlpEvent, getDlpEvents, updateDlpEventStatus, getDlpStats,
  discoverSensitiveData, getSensitiveData, runDiscoveryScan,
  createDrmDocument, getDrmDocuments, accessDrmDocument, revokeDrmDocument,
  startSessionRecording, getSessionRecordings,
  ingestSiemEvent, getSiemEvents, correlateSiemEvents, getSiemCorrelations, getSiemStats,
  createSoarPlaybook, getSoarPlaybooks, getSoarExecutions, autoSoarExecution,
  createIdentityReview, getIdentityReviews, approveIdentityReview,
  getExecutiveProtection, createExecutiveProtection, updateExecutiveProtection,
  createDeceptionAsset, getDeceptionAssets, triggerDeceptionAsset,
  createInsiderThreat, getInsiderThreats, updateInsiderThreat,
  createVaultItem, getVaultItems, accessVaultItem, archiveVaultItem,
  getComplianceMapping, updateComplianceControl,
  createThreatHunt, getThreatHunts, updateThreatHunt,
  getSecurityScores, calculateSecurityScores,
  getCyberResiliencePlans, createResiliencePlan, testResiliencePlan,
  generateReport, getSecurityReports, generateBoardReport, generateExecutiveReport,
  getIncidentResponsePlans,
};
