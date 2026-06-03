const MultiTenantEngine = require('../../services/multiTenantEngine');

exports.getBranches = async (req, res) => {
  try {
    const companyId = req.query.company_id || req.body.company_id || null;
    const filters = { ...req.query, company_id: companyId };
    const result = await MultiTenantEngine.getBranches(filters);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBranchById = async (req, res) => {
  try {
    const result = await MultiTenantEngine.getBranchById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createBranch = async (req, res) => {
  try {
    const result = await MultiTenantEngine.createBranch(req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const result = await MultiTenantEngine.updateBranch(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const result = await MultiTenantEngine.deleteBranch(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.assignManager = async (req, res) => {
  try {
    const result = await MultiTenantEngine.assignBranchManager(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
