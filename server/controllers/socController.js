const { query } = require('../config/db');
const detectionEngine = require('../services/socDetectionEngine');
const alertManager = require('../services/socAlertManager');
const incidentManager = require('../services/socIncidentManager');
const userRiskScorer = require('../services/socUserRiskScorer');
const eventCorrelator = require('../services/socEventCorrelator');
const threatIntel = require('../services/socThreatIntelService');
const notificationService = require('../services/socNotificationService');
const reportGenerator = require('../services/socReportGenerator');
const attackLogger = require('../services/socAttackLogger');

// ─── Dashboard ──────────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const [activeUsers, activeSessions, failedLogins, lockedAccounts, alerts, incidents, attackStats, riskOverview, fileViolations, malwareDetections] = await Promise.all([
      query("SELECT COUNT(*)::int AS count FROM users WHERE is_active = true"),
      query("SELECT COUNT(*)::int AS count FROM user_sessions WHERE is_active = true"),
      query("SELECT COUNT(*)::int AS count FROM login_attempts WHERE success = false AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'"),
      query("SELECT COUNT(*)::int AS count FROM users WHERE is_locked = true"),
      alertManager.getAlertStats(),
      incidentManager.getIncidentStats(),
      attackLogger.getAttackStats(),
      userRiskScorer.getOverview(),
      query("SELECT COUNT(*)::int AS count FROM file_access_logs WHERE is_suspicious = true AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'"),
      query("SELECT COUNT(*)::int AS count FROM file_malware_scans WHERE scan_result IN ('infected','suspicious') AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'"),
    ]);
    res.json({ success: true, data: {
      activeUsers: activeUsers.rows[0].count,
      activeSessions: activeSessions.rows[0].count,
      failedLogins24h: failedLogins.rows[0].count,
      lockedAccounts: lockedAccounts.rows[0].count,
      alerts,
      incidents,
      attacks: attackStats,
      riskOverview,
      fileViolations: fileViolations.rows[0].count,
      malwareDetections: malwareDetections.rows[0].count,
    }});
  } catch (err) { next(err); }
};

// ─── Detection Engine ──────────────────────────────────────────
exports.detectEvent = async (req, res, next) => {
  try {
    const event = { ...req.body, ip: req.ip };
    const detections = await detectionEngine.detect(event);
    const alerts = [];
    for (const d of detections) {
      const alert = await alertManager.createAlert(d);
      if (alert) { alerts.push(alert); await notificationService.notifySecurityTeam(alert); }
    }
    res.json({ success: true, data: { detections, alertsCreated: alerts } });
  } catch (err) { next(err); }
};

