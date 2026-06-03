const WorkflowEngine = require('../../services/workflowEngine');

const getCompanyId = (req) => req.query.company_id || req.body.company_id || null;

exports.getWorkflowDefinitions = async (req, res) => {
  try {
    const { company_id, ...filters } = req.query;
    const result = await WorkflowEngine.getWorkflowDefinitions(company_id || null, filters);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWorkflowDefinitionById = async (req, res) => {
  try {
    const result = await WorkflowEngine.getWorkflowDefinitionById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createWorkflowDefinition = async (req, res) => {
  try {
    const result = await WorkflowEngine.createWorkflowDefinition(req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateWorkflowDefinition = async (req, res) => {
  try {
    const result = await WorkflowEngine.updateWorkflowDefinition(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteWorkflowDefinition = async (req, res) => {
  try {
    const result = await WorkflowEngine.deleteWorkflowDefinition(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.triggerWorkflow = async (req, res) => {
  try {
    const result = await WorkflowEngine.triggerWorkflow(req.params.id, { ...req.body, triggered_by: req.user.id });
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approveStep = async (req, res) => {
  try {
    const result = await WorkflowEngine.approveStep(req.params.id, { ...req.body, approved_by: req.user.id });
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectStep = async (req, res) => {
  try {
    const result = await WorkflowEngine.rejectStep(req.params.id, { ...req.body, rejected_by: req.user.id });
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWorkflowInstances = async (req, res) => {
  try {
    const { company_id, ...filters } = req.query;
    const result = await WorkflowEngine.getWorkflowInstances(company_id || null, filters);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getInstanceById = async (req, res) => {
  try {
    const result = await WorkflowEngine.getInstanceById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWorkflowStats = async (req, res) => {
  try {
    const result = await WorkflowEngine.getWorkflowStats(getCompanyId(req));
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
