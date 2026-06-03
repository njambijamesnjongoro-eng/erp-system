const db = require('../../config/db');
const NotificationEngine = require('../../services/notificationEngine');

exports.getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { is_read, type } = req.query;

    const filters = {};
    if (is_read !== undefined) filters.is_read = is_read === 'true';
    if (type) filters.type = type;
    filters.limit = limit;
    filters.offset = offset;

    const data = await NotificationEngine.getUserNotifications(req.user.id, filters);

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM notifications WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({ success: true, data, total: countResult.rows[0].total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await NotificationEngine.getUnreadCount(req.user.id);
    res.json({ success: true, data: { unread_count: count } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const data = await NotificationEngine.markAsRead(req.params.id, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === 'Notification not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const data = await NotificationEngine.markAllAsRead(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.archiveNotification = async (req, res) => {
  try {
    const data = await NotificationEngine.archiveNotification(req.params.id, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === 'Notification not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const data = await NotificationEngine.deleteNotification(req.params.id, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === 'Notification not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const data = await NotificationEngine.getPreferences(req.user.id);
    if (!data) {
      return res.json({
        success: true,
        data: {
          email_notifications: true,
          in_app_notifications: true,
          sms_notifications: false,
          push_notifications: false,
          categories: [],
        },
      });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const data = await NotificationEngine.updatePreferences(req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