// ─── Alerts ─────────────────────────────────────────────────────
exports.getAlerts = async (req, res, next) => {
  try { const data = await alertManager.getAlerts(req.query); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.getAlertStats = async (req, res, next) => {
  try { const data = await alertManager.getAlertStats(); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.acknowledgeAlert = async (req, res, next) => {
  try { await alertManager.acknowledgeAlert(req.params.id, req.user.id); res.json({ success: true, message: 'Acknowledged' }); }
  catch (err) { next(err); }
};

exports.assignAlert = async (req, res, next) => {
  try { await alertManager.assignAlert(req.params.id, req.body.assigneeId); res.json({ success: true, message: 'Assigned' }); }
  catch (err) { next(err); }
};

exports.resolveAlert = async (req, res, next) => {
  try { await alertManager.resolveAlert(req.params.id, req.user.id, req.body.notes); res.json({ success: true, message: 'Resolved' }); }
  catch (err) { next(err); }
};

// ─── Incidents ──────────────────────────────────────────────────
exports.getIncidents = async (req, res, next) => {
  try { const data = await incidentManager.getIncidents(req.query); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.getIncident = async (req, res, next) => {
  try { const data = await incidentManager.getIncident(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Incident not found' });
    res.json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.createIncident = async (req, res, next) => {
  try { const data = await incidentManager.createIncident({ ...req.body }); res.status(201).json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.updateIncident = async (req, res, next) => {
  try { const data = await incidentManager.updateIncident(req.params.id, { ...req.body, closedBy: req.body.isClosed ? req.user.id : null }); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.addCaseEntry = async (req, res, next) => {
  try { const data = await incidentManager.addCaseEntry(req.params.id, { ...req.body, createdBy: req.user.id }); res.status(201).json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.getIncidentStats = async (req, res, next) => {
  try { const data = await incidentManager.getIncidentStats(); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

// ─── User Risk Scoring ─────────────────────────────────────────
exports.calculateUserRisk = async (req, res, next) => {
  try { const data = await userRiskScorer.calculateRisk(req.params.userId); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.getUserRiskHistory = async (req, res, next) => {
  try { const data = await userRiskScorer.getRiskHistory(req.params.userId); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.getAllUserRisks = async (req, res, next) => {
  try { const data = await userRiskScorer.getAllCurrentRisks(req.query); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.getRiskOverview = async (req, res, next) => {
  try { const data = await userRiskScorer.getOverview(); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

// ─── Event Correlations ────────────────────────────────────────
exports.getCorrelations = async (req, res, next) => {
  try { const data = await eventCorrelator.getCorrelations(req.query); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.evaluateCorrelation = async (req, res, next) => {
  try { const data = await eventCorrelator.evaluate(req.body.events || []); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

// ─── Threat Intelligence ───────────────────────────────────────
exports.getThreatIOCs = async (req, res, next) => {
  try { const data = await threatIntel.getIOCs(req.query); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.addThreatIOC = async (req, res, next) => {
  try { const data = await threatIntel.addIOC(req.body); res.status(201).json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.deactivateThreatIOC = async (req, res, next) => {
  try { await threatIntel.deactivateIOC(req.params.id); res.json({ success: true, message: 'Deactivated' }); }
  catch (err) { next(err); }
};

// ─── Attack Events ─────────────────────────────────────────────
exports.getAttackEvents = async (req, res, next) => {
  try { const data = await attackLogger.getAttackEvents(req.query); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.getAttackStats = async (req, res, next) => {
  try { const data = await attackLogger.getAttackStats(); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.blockIP = async (req, res, next) => {
  try { await attackLogger.blockIP(req.params.ip); res.json({ success: true, message: 'IP blocked' }); }
  catch (err) { next(err); }
};

// ─── Notifications ─────────────────────────────────────────────
exports.getNotifications = async (req, res, next) => {
  try { const data = await notificationService.getUserNotifications(req.user.id, req.query); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.markNotificationRead = async (req, res, next) => {
  try { await notificationService.markAsRead(req.params.id); res.json({ success: true }); }
  catch (err) { next(err); }
};

exports.markAllNotificationsRead = async (req, res, next) => {
  try { await notificationService.markAllAsRead(req.user.id); res.json({ success: true }); }
  catch (err) { next(err); }
};

exports.getUnreadNotificationCount = async (req, res, next) => {
  try { const count = await notificationService.getUnreadCount(req.user.id); res.json({ success: true, data: { count } }); }
  catch (err) { next(err); }
};

// ─── Reports ────────────────────────────────────────────────────
exports.generateReport = async (req, res, next) => {
  try { const data = await reportGenerator.generateReport(req.body.reportType, req.body.params, req.user.id); res.status(201).json({ success: true, data }); }
  catch (err) { next(err); }
};

exports.getReports = async (req, res, next) => {
  try { const data = await reportGenerator.getReports(req.query); res.json({ success: true, data }); }
  catch (err) { next(err); }
};

// ─── Threat Records ────────────────────────────────────────────
exports.getThreatRecords = async (req, res, next) => {
  try {
    let sql = 'SELECT t.*, u.full_name AS target_user_name FROM soc_threat_records t LEFT JOIN users u ON t.target_user = u.id WHERE 1=1';
    const params = []; let idx = 1;
    if (req.query.threatType) { sql += ` AND t.threat_type = $${idx++}`; params.push(req.query.threatType); }
    if (req.query.severity) { sql += ` AND t.severity = $${idx++}`; params.push(req.query.severity); }
    sql += ' ORDER BY t.created_at DESC LIMIT $' + (idx++) + ' OFFSET $' + (idx++);
    params.push(parseInt(req.query.limit) || 50, parseInt(req.query.offset) || 0);
    res.json({ success: true, data: (await query(sql, params)).rows });
  } catch (err) { next(err); }
};

exports.getThreatStats = async (req, res, next) => {
  try {
    const [total, bySeverity, byType] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM soc_threat_records'),
      query('SELECT severity, COUNT(*)::int AS count FROM soc_threat_records GROUP BY severity'),
      query('SELECT threat_type, COUNT(*)::int AS count FROM soc_threat_records GROUP BY threat_type ORDER BY count DESC'),
    ]);
    res.json({ success: true, data: { total: total.rows[0].count, bySeverity: bySeverity.rows, byType: byType.rows } });
  } catch (err) { next(err); }
};

// ─── Security Score ────────────────────────────────────────────
exports.getSecurityScore = async (req, res, next) => {
  try {
    const [totalAlerts, openIncidents, criticalAlerts, highRiskUsers, openCriticalAlerts] = await Promise.all([
      query('SELECT COUNT(*)::int FROM soc_alerts'),
      query("SELECT COUNT(*)::int FROM soc_incidents WHERE is_closed = false"),
      query("SELECT COUNT(*)::int FROM soc_alerts WHERE severity = 'critical' AND status != 'resolved'"),
      query("SELECT COUNT(*)::int FROM (SELECT DISTINCT ON (user_id) risk_level FROM soc_user_risk_scores ORDER BY user_id, calculated_at DESC) sub WHERE risk_level IN ('high','critical')"),
      query("SELECT COUNT(*)::int FROM soc_alerts WHERE severity = 'critical' AND status = 'open'"),
    ]);
    const score = Math.max(0, Math.min(100, 100 - (openIncidents.rows[0].count * 5) - (criticalAlerts.rows[0].count * 10) - (highRiskUsers.rows[0].count * 3)));
    res.json({ success: true, data: { score, factors: { totalAlerts: totalAlerts.rows[0].count, openIncidents: openIncidents.rows[0].count, criticalAlerts: criticalAlerts.rows[0].count, highRiskUsers: highRiskUsers.rows[0].count } } });
  } catch (err) { next(err); }
};

// ─── Live Feed ──────────────────────────────────────────────────
exports.getLiveFeed = async (req, res, next) => {
  try {
    const [logins, fileAccess, alerts, adminActions] = await Promise.all([
      query("SELECT 'login' AS type, la.created_at, u.email AS user_info FROM login_attempts la LEFT JOIN users u ON la.user_id = u.id WHERE la.created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour' ORDER BY la.created_at DESC LIMIT 20"),
      query("SELECT 'file_access' AS type, l.created_at, f.original_name AS resource, l.action FROM file_access_logs l LEFT JOIN file_security_files f ON l.file_id = f.id WHERE l.created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour' ORDER BY l.created_at DESC LIMIT 20"),
      query("SELECT 'alert' AS type, a.created_at, a.title, a.severity FROM soc_alerts a WHERE a.created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour' ORDER BY a.created_at DESC LIMIT 20"),
      query("SELECT 'admin_action' AS type, d.created_at, d.table_name AS resource, d.operation FROM db_activities d WHERE d.created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour' ORDER BY d.created_at DESC LIMIT 20"),
    ]);
    const feed = [...logins.rows, ...fileAccess.rows, ...alerts.rows, ...adminActions.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 100);
    res.json({ success: true, data: feed });
  } catch (err) { next(err); }
};
