const geoip = require('geoip-lite');
const { query } = require('../config/db');
const logger = require('../utils/logger');

const SUSPICIOUS_COUNTRIES = new Set([]);
const IMPOSSIBLE_TRAVEL_SPEED_KMH = 900;

function getGeoData(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return { country: 'Local', countryCode: 'LO', city: 'Local', region: null, ll: [0, 0] };
  }
  const geo = geoip.lookup(ip);
  if (!geo) return { country: 'Unknown', countryCode: 'UN', city: 'Unknown', region: null, ll: [0, 0] };
  return {
    country: geo.country,
    countryCode: geo.country,
    city: geo.city,
    region: geo.region,
    ll: geo.ll || [0, 0],
    timezone: geo.timezone,
  };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function logGeolocation(userId, ipAddress, loginId, geoData) {
  const result = await query(
    `INSERT INTO geolocation_logs (user_id, login_id, ip_address, country, country_code, city, region,
     latitude, longitude, is_vpn, is_proxy, is_datacenter, risk_score)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [userId, loginId, ipAddress, geoData.country, geoData.countryCode, geoData.city, geoData.region,
     geoData.ll ? geoData.ll[0] : null, geoData.ll ? geoData.ll[1] : null,
     geoData.isVpn || false, geoData.isProxy || false, geoData.isDatacenter || false,
     geoData.riskScore || 0]
  );
  return result.rows[0];
}

async function detectImpossibleTravel(userId, ipAddress) {
  const geo = getGeoData(ipAddress);
  if (!geo.ll || geo.ll[0] === 0) return { impossible: false, distance: 0 };

  const lastLocation = await query(
    `SELECT country, city, latitude, longitude, created_at FROM geolocation_logs
     WHERE user_id = $1 AND latitude IS NOT NULL AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  if (!lastLocation.rows.length) return { impossible: false, distance: 0 };

  const last = lastLocation.rows[0];
  const distance = haversineDistance(
    parseFloat(last.latitude), parseFloat(last.longitude),
    geo.ll[0], geo.ll[1]
  );

  const timeDiffHours = (new Date() - new Date(last.created_at)) / (1000 * 60 * 60);
  const speed = timeDiffHours > 0 ? distance / timeDiffHours : 0;

  if (speed > IMPOSSIBLE_TRAVEL_SPEED_KMH && distance > 500) {
    return { impossible: true, distance: Math.round(distance), speed: Math.round(speed), from: `${last.city || ''}, ${last.country || ''}` };
  }
  return { impossible: false, distance: Math.round(distance) };
}

async function checkCountryRestriction(userId, countryCode) {
  const prefs = await query('SELECT allowed_countries, blocked_countries FROM user_security_preferences WHERE user_id = $1', [userId]);
  if (!prefs.rows.length) return { blocked: false };

  const { allowed_countries, blocked_countries } = prefs.rows[0];

  const globalRestriction = await query(
    'SELECT action FROM country_ip_restrictions WHERE country_code = $1 AND is_active = true LIMIT 1',
    [countryCode]
  );

  if (blocked_countries && blocked_countries.includes(countryCode)) return { blocked: true, reason: 'Country blocked by user' };
  if (globalRestriction.rows.length && globalRestriction.rows[0].action === 'block') return { blocked: true, reason: 'Country blocked by administrator' };
  if (allowed_countries && allowed_countries.length > 0 && !allowed_countries.includes(countryCode)) {
    return { blocked: true, reason: 'Country not in allowed list' };
  }
  return { blocked: false };
}

async function getLoginHistory(userId, limit = 50) {
  const result = await query(
    `SELECT gl.*, lrs.risk_score, lrs.risk_level
     FROM geolocation_logs gl
     LEFT JOIN login_risk_scores lrs ON lrs.login_id = gl.login_id
     WHERE gl.user_id = $1 ORDER BY gl.created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

async function getGeoStats(userId) {
  const result = await query(
    `SELECT country, country_code, COUNT(*)::int AS count,
     MIN(created_at) AS first_seen, MAX(created_at) AS last_seen
     FROM geolocation_logs WHERE user_id = $1
     GROUP BY country, country_code ORDER BY count DESC`,
    [userId]
  );
  return result.rows;
}

module.exports = {
  getGeoData, logGeolocation, detectImpossibleTravel,
  checkCountryRestriction, getLoginHistory, getGeoStats,
};
