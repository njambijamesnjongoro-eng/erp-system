const crypto = require('crypto');
const { query } = require('../config/db');
const logger = require('../utils/logger');

async function blacklistToken(tokenHash, tokenType, userId, expiresAt, reason = 'logout') {
  try {
    await query(
      `INSERT INTO token_blacklist (token_hash, token_type, user_id, expires_at, reason)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (token_hash) DO NOTHING`,
      [tokenHash, tokenType, userId, new Date(expiresAt * 1000), reason]
    );
  } catch (e) { logger.error('Token blacklist failed', { error: e.message }); }
}

async function isTokenBlacklisted(token, tokenType = 'access') {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const result = await query(
    `SELECT id FROM token_blacklist WHERE token_hash = $1 AND token_type = $2 AND expires_at > CURRENT_TIMESTAMP`,
    [hash, tokenType]
  );
  return result.rows.length > 0;
}

async function blacklistRefreshToken(token, userId) {
  try {
    const decoded = require('jsonwebtoken').decode(token);
    if (decoded && decoded.exp) {
      await blacklistToken(
        crypto.createHash('sha256').update(token).digest('hex'),
        'refresh', userId, decoded.exp, 'logout'
      );
    }
  } catch (e) { logger.error('Refresh token blacklist failed', { error: e.message }); }
}

async function cleanupExpiredBlacklist() {
  try {
    const result = await query('DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP');
    if (result.rowCount > 0) logger.info(`Cleaned ${result.rowCount} expired blacklisted tokens`);
  } catch (e) { logger.error('Token blacklist cleanup failed', { error: e.message }); }
}

module.exports = { blacklistToken, isTokenBlacklisted, blacklistRefreshToken, cleanupExpiredBlacklist };
