const { query } = require('../config/db');
const logger = require('../utils/logger');
const { createAlert } = require('./notificationService');

const SUSPICIOUS_PATTERNS = [
  { pattern: /(\bDROP\s+TABLE|\bDELETE\s+FROM|\bTRUNCATE\b)/i, type: 'sql_attack', severity: 'critical', desc: 'SQL destruction attempt' },
  { pattern: /(\bUNION\b.*\bSELECT\b|\bSELECT\b.*\bFROM\b.*\bINTO\b)/i, type: 'sql_injection', severity: 'high', desc: 'SQL injection attempt' },
  { pattern: /(<script|<iframe|<embed|<object)/i, type: 'xss_attempt', severity: 'high', desc: 'XSS attempt' },
  { pattern: /(\/\*|\*\/|--|\$\{|\%24\{)/i, type: 'code_injection', severity: 'medium', desc: 'Code injection characters' },
  { pattern: /(\bEXEC\b|\bEXECUTE\b|\bxp_cmdshell\b)/i, type: 'command_injection', severity: 'critical', desc: 'Command execution attempt' },
  { pattern: /(\$\{|\%24\{)/i, type: 'template_injection', severity: 'high', desc: 'Template injection attempt' },
  { pattern: /(\.\.\/|\.\.\\)/i, type: 'path_traversal', severity: 'high', desc: 'Path traversal attempt' },
  { pattern: /(\bvar_dump\b|\bprint_r\b|\bphpinfo\b)/i, type: 'information_disclosure', severity: 'medium', desc: 'Information disclosure attempt' },
];

function collectStringValues(value, values = []) {
  if (typeof value === 'string') {
    values.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectStringValues(item, values));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStringValues(item, values));
  }
  return values;
}

function detectSuspiciousPayload(body, query, params) {
  const values = [
    ...collectStringValues(body),
    ...collectStringValues(query),
    ...collectStringValues(params),
  ];
  for (const { pattern, type, severity, desc } of SUSPICIOUS_PATTERNS) {
    for (const value of values) {
      pattern.lastIndex = 0;
      if (pattern.test(value)) {
        const matches = value.match(pattern);
      return { detected: true, type, severity, description: desc, match: matches ? matches[0] : null };
      }
    }
  }
  return { detected: false };
}

async function logThreat(threatType, severity, sourceIp, userId, endpoint, method, payloadSnippet, headers, description) {
  try {
    const result = await query(
      `INSERT INTO threat_detections (threat_type, severity, source_ip, user_id, endpoint, method, payload_snippet, headers, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [threatType, severity, sourceIp, userId, endpoint, method,
       payloadSnippet ? payloadSnippet.substring(0, 500) : null,
       headers ? JSON.stringify(headers) : null, description]
    );

    if (severity === 'critical' || severity === 'high') {
      const adminUsers = await query("SELECT id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name IN ('System Admin', 'Security Admin')");
      for (const admin of adminUsers.rows) {
        await createAlert(admin.id, 'suspicious_login', {
          riskScore: severity === 'critical' ? 95 : 75,
          ip: sourceIp,
          time: new Date().toLocaleString(),
          description: `${threatType}: ${description}`,
        }, ['in_app', 'email']);
      }
    }

    return result.rows[0]?.id;
  } catch (e) {
    logger.error('Failed to log threat', { error: e.message });
  }
}

async function detectRapidRequests(ip, windowMs = 60000, threshold = 60) {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM request_logs
     WHERE ip_address = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '${windowMs / 1000} seconds'`,
    [ip]
  );
  return result.rows[0].count >= threshold;
}

async function getThreatDetections(filters = {}) {
  let sql = 'SELECT * FROM threat_detections WHERE 1=1';
  const params = [];
  let i = 1;
  if (filters.severity) { sql += ` AND severity = $${i++}`; params.push(filters.severity); }
  if (filters.threatType) { sql += ` AND threat_type = $${i++}`; params.push(filters.threatType); }
  if (filters.resolved !== undefined) { sql += ` AND is_resolved = $${i++}`; params.push(filters.resolved); }
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const result = await query(sql, params);
  return result.rows;
}

async function resolveThreat(id) {
  await query('UPDATE threat_detections SET is_resolved = true, resolved_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
}

async function getThreatStats() {
  const [total, critical, high, today] = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM threat_detections WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'"),
    query("SELECT COUNT(*)::int AS count FROM threat_detections WHERE severity = 'critical' AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'"),
    query("SELECT COUNT(*)::int AS count FROM threat_detections WHERE severity = 'high' AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'"),
    query("SELECT COUNT(*)::int AS count FROM threat_detections WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'"),
  ]);
  return {
    total7d: total.rows[0].count,
    critical7d: critical.rows[0].count,
    high7d: high.rows[0].count,
    today: today.rows[0].count,
  };
}

module.exports = { detectSuspiciousPayload, logThreat, detectRapidRequests, getThreatDetections, resolveThreat, getThreatStats };
