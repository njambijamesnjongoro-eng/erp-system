const IntegrationEngine = require('../../services/integrationEngine');

exports.getAll = async (req, res) => {
  try {
    const result = await IntegrationEngine.getIntegrations(req.query.provider);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await IntegrationEngine.getIntegrationById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await IntegrationEngine.createIntegration({ ...req.body, created_by: req.user.id });
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const result = await IntegrationEngine.updateIntegration(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggle = async (req, res) => {
  try {
    const result = await IntegrationEngine.toggleIntegration(req.params.id, req.body.is_active);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const result = await IntegrationEngine.deleteIntegration(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const result = await IntegrationEngine.getIntegrationLogs(req.params.id, req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const result = await IntegrationEngine.getIntegrationStats();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWebhooks = async (req, res) => {
  try {
    const result = await IntegrationEngine.getWebhooks();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createWebhook = async (req, res) => {
  try {
    const result = await IntegrationEngine.createWebhook({ ...req.body, created_by: req.user.id });
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateWebhook = async (req, res) => {
  try {
    const result = await IntegrationEngine.updateWebhook(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteWebhook = async (req, res) => {
  try {
    const result = await IntegrationEngine.deleteWebhook(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWebhookDeliveries = async (req, res) => {
  try {
    const result = await IntegrationEngine.getWebhookDeliveries(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
