const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool, query } = require('../config/db');
const logger = require('../utils/logger');
const {
  UnauthorizedError, BadRequestError, NotFoundError, ConflictError, ForbiddenError,
} = require('../utils/errors');
const { sanitizeUser } = require('../utils/helpers');
const {
  validatePasswordStrength, checkPasswordHistory, recordPasswordHistory,
  handleFailedLogin, trackDevice, logSecurityEvent, queueEmail,
} = require('./securityEngine');
const mfaService = require('./mfaService');
const deviceTrustService = require('./deviceTrustService');
const geoipService = require('./geoipService');
const riskEngine = require('./riskEngine');
const notificationService = require('./notificationService');
const loginAnalytics = require('./loginAnalytics');

function generateTokens(userId, roleName, extra = {}) {
  const accessToken = jwt.sign(
    { userId, role: roleName, ...extra },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
}

async function registerUser(email, password, roleId, profileData) {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new ConflictError('Email already registered');
  }

  await validatePasswordStrength(password);
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await query(
    `INSERT INTO users (email, password_hash, role_id) VALUES ($1, $2, $3) RETURNING id`,
    [email, passwordHash, roleId]
  );

  const userId = result.rows[0].id;

  const { fullName, departmentId, position, phone, dateHired } = profileData;

  let employeeId;
  if (departmentId) {
    const dept = await query('SELECT code FROM departments WHERE id = $1', [departmentId]);
    const deptCode = dept.rows[0]?.code || 'GEN';
    const year = new Date().getFullYear();
    const seq = Math.floor(1000 + Math.random() * 9000);
    employeeId = `ERP-${year}-${deptCode}-${seq}`;
  } else {
    const year = new Date().getFullYear();
    const seq = Math.floor(1000 + Math.random() * 9000);
    employeeId = `ERP-${year}-GEN-${seq}`;
  }

  await query(
    `INSERT INTO employee_profiles (employee_id, user_id, full_name, email, phone, department_id, position, date_hired)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [employeeId, userId, fullName, email, phone, departmentId, position, dateHired || new Date()]
  );

  return { userId, employeeId };
}

async function loginUser(email, password, ipAddress, userAgent, deviceFingerprint) {
  const result = await query(
    `SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    await logAuthentication(null, email, ipAddress, userAgent, 'LOGIN', 'FAILED', 'Invalid email');
    throw new UnauthorizedError('Invalid email or password');
  }

  const user = result.rows[0];

  if (user.is_locked) {
    if (user.locked_until && new Date() < user.locked_until) {
      const remaining = Math.ceil((user.locked_until - new Date()) / 60000);
      await logAuthentication(user.id, email, ipAddress, userAgent, 'LOGIN', 'FAILED', 'Account locked');
      throw new ForbiddenError(`Account locked. Try again in ${remaining} minute${remaining > 1 ? 's' : ''}.`);
    } else {
      await query('UPDATE users SET is_locked = false, locked_until = NULL, login_attempts = 0 WHERE id = $1', [user.id]);
    }
  }

  if (!user.is_active) {
    await logAuthentication(user.id, email, ipAddress, userAgent, 'LOGIN', 'FAILED', 'Account deactivated');
    throw new ForbiddenError('Account is deactivated. Contact administrator.');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    const lockResult = await handleFailedLogin(user);
    await logAuthentication(user.id, email, ipAddress, userAgent, 'LOGIN', 'FAILED',
      lockResult.locked ? 'Account locked' : 'Invalid password');
    if (lockResult.locked) {
      throw new ForbiddenError(`Account locked for ${lockResult.minutes} minutes due to too many failed attempts.`);
    }
    throw new UnauthorizedError(`Invalid email or password (${lockResult.remaining} attempt${lockResult.remaining > 1 ? 's' : ''} remaining)`);
  }

  await query(
    'UPDATE users SET login_attempts = 0, lock_count = 0, last_login = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );

  // ─── MFA Check ──────────────────────────────────────────────
  const mfaStatus = await mfaService.getMFAStatus(user.id);
  const mfaRequired = mfaStatus.enabled || mfaStatus.mfaRequired;

  // ─── Geo / Risk Evaluation ────────────────────────────────────
  const geo = geoipService.getGeoData(ipAddress);
  const geoLog = await geoipService.logGeolocation(user.id, ipAddress, null, geo);
  const travelCheck = await geoipService.detectImpossibleTravel(user.id, ipAddress);
  const countryCheck = await geoipService.checkCountryRestriction(user.id, geo.countryCode);

  // ─── Device Registration ────────────────────────────────────
  let isKnownDevice = false;
  let deviceRiskScore = 0;
  if (deviceFingerprint) {
    const devResult = await deviceTrustService.registerDeviceFingerprint(user.id, {
      fingerprint: deviceFingerprint, userAgent, ip: ipAddress,
      deviceName: userAgent?.split('/')[0] || 'Unknown',
      browser: userAgent,
    });
    isKnownDevice = devResult.known;
    deviceRiskScore = devResult.device?.risk_score || 0;
    if (!devResult.known) {
      await logSecurityEvent(user.id, 'new_device_login', 'info',
        'New device used to login', ipAddress, userAgent);
      await notificationService.createAlert(user.id, 'new_device_login',
        { deviceName: userAgent?.split('/')[0] || 'Unknown', browser: userAgent, location: `${geo.city}, ${geo.country}`, ip: ipAddress },
        ['in_app', 'email']);
    }
  }

  // ─── Risk Scoring ───────────────────────────────────────────
  const riskContext = {
    loginAttempts: user.login_attempts || 0,
    isKnownDevice,
    geoChanged: travelCheck.impossible,
    impossibleTravel: travelCheck.impossible,
    isVPN: geo.isVpn || false,
    browserChanged: false,
    rapidAttempts: user.login_attempts || 0,
    travelDistance: travelCheck.distance || 0,
    previousCountry: travelCheck.from || null,
    currentCountry: geo.country,
    ipAddress,
    userAgent,
    deviceRiskScore,
    loginId: null,
  };
  const loginRisk = await riskEngine.evaluateLoginRisk(user.id, riskContext);

  // ─── Country Restriction ────────────────────────────────────
  if (countryCheck.blocked) {
    await logAuthentication(user.id, email, ipAddress, userAgent, 'LOGIN', 'FAILED', countryCheck.reason);
    await logSecurityEvent(user.id, 'country_blocked', 'warning',
      `Login blocked from ${geo.country}`, ipAddress, userAgent);
    throw new ForbiddenError(`Access restricted from your location: ${geo.country}`);
  }

  // ─── High Risk Auto-Lock ────────────────────────────────────
  if (loginRisk.score >= 85 && !isKnownDevice) {
    await query('UPDATE users SET is_locked = true, locked_until = $1 WHERE id = $2',
      [new Date(Date.now() + 60 * 60 * 1000), user.id]);
    await logAuthentication(user.id, email, ipAddress, userAgent, 'LOGIN', 'FAILED', 'Auto-locked: high risk login');
    await logSecurityEvent(user.id, 'auto_locked', 'critical',
      `Account auto-locked due to critical risk login (score: ${loginRisk.score})`, ipAddress, userAgent);
    await notificationService.createAlert(user.id, 'account_locked',
      { unlockTime: new Date(Date.now() + 60 * 60 * 1000).toLocaleString(), riskScore: loginRisk.score, ip: ipAddress },
      ['in_app', 'email']);
    throw new ForbiddenError('Login blocked due to high-risk activity. Account locked for security.');
  }

  // ─── Generate Pre-auth Token if MFA required ──────────────
  if (mfaRequired) {
    const preAuthToken = jwt.sign(
      { userId: user.id, role: user.role_name, mfaVerified: false, preAuth: true },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );
    await logAuthentication(user.id, email, ipAddress, userAgent, 'LOGIN', 'SUCCESS', 'MFA pending');
    return {
      mfaRequired: true,
      mfaMethod: mfaStatus.method,
      preAuthToken,
      user: sanitizeUser(user),
    };
  }

  // ─── Full Auth (no MFA) ────────────────────────────────────
  const tokens = generateTokens(user.id, user.role_name, { mfaVerified: true });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokens.refreshToken, expiresAt]
  );

  await logAuthentication(user.id, email, ipAddress, userAgent, 'LOGIN', 'SUCCESS');

  // Update geo log with login_id
  if (geoLog?.id) {
    const loginRecord = await query('SELECT id FROM authentication_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [user.id]);
    if (loginRecord.rows.length) {
      await query('UPDATE geolocation_logs SET login_id = $1 WHERE id = $2', [loginRecord.rows[0].id, geoLog.id]);
    }
  }

  return {
    user: sanitizeUser(user),
    ...tokens,
    mfaRequired: false,
    riskScore: loginRisk.score,
    riskLevel: loginRisk.level,
  };
}

