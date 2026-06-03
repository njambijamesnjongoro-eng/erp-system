const AiEngine = require('../../services/aiEngine');

const getCompanyId = (req) => req.query.company_id || req.body.company_id || null;

exports.getAnalyses = async (req, res) => {
  try {
    const { company_id, ...filters } = req.query;
    const result = await AiEngine.getAnalyses(company_id || null, filters);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAnalysisById = async (req, res) => {
  try {
    const result = await AiEngine.getAnalysisById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createAnalysis = async (req, res) => {
  try {
    const result = await AiEngine.createAnalysis(req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.actionAnalysis = async (req, res) => {
  try {
    const result = await AiEngine.actionAnalysis(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.detectAnomalies = async (req, res) => {
  try {
    const result = await AiEngine.detectAnomalies(req.body);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.predictMaintenance = async (req, res) => {
  try {
    const result = await AiEngine.predictMaintenance(req.body);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.detectProcurementAnomalies = async (req, res) => {
  try {
    const result = await AiEngine.detectProcurementAnomalies(req.body);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.detectPayrollAnomalies = async (req, res) => {
  try {
    const result = await AiEngine.detectPayrollAnomalies(req.body);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateInsights = async (req, res) => {
  try {
    const result = await AiEngine.generateInsights(getCompanyId(req), req.body);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getModels = async (req, res) => {
  try {
    const { company_id, ...filters } = req.query;
    const result = await AiEngine.getModels(company_id || null, filters);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getModelById = async (req, res) => {
  try {
    const result = await AiEngine.getModelById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createModel = async (req, res) => {
  try {
    const result = await AiEngine.createModel(req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateModel = async (req, res) => {
  try {
    const result = await AiEngine.updateModel(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteModel = async (req, res) => {
  try {
    const result = await AiEngine.deleteModel(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.trainModel = async (req, res) => {
  try {
    const result = await AiEngine.trainModel(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAIStats = async (req, res) => {
  try {
    const result = await AiEngine.getAIStats(getCompanyId(req));
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
