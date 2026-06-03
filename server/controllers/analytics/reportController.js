const db = require('../../config/db');
const ReportGenerator = require('../../services/reportGenerator');
const EmailEngine = require('../../services/emailEngine');

exports.getReportDefinitions = async (req, res) => {
  try {
    const definitions = ReportGenerator.getReportDefinitions();
    res.json({ success: true, data: definitions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateReport = async (req, res) => {
  try {
    const { type, parameters, format } = req.body;
    if (!type) {
      return res.status(400).json({ success: false, message: 'Report type is required' });
    }
    const result = await ReportGenerator.generateReport(type, parameters || {}, format || 'json', req.user.id);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const filters = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.created_by) filters.created_by = req.query.created_by;
    filters.limit = limit;
    filters.offset = offset;

    const countResult = await db.query('SELECT COUNT(*)::int AS total FROM reports');
    const data = await ReportGenerator.getReports(filters);

    res.json({ success: true, data, total: countResult.rows[0].total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getReportById = async (req, res) => {
  try {
    const data = await ReportGenerator.getReportById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === 'Report not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const data = await ReportGenerator.deleteReport(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === 'Report not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSchedules = async (req, res) => {
  try {
    const data = await ReportGenerator.getSchedules();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createSchedule = async (req, res) => {
  try {
    const data = await ReportGenerator.createSchedule(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const data = await ReportGenerator.updateSchedule(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === 'Schedule not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const data = await ReportGenerator.deleteSchedule(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === 'Schedule not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTemplates = async (req, res) => {
  try {
    const data = await EmailEngine.getTemplates(req.query.category || null);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTemplateById = async (req, res) => {
  try {
    const data = await EmailEngine.getTemplateById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const data = await EmailEngine.createTemplate(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const data = await EmailEngine.updateTemplate(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const data = await EmailEngine.deleteTemplate(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendEmail = async (req, res) => {
  try {
    const { to_address, subject, body, template_id } = req.body;
    if (!to_address || !subject || !body) {
      return res.status(400).json({ success: false, message: 'to_address, subject, and body are required' });
    }
    const data = await EmailEngine.sendEmail(to_address, subject, body, template_id || null);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getEmailLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.dateFrom) filters.dateFrom = req.query.dateFrom;
    if (req.query.dateTo) filters.dateTo = req.query.dateTo;
    filters.limit = limit;
    filters.offset = offset;

    const data = await EmailEngine.getEmailLogs(filters);

    const countResult = await db.query('SELECT COUNT(*)::int AS total FROM email_queue');
    res.json({ success: true, data, total: countResult.rows[0].total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
