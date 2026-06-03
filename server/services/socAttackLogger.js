const { query } = require('../config/db');
const logger = require('../utils/logger');

class SOCAttackLogger {
  async logAttack(attack) {
    try {
      const result = await query(
        `INSERT INTO soc_attack_events (attack_type, severity, source_ip, target_user, target_endpoint,
         http_method, user_agent, request_count, time_window_seconds, is_blocked, details)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) RETURNING *`,
        [attack.attackType, attack.severity, attack.sourceIp || null,
         attack.targetUserId || null, attack.targetEndpoint || null,
         attack.httpMethod || null, attack.userAgent || null,
         attack.requestCount || 1, attack.timeWindowSeconds || 60,
         attack.isBlocked || false, attack.details || {}]
      );
      return result.rows[0];
    } catch (err) { logger.error('Failed to log attack event', { error: err.message }); return null; }
  }

  async getAttackEvents(filters = {}) {
    let sql = 'SELECT a.*, u.full_name AS target_user_name FROM soc_attack_events a LEFT JOIN users u ON a.target_user = u.id WHERE 1=1';
    const params = []; let idx = 1;
    if (filters.attackType) { sql += ` AND a.attack_type = $${idx++}`; params.push(filters.attackType); }
    if (filters.severity) { sql += ` AND a.severity = $${idx++}`; params.push(filters.severity); }
    if (filters.ip) { sql += ` AND a.source_ip = $${idx++}`; params.push(filters.ip); }
    if (filters.blocked !== undefined) { sql += ` AND a.is_blocked = $${idx++}`; params.push(filters.blocked); }
    sql += ' ORDER BY a.created_at DESC LIMIT $' + (idx++) + ' OFFSET $' + (idx++);
    params.push(parseInt(filters.limit) || 100, parseInt(filters.offset) || 0);
    return (await query(sql, params)).rows;
  }

  async blockIP(ip) {
    await query('UPDATE soc_attack_events SET is_blocked = true WHERE source_ip = $1 AND is_blocked = false', [ip]);
    await query(
      `INSERT INTO soc_threat_intelligence (ioc_type, ioc_value, threat_type, severity, confidence, source, auto_block)
       VALUES ('ip', $1, 'auto_blocked', 'critical', 0.95, 'auto_block', true)
       ON CONFLICT (ioc_type, ioc_value) DO UPDATE SET is_active = true, last_seen = CURRENT_TIMESTAMP`,
      [ip]
    );
    return true;
  }

  async getAttackStats() {
    const [total, byType, bySeverity] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM soc_attack_events'),
      query('SELECT attack_type, COUNT(*)::int AS count FROM soc_attack_events GROUP BY attack_type ORDER BY count DESC'),
      query('SELECT severity, COUNT(*)::int AS count FROM soc_attack_events GROUP BY severity'),
    ]);
    return { total: total.rows[0].count, byType: byType.rows, bySeverity: bySeverity.rows };
  }
}

module.exports = new SOCAttackLogger();
