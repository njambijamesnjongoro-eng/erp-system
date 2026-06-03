const CommunicationEngine = require('../../services/communicationEngine');

exports.getSent = async (req, res) => {
  try {
    const result = await CommunicationEngine.getSentMessages(req.user.employeeId || req.user.id, req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getReceived = async (req, res) => {
  try {
    const result = await CommunicationEngine.getReceivedMessages(req.user.employeeId || req.user.id, req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const result = await CommunicationEngine.getUnreadMessageCount(req.user.employeeId || req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.send = async (req, res) => {
  try {
    const result = await CommunicationEngine.sendMessage(req.user.employeeId || req.user.id, req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendBroadcast = async (req, res) => {
  try {
    const result = await CommunicationEngine.sendBroadcast(req.user.employeeId || req.user.id, req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const result = await CommunicationEngine.markMessageRead(req.params.id, req.user.employeeId || req.user.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
