const PolicyEngine = require('../../services/policyEngine');

const getCompanyId = (req) => req.query.company_id || req.body.company_id || null;

exports.getPolicies = async (req, res) => {
  try {
    const { company_id, ...filters } = req.query;
    const result = await PolicyEngine.getPolicies(company_id || null, filters);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPolicyById = async (req, res) => {
  try {
    const result = await PolicyEngine.getPolicyById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createPolicy = async (req, res) => {
  try {
    const result = await PolicyEngine.createPolicy({ ...req.body, created_by: req.user.id });
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const result = await PolicyEngine.updatePolicy(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deletePolicy = async (req, res) => {
  try {
    const result = await PolicyEngine.deletePolicy(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.publishPolicy = async (req, res) => {
  try {
    const result = await PolicyEngine.publishPolicy(req.params.id, req.user.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.acknowledgePolicy = async (req, res) => {
  try {
    const result = await PolicyEngine.acknowledgePolicy(req.params.id, req.user.employeeId || req.user.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPolicyAcknowledgements = async (req, res) => {
  try {
    const result = await PolicyEngine.getPolicyAcknowledgements(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getEmployeeAcknowledgements = async (req, res) => {
  try {
    const result = await PolicyEngine.getEmployeeAcknowledgements(req.user.employeeId || req.user.id);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPolicyStats = async (req, res) => {
  try {
    const result = await PolicyEngine.getPolicyStats(getCompanyId(req));
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
