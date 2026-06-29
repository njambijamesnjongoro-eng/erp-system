const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const os = require('os');

class DeploymentEngine {
  static async getSystemHealth() {
    const dbOk = await this.checkDatabaseConnection();
    const memUsage = process.memoryUsage();
    const cpus = os.cpus();
    return {
      status: dbOk ? 'healthy' : 'degraded',
      server_uptime_seconds: process.uptime(),
      system_uptime_seconds: os.uptime(),
      memory: {
        rss: memUsage.rss,
        heap_total: memUsage.heapTotal,
        heap_used: memUsage.heapUsed,
        external: memUsage.external,
        rss_mb: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
        heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'unknown',
        speed_mhz: cpus[0]?.speed || 0,
        load_percent: cpus.filter(c => c.speed > 0).length > 0
          ? Math.round(cpus.reduce((acc, cpu) => {
              const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
              const idle = cpu.times.idle;
              return acc + ((total - idle) / total) * 100;
            }, 0) / cpus.length * 100) / 100
          : 0
      },
      database: dbOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    };
  }

  static async checkDatabaseConnection() {
    try {
      await db.query('SELECT 1 AS health_check');
      return true;
    } catch {
      return false;
    }
  }

  static async getActiveUserCount() {
    const result = await db.query(
      `SELECT COUNT(*)::int AS active_users_24h
       FROM user_sessions
       WHERE is_active = true AND last_activity >= CURRENT_TIMESTAMP - INTERVAL '24 hours'`
    );
    return result.rows[0].active_users_24h;
  }

  static async getStorageInfo() {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    let totalSize = 0;
    let fileCount = 0;
    if (fs.existsSync(uploadsDir)) {
      const walkDir = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) walkDir(fullPath);
          else {
            totalSize += fs.statSync(fullPath).size;
            fileCount++;
          }
        }
      };
      walkDir(uploadsDir);
    }
    const dbResult = await db.query(
      `SELECT COUNT(*)::int AS db_file_count, COALESCE(SUM(file_size), 0)::bigint AS db_total_size FROM file_storage`
    );
    return {
      upload_directory: uploadsDir,
      disk_files: fileCount,
      disk_size_bytes: totalSize,
      disk_size_mb: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      db_files: dbResult.rows[0].db_file_count,
      db_size_bytes: dbResult.rows[0].db_total_size,
      db_size_mb: Math.round(dbResult.rows[0].db_total_size / 1024 / 1024 * 100) / 100
    };
  }

  static async getPerformanceMetrics() {
    const hourly = await db.query(
      `SELECT
        DATE_TRUNC('hour', created_at) AS hour,
        COUNT(*)::int AS request_count,
        ROUND(AVG(response_time), 2) AS avg_response_time,
        ROUND(COUNT(*) FILTER (WHERE status_code >= 500)::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS error_rate
       FROM api_usage_logs
       WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
       GROUP BY DATE_TRUNC('hour', created_at)
       ORDER BY hour DESC`
    );
    const endpoints = await db.query(
      `SELECT
        endpoint, method,
        COUNT(*)::int AS request_count,
        ROUND(AVG(response_time), 2) AS avg_response_time,
        ROUND(COUNT(*) FILTER (WHERE status_code >= 400)::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS error_rate,
        MAX(response_time)::int AS max_response_time
       FROM api_usage_logs
       WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
       GROUP BY endpoint, method
       ORDER BY request_count DESC
       LIMIT 50`
    );
    const summary = await db.query(
      `SELECT
        COUNT(*)::int AS total_requests_24h,
        ROUND(AVG(response_time), 2) AS avg_response_time_24h,
        ROUND(COUNT(*) FILTER (WHERE status_code >= 500)::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS error_rate_24h,
        COUNT(*) FILTER (WHERE status_code >= 500)::int AS server_errors_24h,
        COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 500)::int AS client_errors_24h
       FROM api_usage_logs
       WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'`
    );
    return { summary: summary.rows[0], hourly: hourly.rows, by_endpoint: endpoints.rows };
  }

  static async getEnvironmentInfo() {
    return {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
      os_type: os.type(),
      os_release: os.release(),
      total_memory_mb: Math.round(os.totalmem() / 1024 / 1024),
      free_memory_mb: Math.round(os.freemem() / 1024 / 1024),
      cpus: os.cpus().length,
      process_uptime_seconds: process.uptime(),
      system_uptime_seconds: os.uptime(),
      pid: process.pid,
      env: process.env.NODE_ENV || 'development'
    };
  }
}

module.exports = DeploymentEngine;
