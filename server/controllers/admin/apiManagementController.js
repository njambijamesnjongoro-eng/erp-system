const db = require('../../config/db');
const APIManagementEngine = require('../../services/apiManagementEngine');

exports.getApiKeys = async (req, res) => {
  try {
    const keys = await APIManagementEngine.getApiKeys();
    res.json({ success: true, data: keys });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createApiKey = async (req, res) => {
  try {
    const { name, permissions, rate_limit, ip_restrictions } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Key name is required' });
    }
    const key = await APIManagementEngine.generateApiKey(name, req.user.id, permissions || [], rate_limit || 100, ip_restrictions || []);
    res.status(201).json({ success: true, data: key });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const key = await APIManagementEngine.updateApiKey(id, req.body);
    if (!key) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }
    res.json({ success: true, data: key });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.revokeApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const key = await APIManagementEngine.revokeApiKey(id);
    if (!key) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }
    res.json({ success: true, data: key });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getApiUsage = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const filters = {};
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    const usage = await APIManagementEngine.getApiUsageStats(filters);
    res.json({ success: true, data: usage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getApiLogs = async (req, res) => {
  try {
    const { api_key_id, endpoint, method, status_code, date_from, date_to, page = 1, limit = 20 } = req.query;
    const filters = { limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit) };
    if (api_key_id) filters.api_key_id = api_key_id;
    if (endpoint) filters.endpoint = endpoint;
    if (method) filters.method = method;
    if (status_code) filters.status_code = parseInt(status_code);
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    const logs = await APIManagementEngine.getApiUsageLogs(filters);
    const countParams = [];
    const countConditions = [];
    if (api_key_id) { countConditions.push(`api_key_id = $${countParams.length + 1}`); countParams.push(api_key_id); }
    if (endpoint) { countConditions.push(`endpoint = $${countParams.length + 1}`); countParams.push(endpoint); }
    if (method) { countConditions.push(`method = $${countParams.length + 1}`); countParams.push(method); }
    if (status_code) { countConditions.push(`status_code = $${countParams.length + 1}`); countParams.push(parseInt(status_code)); }
    if (date_from) { countConditions.push(`created_at >= $${countParams.length + 1}`); countParams.push(date_from); }
    if (date_to) { countConditions.push(`created_at <= $${countParams.length + 1}`); countParams.push(date_to); }
    const where = countConditions.length > 0 ? ` WHERE ` + countConditions.join(' AND ') : '';
    const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM api_usage_logs${where}`, countParams);
    res.json({ success: true, data: logs, total: countResult.rows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
