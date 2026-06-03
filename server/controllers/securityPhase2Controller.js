const mfaService = require('../services/mfaService');
const deviceTrustService = require('../services/deviceTrustService');
const geoipService = require('../services/geoipService');
const riskEngine = require('../services/riskEngine');
const notificationService = require('../services/notificationService');
const loginAnalytics = require('../services/loginAnalytics');
const { logSecurityEvent } = require('../services/securityEngine');

// ─── MFA ────────────────────────────────────────────────────────

exports.getMFAStatus = async (req, res, next) => {
  try {
    const status = await mfaService.getMFAStatus(req.user.id);
    const recovery = await mfaService.getMFARecoveryStatus(req.user.id);
    res.json({ success: true, data: { ...status, recovery } });
  } catch (err) { next(err); }
};

exports.setupTOTP = async (req, res, next) => {
  try {
    const data = await mfaService.setupTOTP(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.verifyAndEnableTOTP = async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await mfaService.verifyAndEnableTOTP(req.user.id, token);
    await notificationService.createAlert(req.user.id, 'mfa_enabled', {}, ['in_app', 'email']);
    await logSecurityEvent(req.user.id, 'mfa_enabled', 'info', 'MFA enabled via authenticator app', req.ip, req.headers['user-agent']);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.sendEmailOTP = async (req, res, next) => {
  try {
    const user = await req.db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    const email = user.rows[0]?.email;
    if (!email) return res.status(400).json({ success: false, message: 'User email not found' });
    await mfaService.sendEmailOTP(req.user.id, email, req.body.purpose || 'login');
    res.json({ success: true, message: 'OTP sent to email' });
  } catch (err) { next(err); }
};

exports.verifyEmailOTP = async (req, res, next) => {
  try {
    const { otpCode, purpose } = req.body;
    const valid = await mfaService.verifyEmailOTP(req.user.id, otpCode, purpose || 'login');
    if (!valid) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    res.json({ success: true, message: 'OTP verified' });
  } catch (err) { next(err); }
};

exports.enableEmailOTP = async (req, res, next) => {
  try {
    await mfaService.enableEmailOTP(req.user.id);
    await notificationService.createAlert(req.user.id, 'mfa_enabled', {}, ['in_app', 'email']);
    await logSecurityEvent(req.user.id, 'mfa_enabled', 'info', 'MFA enabled via email OTP', req.ip, req.headers['user-agent']);
    res.json({ success: true, message: 'Email OTP enabled' });
  } catch (err) { next(err); }
};

exports.disableMFA = async (req, res, next) => {
  try {
    const { otpCode } = req.body;
    const mfa = await mfaService.getMFAStatus(req.user.id);
    if (mfa.method === 'totp' && otpCode) {
      const valid = await mfaService.verifyTOTP(req.user.id, otpCode);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid TOTP code' });
    }
    await mfaService.disableMFA(req.user.id);
    await notificationService.createAlert(req.user.id, 'mfa_disabled', {}, ['in_app', 'email']);
    await logSecurityEvent(req.user.id, 'mfa_disabled', 'warning', 'MFA was disabled', req.ip, req.headers['user-agent']);
    res.json({ success: true, message: 'MFA disabled' });
  } catch (err) { next(err); }
};

exports.generateBackupCodes = async (req, res, next) => {
  try {
    const codes = await mfaService.generateBackupCodes(req.user.id);
    res.json({ success: true, data: { codes } });
  } catch (err) { next(err); }
};

exports.verifyRecoveryCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    const valid = await mfaService.verifyBackupCode(req.user.id, code);
    if (!valid) return res.status(400).json({ success: false, message: 'Invalid recovery code' });
    await notificationService.createAlert(req.user.id, 'recovery_code_used', {}, ['in_app', 'email']);
    res.json({ success: true, message: 'Recovery code verified' });
  } catch (err) { next(err); }
};

// ─── Devices ────────────────────────────────────────────────────

exports.getDevices = async (req, res, next) => {
  try {
    const devices = await deviceTrustService.getDeviceFingerprints(req.user.id);
    res.json({ success: true, data: devices });
  } catch (err) { next(err); }
};

exports.approveDevice = async (req, res, next) => {
  try {
    await deviceTrustService.approveDevice(req.params.id, req.user.id);
    const device = await deviceTrustService.getDeviceById(req.params.id, req.user.id);
    await notificationService.createAlert(req.user.id, 'device_approved', device || {}, ['in_app']);
    res.json({ success: true, message: 'Device approved' });
  } catch (err) { next(err); }
};

exports.revokeDevice = async (req, res, next) => {
  try {
    await deviceTrustService.revokeDevice(req.params.id, req.user.id);
    res.json({ success: true, message: 'Device trust revoked' });
  } catch (err) { next(err); }
};

// ─── Geo / Login History ────────────────────────────────────────

exports.getLoginHistory = async (req, res, next) => {
  try {
    const history = await geoipService.getLoginHistory(req.user.id, req.query.limit || 50);
    res.json({ success: true, data: history });
  } catch (err) { next(err); }
};

exports.getGeoStats = async (req, res, next) => {
  try {
    const stats = await geoipService.getGeoStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
};

// ─── Risk ───────────────────────────────────────────────────────

exports.getRiskSummary = async (req, res, next) => {
  try {
    const summary = await riskEngine.getRiskSummary(req.user.id);
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
};

exports.getSuspiciousActivities = async (req, res, next) => {
  try {
    const activities = await riskEngine.getSuspiciousActivities(req.user.id, req.query.limit || 50);
    res.json({ success: true, data: activities });
  } catch (err) { next(err); }
};

exports.resolveSuspiciousActivity = async (req, res, next) => {
  try {
    await riskEngine.resolveSuspiciousActivity(req.params.id, req.user.id, req.user.id);
    res.json({ success: true, message: 'Activity resolved' });
  } catch (err) { next(err); }
};

// ─── Notifications / Alerts ─────────────────────────────────────

exports.getAlerts = async (req, res, next) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const alerts = await notificationService.getAlerts(req.user.id, req.query.limit || 50, unreadOnly);
    res.json({ success: true, data: alerts });
  } catch (err) { next(err); }
};

exports.markAlertRead = async (req, res, next) => {
  try {
    await notificationService.markAlertRead(req.params.id, req.user.id);
    res.json({ success: true, message: 'Alert marked as read' });
  } catch (err) { next(err); }
};

exports.markAllAlertsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAlertsRead(req.user.id);
    res.json({ success: true, message: 'All alerts marked as read' });
  } catch (err) { next(err); }
};

exports.getUnreadAlertCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
};

// ─── Analytics ──────────────────────────────────────────────────

exports.getLoginStats = async (req, res, next) => {
  try {
    const stats = await loginAnalytics.getLoginStats(req.user.id, req.query.days || 30);
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
};

exports.getDeviceAnalytics = async (req, res, next) => {
  try {
    const analytics = await loginAnalytics.getDeviceAnalytics(req.user.id);
    res.json({ success: true, data: analytics });
  } catch (err) { next(err); }
};

exports.getGeoAnalytics = async (req, res, next) => {
  try {
    const analytics = await loginAnalytics.getGeoAnalytics(req.user.id);
    res.json({ success: true, data: analytics });
  } catch (err) { next(err); }
};

exports.getRiskHeatmap = async (req, res, next) => {
  try {
    const data = await loginAnalytics.getRiskHeatmap(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getGlobalLoginStats = async (req, res, next) => {
  try {
    const stats = await loginAnalytics.getGlobalLoginStats();
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
};
