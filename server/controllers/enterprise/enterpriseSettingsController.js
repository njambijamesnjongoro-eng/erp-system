const ApiGatewayEngine = require('../../services/apiGatewayEngine');
const SearchEngine = require('../../services/searchEngine');

const getCompanyId = (req) => req.query.company_id || req.body.company_id || null;

exports.getApiKeys = async (req, res) => {
  try {
    const { company_id, ...filters } = req.query;
    const result = await ApiGatewayEngine.getApiKeys(company_id || null, filters);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getApiKeyById = async (req, res) => {
  try {
    const result = await ApiGatewayEngine.getApiKeyById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createApiKey = async (req, res) => {
  try {
    const result = await ApiGatewayEngine.createApiKey({ ...req.body, created_by: req.user.id });
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateApiKey = async (req, res) => {
  try {
    const result = await ApiGatewayEngine.updateApiKey(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteApiKey = async (req, res) => {
  try {
    const result = await ApiGatewayEngine.deleteApiKey(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.revokeApiKey = async (req, res) => {
  try {
    const result = await ApiGatewayEngine.revokeApiKey(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getApiLogs = async (req, res) => {
  try {
    const result = await ApiGatewayEngine.getApiLogs(req.params.id, req.query);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getApiUsageStats = async (req, res) => {
  try {
    const result = await ApiGatewayEngine.getApiUsageStats(req.query);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getGovernanceRules = async (req, res) => {
  try {
    const { company_id, ...filters } = req.query;
    const result = await ApiGatewayEngine.getGovernanceRules(company_id || null, filters);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getGovernanceRuleById = async (req, res) => {
  try {
    const result = await ApiGatewayEngine.getGovernanceRuleById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createGovernanceRule = async (req, res) => {
  try {
    const result = await ApiGatewayEngine.createGovernanceRule(req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateGovernanceRule = async (req, res) => {
  try {
    const result = await ApiGatewayEngine.updateGovernanceRule(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteGovernanceRule = async (req, res) => {
  try {
    const result = await ApiGatewayEngine.deleteGovernanceRule(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOrchestrationRules = async (req, res) => {
  try {
    const { company_id, ...filters } = req.query;
    const result = await ApiGatewayEngine.getOrchestrationRules(company_id || null, filters);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOrchestrationRuleById = async (req, res) => {
  try {
    const result = await ApiGatewayEngine.getOrchestrationRuleById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createOrchestrationRule = async (req, res) => {
  try {
    const result = await ApiGatewayEngine.createOrchestrationRule(req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateOrchestrationRule = async (req, res) => {
  try {
    const result = await ApiGatewayEngine.updateOrchestrationRule(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteOrchestrationRule = async (req, res) => {
  try {
    const result = await ApiGatewayEngine.deleteOrchestrationRule(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.search = async (req, res) => {
  try {
    const result = await SearchEngine.search(req.query);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reindexModule = async (req, res) => {
  try {
    const result = await SearchEngine.reindexModule(req.body);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
