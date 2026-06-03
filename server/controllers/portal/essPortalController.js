const PortalEngine = require('../../services/portalEngine');

exports.getProfile = async (req, res) => {
  try {
    const result = await PortalEngine.getEmployeeProfile(req.user.employeeId);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPayslips = async (req, res) => {
  try {
    const result = await PortalEngine.getEmployeePayslips(req.user.employeeId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLeaveBalances = async (req, res) => {
  try {
    const result = await PortalEngine.getEmployeeLeaveBalances(req.user.employeeId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAssets = async (req, res) => {
  try {
    const result = await PortalEngine.getEmployeeAssignedAssets(req.user.employeeId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const filters = {};
    if (req.query.month) filters.dateFrom = req.query.month;
    if (req.query.year) filters.dateTo = req.query.year;
    const result = await PortalEngine.getEmployeeAttendance(req.user.employeeId, filters);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTrainings = async (req, res) => {
  try {
    const result = await PortalEngine.getEmployeeTrainings(req.user.employeeId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const result = await PortalEngine.updateEmployeeProfile(req.user.employeeId, req.body);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const result = await PortalEngine.getEmployeeNotifications(req.user.employeeId, req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const result = await PortalEngine.markNotificationRead(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
