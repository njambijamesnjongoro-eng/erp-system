const jwt = require('jsonwebtoken');
const authService = require('../services/authService');
const securityEngine = require('../services/securityEngine');

const login = async (req, res, next) => {
  try {
    const { email, password, deviceFingerprint } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await authService.loginUser(email, password, ipAddress, userAgent, deviceFingerprint);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const register = async (req, res, next) => {
  try {
    const { email, password, roleId, profile } = req.body;
    const result = await authService.registerUser(email, password, roleId, profile);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logoutUser(req.user.id, refreshToken);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.requestPasswordReset(email);
    res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const { pool } = require('../config/db');
    const result = await pool.query(
      `SELECT u.id, u.email, u.is_active, u.last_login, u.created_at,
              r.name as role_name, r.id as role_id,
              ep.employee_id, ep.full_name, ep.phone, ep.department_id,
              ep.position, ep.passport_photo, ep.employment_status, ep.date_hired,
              d.name as department_name, d.code as department_code
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       LEFT JOIN departments d ON ep.department_id = d.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const getSessions = async (req, res, next) => {
  try {
    const sessions = await securityEngine.getActiveSessions(req.user.id);
    res.json({ success: true, data: sessions });
  } catch (err) { next(err); }
};

const terminateSession = async (req, res, next) => {
  try {
    await securityEngine.terminateSession(req.params.id, req.user.id);
    res.json({ success: true, message: 'Session terminated' });
  } catch (err) { next(err); }
};

const terminateAllSessions = async (req, res, next) => {
  try {
    await securityEngine.terminateAllSessions(req.user.id, req.params.excludeId);
    res.json({ success: true, message: 'All other sessions terminated' });
  } catch (err) { next(err); }
};

const getDevices = async (req, res, next) => {
  try {
    const devices = await securityEngine.getTrustedDevices(req.user.id);
    res.json({ success: true, data: devices });
  } catch (err) { next(err); }
};

const removeDevice = async (req, res, next) => {
  try {
    await securityEngine.removeTrustedDevice(req.params.id, req.user.id);
    res.json({ success: true, message: 'Device removed' });
  } catch (err) { next(err); }
};

const getSecurityEvents = async (req, res, next) => {
  try {
    const events = await securityEngine.getSecurityEvents(req.user.id, req.query.limit || 50);
    res.json({ success: true, data: events });
  } catch (err) { next(err); }
};

const getSecurityDashboardStats = async (req, res, next) => {
  try {
    const stats = await securityEngine.getSecurityDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
};

const generateCaptcha = async (req, res, next) => {
  try {
    const captcha = await securityEngine.generateCaptcha();
    res.json({ success: true, data: captcha });
  } catch (err) { next(err); }
};

const verifyCaptcha = async (req, res, next) => {
  try {
    const valid = await securityEngine.verifyCaptcha(req.body.token, req.body.answer);
    res.json({ success: true, data: { valid } });
  } catch (err) { next(err); }
};

const verifyMFA = async (req, res, next) => {
  try {
    const { mfaMethod, otpCode, preAuthToken } = req.body;
    let userId;
    try {
      const decoded = jwt.verify(preAuthToken, process.env.JWT_SECRET);
      if (!decoded.preAuth) throw new Error('Invalid token type');
      userId = decoded.userId;
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired pre-authentication token' });
    }
    const result = await authService.verifyMFAAndCompleteLogin(userId, mfaMethod, otpCode, preAuthToken);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

module.exports = {
  login, register, refresh, logout, changePassword, forgotPassword, resetPassword, getMe,
  getSessions, terminateSession, terminateAllSessions,
  getDevices, removeDevice,
  getSecurityEvents, getSecurityDashboardStats,
  generateCaptcha, verifyCaptcha,
  verifyMFA,
};
