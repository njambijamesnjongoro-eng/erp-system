const MultiTenantEngine = require('../../services/multiTenantEngine');

exports.getCompanyUsers = async (req, res) => {
  try {
    const companyId = req.query.company_id || req.body.company_id || null;
    const result = await MultiTenantEngine.getCompanyUsers(companyId);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.assignUserToCompany = async (req, res) => {
  try {
    const result = await MultiTenantEngine.assignUserToCompany(req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeUserFromCompany = async (req, res) => {
  try {
    const result = await MultiTenantEngine.removeUserFromCompany(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
