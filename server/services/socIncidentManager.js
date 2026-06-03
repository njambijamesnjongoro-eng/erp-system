const { query } = require('../config/db');
const logger = require('../utils/logger');

class SOCIncidentManager {
  async createIncident(incident) {
    const result = await query(
      `INSERT INTO soc_incidents (incident_type, severity, title, description, assigned_to,
       related_alerts, related_users, sla_deadline, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING *`,
      [incident.incidentType, incident.severity || 'medium', incident.title, incident.description || null,
       incident.assignedTo || null, incident.relatedAlerts || [], incident.relatedUsers || [],
       incident.slaDeadline || null, incident.details || {}]
    );
    logger.warn('SOC incident created', { id: result.rows[0].id, type: incident.incidentType });
    return result.rows[0];
  }

  async updateIncident(id, updates) {
    const result = await query(
      `UPDATE soc_incidents SET
       status = COALESCE($1, status), assigned_to = COALESCE($2, assigned_to),
       root_cause = COALESCE($3, root_cause), resolution = COALESCE($4, resolution),
       resolution_date = CASE WHEN $5 THEN CURRENT_TIMESTAMP ELSE resolution_date END,
       escalation_level = COALESCE($6, escalation_level),
       is_closed = COALESCE($7, is_closed), closed_by = $8,
       closed_at = CASE WHEN $7 THEN CURRENT_TIMESTAMP ELSE closed_at END,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 RETURNING *`,
      [updates.status || null, updates.assignedTo || null, updates.rootCause || null,
       updates.resolution || null, updates.resolved || false,
       updates.escalationLevel || null, updates.isClosed || null,
       updates.closedBy || null, id]
    );
    return result.rows[0];
  }

  async addCaseEntry(incidentId, entry) {
    const result = await query(
      `INSERT INTO soc_incident_cases (incident_id, case_type, title, content, evidence_path, evidence_type, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [incidentId, entry.caseType || 'note', entry.title || null, entry.content || null,
       entry.evidencePath || null, entry.evidenceType || null, entry.createdBy || null]
    );
    return result.rows[0];
  }

  async getIncidents(filters = {}) {
    let sql = `SELECT i.*, u.full_name AS assigned_name FROM soc_incidents i
               LEFT JOIN users u ON i.assigned_to = u.id WHERE 1=1`;
    const params = []; let idx = 1;
    if (filters.severity) { sql += ` AND i.severity = $${idx++}`; params.push(filters.severity); }
    if (filters.status) { sql += ` AND i.status = $${idx++}`; params.push(filters.status); }
    if (filters.incidentType) { sql += ` AND i.incident_type = $${idx++}`; params.push(filters.incidentType); }
    if (filters.assignedTo) { sql += ` AND i.assigned_to = $${idx++}`; params.push(filters.assignedTo); }
    sql += ' ORDER BY i.created_at DESC LIMIT $' + (idx++) + ' OFFSET $' + (idx++);
    params.push(parseInt(filters.limit) || 50, parseInt(filters.offset) || 0);
    return (await query(sql, params)).rows;
  }

  async getIncident(incidentId) {
    const inc = await query(
      `SELECT i.*, u.full_name AS assigned_name FROM soc_incidents i
       LEFT JOIN users u ON i.assigned_to = u.id WHERE i.id = $1`, [incidentId]
    );
    if (inc.rows.length === 0) return null;
    const cases = await query('SELECT c.*, u.full_name AS created_by_name FROM soc_incident_cases c LEFT JOIN users u ON c.created_by = u.id WHERE c.incident_id = $1 ORDER BY c.created_at', [incidentId]);
    return { ...inc.rows[0], caseEntries: cases.rows };
  }

  async getIncidentStats() {
    const [total, bySeverity, byStatus, byType] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM soc_incidents'),
      query('SELECT severity, COUNT(*)::int AS count FROM soc_incidents GROUP BY severity'),
      query('SELECT status, COUNT(*)::int AS count FROM soc_incidents GROUP BY status'),
      query('SELECT incident_type AS type, COUNT(*)::int AS count FROM soc_incidents GROUP BY incident_type'),
    ]);
    return { total: total.rows[0].count, bySeverity: bySeverity.rows, byStatus: byStatus.rows, byType: byType.rows };
  }
}

module.exports = new SOCIncidentManager();
