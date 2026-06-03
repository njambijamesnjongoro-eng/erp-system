const { query } = require('../config/db');
const logger = require('../utils/logger');
const { logSecurityEvent } = require('./securityEngine');
const geoipService = require('./geoipService');

const RISK_LEVELS = [
  { max: 20, level: 'low', label: 'Low Risk' },
  { max: 50, level: 'medium', label: 'Medium Risk' },
  { max: 75, level: 'high', label: 'High Risk' },
  { max: 100, level: 'critical', label: 'Critical Risk' },
];

const WEIGHTS = {
  failed_logins: { weight: 25, max: 100 },
  new_device: { weight: 30, max: 90 },
  geo_change: { weight: 25, max: 100 },
  impossible_travel: { weight: 40, max: 100 },
  suspicious_time: { weight: 10, max: 50 },
  browser_change: { weight: 15, max: 60 },
  vpn_proxy: { weight: 20, max: 80 },
  rapid_attempts: { weight: 30, max: 100 },
  country_blocked: { weight: 35, max: 100 },
};

function getRiskLevel(score) {
  for (const r of RISK_LEVELS) {
    if (score <= r.max) return r;
  }
  return RISK_LEVELS[RISK_LEVELS.length - 1];
}

async function calculateLoginRisk(userId, factors = {}) {
  let score = 0;
  const details = {};

  if (factors.failedLoginCount !== undefined) {
    const s = Math.min(factors.failedLoginCount * 10, WEIGHTS.failed_logins.max);
    score += s * (WEIGHTS.failed_logins.weight / 100);
    details.failed_logins = { score: s, count: factors.failedLoginCount };
  }

  if (factors.isNewDevice) {
    const s = WEIGHTS.new_device.max;
    score += s * (WEIGHTS.new_device.weight / 100);
    details.new_device = { score: s };
  }

  if (factors.geoChanged) {
    const s = WEIGHTS.geo_change.max;
    score += s * (WEIGHTS.geo_change.weight / 100);
    details.geo_change = { score: s, from: factors.previousCountry, to: factors.currentCountry };
  }

  if (factors.impossibleTravel) {
    const s = WEIGHTS.impossible_travel.max;
    score += s * (WEIGHTS.impossible_travel.weight / 100);
    details.impossible_travel = { score: s, distance: factors.travelDistance };
  }

  if (factors.isVPN) {
    const s = WEIGHTS.vpn_proxy.max;
    score += s * (WEIGHTS.vpn_proxy.weight / 100);
    details.vpn_proxy = { score: s };
  }

  if (factors.isSuspiciousTime) {
    const s = WEIGHTS.suspicious_time.max;
    score += s * (WEIGHTS.suspicious_time.weight / 100);
    details.suspicious_time = { score: s, hour: factors.loginHour };
  }

  if (factors.browserChanged) {
    const s = WEIGHTS.browser_change.max;
    score += s * (WEIGHTS.browser_change.weight / 100);
    details.browser_change = { score: s };
  }

  if (factors.rapidAttempts) {
    const s = Math.min(factors.rapidAttempts * 15, WEIGHTS.rapid_attempts.max);
    score += s * (WEIGHTS.rapid_attempts.weight / 100);
    details.rapid_attempts = { score: s, count: factors.rapidAttempts };
  }

  score = Math.min(Math.round(score), 100);
  const { level, label } = getRiskLevel(score);

  return { score, level, label, factors: details };
}

async function saveRiskScore(userId, loginId, score, factors) {
  const { label } = getRiskLevel(score);
  const result = await query(
    `INSERT INTO login_risk_scores (user_id, login_id, risk_score, risk_level, factors,
     device_score, geo_score, behavioral_score, ip_reputation_score)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [userId, loginId, score, label, JSON.stringify(factors),
     factors.deviceScore || 0, factors.geoScore || 0,
     factors.behavioralScore || 0, factors.ipReputationScore || 0]
  );
  return result.rows[0];
}

async function evaluateLoginRisk(userId, context) {
  const factors = {
    failedLoginCount: context.loginAttempts || 0,
    isNewDevice: !context.isKnownDevice,
    geoChanged: context.geoChanged || false,
    impossibleTravel: context.impossibleTravel || false,
    isVPN: context.isVPN || false,
    isSuspiciousTime: isSuspiciousHour(),
    browserChanged: context.browserChanged || false,
    rapidAttempts: context.rapidAttempts || 0,
    travelDistance: context.travelDistance || 0,
    previousCountry: context.previousCountry,
    currentCountry: context.currentCountry,
    deviceScore: context.deviceRiskScore || 0,
    geoScore: context.geoRiskScore || 0,
  };

  const risk = await calculateLoginRisk(userId, factors);
  const loginId = context.loginId || null;
  await saveRiskScore(userId, loginId, risk.score, risk.factors);

  if (risk.score >= 60) {
    await logSecurityEvent(userId, 'high_risk_login', risk.score >= 80 ? 'critical' : 'high',
      `High risk login detected (score: ${risk.score}, level: ${risk.level})`,
      context.ipAddress, context.userAgent);
  }

  if (risk.score >= 75) {
    await query(
      'INSERT INTO suspicious_activities (user_id, activity_type, severity, description, risk_score, ip_address, user_agent, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [userId, 'high_risk_login', risk.score >= 85 ? 'critical' : 'high',
       `Login risk score: ${risk.score} (${risk.label})`, risk.score, context.ipAddress,
       context.userAgent, JSON.stringify(risk.factors)]
    );
  }

  return risk;
}

function isSuspiciousHour() {
  const hour = new Date().getHours();
  return hour >= 1 && hour <= 5;
}

async function detectBruteForce(ipAddress, windowMinutes = 15, threshold = 10) {
  const result = await query(
    `SELECT COUNT(*)::int AS attempt_count FROM authentication_logs
     WHERE ip_address = $1 AND status = 'FAILED' AND created_at > CURRENT_TIMESTAMP - INTERVAL '${windowMinutes} minutes'`,
    [ipAddress]
  );
  return result.rows[0].attempt_count >= threshold;
}

async function getSuspiciousActivities(userId, limit = 50) {
  const result = await query(
    'SELECT * FROM suspicious_activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows;
}

async function resolveSuspiciousActivity(id, userId, resolvedBy) {
  await query(
    'UPDATE suspicious_activities SET is_resolved = true, resolved_at = CURRENT_TIMESTAMP, resolved_by = $1 WHERE id = $2 AND user_id = $3',
    [resolvedBy, id, userId]
  );
}

async function getRiskSummary(userId) {
  const [recentScore, highRiskCount, suspiciousCount] = await Promise.all([
    query('SELECT risk_score, risk_level, created_at FROM login_risk_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]),
    query("SELECT COUNT(*)::int AS count FROM login_risk_scores WHERE user_id = $1 AND risk_level IN ('high', 'critical') AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'", [userId]),
    query('SELECT COUNT(*)::int AS count FROM suspicious_activities WHERE user_id = $1 AND is_resolved = false', [userId]),
  ]);
  return {
    currentRisk: recentScore.rows[0] || null,
    highRiskEvents7d: highRiskCount.rows[0].count,
    unresolvedSuspicious: suspiciousCount.rows[0].count,
  };
}

module.exports = {
  calculateLoginRisk, evaluateLoginRisk, saveRiskScore,
  detectBruteForce, getSuspiciousActivities, resolveSuspiciousActivity,
  getRiskSummary, getRiskLevel,
};
