const auditService = require('../services/auditService');
const threatDetection = require('../services/threatDetectionService');
const infrastructureMonitor = require('../services/infrastructureMonitor');
const apiGateway = require('../services/apiGateway');
const backupSecurity = require('../services/backupSecurityService');
const rateLimiterService = require('../services/rateLimiterService');
const encryptionService = require('../services/encryptionService');
const { query } = require('../config/db');

// ─── Dashboard ──────────────────────────────────────────────────

exports.getDashboard = async (req, res, next) => {
  try {
    const [gateway, threats, audit, systemHealth, dbHealth, perf, rate] = await Promise.all([
      apiGateway.getGatewayStats(),
      threatDetection.getThreatStats(),
      auditService.getAuditStats(),
      infrastructureMonitor.getSystemHealth(),
      infrastructureMonitor.checkDatabaseHealth(),
      infrastructureMonitor.getPerformanceMetrics(),
      rateLimiterService.getRateLimitStats(),
    ]);
    res.json({ success: true, data: { gateway, threats, audit, system: systemHealth, database: dbHealth, performance: perf, rateLimits: rate } });
  } catch (err) { next(err); }
};

// ─── Audit Logs ────────────────────────────────────────────────

exports.getAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs({
      tableName: req.query.table,
      operation: req.query.operation,
      userId: req.query.userId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
      limit: req.query.limit || 100,
      offset: req.query.offset || 0,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getAuditSummary = async (req, res, next) => {
  try {
    const summary = await auditService.getAuditSummary(req.query.days || 7);
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
};

// ─── Threat Detection ──────────────────────────────────────────

exports.getThreats = async (req, res, next) => {
  try {
    const threats = await threatDetection.getThreatDetections({
      severity: req.query.severity,
      threatType: req.query.threatType,
      resolved: req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined,
    });
    res.json({ success: true, data: threats });
  } catch (err) { next(err); }
};

exports.resolveThreat = async (req, res, next) => {
  try {
    await threatDetection.resolveThreat(req.params.id);
    res.json({ success: true, message: 'Threat resolved' });
  } catch (err) { next(err); }
};

// ─── Infrastructure Health ─────────────────────────────────────

exports.getHealth = async (req, res, next) => {
  try {
    const health = await infrastructureMonitor.checkAllServices();
    res.json({ success: true, data: health });
  } catch (err) { next(err); }
};

exports.getPerformance = async (req, res, next) => {
  try {
    const metrics = await infrastructureMonitor.getPerformanceMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) { next(err); }
};

// ─── Backups ────────────────────────────────────────────────────

exports.createBackup = async (req, res, next) => {
  try {
    const result = await backupSecurity.createBackup(req.user.id, req.body.type || 'full');
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getBackupLogs = async (req, res, next) => {
  try {
    const logs = await backupSecurity.getBackupLogs(req.query.limit || 20);
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
};

exports.verifyBackup = async (req, res, next) => {
  try {
    const result = await backupSecurity.verifyBackup(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ─── Rate Limiting ─────────────────────────────────────────────

exports.getRateLimitStats = async (req, res, next) => {
  try {
    const stats = await rateLimiterService.getRateLimitStats();
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
};

// ─── Gateway ───────────────────────────────────────────────────

exports.getGatewayStats = async (req, res, next) => {
  try {
    const stats = await apiGateway.getGatewayStats();
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
};

// ─── Encryption ────────────────────────────────────────────────

exports.rotateEncryptionKey = async (req, res, next) => {
  try {
    const result = await encryptionService.rotateEncryptionKey(req.body.newKeyEnvVar);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ─── General Stats ─────────────────────────────────────────────

exports.getSecurityOverview = async (req, res, next) => {
  try {
    const [totalUsers, activeSessions, lockedAccounts, mfaEnabled] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM users'),
      query("SELECT COUNT(*)::int AS count FROM user_sessions WHERE is_active = true"),
      query("SELECT COUNT(*)::int AS count FROM users WHERE is_locked = true"),
      query("SELECT COUNT(*)::int AS count FROM mfa_settings WHERE method != 'none'"),
    ]);
    res.json({ success: true, data: {
      totalUsers: totalUsers.rows[0].count,
      activeSessions: activeSessions.rows[0].count,
      lockedAccounts: lockedAccounts.rows[0].count,
      mfaEnabled: mfaEnabled.rows[0].count,
    }});
  } catch (err) { next(err); }
};
