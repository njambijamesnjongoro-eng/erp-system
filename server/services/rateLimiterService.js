const { query } = require('../config/db');
const logger = require('../utils/logger');

const RATE_LIMITS = {
  default: { windowMs: 60000, max: 100 },
  auth: { windowMs: 900000, max: 10 },
  sensitive: { windowMs: 60000, max: 20 },
  admin: { windowMs: 60000, max: 50 },
  finance: { windowMs: 60000, max: 30 },
  api: { windowMs: 60000, max: 200 },
};

const DEVELOPMENT_RATE_LIMIT_MULTIPLIER = 20;

const ipRequestCounts = new Map();
const userRequestCounts = new Map();
const BLACKLIST_DURATION = 30 * 60 * 1000;
const blacklistedIPs = new Map();

const CLEANUP_INTERVAL = 60000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of ipRequestCounts) {
    if (entry.resetAt < now) ipRequestCounts.delete(key);
  }
  for (const [key, entry] of userRequestCounts) {
    if (entry.resetAt < now) userRequestCounts.delete(key);
  }
  for (const [ip, until] of blacklistedIPs) {
    if (until < now) blacklistedIPs.delete(ip);
  }
}, CLEANUP_INTERVAL);

function getLimitsForPath(path) {
  let limits = RATE_LIMITS.default;
  if (path.startsWith('/api/auth/')) limits = RATE_LIMITS.auth;
  else if (path.startsWith('/api/finance/')) limits = RATE_LIMITS.finance;
  else if (path.startsWith('/api/admin/')) limits = RATE_LIMITS.admin;
  else if (path.startsWith('/api/security-phase2')) limits = RATE_LIMITS.sensitive;
  else if (path.startsWith('/api/security')) limits = RATE_LIMITS.sensitive;

  if (process.env.NODE_ENV !== 'production' && !path.startsWith('/api/auth/')) {
    return { ...limits, max: limits.max * DEVELOPMENT_RATE_LIMIT_MULTIPLIER };
  }

  return limits;
}

function isBlacklisted(ip) {
  const until = blacklistedIPs.get(ip);
  if (until && until > Date.now()) return true;
  if (until) blacklistedIPs.delete(ip);
  return false;
}

function blacklistIP(ip, duration = BLACKLIST_DURATION) {
  blacklistedIPs.set(ip, Date.now() + duration);
  logger.warn(`IP blacklisted: ${ip} for ${duration / 60000}min`);
}

async function checkRateLimit(ip, userId, path) {
  if (isBlacklisted(ip)) return { allowed: false, blocked: true, message: 'IP is temporarily blocked' };

  const limits = getLimitsForPath(path);
  const now = Date.now();

  // IP-based
  const ipKey = `${ip}:${limits.windowMs}`;
  let ipEntry = ipRequestCounts.get(ipKey);
  if (!ipEntry || ipEntry.resetAt < now) {
    ipEntry = { count: 0, resetAt: now + limits.windowMs };
    ipRequestCounts.set(ipKey, ipEntry);
  }
  ipEntry.count++;

  // User-based (if authenticated)
  let userEntry = null;
  if (userId) {
    const userKey = `${userId}:${limits.windowMs}`;
    userEntry = userRequestCounts.get(userKey);
    if (!userEntry || userEntry.resetAt < now) {
      userEntry = { count: 0, resetAt: now + limits.windowMs };
      userRequestCounts.set(userKey, userEntry);
    }
    userEntry.count++;
  }

  const ipExceeded = ipEntry.count > limits.max;
  const userExceeded = userEntry ? userEntry.count > limits.max : false;

  if (ipExceeded || userExceeded) {
    const remaining = limits.max - Math.min(ipEntry.count, userEntry?.count || ipEntry.count) + 1;
    await query(
      `INSERT INTO rate_limit_violations (ip_address, user_id, endpoint, method, limit_type, limit_value, window_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [ip, userId, path, 'RATE_LIMIT', ipExceeded ? 'ip' : 'user', limits.max, limits.windowMs]
    );

    if (ipEntry.count > limits.max * 3) {
      blacklistIP(ip);
      return { allowed: false, blocked: true, message: 'IP blocked due to excessive requests' };
    }

    return { allowed: false, remaining: Math.max(0, remaining), resetAt: ipEntry.resetAt, limit: limits.max };
  }

  const ipRemaining = limits.max - ipEntry.count;
  const userRemaining = userEntry ? limits.max - userEntry.count : limits.max;
  return {
    allowed: true,
    remaining: Math.min(ipRemaining, userRemaining),
    resetAt: ipEntry.resetAt,
    limit: limits.max,
  };
}

async function getRateLimitStats(userId) {
  const [violations, blockedIPs, topViolators] = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM rate_limit_violations WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'"),
    query("SELECT COUNT(*)::int AS count FROM rate_limit_violations WHERE blocked_until > CURRENT_TIMESTAMP"),
    query(`SELECT ip_address, COUNT(*)::int AS count FROM rate_limit_violations
           WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
           GROUP BY ip_address ORDER BY count DESC LIMIT 10`),
  ]);
  return {
    violations24h: violations.rows[0].count,
    currentlyBlocked: blockedIPs.rows[0].count,
    topViolators: topViolators.rows,
  };
}

module.exports = { checkRateLimit, getRateLimitStats, blacklistIP, isBlacklisted };
