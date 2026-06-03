const CommunicationEngine = require('../../services/communicationEngine');

exports.getAll = async (req, res) => {
  try {
    const filters = { ...req.query };
    if (req.user.employeeId) filters.employeeId = req.user.employeeId;
    const result = await CommunicationEngine.getAnnouncements(filters);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await CommunicationEngine.getAnnouncementById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await CommunicationEngine.createAnnouncement({ ...req.body, created_by: req.user.employeeId || req.user.id });
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const result = await CommunicationEngine.markAnnouncementRead(req.params.id, req.user.employeeId);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const result = await CommunicationEngine.deleteAnnouncement(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
