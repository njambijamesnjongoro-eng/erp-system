const ComplianceEngine = require('../../services/complianceEngine');

const getCompanyId = (req) => req.query.company_id || req.body.company_id || null;

exports.getComplianceStats = async (req, res) => {
  try {
    const result = await ComplianceEngine.getComplianceStats(getCompanyId(req));
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getComplianceDashboard = async (req, res) => {
  try {
    const result = await ComplianceEngine.getComplianceDashboard(getCompanyId(req));
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFrameworks = async (req, res) => {
  try {
    const result = await ComplianceEngine.getFrameworks(req.query);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFrameworkById = async (req, res) => {
  try {
    const result = await ComplianceEngine.getFrameworkById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createFramework = async (req, res) => {
  try {
    const result = await ComplianceEngine.createFramework(req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateFramework = async (req, res) => {
  try {
    const result = await ComplianceEngine.updateFramework(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteFramework = async (req, res) => {
  try {
    const result = await ComplianceEngine.deleteFramework(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRequirements = async (req, res) => {
  try {
    const { framework_id, ...filters } = req.query;
    const result = await ComplianceEngine.getRequirements(framework_id || null, filters);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRequirementById = async (req, res) => {
  try {
    const result = await ComplianceEngine.getRequirementById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createRequirement = async (req, res) => {
  try {
    const result = await ComplianceEngine.createRequirement(req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateRequirement = async (req, res) => {
  try {
    const result = await ComplianceEngine.updateRequirement(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteRequirement = async (req, res) => {
  try {
    const result = await ComplianceEngine.deleteRequirement(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAudits = async (req, res) => {
  try {
    const { company_id, ...filters } = req.query;
    const result = await ComplianceEngine.getAudits(company_id || null, filters);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAuditById = async (req, res) => {
  try {
    const result = await ComplianceEngine.getAuditById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createAudit = async (req, res) => {
  try {
    const result = await ComplianceEngine.createAudit(req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateAudit = async (req, res) => {
  try {
    const result = await ComplianceEngine.updateAudit(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteAudit = async (req, res) => {
  try {
    const result = await ComplianceEngine.deleteAudit(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
