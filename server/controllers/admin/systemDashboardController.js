const db = require('../../config/db');
const SystemMonitor = require('../../services/systemMonitor');

exports.getSystemOverview = async (req, res) => {
  try {
    const [health, activeUsers, sessionCount, recentEvents, backupStatus, storageUsage] = await Promise.all([
      SystemMonitor.getSystemHealth(),
      db.query(`SELECT COUNT(*)::int AS count FROM users WHERE is_active = true`),
      db.query(`SELECT COUNT(*)::int AS count FROM user_sessions WHERE is_active = true`),
      db.query(`SELECT * FROM security_events WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours' ORDER BY created_at DESC LIMIT 10`),
      db.query(`SELECT status, COUNT(*)::int AS count FROM backup_records WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days' GROUP BY status`),
      db.query(`SELECT COUNT(*)::int AS total_files, COALESCE(SUM(file_size), 0)::bigint AS total_size_bytes FROM file_storage`),
    ]);
    res.json({
      success: true,
      data: {
        system_health: health,
        active_users: activeUsers.rows[0].count,
        active_sessions: sessionCount.rows[0].count,
        recent_security_events: recentEvents.rows,
        backup_status: backupStatus.rows,
        storage_usage: storageUsage.rows[0],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSystemStats = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const [apiMetrics, dbStats, requestCounts] = await Promise.all([
      SystemMonitor.getPerformanceMetrics(hours),
      db.query(`SELECT COUNT(*)::int AS total_tables FROM information_schema.tables WHERE table_schema = 'public'`),
      db.query(
        `SELECT DATE_TRUNC('hour', created_at) AS hour, COUNT(*)::int AS count
         FROM system_logs
         WHERE created_at >= CURRENT_TIMESTAMP - ($1 || ' hours')::interval
         GROUP BY hour ORDER BY hour DESC`,
        [hours]
      ),
    ]);
    res.json({
      success: true,
      data: {
        api_metrics: apiMetrics,
        database_stats: { total_tables: dbStats.rows[0].total_tables },
        request_counts: requestCounts.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
