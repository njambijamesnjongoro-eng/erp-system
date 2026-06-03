const db = require('../../config/db');
const SystemConfigEngine = require('../../services/systemConfigEngine');

exports.getSettings = async (req, res) => {
  try {
    const { category } = req.query;
    const settings = await SystemConfigEngine.getSettings(category || null);
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await SystemConfigEngine.getSetting(key);
    if (!setting) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }
    res.json({ success: true, data: setting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ success: false, message: 'settings array is required' });
    }
    const results = await SystemConfigEngine.updateSettings(settings);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await SystemConfigEngine.getCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCompanyInfo = async (req, res) => {
  try {
    const info = await SystemConfigEngine.getCompanyInfo();
    res.json({ success: true, data: info });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSecurityPolicy = async (req, res) => {
  try {
    const policy = await SystemConfigEngine.getSecurityPolicy();
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getEmailConfig = async (req, res) => {
  try {
    const config = await SystemConfigEngine.getEmailConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
