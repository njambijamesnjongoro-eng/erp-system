const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { query } = require('../config/db');
const logger = require('../utils/logger');
const { queueEmail } = require('./securityEngine');

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const BACKUP_CODE_COUNT = 10;

async function setupTOTP(userId) {
  const secret = speakeasy.generateSecret({ length: 20, name: `ERP:${userId}` });
  const existing = await query('SELECT id FROM mfa_settings WHERE user_id = $1', [userId]);
  if (existing.rows.length > 0) {
    await query('UPDATE mfa_settings SET totp_secret = $1, totp_enabled = false, method = $2 WHERE user_id = $3',
      [secret.base32, 'none', userId]);
  } else {
    await query('INSERT INTO mfa_settings (user_id, method, totp_secret, totp_enabled) VALUES ($1, $2, $3, $4)',
      [userId, 'none', secret.base32, false]);
  }
  const otpauth = speakeasy.otpauthURL({ secret: secret.ascii, label: `ERP:${userId}`, issuer: 'ERP System' });
  const qrCode = await QRCode.toDataURL(otpauth);
  return { secret: secret.base32, qrCode, otpauth };
}

async function verifyAndEnableTOTP(userId, token) {
  const mfa = await query('SELECT totp_secret FROM mfa_settings WHERE user_id = $1', [userId]);
  if (!mfa.rows.length || !mfa.rows[0].totp_secret) throw new Error('MFA not initialized');
  const verified = speakeasy.totp.verify({
    secret: mfa.rows[0].totp_secret,
    encoding: 'base32',
    token,
    window: 2,
  });
  if (!verified) throw new Error('Invalid TOTP code');
  await query('UPDATE mfa_settings SET totp_enabled = true, method = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
    ['totp', userId]);
  const codes = await generateBackupCodes(userId);
  return { verified: true, backupCodes: codes };
}

async function verifyTOTP(userId, token) {
  const mfa = await query('SELECT totp_secret, totp_enabled FROM mfa_settings WHERE user_id = $1', [userId]);
  if (!mfa.rows.length || !mfa.rows[0].totp_enabled) throw new Error('TOTP not enabled');
  return speakeasy.totp.verify({
    secret: mfa.rows[0].totp_secret,
    encoding: 'base32',
    token,
    window: 2,
  });
}

async function sendEmailOTP(userId, email, purpose = 'login') {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await query(
    'INSERT INTO otp_tokens (user_id, type, otp_code, purpose, expires_at) VALUES ($1, $2, $3, $4, $5)',
    [userId, 'email', otp, purpose, expiresAt]
  );
  const purposeLabels = { login: 'Login Verification', mfa_setup: 'MFA Setup', password_reset: 'Password Reset', device_approval: 'Device Approval' };
  await queueEmail(email, `Your OTP Code - ${purposeLabels[purpose] || 'Verification'}`,
    `Your OTP code is: ${otp}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not request this, contact your administrator immediately.`);
  return true;
}

async function verifyEmailOTP(userId, otpCode, purpose = 'login') {
  const result = await query(
    `SELECT * FROM otp_tokens WHERE user_id = $1 AND type = 'email' AND purpose = $2
     AND used = false AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1`,
    [userId, purpose]
  );
  if (!result.rows.length) return false;
  const otp = result.rows[0];
  if (otp.attempts >= otp.max_attempts) {
    await query('UPDATE otp_tokens SET used = true WHERE id = $1', [otp.id]);
    throw new Error('OTP max attempts exceeded');
  }
  if (otp.otp_code !== otpCode) {
    await query('UPDATE otp_tokens SET attempts = attempts + 1 WHERE id = $1', [otp.id]);
    return false;
  }
  await query('UPDATE otp_tokens SET used = true WHERE id = $1', [otp.id]);
  return true;
}

async function generateBackupCodes(userId, count = BACKUP_CODE_COUNT) {
  await query('DELETE FROM recovery_codes WHERE user_id = $1 AND used = false', [userId]);
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = `ERP-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    await query('INSERT INTO recovery_codes (user_id, code_hash) VALUES ($1, $2)', [userId, hash]);
    codes.push(code);
  }
  return codes;
}

async function verifyBackupCode(userId, code) {
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  const result = await query(
    'SELECT id FROM recovery_codes WHERE user_id = $1 AND code_hash = $2 AND used = false',
    [userId, hash]
  );
  if (!result.rows.length) return false;
  await query('UPDATE recovery_codes SET used = true, used_at = CURRENT_TIMESTAMP WHERE id = $1', [result.rows[0].id]);
  return true;
}

async function getMFAStatus(userId) {
  const mfa = await query('SELECT * FROM mfa_settings WHERE user_id = $1', [userId]);
  if (!mfa.rows.length) {
    return { enabled: false, method: 'none', totpEnabled: false, emailOtpEnabled: false, mfaRequired: false };
  }
  const s = mfa.rows[0];
  return {
    enabled: s.method !== 'none',
    method: s.method,
    totpEnabled: s.totp_enabled,
    emailOtpEnabled: s.email_otp_enabled,
    mfaRequired: s.is_mfa_required || s.method !== 'none',
  };
}

async function disableMFA(userId) {
  await query(
    'UPDATE mfa_settings SET method = $1, totp_enabled = false, email_otp_enabled = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
    ['none', userId]
  );
  await query('DELETE FROM recovery_codes WHERE user_id = $1', [userId]);
}

async function enableEmailOTP(userId) {
  await query(
    'UPDATE mfa_settings SET method = $1, email_otp_enabled = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
    ['email', userId]
  );
}

async function getMFARecoveryStatus(userId) {
  const result = await query(
    'SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE used = true)::int AS used_count FROM recovery_codes WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || { total: 0, used_count: 0 };
}

async function getOTPAttempts(userId) {
  const result = await query(
    `SELECT id, attempts, max_attempts, expires_at FROM otp_tokens
     WHERE user_id = $1 AND used = false AND expires_at > CURRENT_TIMESTAMP
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  if (!result.rows.length) return { remaining: 5 };
  return { remaining: result.rows[0].max_attempts - result.rows[0].attempts };
}

module.exports = {
  setupTOTP, verifyAndEnableTOTP, verifyTOTP,
  sendEmailOTP, verifyEmailOTP,
  generateBackupCodes, verifyBackupCode,
  getMFAStatus, disableMFA, enableEmailOTP,
  getMFARecoveryStatus, getOTPAttempts,
};
