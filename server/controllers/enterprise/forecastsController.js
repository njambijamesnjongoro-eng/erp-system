const forecastingEngine = require('../../services/forecastingEngine');

const getCompanyId = (req) => req.query.company_id || req.body.company_id || null;

exports.getAll = async (req, res) => {
  try {
    const result = await forecastingEngine.getForecasts(getCompanyId(req), req.query);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await forecastingEngine.getForecastById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await forecastingEngine.createForecast(req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.recordActual = async (req, res) => {
  try {
    const result = await forecastingEngine.recordActual(req.params.id, req.body.actualValue);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const result = await forecastingEngine.getForecastStats(getCompanyId(req));
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
