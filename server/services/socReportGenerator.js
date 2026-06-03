const { query } = require('../config/db');
const logger = require('../utils/logger');

class SOCReportGenerator {
  async generateReport(reportType, params, generatedBy) {
    let reportData;
    switch (reportType) {
      case 'failed_logins':
        reportData = await this._failedLoginsReport(params);
        break;
      case 'user_risk':
        reportData = await this._userRiskReport(params);
        break;
      case 'threat_activity':
        reportData = await this._threatActivityReport(params);
        break;
      case 'incidents':
        reportData = await this._incidentsReport(params);
        break;
      case 'malware':
        reportData = await this._malwareReport(params);
        break;
      case 'data_access':
        reportData = await this._dataAccessReport(params);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    const result = await query(
      `INSERT INTO soc_security_reports (report_type, title, description, parameters, result_data, file_format, generated_by, period_start, period_end)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9) RETURNING *`,
      [reportType, reportData.title || reportType, reportData.description || '',
       params || {}, reportData.data || {}, params?.format || 'json',
       generatedBy, params?.startDate || null, params?.endDate || null]
    );
    return result.rows[0];
  }

  async _failedLoginsReport(params) {
    const days = params?.days || 7;
    const data = await query(
      `SELECT la.*, u.full_name, u.email FROM login_attempts la
       LEFT JOIN users u ON la.user_id = u.id
       WHERE la.created_at > CURRENT_TIMESTAMP - INTERVAL '1 day' * $1
       AND la.success = false ORDER BY la.created_at DESC`,
      [days]
    );
    return {
      title: `Failed Logins Report (${days} days)`,
      description: `${data.rows.length} failed login attempts in the last ${days} days`,
      data: { failures: data.rows, total: data.rows.length, period: `${days}d` },
    };
  }

  async _userRiskReport(params) {
    const riskLevel = params?.riskLevel || 'high';
    const data = await query(
      `SELECT r.*, u.full_name, u.email, u.role_name FROM soc_user_risk_scores r
       JOIN users u ON r.user_id = u.id
       WHERE r.id IN (SELECT MAX(id) FROM soc_user_risk_scores GROUP BY user_id)
       AND r.risk_level = $1 ORDER BY r.overall_score DESC`,
      [riskLevel]
    );
    return {
      title: `User Risk Report — ${riskLevel.toUpperCase()} Risk Users`,
      description: `${data.rows.length} users at ${riskLevel} risk level`,
      data: { users: data.rows, total: data.rows.length, riskLevel },
    };
  }

  async _threatActivityReport(params) {
    const days = params?.days || 7;
    const [threats, alerts, attacks] = await Promise.all([
      query(`SELECT * FROM soc_threat_records WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 day' * $1 ORDER BY created_at DESC`, [days]),
      query(`SELECT * FROM soc_alerts WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 day' * $1 ORDER BY created_at DESC`, [days]),
      query(`SELECT * FROM soc_attack_events WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 day' * $1 ORDER BY created_at DESC`, [days]),
    ]);
    return {
      title: `Threat Activity Report (${days} days)`,
      description: `${threats.rows.length} threats, ${alerts.rows.length} alerts, ${attacks.rows.length} attack events`,
      data: { threats: threats.rows, alerts: alerts.rows, attacks: attacks.rows },
    };
  }

  async _incidentsReport(params) {
    const days = params?.days || 30;
    const data = await query(
      `SELECT i.*, u.full_name AS assigned_name FROM soc_incidents i
       LEFT JOIN users u ON i.assigned_to = u.id
       WHERE i.created_at > CURRENT_TIMESTAMP - INTERVAL '1 day' * $1
       ORDER BY i.created_at DESC`,
      [days]
    );
    return {
      title: `Security Incidents Report (${days} days)`,
      description: `${data.rows.length} incidents in the last ${days} days`,
      data: { incidents: data.rows, total: data.rows.length },
    };
  }

  async _malwareReport(params) {
    const days = params?.days || 7;
    const [scans, threats] = await Promise.all([
      query(`SELECT * FROM file_malware_scans WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 day' * $1 AND scan_result != 'clean' ORDER BY created_at DESC`, [days]),
      query(`SELECT * FROM soc_threat_records WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 day' * $1 AND threat_type LIKE '%malware%' ORDER BY created_at DESC`, [days]),
    ]);
    return {
      title: `Malware Report (${days} days)`,
      description: `${scans.rows.length} malware detections`,
      data: { scans: scans.rows, threats: threats.rows },
    };
  }

  async _dataAccessReport(params) {
    const days = params?.days || 7;
    const data = await query(
      `SELECT l.*, u.full_name, f.original_name FROM file_access_logs l
       LEFT JOIN users u ON l.user_id = u.id
       LEFT JOIN file_security_files f ON l.file_id = f.id
       WHERE l.created_at > CURRENT_TIMESTAMP - INTERVAL '1 day' * $1
       ORDER BY l.created_at DESC LIMIT 500`,
      [days]
    );
    return {
      title: `Data Access Report (${days} days)`,
      description: `${data.rows.length} file access events`,
      data: { accesses: data.rows, total: data.rows.length },
    };
  }

  async getReports(filters = {}) {
    let sql = 'SELECT r.*, u.full_name AS generated_by_name FROM soc_security_reports r LEFT JOIN users u ON r.generated_by = u.id WHERE 1=1';
    const params = []; let idx = 1;
    if (filters.reportType) { sql += ` AND r.report_type = $${idx++}`; params.push(filters.reportType); }
    sql += ' ORDER BY r.created_at DESC LIMIT $' + (idx++) + ' OFFSET $' + (idx++);
    params.push(parseInt(filters.limit) || 50, parseInt(filters.offset) || 0);
    return (await query(sql, params)).rows;
  }
}

module.exports = new SOCReportGenerator();
