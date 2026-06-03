const crypto = require('crypto');
const { query } = require('../config/db');
const logger = require('../utils/logger');

const TRUST_DURATION_DAYS = 30;
const DEVICE_RISK_WEIGHTS = { new_device: 30, unknown_browser: 15, vpn: 25, datacenter: 20, geo_change: 25 };

async function registerDeviceFingerprint(userId, info) {
  const hash = crypto.createHash('sha256')
    .update(`${info.fingerprint || info.userAgent || ''}${info.ip || ''}`)
    .digest('hex');

  const existing = await query(
    'SELECT * FROM device_fingerprints WHERE user_id = $1 AND fingerprint_hash = $2',
    [userId, hash]
  );

  if (existing.rows.length > 0) {
    const dev = existing.rows[0];
    await query(
      `UPDATE device_fingerprints SET last_seen_at = CURRENT_TIMESTAMP, login_count = login_count + 1,
       ip_address = $1, is_trusted = $2 WHERE id = $3`,
      [info.ip, dev.trusted_until && new Date(dev.trusted_until) > new Date(), dev.id]
    );
    return { known: true, device: dev, fingerprintHash: hash };
  }

  const result = await query(
    `INSERT INTO device_fingerprints (user_id, fingerprint_hash, device_name, browser, browser_version, os, os_version,
     device_type, screen_resolution, timezone, language, ip_address, is_trusted, is_approved)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
    [userId, hash, info.deviceName, info.browser, info.browserVersion, info.os, info.osVersion,
     info.deviceType || 'desktop', info.screenResolution, info.timezone, info.language,
     info.ip, false, false]
  );

  return { known: false, device: result.rows[0], fingerprintHash: hash };
}

async function getDeviceFingerprints(userId) {
  const result = await query(
    'SELECT * FROM device_fingerprints WHERE user_id = $1 ORDER BY last_seen_at DESC',
    [userId]
  );
  return result.rows;
}

async function getDeviceById(deviceId, userId) {
  const result = await query(
    'SELECT * FROM device_fingerprints WHERE id = $1 AND user_id = $2',
    [deviceId, userId]
  );
  return result.rows[0] || null;
}

async function approveDevice(deviceId, userId) {
  const trustedUntil = new Date(Date.now() + TRUST_DURATION_DAYS * 24 * 60 * 60 * 1000);
  await query(
    'UPDATE device_fingerprints SET is_approved = true, is_trusted = true, trusted_until = $1 WHERE id = $2 AND user_id = $3',
    [trustedUntil, deviceId, userId]
  );
}

async function revokeDevice(deviceId, userId) {
  await query(
    'UPDATE device_fingerprints SET is_trusted = false, is_approved = false, trusted_until = NULL WHERE id = $1 AND user_id = $2',
    [deviceId, userId]
  );
}

async function scoreDeviceRisk(device) {
  if (!device) return 50;
  if (device.is_trusted && device.trusted_until && new Date(device.trusted_until) > new Date()) {
    return 5;
  }
  if (device.is_approved) return 15;
  if (device.login_count > 10) return 10;
  if (device.login_count > 3) return 20;
  return 40;
}

async function calculateDeviceRisk(userId, deviceInfo) {
  const hash = crypto.createHash('sha256')
    .update(`${deviceInfo.fingerprint || deviceInfo.userAgent || ''}${deviceInfo.ip || ''}`)
    .digest('hex');
  const existing = await query(
    'SELECT * FROM device_fingerprints WHERE user_id = $1 AND fingerprint_hash = $2',
    [userId, hash]
  );
  return scoreDeviceRisk(existing.rows[0] || null);
}

module.exports = {
  registerDeviceFingerprint, getDeviceFingerprints, getDeviceById,
  approveDevice, revokeDevice, scoreDeviceRisk, calculateDeviceRisk,
};
