const db = require('../../config/db');
const FileStorageEngine = require('../../services/fileStorageEngine');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }
    const category = req.body.category || 'document';
    const file = await FileStorageEngine.storeFile(req.file, category, req.user.id);
    res.status(201).json({ success: true, data: file });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFile = async (req, res) => {
  try {
    const { id } = req.params;
    const file = await FileStorageEngine.getFileRecord(id);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    res.json({ success: true, data: file });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await FileStorageEngine.deleteFile(id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    res.json({ success: true, message: 'File deleted', data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listFiles = async (req, res) => {
  try {
    const { category, mime_type, search, date_from, date_to, page = 1, limit = 20 } = req.query;
    const filters = { limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit) };
    if (category) filters.category = category;
    if (mime_type) filters.mime_type = mime_type;
    if (search) filters.search = search;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    const files = await FileStorageEngine.listFiles(filters);
    const countParams = [];
    const countConditions = [];
    if (category) { countConditions.push(`category = $${countParams.length + 1}`); countParams.push(category); }
    if (mime_type) { countConditions.push(`mime_type = $${countParams.length + 1}`); countParams.push(mime_type); }
    if (search) { countConditions.push(`(original_name ILIKE $${countParams.length + 1})`); countParams.push(`%${search}%`); }
    if (date_from) { countConditions.push(`created_at >= $${countParams.length + 1}`); countParams.push(date_from); }
    if (date_to) { countConditions.push(`created_at <= $${countParams.length + 1}`); countParams.push(date_to); }
    const where = countConditions.length > 0 ? ` WHERE ` + countConditions.join(' AND ') : '';
    const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM file_storage${where}`, countParams);
    res.json({ success: true, data: files, total: countResult.rows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFileInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const file = await FileStorageEngine.getFileRecord(id);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    res.json({ success: true, data: file });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStorageStats = async (req, res) => {
  try {
    const stats = await FileStorageEngine.getStorageStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
