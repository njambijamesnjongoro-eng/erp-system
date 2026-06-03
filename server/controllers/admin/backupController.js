const db = require('../../config/db');
const BackupEngine = require('../../services/backupEngine');

exports.createBackup = async (req, res) => {
  try {
    const backup = await BackupEngine.createBackup('manual', req.user.id);
    res.status(201).json({ success: true, data: backup });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.restoreBackup = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await BackupEngine.restoreBackup(id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyBackup = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await BackupEngine.verifyBackup(id, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteBackup = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await BackupEngine.deleteBackup(id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBackups = async (req, res) => {
  try {
    const { backup_type, status, date_from, date_to, page = 1, limit = 20 } = req.query;
    const filters = { limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit) };
    if (backup_type) filters.backup_type = backup_type;
    if (status) filters.status = status;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    const backups = await BackupEngine.getBackups(filters);
    const countParams = [];
    const countConditions = [];
    if (backup_type) { countConditions.push(`backup_type = $${countParams.length + 1}`); countParams.push(backup_type); }
    if (status) { countConditions.push(`status = $${countParams.length + 1}`); countParams.push(status); }
    if (date_from) { countConditions.push(`created_at >= $${countParams.length + 1}`); countParams.push(date_from); }
    if (date_to) { countConditions.push(`created_at <= $${countParams.length + 1}`); countParams.push(date_to); }
    const where = countConditions.length > 0 ? ` WHERE ` + countConditions.join(' AND ') : '';
    const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM backup_records${where}`, countParams);
    res.json({ success: true, data: backups, total: countResult.rows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBackupById = async (req, res) => {
  try {
    const { id } = req.params;
    const backup = await BackupEngine.getBackupById(id);
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }
    res.json({ success: true, data: backup });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBackupStats = async (req, res) => {
  try {
    const stats = await BackupEngine.getBackupStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSchedules = async (req, res) => {
  try {
    const schedules = await BackupEngine.getSchedules();
    res.json({ success: true, data: schedules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createSchedule = async (req, res) => {
  try {
    const schedule = await BackupEngine.createSchedule(req.body);
    res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await BackupEngine.updateSchedule(id, req.body);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }
    res.json({ success: true, data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await BackupEngine.deleteSchedule(id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.runScheduledBackup = async (req, res) => {
  try {
    const { id } = req.params;
    const backup = await BackupEngine.runScheduledBackup(id);
    res.json({ success: true, data: backup });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
