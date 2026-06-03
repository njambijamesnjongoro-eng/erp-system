const db = require('../../config/db');
const SecurityEngine = require('../../services/securityEngine');

exports.getSecurityEvents = async (req, res) => {
  try {
    const { event_type, severity, is_resolved, date_from, date_to, page = 1, limit = 20 } = req.query;
    const filters = {};
    if (event_type) filters.event_type = event_type;
    if (severity) filters.severity = severity;
    if (is_resolved !== undefined) filters.is_resolved = is_resolved === 'true' || is_resolved === true;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    filters.limit = parseInt(limit);
    filters.offset = (parseInt(page) - 1) * parseInt(limit);
    const events = await SecurityEngine.getSecurityEvents(filters);
    const countParams = [];
    const countConditions = [];
    if (filters.event_type) { countConditions.push(`event_type = $${countParams.length + 1}`); countParams.push(filters.event_type); }
    if (filters.severity) { countConditions.push(`severity = $${countParams.length + 1}`); countParams.push(filters.severity); }
    if (filters.is_resolved !== undefined) { countConditions.push(`is_resolved = $${countParams.length + 1}`); countParams.push(filters.is_resolved); }
    if (filters.date_from) { countConditions.push(`created_at >= $${countParams.length + 1}`); countParams.push(filters.date_from); }
    if (filters.date_to) { countConditions.push(`created_at <= $${countParams.length + 1}`); countParams.push(filters.date_to); }
    const where = countConditions.length > 0 ? ` WHERE ` + countConditions.join(' AND ') : '';
    const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM security_events${where}`, countParams);
    res.json({ success: true, data: events, total: countResult.rows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSecurityEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`SELECT * FROM security_events WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Security event not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.resolveSecurityEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await SecurityEngine.resolveSecurityEvent(id, req.user.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Security event not found' });
    }
    res.json({ success: true, data: event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSecuritySummary = async (req, res) => {
  try {
    const summary = await SecurityEngine.getSystemSecuritySummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.detectThreats = async (req, res) => {
  try {
    const threats = await SecurityEngine.detectSuspiciousActivity();
    res.json({ success: true, data: threats, detected: threats.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLoginAttempts = async (req, res) => {
  try {
    const { email, ip_address, success, date_from, date_to, page = 1, limit = 20 } = req.query;
    const filters = { limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit) };
    if (email) filters.email = email;
    if (ip_address) filters.ip_address = ip_address;
    if (success !== undefined) filters.success = success === 'true' || success === true;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    const attempts = await SecurityEngine.getLoginAttempts(filters);
    const countParams = [];
    const countConditions = [];
    if (email) { countConditions.push(`email = $${countParams.length + 1}`); countParams.push(email); }
    if (ip_address) { countConditions.push(`ip_address = $${countParams.length + 1}`); countParams.push(ip_address); }
    if (success !== undefined) { countConditions.push(`success = $${countParams.length + 1}`); countParams.push(success === 'true' || success === true); }
    if (date_from) { countConditions.push(`created_at >= $${countParams.length + 1}`); countParams.push(date_from); }
    if (date_to) { countConditions.push(`created_at <= $${countParams.length + 1}`); countParams.push(date_to); }
    const where = countConditions.length > 0 ? ` WHERE ` + countConditions.join(' AND ') : '';
    const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM login_attempts${where}`, countParams);
    res.json({ success: true, data: attempts, total: countResult.rows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBlacklist = async (req, res) => {
  try {
    const blacklist = await SecurityEngine.getBlacklist();
    res.json({ success: true, data: blacklist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addToBlacklist = async (req, res) => {
  try {
    const { ip_address, reason } = req.body;
    if (!ip_address) {
      return res.status(400).json({ success: false, message: 'IP address is required' });
    }
    const entry = await SecurityEngine.blacklistIP(ip_address, reason || 'Manually added', req.user.id);
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeFromBlacklist = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await SecurityEngine.removeFromBlacklist(id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Blacklist entry not found' });
    }
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWhitelist = async (req, res) => {
  try {
    const whitelist = await SecurityEngine.getWhitelist();
    res.json({ success: true, data: whitelist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addToWhitelist = async (req, res) => {
  try {
    const { ip_address, description } = req.body;
    if (!ip_address) {
      return res.status(400).json({ success: false, message: 'IP address is required' });
    }
    const entry = await SecurityEngine.whitelistIP(ip_address, description || '', req.user.id);
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeFromWhitelist = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await SecurityEngine.removeFromWhitelist(id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Whitelist entry not found' });
    }
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
