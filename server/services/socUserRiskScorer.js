const { query } = require('../config/db');
const logger = require('../utils/logger');

class SOCUserRiskScorer {
  async calculateRisk(userId) {
    try {
      const factors = await this._gatherFactors(userId);
      const scores = this._computeScores(factors);
      const overall = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
      const riskLevel = overall >= 0.7 ? 'critical' : overall >= 0.5 ? 'high' : overall >= 0.3 ? 'medium' : 'low';

      await query(
        `INSERT INTO soc_user_risk_scores (user_id, overall_score, login_risk, device_risk, location_risk,
         download_risk, permission_risk, session_risk, risk_level, factor_breakdown)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
        [userId, overall, scores.login, scores.device, scores.location,
         scores.download, scores.permission, scores.session, riskLevel, factors]
      );
      return { overall, riskLevel, scores };
    } catch (err) { logger.error('Risk calculation failed', { userId, error: err.message }); return null; }
  }

  async _gatherFactors(userId) {
    const [failedLogins, sessionCount, recentDownloads, permChanges, geoAnomalies] = await Promise.all([
      query("SELECT COUNT(*)::int AS count FROM login_attempts WHERE user_id = $1 AND success = false AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'", [userId]),
      query("SELECT COUNT(*)::int AS count, COUNT(DISTINCT ip_address)::int AS ips FROM user_sessions WHERE user_id = $1 AND is_active = true", [userId]),
      query("SELECT COUNT(*)::int AS count FROM file_access_logs WHERE user_id = $1 AND action IN ('download','signed_download') AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'", [userId]),
      query("SELECT COUNT(*)::int AS count FROM db_activities WHERE user_id = $1 AND operation = 'UPDATE' AND table_name IN ('user_roles','users') AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'", [userId]),
      query("SELECT COUNT(*)::int AS count FROM login_attempts WHERE user_id = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days' AND ip_address NOT IN (SELECT ip_address FROM login_attempts WHERE user_id = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days' GROUP BY ip_address HAVING COUNT(*) > 3)", [userId]),
    ]);
    return {
      failedLoginCount: failedLogins.rows[0].count,
      activeSessionCount: sessionCount.rows[0].count,
      distinctIps: sessionCount.rows[0].ips,
      downloadCount7d: recentDownloads.rows[0].count,
      permChangeCount7d: permChanges.rows[0].count,
      geoAnomalyCount7d: geoAnomalies.rows[0].count,
    };
  }

  _computeScores(factors) {
    const login = Math.min(1.0, factors.failedLoginCount / 20);
    const device = Math.min(1.0, (factors.activeSessionCount + factors.distinctIps) / 10);
    const location = Math.min(1.0, factors.geoAnomalyCount7d / 5);
    const download = Math.min(1.0, factors.downloadCount7d / 100);
    const permission = Math.min(1.0, factors.permChangeCount7d / 5);
    const session = Math.min(1.0, (factors.distinctIps - 1) / 3);
    return { login, device, location, download, permission, session };
  }

  async getRiskHistory(userId, limit = 20) {
    const result = await query(
      'SELECT * FROM soc_user_risk_scores WHERE user_id = $1 ORDER BY calculated_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows;
  }

  async getAllCurrentRisks(filters = {}) {
    let sql = `SELECT r.*, COALESCE(ep.full_name, u.email) AS full_name, u.email, rl.name AS role_name, d.name AS department_name
               FROM soc_user_risk_scores r
               JOIN users u ON r.user_id = u.id
               LEFT JOIN employee_profiles ep ON u.id = ep.user_id
               LEFT JOIN roles rl ON u.role_id = rl.id
               LEFT JOIN departments d ON ep.department_id = d.id
                WHERE r.id IN (SELECT DISTINCT ON (user_id) id FROM soc_user_risk_scores ORDER BY user_id, calculated_at DESC)`;
    const params = []; let idx = 1;
    if (filters.riskLevel) { sql += ` AND r.risk_level = $${idx++}`; params.push(filters.riskLevel); }
    sql += ' ORDER BY r.overall_score DESC LIMIT $' + (idx++);
    params.push(parseInt(filters.limit) || 100);
    return (await query(sql, params)).rows;
  }

  async getOverview() {
    const [distribution, highest, recent] = await Promise.all([
      query('SELECT risk_level, COUNT(*)::int AS count FROM (SELECT DISTINCT ON (user_id) risk_level FROM soc_user_risk_scores ORDER BY user_id, calculated_at DESC) sub GROUP BY risk_level'),
      query(`SELECT COALESCE(ep.full_name, u.email) AS full_name, r.overall_score, r.risk_level FROM soc_user_risk_scores r JOIN users u ON r.user_id = u.id LEFT JOIN employee_profiles ep ON u.id = ep.user_id
             WHERE r.id IN (SELECT DISTINCT ON (user_id) id FROM soc_user_risk_scores ORDER BY user_id, calculated_at DESC) ORDER BY r.overall_score DESC LIMIT 10`),
      query('SELECT AVG(overall_score)::decimal(5,2) AS avg_risk FROM soc_user_risk_scores WHERE id IN (SELECT DISTINCT ON (user_id) id FROM soc_user_risk_scores ORDER BY user_id, calculated_at DESC)'),
    ]);
    return { distribution: distribution.rows, highestRisk: highest.rows, avgRisk: recent.rows[0]?.avg_risk || 0 };
  }
}

module.exports = new SOCUserRiskScorer();
