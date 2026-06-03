const db = require('../../config/db');
const SystemMonitor = require('../../services/systemMonitor');

exports.getSystemHealth = async (req, res) => {
  try {
    const data = await SystemMonitor.getSystemHealth();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPerformanceMetrics = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const data = await SystemMonitor.getPerformanceMetrics(hours);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserActivity = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await SystemMonitor.getUserActivityStats(days);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getErrorLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const filters = {};
    if (req.query.level) filters.level = req.query.level;
    if (req.query.source) filters.source = req.query.source;
    if (req.query.date_from) filters.dateFrom = req.query.date_from;
    if (req.query.date_to) filters.dateTo = req.query.date_to;
    filters.limit = limit;
    filters.offset = offset;

    const data = await SystemMonitor.getErrorLogs(filters);

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM system_logs
       WHERE level IN ('error', 'critical')`
    );

    res.json({ success: true, data, total: countResult.rows[0].total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getActiveUsers = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const result = await db.query(
      `SELECT COUNT(DISTINCT user_id)::int AS active_users
       FROM activity_feed
       WHERE created_at >= CURRENT_TIMESTAMP - ($1 || ' hours')::interval`,
      [hours]
    );

    const userDetails = await db.query(
      `SELECT af.user_id, u.email,
        COUNT(*)::int AS activity_count,
        MAX(af.created_at) AS last_active
       FROM activity_feed af
       JOIN users u ON af.user_id = u.id
       WHERE af.created_at >= CURRENT_TIMESTAMP - ($1 || ' hours')::interval
       GROUP BY af.user_id, u.email
       ORDER BY activity_count DESC
       LIMIT 20`,
      [hours]
    );

    res.json({
      success: true,
      data: {
        active_user_count: parseInt(result.rows[0].active_users),
        users: userDetails.rows,
        period_hours: hours,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
