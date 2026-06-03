const { query } = require('../config/db');
const rateLimiter = require('./rateLimiterService');
const threatDetection = require('./threatDetectionService');
const logger = require('../utils/logger');

function createApiGateway() {
  return async (req, res, next) => {
    const start = Date.now();
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userId = req.user?.id;
    const path = req.originalUrl || req.url;
    const method = req.method;

    // Rate limiting
    const rateResult = await rateLimiter.checkRateLimit(ip, userId, path);
    if (!rateResult.allowed) {
      const duration = Date.now() - start;
      await logRequest(req, userId, 429, duration, true);
      if (rateResult.blocked) {
        return res.status(429).json({ success: false, message: rateResult.message || 'Too many requests. IP blocked.' });
      }
      res.setHeader('X-RateLimit-Limit', rateResult.limit);
      res.setHeader('X-RateLimit-Remaining', rateResult.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(rateResult.resetAt / 1000));
      return res.status(429).json({ success: false, message: 'Too many requests. Please slow down.' });
    }

    res.setHeader('X-RateLimit-Limit', rateResult.limit);
    res.setHeader('X-RateLimit-Remaining', rateResult.remaining);

    // Suspicious payload detection (POST/PUT/PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
      const threat = threatDetection.detectSuspiciousPayload(req.body, req.query, req.params);
      if (threat.detected) {
        await threatDetection.logThreat(
          threat.type, threat.severity, ip, userId, path, method,
          JSON.stringify(req.body).substring(0, 200),
          JSON.stringify(req.headers),
          threat.description
        );
        logger.warn(`Threat detected: ${threat.type} from ${ip} on ${path}`);
        if (threat.severity === 'critical') {
          rateLimiter.blacklistIP(ip);
          return res.status(403).json({ success: false, message: 'Request blocked for security reasons' });
        }
      }
    }

    // Log request after response
    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = Date.now() - start;
      logRequest(req, userId, res.statusCode, duration, false).catch(() => {});
      logApiLog(req, userId, path, method, res.statusCode, duration).catch(() => {});
      originalEnd.apply(this, args);
    };

    next();
  };
}

async function logRequest(req, userId, statusCode, duration, rateLimited) {
  try {
    await query(
      `INSERT INTO request_logs (user_id, method, path, query_params, ip_address, user_agent, referer,
       status_code, response_time_ms, body_size, rate_limited)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [userId, req.method, req.originalUrl || req.url,
       JSON.stringify(req.query), req.ip || req.connection?.remoteAddress,
       req.headers['user-agent'], req.headers['referer'] || req.headers['referrer'],
       statusCode, duration, JSON.stringify(req.body || '').length, rateLimited]
    );
  } catch (e) { logger.error('Request log failed', { error: e.message }); }
}

async function logApiLog(req, userId, endpoint, method, statusCode, responseTimeMs) {
  try {
    await query(
      `INSERT INTO api_logs (user_id, endpoint, method, status_code, response_time_ms, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, endpoint, method, statusCode, responseTimeMs,
       req.ip || req.connection?.remoteAddress, req.headers['user-agent']]
    );
  } catch (e) { /* silent */ }
}

async function getGatewayStats(userId) {
  const [totalRequests, avgResponseTime, recentErrors, topEndpoints] = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM request_logs WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'"),
    query("SELECT COALESCE(AVG(response_time_ms), 0)::int AS avg FROM request_logs WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'"),
    query("SELECT COUNT(*)::int AS count FROM request_logs WHERE status_code >= 400 AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'"),
    query(`SELECT path, COUNT(*)::int AS count, AVG(response_time_ms)::int AS avg_ms
           FROM request_logs WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
           GROUP BY path ORDER BY count DESC LIMIT 20`),
  ]);
  return {
    requests24h: totalRequests.rows[0].count,
    avgResponseTimeMs: avgResponseTime.rows[0].avg,
    errors24h: recentErrors.rows[0].count,
    topEndpoints: topEndpoints.rows,
  };
}

module.exports = { createApiGateway, getGatewayStats };
