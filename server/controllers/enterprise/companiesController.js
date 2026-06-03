const MultiTenantEngine = require('../../services/multiTenantEngine');

exports.getCompanies = async (req, res) => {
  try {
    const result = await MultiTenantEngine.getCompanies(req.query);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCompanyById = async (req, res) => {
  try {
    const result = await MultiTenantEngine.getCompanyById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createCompany = async (req, res) => {
  try {
    const result = await MultiTenantEngine.createCompany(req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const result = await MultiTenantEngine.updateCompany(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleCompany = async (req, res) => {
  try {
    const result = await MultiTenantEngine.toggleCompany(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const result = await MultiTenantEngine.deleteCompany(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMultiCompanyStats = async (req, res) => {
  try {
    const companyId = req.query.company_id || req.body.company_id || null;
    const result = await MultiTenantEngine.getMultiCompanyStats(companyId);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