async function refreshAccessToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const result = await query(
      `SELECT rt.*, u.role_id, r.name as role_name FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE rt.token = $1 AND rt.expires_at > CURRENT_TIMESTAMP`,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokenData = result.rows[0];
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenData.user_id, tokenData.role_name);

    await query('DELETE FROM refresh_tokens WHERE id = $1', [tokenData.id]);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [tokenData.user_id, newRefreshToken, expiresAt]
    );

    return { accessToken, refreshToken: newRefreshToken };
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
    throw err;
  }
}

async function logoutUser(userId, refreshToken) {
  if (refreshToken) {
    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  }
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

async function changePassword(userId, currentPassword, newPassword) {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!isValid) {
    throw new BadRequestError('Current password is incorrect');
  }

  await validatePasswordStrength(newPassword);
  await checkPasswordHistory(userId, newPassword);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await query(
    'UPDATE users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP WHERE id = $2',
    [passwordHash, userId]
  );

  await recordPasswordHistory(userId, result.rows[0].password_hash);
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

  const user = await query('SELECT email FROM users WHERE id = $1', [userId]);
  if (user.rows.length > 0) {
    await queueEmail(user.rows[0].email, 'Password Changed',
      'Your password was successfully changed. If you did not make this change, contact your administrator immediately.');
    await logSecurityEvent(userId, 'password_changed', 'info',
      'Password was changed successfully', null, null);
  }
}

