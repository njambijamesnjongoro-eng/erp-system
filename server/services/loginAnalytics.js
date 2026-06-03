const { query } = require('../config/db');

async function getLoginStats(userId, days = 30) {
  const result = await query(
    `SELECT DATE(created_at) AS date,
     COUNT(*)::int AS total,
     COUNT(*) FILTER (WHERE status = 'SUCCESS')::int AS successful,
     COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed
     FROM authentication_logs WHERE user_id = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'
     GROUP BY DATE(created_at) ORDER BY date DESC`,
    [userId]
  );
  return result.rows;
}

async function getDeviceAnalytics(userId) {
  const result = await query(
    `SELECT browser, os, device_type, COUNT(*)::int AS count,
     MAX(last_seen_at) AS last_seen
     FROM device_fingerprints WHERE user_id = $1
     GROUP BY browser, os, device_type ORDER BY count DESC`,
    [userId]
  );
  return result.rows;
}

async function getGeoAnalytics(userId) {
  const result = await query(
    `SELECT country, country_code, city, COUNT(*)::int AS login_count,
     MIN(created_at) AS first_login, MAX(created_at) AS last_login
     FROM geolocation_logs WHERE user_id = $1
     GROUP BY country, country_code, city ORDER BY login_count DESC`,
    [userId]
  );
  return result.rows;
}

async function getFailedLoginTrends(days = 7) {
  const result = await query(
    `SELECT DATE(created_at) AS date,
     COUNT(*)::int AS count,
     COUNT(DISTINCT user_id)::int AS affected_users
     FROM authentication_logs WHERE status = 'FAILED' AND created_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'
     GROUP BY DATE(created_at) ORDER BY date`
  );
  return result.rows;
}

async function getRiskHeatmap(userId) {
  const result = await query(
    `SELECT EXTRACT(HOUR FROM created_at)::int AS hour,
     risk_level, COUNT(*)::int AS count
     FROM login_risk_scores WHERE user_id = $1
     GROUP BY hour, risk_level ORDER BY hour`,
    [userId]
  );
  return result.rows;
}

async function getGlobalLoginStats() {
  const [totalLogins, failedToday, activeUsers, uniqueIPs] = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM authentication_logs WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'"),
    query("SELECT COUNT(*)::int AS count FROM authentication_logs WHERE status = 'FAILED' AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'"),
    query("SELECT COUNT(DISTINCT user_id)::int AS count FROM authentication_logs WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' AND user_id IS NOT NULL"),
    query("SELECT COUNT(DISTINCT ip_address)::int AS count FROM authentication_logs WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'"),
  ]);
  return {
    totalLogins24h: totalLogins.rows[0].count,
    failedLogins24h: failedToday.rows[0].count,
    activeUsers24h: activeUsers.rows[0].count,
    uniqueIPs24h: uniqueIPs.rows[0].count,
  };
}

module.exports = { getLoginStats, getDeviceAnalytics, getGeoAnalytics, getFailedLoginTrends, getRiskHeatmap, getGlobalLoginStats };
