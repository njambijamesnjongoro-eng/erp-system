const os = require('os');
const { query } = require('../config/db');
const logger = require('../utils/logger');

async function getSystemHealth() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const cpus = os.cpus();
  const cpuLoad = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b);
    const idle = cpu.times.idle;
    return acc + ((total - idle) / total) * 100;
  }, 0) / cpus.length;

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    cpuCount: cpus.length,
    cpuLoad: Math.round(cpuLoad * 100) / 100,
    memoryTotal: totalMem,
    memoryUsed: totalMem - freeMem,
    memoryFree: freeMem,
    memoryUsagePercent: Math.round(((totalMem - freeMem) / totalMem) * 100 * 100) / 100,
    loadAverage: os.loadavg ? os.loadavg() : [0, 0, 0],
  };
}

async function checkDatabaseHealth() {
  const start = Date.now();
  try {
    await query('SELECT 1');
    const duration = Date.now() - start;
    const result = await query(
      `SELECT COUNT(*)::int AS total_connections FROM pg_stat_activity WHERE state = 'active'`
    );
    return {
      status: 'healthy',
      responseTimeMs: duration,
      activeConnections: result.rows[0].total_connections || 0,
    };
  } catch (e) {
    return { status: 'unhealthy', responseTimeMs: Date.now() - start, error: e.message };
  }
}

async function checkAllServices() {
  const [system, db] = await Promise.all([
    getSystemHealth(),
    checkDatabaseHealth(),
  ]);
  return {
    timestamp: new Date().toISOString(),
    system,
    database: db,
    allHealthy: db.status === 'healthy',
  };
}

async function logHealthCheck(type, status, duration, details) {
  try {
    await query(
      `INSERT INTO security_health_checks (check_type, status, duration_ms, details) VALUES ($1, $2, $3, $4)`,
      [type, status, duration, details ? JSON.stringify(details) : null]
    );
  } catch (e) { logger.error('Health check log failed', { error: e.message }); }
}

async function getPerformanceMetrics() {
  const [apiStats, errorStats, avgResponseTime] = await Promise.all([
    query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status_code >= 400)::int AS errors FROM api_logs WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'"),
    query("SELECT COUNT(*)::int AS count FROM api_logs WHERE status_code >= 500 AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'"),
    query("SELECT COALESCE(AVG(response_time_ms), 0)::int AS avg_ms FROM api_logs WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'"),
  ]);
  return {
    requestsLastHour: apiStats.rows[0].total,
    errorsLastHour: apiStats.rows[0].errors,
    serverErrorsLastHour: errorStats.rows[0].count,
    avgResponseTimeMs: avgResponseTime.rows[0].avg_ms,
  };
}

module.exports = { getSystemHealth, checkDatabaseHealth, checkAllServices, logHealthCheck, getPerformanceMetrics };
