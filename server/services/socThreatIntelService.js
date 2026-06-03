const { query } = require('../config/db');

class SOCThreatIntelService {
  async checkIP(ip) {
    const result = await query(
      `SELECT * FROM soc_threat_intelligence WHERE ioc_type = 'ip' AND ioc_value = $1 AND is_active = true`,
      [ip]
    );
    return result.rows[0] || null;
  }

  async checkPattern(pattern) {
    const result = await query(
      `SELECT * FROM soc_threat_intelligence
       WHERE ioc_type = 'pattern' AND ioc_value = $1 AND is_active = true`,
      [pattern]
    );
    return result.rows[0] || null;
  }

  async addIOC(ioc) {
    const result = await query(
      `INSERT INTO soc_threat_intelligence (ioc_type, ioc_value, threat_type, severity, confidence,
       source, description, auto_block, tags, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
       ON CONFLICT (ioc_type, ioc_value) DO UPDATE SET
       last_seen = CURRENT_TIMESTAMP, is_active = true, confidence = GREATEST(soc_threat_intelligence.confidence, $5)
       RETURNING *`,
      [ioc.iocType, ioc.iocValue, ioc.threatType || null, ioc.severity || 'medium',
       ioc.confidence || 0.5, ioc.source || 'manual', ioc.description || null,
       ioc.autoBlock || false, ioc.tags || [], ioc.metadata || {}]
    );
    return result.rows[0];
  }

  async getIOCs(filters = {}) {
    let sql = 'SELECT * FROM soc_threat_intelligence WHERE 1=1';
    const params = []; let idx = 1;
    if (filters.iocType) { sql += ` AND ioc_type = $${idx++}`; params.push(filters.iocType); }
    if (filters.threatType) { sql += ` AND threat_type = $${idx++}`; params.push(filters.threatType); }
    if (filters.severity) { sql += ` AND severity = $${idx++}`; params.push(filters.severity); }
    if (filters.active !== undefined) { sql += ` AND is_active = $${idx++}`; params.push(filters.active); }
    sql += ' ORDER BY created_at DESC LIMIT $' + (idx++) + ' OFFSET $' + (idx++);
    params.push(parseInt(filters.limit) || 100, parseInt(filters.offset) || 0);
    return (await query(sql, params)).rows;
  }

  async deactivateIOC(id) {
    await query('UPDATE soc_threat_intelligence SET is_active = false WHERE id = $1', [id]);
    return true;
  }
}

module.exports = new SOCThreatIntelService();
