const db = require('../../config/db');
const BIEngine = require('../../services/biEngine');

exports.getInsights = async (req, res) => {
  try {
    const { severity, category, department_id } = req.query;
    const data = await BIEngine.getActiveInsights(department_id || null, category || null);

    let filtered = data;
    if (severity) {
      filtered = data.filter(i => i.severity === severity);
    }

    res.json({ success: true, data: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateInsights = async (req, res) => {
  try {
    const insights = await BIEngine.generateAllInsights();
    res.status(201).json({ success: true, data: insights });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.dismissInsight = async (req, res) => {
  try {
    const data = await BIEngine.dismissInsight(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === 'Insight not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.resolveInsight = async (req, res) => {
  try {
    const data = await BIEngine.resolveInsight(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === 'Insight not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const data = await BIEngine.getRecommendations();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