async function requestPasswordReset(email) {
  const result = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) {
    return;
  }

  const userId = result.rows[0].id;
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  return token;
}

async function resetPassword(token, newPassword) {
  const result = await query(
    `SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > CURRENT_TIMESTAMP`,
    [token]
  );

  if (result.rows.length === 0) {
    throw new BadRequestError('Invalid or expired reset token');
  }

  const resetToken = result.rows[0];

  await validatePasswordStrength(newPassword);
  await checkPasswordHistory(resetToken.user_id, newPassword);

  const oldHash = await query('SELECT password_hash FROM users WHERE id = $1', [resetToken.user_id]);
  const passwordHash = await bcrypt.hash(newPassword, 12);

  await query('UPDATE users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP WHERE id = $2',
    [passwordHash, resetToken.user_id]);
  await query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [resetToken.id]);
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [resetToken.user_id]);

  if (oldHash.rows.length > 0) {
    await recordPasswordHistory(resetToken.user_id, oldHash.rows[0].password_hash);
  }

  const user = await query('SELECT email FROM users WHERE id = $1', [resetToken.user_id]);
  if (user.rows.length > 0) {
    await queueEmail(user.rows[0].email, 'Password Reset Successful',
      'Your password has been reset successfully. If you did not request this, contact your administrator immediately.');
  }
}

async function logAuthentication(userId, email, ipAddress, userAgent, action, status, failureReason) {
  try {
    await query(
      `INSERT INTO authentication_logs (user_id, email, ip_address, user_agent, action, status, failure_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, email, ipAddress, userAgent, action, status, failureReason]
    );
  } catch (err) {
    logger.error('Failed to log authentication', { error: err.message });
  }
}

async function logAudit(userId, action, resource, resourceId, details, ipAddress) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, resource, resourceId, details ? JSON.stringify(details) : null, ipAddress]
    );
  } catch (err) {
    logger.error('Failed to log audit', { error: err.message });
  }
}

async function verifyMFAAndCompleteLogin(userId, mfaMethod, otpCode, preAuthToken) {
  let mfaValid = false;

  if (mfaMethod === 'totp') {
    mfaValid = await mfaService.verifyTOTP(userId, otpCode);
  } else if (mfaMethod === 'email') {
    mfaValid = await mfaService.verifyEmailOTP(userId, otpCode, 'login');
  }

  if (!mfaValid) {
    throw new UnauthorizedError('Invalid MFA code');
  }

  const userResult = await query(
    `SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
    [userId]
  );
  if (!userResult.rows.length) throw new UnauthorizedError('User not found');
  const user = userResult.rows[0];

  const tokens = generateTokens(user.id, user.role_name, { mfaVerified: true });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokens.refreshToken, expiresAt]
  );

  await logSecurityEvent(user.id, 'mfa_verified', 'info', `MFA verification completed via ${mfaMethod}`, null, null);

  return {
    user: sanitizeUser(user),
    ...tokens,
    mfaRequired: false,
  };
}

module.exports = {
  registerUser, loginUser, refreshAccessToken, logoutUser,
  changePassword, requestPasswordReset, resetPassword, logAudit, generateTokens,
  verifyMFAAndCompleteLogin,
};
