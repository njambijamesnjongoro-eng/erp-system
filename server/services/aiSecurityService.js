const { Pool } = require('pg');
const { getPoolConfig } = require('../config/poolConfig');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool(getPoolConfig());

function genId(prefix) { return `${prefix}${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`; }

// ============= HELPERS =============

function calculateRiskLevel(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'informational';
}

function clamp(n, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }

// ============= FRAUD DETECTION ENGINE =============

async function detectFraud({ fraudType, title, description, entityType, entityId, entityName, department, indicators, evidence, amount, sourceModule, riskScore, confidence }) {
  const detectionId = genId('FRD');
  const severity = calculateRiskLevel(riskScore || 50);
  await pool.query(
    `INSERT INTO ai_fraud_detections (detection_id, fraud_type, title, description, severity, risk_score, confidence, entity_type, entity_id, entity_name, department, evidence, indicators, amount, source_module)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [detectionId, fraudType, title, description, severity, riskScore || 50, confidence || 75,
     entityType, entityId, entityName, department, evidence ? JSON.stringify(evidence) : null,
     indicators || [], amount || 0, sourceModule || 'general']
  );
  // Auto-create recommendation
  await createRecommendation({
    recommendationType: 'review_activity',
    title: `Review: ${title}`,
    description: `AI-detected ${fraudType} affecting ${entityName}. Risk score: ${riskScore || 50}.`,
    priority: severity,
    category: 'monitoring',
    targetEntityType: entityType,
    targetEntityId: entityId,
    targetEntityName: entityName,
    riskScore: riskScore || 50,
    source: 'ai_engine'
  });
  return { detectionId, severity };
}

async function getFraudDetections({ fraudType, severity, status, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM ai_fraud_detections WHERE 1=1';
  const params = [];
  if (fraudType) { params.push(fraudType); sql += ` AND fraud_type=$${params.length}`; }
  if (severity) { params.push(severity); sql += ` AND severity=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY risk_score DESC, created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM ai_fraud_detections');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

async function getFraudStats() {
  const types = await pool.query('SELECT fraud_type, COUNT(*) as c FROM ai_fraud_detections GROUP BY fraud_type ORDER BY c DESC');
  const severities = await pool.query('SELECT severity, COUNT(*) as c FROM ai_fraud_detections GROUP BY severity');
  const total = await pool.query('SELECT COUNT(*) as c FROM ai_fraud_detections');
  const open = await pool.query("SELECT COUNT(*) as c FROM ai_fraud_detections WHERE status='open'");
  return { total: parseInt(total.rows[0].c), open: parseInt(open.rows[0].c), byType: types.rows, bySeverity: severities.rows };
}

// Ghost Employee Detection
async function runGhostEmployeeDetection() {
  const ghosts = await pool.query(`
    SELECT u.id, u.full_name, u.email, u.status, u.created_at,
           (SELECT COUNT(*) FROM sessions s WHERE s.user_id=u.id) as login_count,
           (SELECT MAX(s.created_at) FROM sessions s WHERE s.user_id=u.id) as last_login
    FROM users u WHERE u.status='active'
    AND (SELECT COUNT(*) FROM sessions s WHERE s.user_id=u.id) < 3
  `);
  const results = [];
  for (const emp of ghosts.rows) {
    const riskScore = emp.login_count === 0 ? 85 : emp.login_count < 3 ? 60 : 30;
    if (riskScore >= 50) {
      const result = await detectFraud({
        fraudType: 'ghost_employee',
        title: `Potential Ghost Employee: ${emp.full_name}`,
        description: `Employee ${emp.full_name} (${emp.email}) has only ${emp.login_count} login(s) since account creation. Last login: ${emp.last_login || 'Never'}`,
        entityType: 'user', entityId: emp.id, entityName: emp.full_name,
        indicators: ['low_login_count', 'no_recent_activity'],
        riskScore, sourceModule: 'hr'
      });
      results.push(result);
    }
  }
  return results;
}

// Duplicate Payment Detection
async function runDuplicatePaymentDetection() {
  const dups = await pool.query(`
    SELECT p1.id, p1.invoice_number, p1.amount, p1.vendor_name, p1.payment_date,
           p2.id as dup_id, p2.invoice_number as dup_invoice, p2.payment_date as dup_date
    FROM payroll_payments p1
    JOIN payroll_payments p2 ON p1.vendor_name = p2.vendor_name AND p1.amount = p2.amount
    WHERE p1.id < p2.id AND p1.payment_date = p2.payment_date
  `);
  const results = [];
  for (const d of dups.rows) {
    const result = await detectFraud({
      fraudType: 'duplicate_payment',
      title: `Duplicate Payment: ${d.invoice_number} & ${d.dup_invoice}`,
      description: `Two payments of $${d.amount} to ${d.vendor_name} on ${d.payment_date?.slice(0,10)}`,
      entityType: 'payment', entityId: String(d.id), entityName: d.invoice_number,
      indicators: ['duplicate_amount', 'same_vendor', 'same_date'],
      amount: d.amount, riskScore: 80, sourceModule: 'finance'
    });
    results.push(result);
  }
  return results;
}

// ============= BEHAVIOR ANALYTICS =============

async function recordBehaviorEvent({ userId, userName, department, eventType, module, action, resourceType, resourceId, metadata, ipAddress, deviceFingerprint, geoLocation, sessionId }) {
  const eventId = genId('BEV');
  await pool.query(
    `INSERT INTO ai_behavior_events (event_id, user_id, user_name, department, event_type, module, action, resource_type, resource_id, metadata, ip_address, device_fingerprint, geo_location, session_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [eventId, userId, userName, department, eventType, module, action, resourceType, resourceId,
     metadata ? JSON.stringify(metadata) : null, ipAddress, deviceFingerprint, geoLocation, sessionId]
  );
  return { eventId };
}

async function analyzeUserBehavior(userId) {
  // Build a baseline profile of user behavior
  const events = await pool.query(
    'SELECT event_type, COUNT(*) as c, MIN(created_at) as first_seen, MAX(created_at) as last_seen FROM ai_behavior_events WHERE user_id=$1 GROUP BY event_type',
    [userId]
  );
  const loginHours = await pool.query(
    "SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as c FROM ai_behavior_events WHERE user_id=$1 AND event_type='login' GROUP BY hour ORDER BY hour",
    [userId]
  );
  const userInfo = await pool.query('SELECT u.id, u.full_name, u.email, u.role_name, d.name as dept FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1', [userId]);
  const u = userInfo.rows[0];
  if (!u) throw new Error('User not found');

  const avgDownloads = await pool.query("SELECT AVG(daily) FROM (SELECT DATE(created_at) as day, COUNT(*) as daily FROM ai_behavior_events WHERE user_id=$1 AND event_type='file_download' GROUP BY day) sub", [userId]);
  const avgLogins = await pool.query("SELECT AVG(daily) FROM (SELECT DATE(created_at) as day, COUNT(*) as daily FROM ai_behavior_events WHERE user_id=$1 AND event_type='login' GROUP BY day) sub", [userId]);

  // Upsert profile
  await pool.query(
    `INSERT INTO ai_user_behavior_profiles (user_id, full_name, email, department, role_name, baseline_login_hours, avg_daily_logins, avg_daily_downloads, last_analyzed_at, risk_score, risk_level)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP,0,'low')
     ON CONFLICT (user_id) DO UPDATE SET baseline_login_hours=$6, avg_daily_logins=$7, avg_daily_downloads=$8, last_analyzed_at=CURRENT_TIMESTAMP`,
    [userId, u.full_name, u.email, u.dept, u.role_name,
     JSON.stringify(loginHours.rows), parseFloat(avgLogins.rows[0]?.avg || 0).toFixed(2), parseFloat(avgDownloads.rows[0]?.avg || 0).toFixed(2)]
  );

  return { userId, totalEvents: events.rows.length, profileCreated: true };
}

async function getUserBehaviorProfiles({ riskLevel, department, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM ai_user_behavior_profiles WHERE 1=1';
  const params = [];
  if (riskLevel) { params.push(riskLevel); sql += ` AND risk_level=$${params.length}`; }
  if (department) { params.push(department); sql += ` AND department=$${params.length}`; }
  sql += ' ORDER BY risk_score DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM ai_user_behavior_profiles');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

// ============= ANOMALY DETECTION =============

async function detectAnomaly({ anomalyType, title, description, severity, entityType, entityId, entityName, department, module, expectedValue, actualValue, deviationPercentage, indicators, evidence }) {
  const anomalyId = genId('ANO');
  const score = severity === 'critical' ? 85 : severity === 'high' ? 65 : severity === 'medium' ? 45 : 25;
  await pool.query(
    `INSERT INTO ai_anomaly_events (anomaly_id, title, description, anomaly_type, severity, anomaly_score, entity_type, entity_id, entity_name, department, module, expected_value, actual_value, deviation_percentage, indicators, evidence)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [anomalyId, title, description, anomalyType, severity, score, entityType, entityId, entityName, department, module,
     expectedValue, actualValue, deviationPercentage, indicators || [], evidence ? JSON.stringify(evidence) : null]
  );
  return { anomalyId, score };
}

async function runPayrollAnomalyDetection() {
  // Check for payroll spikes > 300%
  const spikes = await pool.query(`
    SELECT pp.period_start, pp.period_end, SUM(pp.net_salary) as total_payroll,
           LAG(SUM(pp.net_salary)) OVER (ORDER BY pp.period_start) as prev_payroll
    FROM payroll_payments pp GROUP BY pp.period_start, pp.period_end
    HAVING SUM(pp.net_salary) > 1.5 * COALESCE(LAG(SUM(pp.net_salary)) OVER (ORDER BY pp.period_start), 0)
  `);
  const results = [];
  for (const s of spikes.rows) {
    const ratio = s.prev_payroll > 0 ? ((s.total_payroll - s.prev_payroll) / s.prev_payroll) * 100 : 0;
    if (ratio > 50) {
      const result = await detectAnomaly({
        anomalyType: 'payroll_anomaly',
        title: `Payroll Spike Detected: ${ratio.toFixed(0)}% Increase`,
        description: `Payroll jumped from $${parseFloat(s.prev_payroll || 0).toFixed(2)} to $${parseFloat(s.total_payroll).toFixed(2)} (${ratio.toFixed(0)}%)`,
        severity: ratio > 200 ? 'critical' : ratio > 100 ? 'high' : 'medium',
        module: 'payroll', expectedValue: `$${parseFloat(s.prev_payroll || 0).toFixed(2)}`,
        actualValue: `$${parseFloat(s.total_payroll).toFixed(2)}`, deviationPercentage: ratio,
        indicators: ['payroll_spike', 'significant_increase'],
      });
      results.push(result);
    }
  }
  return results;
}

async function getAnomalyEvents({ anomalyType, severity, status, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM ai_anomaly_events WHERE 1=1';
  const params = [];
  if (anomalyType) { params.push(anomalyType); sql += ` AND anomaly_type=$${params.length}`; }
  if (severity) { params.push(severity); sql += ` AND severity=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY anomaly_score DESC, created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM ai_anomaly_events');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

// ============= RISK SCORING =============

async function calculateUserRiskScore(userId) {
  const frauds = await pool.query("SELECT COUNT(*) as c, COALESCE(AVG(risk_score),0) as avg FROM ai_fraud_detections WHERE entity_type='user' AND entity_id=$1 AND status!='false_positive'", [userId]);
  const anomalies = await pool.query("SELECT COUNT(*) as c, COALESCE(AVG(anomaly_score),0) as avg FROM ai_anomaly_events WHERE entity_type='user' AND entity_id=$1", [userId]);
  const threats = await pool.query("SELECT COUNT(*) as c, COALESCE(AVG(risk_score),0) as avg FROM ai_insider_threats WHERE user_id=$1", [userId]);
  const events = await pool.query("SELECT COUNT(*) as c FROM ai_behavior_events WHERE user_id=$1 AND is_anomalous=true", [userId]);
  const profile = await pool.query('SELECT * FROM ai_user_behavior_profiles WHERE user_id=$1', [userId]);

  const fraudRisk = clamp((parseInt(frauds.rows[0].c) * 15) + parseFloat(frauds.rows[0].avg) * 0.3);
  const anomalyRisk = clamp((parseInt(anomalies.rows[0].c) * 10) + parseFloat(anomalies.rows[0].avg) * 0.3);
  const threatRisk = clamp((parseInt(threats.rows[0].c) * 20) + parseFloat(threats.rows[0].avg) * 0.3);
  const behaviorRisk = clamp(parseInt(events.rows[0].c) * 15);

  const overall = clamp(fraudRisk * 0.3 + anomalyRisk * 0.25 + threatRisk * 0.25 + behaviorRisk * 0.2);
  const level = calculateRiskLevel(overall);

  const prev = await pool.query("SELECT overall_score FROM ai_risk_scores WHERE score_type='user' AND entity_id=$1 ORDER BY calculated_at DESC LIMIT 1", [userId]);
  const prevScore = prev.rows[0]?.overall_score || 0;
  const change = overall - parseFloat(prevScore);
  const trend = change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable';

  await pool.query(
    `INSERT INTO ai_risk_scores (score_type, entity_id, entity_name, overall_score, risk_level, login_risk, fraud_risk, behavior_risk, threat_risk, compliance_risk, access_risk, factors, trend, previous_score, score_change, period_start, period_end)
     VALUES ('user',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,DATE_TRUNC('day', CURRENT_TIMESTAMP),DATE_TRUNC('day', CURRENT_TIMESTAMP) + INTERVAL '1 day' - INTERVAL '1 second')`,
    [userId, profile.rows[0]?.full_name || userId, Math.round(overall * 100) / 100, level,
     clamp(Math.round(behaviorRisk * 100) / 100), Math.round(fraudRisk * 100) / 100,
     Math.round(behaviorRisk * 100) / 100, Math.round(threatRisk * 100) / 100,
     Math.round(clamp(anomalyRisk) * 100) / 100, Math.round(clamp(events.rows[0].c * 5) * 100) / 100,
     JSON.stringify({ fraudCount: frauds.rows[0].c, anomalyCount: anomalies.rows[0].c, threatCount: threats.rows[0].c, anomalousEvents: events.rows[0].c }),
     trend, prevScore, Math.round(change * 100) / 100]
  );

  // Update behavior profile risk
  await pool.query('UPDATE ai_user_behavior_profiles SET risk_score=$2, risk_level=$3 WHERE user_id=$1', [userId, Math.round(overall * 100) / 100, level]);

  return { overall: Math.round(overall * 100) / 100, level, fraudRisk: Math.round(fraudRisk * 100) / 100, threatRisk: Math.round(threatRisk * 100) / 100, behaviorRisk: Math.round(behaviorRisk * 100) / 100 };
}

async function getRiskScores({ scoreType, riskLevel, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM ai_risk_scores WHERE 1=1';
  const params = [];
  if (scoreType) { params.push(scoreType); sql += ` AND score_type=$${params.length}`; }
  if (riskLevel) { params.push(riskLevel); sql += ` AND risk_level=$${params.length}`; }
  sql += ' ORDER BY calculated_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  // Deduplicate to latest per entity
  const latest = {};
  for (const r of rows) { if (!latest[r.entity_id] || new Date(r.calculated_at) > new Date(latest[r.entity_id].calculated_at)) latest[r.entity_id] = r; }
  const count = await pool.query('SELECT COUNT(*) FROM ai_risk_scores');
  return { data: Object.values(latest), total: parseInt(count.rows[0].count) };
}

async function getRiskOverview() {
  const users = await pool.query("SELECT risk_level, COUNT(*) as c FROM ai_user_behavior_profiles GROUP BY risk_level");
  const scores = await pool.query("SELECT score_type, AVG(overall_score) as avg, MAX(overall_score) as max FROM ai_risk_scores GROUP BY score_type");
  const recent = await pool.query("SELECT * FROM ai_risk_scores ORDER BY calculated_at DESC LIMIT 20");
  return { userDistribution: users.rows, averages: scores.rows, recentScores: recent.rows };
}

// ============= PREDICTIONS =============

async function generatePrediction({ predictionType, title, description, predictedEntityType, predictedEntityId, predictedEntityName, probability, severity, timeframe, factors, recommendation }) {
  const predictionId = genId('PRD');
  await pool.query(
    `INSERT INTO ai_security_predictions (prediction_id, title, description, prediction_type, predicted_entity_type, predicted_entity_id, predicted_entity_name, probability, severity, timeframe, factors, recommendation, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [predictionId, title, description, predictionType, predictedEntityType, predictedEntityId, predictedEntityName,
     clamp(probability), severity || calculateRiskLevel(probability), timeframe || 'next_30d',
     factors || [], recommendation, 'active']
  );
  return { predictionId };
}

async function getPredictions({ predictionType, status, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM ai_security_predictions WHERE 1=1';
  const params = [];
  if (predictionType) { params.push(predictionType); sql += ` AND prediction_type=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY probability DESC, created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM ai_security_predictions');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

async function runPredictions() {
  // Predict fraud attempts based on recent anomalies + fraud history
  const recentFraud = await pool.query("SELECT COUNT(*) as c FROM ai_fraud_detections WHERE created_at > NOW() - INTERVAL '30 days'");
  const anomalyTrend = await pool.query("SELECT COUNT(*) as c FROM ai_anomaly_events WHERE created_at > NOW() - INTERVAL '7 days'");
  const highRiskUsers = await pool.query("SELECT COUNT(*) as c FROM ai_user_behavior_profiles WHERE risk_level IN ('high','critical')");

  const totalFraud = parseInt(recentFraud.rows[0].c);
  const totalAnomalies = parseInt(anomalyTrend.rows[0].c);
  const totalHighRisk = parseInt(highRiskUsers.rows[0].c);

  const incidentProb = clamp(totalFraud * 5 + totalAnomalies * 3 + totalHighRisk * 10);
  const fraudProb = clamp(totalFraud * 8 + totalHighRisk * 5);

  const results = [];
  if (incidentProb > 30) {
    results.push(await generatePrediction({
      predictionType: 'security_incident',
      title: 'Increased Security Incident Risk',
      description: `${totalFraud} recent frauds, ${totalAnomalies} anomalies, ${totalHighRisk} high-risk users signal elevated incident probability.`,
      probability: incidentProb, severity: incidentProb > 70 ? 'high' : 'medium', timeframe: 'next_30d',
      factors: [`${totalFraud} fraud detections`, `${totalAnomalies} anomalies`, `${totalHighRisk} high-risk users`],
      recommendation: 'Increase monitoring frequency and review high-risk user access.'
    }));
  }
  if (fraudProb > 30) {
    results.push(await generatePrediction({
      predictionType: 'fraud_attempt',
      title: 'Elevated Fraud Risk',
      description: `Based on ${totalFraud} recent frauds and ${totalHighRisk} high-risk users, fraud attempts are likely.`,
      probability: fraudProb, severity: fraudProb > 70 ? 'high' : 'medium', timeframe: 'next_30d',
      factors: ['fraud history', 'high-risk users'],
      recommendation: 'Strengthen approval controls and review financial transactions.'
    }));
  }
  return results;
}

// ============= RECOMMENDATIONS =============

async function createRecommendation({ recommendationType, title, description, priority, category, targetEntityType, targetEntityId, targetEntityName, riskScore, impact, effort, implementationSteps, source }) {
  const recId = genId('REC');
  await pool.query(
    `INSERT INTO ai_recommendations (recommendation_id, title, description, recommendation_type, priority, category, target_entity_type, target_entity_id, target_entity_name, risk_score, impact, effort, implementation_steps, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [recId, title, description, recommendationType, priority || 'medium', category, targetEntityType, targetEntityId,
     targetEntityName, riskScore || 50, impact || '', effort || 'medium', implementationSteps || [], source || 'ai_engine']
  );
  return { recommendationId: recId };
}

async function getRecommendations({ recommendationType, priority, status, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM ai_recommendations WHERE 1=1';
  const params = [];
  if (recommendationType) { params.push(recommendationType); sql += ` AND recommendation_type=$${params.length}`; }
  if (priority) { params.push(priority); sql += ` AND priority=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY risk_score DESC, created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM ai_recommendations');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

async function getRecommendationStats() {
  const types = await pool.query("SELECT recommendation_type, COUNT(*) as c, COUNT(*) FILTER (WHERE status='open') as open FROM ai_recommendations GROUP BY recommendation_type");
  const priorities = await pool.query("SELECT priority, COUNT(*) as c FROM ai_recommendations GROUP BY priority ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END");
  const total = await pool.query('SELECT COUNT(*) as c, COUNT(*) FILTER (WHERE status!=\'implemented\') as pending FROM ai_recommendations');
  return { total: parseInt(total.rows[0].c), pending: parseInt(total.rows[0].pending), byType: types.rows, byPriority: priorities.rows };
}

// ============= INSIDER THREAT DETECTION =============

async function detectInsiderThreat({ threatType, title, description, severity, riskScore, userId, userName, department, roleName, indicators, evidence, resourceAccessed, activityCount, timeWindowHours }) {
  const threatId = genId('INT');
  await pool.query(
    `INSERT INTO ai_insider_threats (threat_id, title, description, threat_type, severity, risk_score, user_id, user_name, department, role_name, indicators, evidence, resource_accessed, activity_count, time_window_hours)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [threatId, title, description, threatType, severity || calculateRiskLevel(riskScore || 50), riskScore || 50,
     userId, userName, department, roleName, indicators || [], evidence ? JSON.stringify(evidence) : null,
     resourceAccessed, activityCount || 1, timeWindowHours || 24]
  );
  return { threatId };
}

async function runInsiderThreatDetection() {
  // Detect excessive downloads in a 24h window
  const excessiveDownloads = await pool.query(`
    SELECT user_id, user_name, department, COUNT(*) as download_count,
           MIN(created_at) as first_download, MAX(created_at) as last_download
    FROM ai_behavior_events
    WHERE event_type='file_download' AND created_at > NOW() - INTERVAL '24 hours'
    GROUP BY user_id, user_name, department
    HAVING COUNT(*) > 20
  `);
  const results = [];
  for (const ed of excessiveDownloads.rows) {
    const result = await detectInsiderThreat({
      threatType: 'excessive_download',
      title: `Excessive Downloads: ${ed.user_name}`,
      description: `${ed.user_name} downloaded ${ed.download_count} files in 24 hours (threshold: 20)`,
      riskScore: clamp(ed.download_count * 3), userId: ed.user_id, userName: ed.user_name,
      department: ed.department, indicators: ['high_download_volume', 'short_time_window'],
      resourceAccessed: 'files', activityCount: parseInt(ed.download_count), timeWindowHours: 24
    });
    results.push(result);
  }
  return results;
}

async function getInsiderThreats({ threatType, severity, status, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM ai_insider_threats WHERE 1=1';
  const params = [];
  if (threatType) { params.push(threatType); sql += ` AND threat_type=$${params.length}`; }
  if (severity) { params.push(severity); sql += ` AND severity=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY risk_score DESC, created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM ai_insider_threats');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

// ============= THREAT CORRELATION =============

async function correlateThreats() {
  // Correlate failed logins + new device + sensitive access → high risk
  const correlations = [];
  const attackChains = await pool.query(`
    SELECT
      b1.user_id, b1.user_name, b1.department,
      (SELECT COUNT(*) FROM ai_behavior_events WHERE user_id=b1.user_id AND event_type='login' AND metadata->>'success'='false' AND created_at > NOW() - INTERVAL '1 hour') as failed_logins,
      (SELECT COUNT(*) FROM ai_behavior_events WHERE user_id=b1.user_id AND event_type='file_download' AND created_at > NOW() - INTERVAL '1 hour') as recent_downloads
    FROM ai_behavior_events b1
    WHERE b1.created_at > NOW() - INTERVAL '1 hour'
    GROUP BY b1.user_id, b1.user_name, b1.department
    HAVING (SELECT COUNT(*) FROM ai_behavior_events WHERE user_id=b1.user_id AND event_type='login' AND metadata->>'success'='false' AND created_at > NOW() - INTERVAL '1 hour') > 3
    AND (SELECT COUNT(*) FROM ai_behavior_events WHERE user_id=b1.user_id AND event_type='file_download' AND created_at > NOW() - INTERVAL '1 hour') > 5
  `);

  for (const chain of attackChains.rows) {
    const corrId = genId('COR');
    const riskScore = clamp(parseInt(chain.failed_logins) * 10 + parseInt(chain.recent_downloads) * 8);
    await pool.query(
      `INSERT INTO ai_threat_correlations (correlation_id, title, description, correlation_type, severity, risk_score, related_events, entities, users, attack_pattern, recommendation)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [corrId, `Attack Chain: ${chain.user_name}`,
       `Failed logins (${chain.failed_logins}) followed by excessive downloads (${chain.recent_downloads}) suggest account compromise`,
       'attack_chain', calculateRiskLevel(riskScore), riskScore,
       [chain.failed_logins, chain.recent_downloads], [chain.user_id], [chain.user_name],
       'failed_logins → data_exfiltration',
       'Immediately investigate user activity, force password reset, and enable MFA.']
    );
    correlations.push({ correlationId: corrId, riskScore });
  }
  return correlations;
}

async function getThreatCorrelations({ correlationType, severity, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM ai_threat_correlations WHERE 1=1';
  const params = [];
  if (correlationType) { params.push(correlationType); sql += ` AND correlation_type=$${params.length}`; }
  if (severity) { params.push(severity); sql += ` AND severity=$${params.length}`; }
  sql += ' ORDER BY risk_score DESC, created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM ai_threat_correlations');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

// ============= VENDOR RISK =============

async function getVendorRiskProfiles({ riskLevel, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM ai_vendor_risk_profiles WHERE 1=1';
  const params = [];
  if (riskLevel) { params.push(riskLevel); sql += ` AND risk_level=$${params.length}`; }
  sql += ' ORDER BY risk_score DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM ai_vendor_risk_profiles');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

// ============= SECURITY AUTOMATION =============

async function createAutomationAction({ actionType, triggerSource, triggerId, triggerReason, targetEntityType, targetEntityId, targetEntityName, initiatedBy }) {
  const actionId = genId('AUT');
  await pool.query(
    `INSERT INTO ai_security_automation (action_id, action_type, trigger_source, trigger_id, trigger_reason, target_entity_type, target_entity_id, target_entity_name, initiated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [actionId, actionType, triggerSource, triggerId, triggerReason, targetEntityType, targetEntityId, targetEntityName, initiatedBy || 'ai_engine']
  );
  return { actionId };
}

async function getAutomationActions({ actionType, status, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM ai_security_automation WHERE 1=1';
  const params = [];
  if (actionType) { params.push(actionType); sql += ` AND action_type=$${params.length}`; }
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query('SELECT COUNT(*) FROM ai_security_automation');
  return { data: rows, total: parseInt(count.rows[0].count) };
}

// ============= INVESTIGATION ASSISTANT =============

async function generateInvestigationSummary({ caseType, caseId, title }) {
  const sessionId = genId('IAS');
  const frauds = await pool.query("SELECT * FROM ai_fraud_detections WHERE detection_id=$1 OR entity_id=$1", [caseId || '']);
  const anomalies = await pool.query("SELECT * FROM ai_anomaly_events WHERE anomaly_id=$1 OR entity_id=$1", [caseId || '']);
  const threats = await pool.query("SELECT * FROM ai_insider_threats WHERE threat_id=$1 OR user_id=$1", [caseId || '']);

  const entities = [];
  const timeline = [];
  const suggestions = [];
  const actions = [];

  frauds.rows.forEach(f => {
    entities.push({ type: 'fraud_detection', id: f.detection_id, name: f.title });
    timeline.push({ time: f.created_at, event: `Fraud detected: ${f.title}`, severity: f.severity });
  });
  anomalies.rows.forEach(a => {
    entities.push({ type: 'anomaly', id: a.anomaly_id, name: a.title });
    timeline.push({ time: a.created_at, event: `Anomaly: ${a.title}`, severity: a.severity });
  });
  threats.rows.forEach(t => {
    entities.push({ type: 'insider_threat', id: t.threat_id, name: t.title });
    timeline.push({ time: t.created_at, event: `Insider threat: ${t.title}`, severity: t.severity });
  });

  if (frauds.rows.length) suggestions.push('Review financial transactions for the affected period');
  if (anomalies.rows.length) suggestions.push('Verify system configurations and access controls');
  if (threats.rows.length) suggestions.push('Conduct user interview and review access logs');

  timeline.sort((a, b) => new Date(a.time) - new Date(b.time));

  const summary = `${frauds.rows.length} fraud detections, ${anomalies.rows.length} anomalies, and ${threats.rows.length} insider threats found.`;

  await pool.query(
    `INSERT INTO ai_investigation_assistant (session_id, case_type, case_id, title, summary, timeline, key_entities, root_cause_suggestions, recommended_actions, ai_confidence)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [sessionId, caseType, caseId, title, summary, JSON.stringify(timeline), JSON.stringify(entities), suggestions, actions, 75]
  );

  return { sessionId, summary, timeline, entities, suggestions };
}

// ============= AI-SOC DASHBOARD =============

async function getAISecurityDashboard() {
  const fraudStats = await getFraudStats();
  const anomalies = await pool.query("SELECT COUNT(*) as c FROM ai_anomaly_events");
  const openAnomalies = await pool.query("SELECT COUNT(*) as c FROM ai_anomaly_events WHERE status='open'");
  const predictions = await pool.query("SELECT COUNT(*) as c FROM ai_security_predictions WHERE status='active'");
  const recommendations = await getRecommendationStats();
  const insiderThreats = await pool.query("SELECT COUNT(*) as c, COUNT(*) FILTER (WHERE status NOT IN ('false_positive','mitigated')) as active FROM ai_insider_threats");
  const highRiskUsers = await pool.query("SELECT COUNT(*) as c FROM ai_user_behavior_profiles WHERE risk_level IN ('high','critical')");
  const correlations = await pool.query("SELECT COUNT(*) as c FROM ai_threat_correlations");
  const heatmaps = await pool.query("SELECT * FROM ai_security_heatmaps ORDER BY calculated_at DESC LIMIT 10");
  const recentDetections = await pool.query("SELECT * FROM ai_fraud_detections ORDER BY created_at DESC LIMIT 10");
  const recentAnomalies = await pool.query("SELECT * FROM ai_anomaly_events ORDER BY created_at DESC LIMIT 10");
  const recentPredictions = await pool.query("SELECT * FROM ai_security_predictions WHERE status='active' ORDER BY probability DESC LIMIT 5");
  const topRecommendations = await pool.query("SELECT * FROM ai_recommendations WHERE status!='implemented' ORDER BY risk_score DESC LIMIT 5");
  const recentThreats = await pool.query("SELECT * FROM ai_insider_threats WHERE status NOT IN ('false_positive','mitigated') ORDER BY risk_score DESC LIMIT 5");
  const riskOverview = await getRiskOverview();

  return {
    fraud: { total: fraudStats.total, open: fraudStats.open, byType: fraudStats.byType, bySeverity: fraudStats.bySeverity },
    anomalies: { total: parseInt(anomalies.rows[0].c), open: parseInt(openAnomalies.rows[0].c) },
    predictions: { active: parseInt(predictions.rows[0].c) },
    recommendations,
    insiderThreats: { total: parseInt(insiderThreats.rows[0].c), active: parseInt(insiderThreats.rows[0].active) },
    highRiskUsers: parseInt(highRiskUsers.rows[0].c),
    correlations: parseInt(correlations.rows[0].c),
    heatmaps: heatmaps.rows,
    recentDetections: recentDetections.rows,
    recentAnomalies: recentAnomalies.rows,
    recentPredictions: recentPredictions.rows,
    topRecommendations: topRecommendations.rows,
    recentThreats: recentThreats.rows,
    riskOverview
  };
}

// ============= HEATMAPS =============

async function calculateHeatmaps() {
  // User risk heatmap
  await pool.query(
    `INSERT INTO ai_security_heatmaps (heatmap_type, dimension, dimension_label, risk_score, risk_level, event_count, severity_distribution, period_start, period_end)
     SELECT 'user_risk', u.id::text, u.full_name, COALESCE(b.risk_score, 0),
            COALESCE(b.risk_level, 'low'),
            (SELECT COUNT(*) FROM ai_behavior_events WHERE user_id=u.id),
            (SELECT jsonb_build_object('critical', COUNT(*) FILTER (WHERE severity='critical'), 'high', COUNT(*) FILTER (WHERE severity='high'), 'medium', COUNT(*) FILTER (WHERE severity='medium')) FROM ai_fraud_detections WHERE entity_id=u.id::text),
            DATE_TRUNC('day', CURRENT_TIMESTAMP), DATE_TRUNC('day', CURRENT_TIMESTAMP) + INTERVAL '1 day' - INTERVAL '1 second'
     FROM users u LEFT JOIN ai_user_behavior_profiles b ON u.id=b.user_id
     WHERE COALESCE(b.risk_score, 0) > 0`
  );

  // Department risk heatmap
  await pool.query(
    `INSERT INTO ai_security_heatmaps (heatmap_type, dimension, dimension_label, risk_score, risk_level, event_count, severity_distribution, period_start, period_end)
     SELECT 'department_risk', d.id::text, d.name, COALESCE(AVG(b.risk_score), 0),
            CASE WHEN AVG(b.risk_score) >= 60 THEN 'high' WHEN AVG(b.risk_score) >= 40 THEN 'medium' ELSE 'low' END,
            (SELECT COUNT(*) FROM ai_behavior_events be JOIN users u2 ON be.user_id=u2.id WHERE u2.department_id=d.id),
            NULL, DATE_TRUNC('day', CURRENT_TIMESTAMP), DATE_TRUNC('day', CURRENT_TIMESTAMP) + INTERVAL '1 day' - INTERVAL '1 second'
     FROM departments d
     LEFT JOIN users u ON u.department_id=d.id
     LEFT JOIN ai_user_behavior_profiles b ON u.id=b.user_id
     GROUP BY d.id, d.name`
  );
}

async function getHeatmaps({ heatmapType, page = 1, limit = 50 }) {
  let sql = 'SELECT * FROM ai_security_heatmaps WHERE 1=1';
  const params = [];
  if (heatmapType) { params.push(heatmapType); sql += ` AND heatmap_type=$${params.length}`; }
  sql += ' ORDER BY risk_score DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(sql, params);
  const count = await pool.query("SELECT COUNT(*) FROM ai_security_heatmaps WHERE heatmap_type=$1", [heatmapType || 'user_risk']);
  return { data: rows, total: parseInt(count.rows[0].count) };
}

// ============= RUN ALL DETECTIONS =============

async function runAllDetections() {
  const results = {};
  try { results.ghostEmployees = await runGhostEmployeeDetection(); } catch (e) { results.ghostEmployees = []; }
  try { results.duplicatePayments = await runDuplicatePaymentDetection(); } catch (e) { results.duplicatePayments = []; }
  try { results.payrollAnomalies = await runPayrollAnomalyDetection(); } catch (e) { results.payrollAnomalies = []; }
  try { results.insiderThreats = await runInsiderThreatDetection(); } catch (e) { results.insiderThreats = []; }
  try { results.predictions = await runPredictions(); } catch (e) { results.predictions = []; }
  try { results.correlations = await correlateThreats(); } catch (e) { results.correlations = []; }
  return results;
}

module.exports = {
  // Fraud
  detectFraud, getFraudDetections, getFraudStats, runGhostEmployeeDetection, runDuplicatePaymentDetection,
  // Behavior
  recordBehaviorEvent, analyzeUserBehavior, getUserBehaviorProfiles,
  // Anomaly
  detectAnomaly, runPayrollAnomalyDetection, getAnomalyEvents,
  // Risk
  calculateUserRiskScore, getRiskScores, getRiskOverview,
  // Predictions
  generatePrediction, getPredictions, runPredictions,
  // Recommendations
  createRecommendation, getRecommendations, getRecommendationStats,
  // Insider Threat
  detectInsiderThreat, runInsiderThreatDetection, getInsiderThreats,
  // Correlation
  correlateThreats, getThreatCorrelations,
  // Vendor
  getVendorRiskProfiles,
  // Automation
  createAutomationAction, getAutomationActions,
  // Investigation
  generateInvestigationSummary,
  // Dashboard
  getAISecurityDashboard,
  // Heatmaps
  calculateHeatmaps, getHeatmaps,
  // Run all
  runAllDetections,
};
