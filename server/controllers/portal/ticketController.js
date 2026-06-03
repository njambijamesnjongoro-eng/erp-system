const TicketEngine = require('../../services/ticketEngine');

exports.getAll = async (req, res) => {
  try {
    const result = await TicketEngine.getTickets(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const result = await TicketEngine.getTicketStats();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await TicketEngine.getTicketById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await TicketEngine.createTicket({ ...req.body, requester_id: req.user.employeeId || req.user.id, requester_email: req.user.email });
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const result = await TicketEngine.updateTicketStatus(req.params.id, req.body.status, req.user.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.assignTicket = async (req, res) => {
  try {
    const result = await TicketEngine.assignTicket(req.params.id, req.body.assigned_to, req.user.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const result = await TicketEngine.getTicketMessages(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addMessage = async (req, res) => {
  try {
    const result = await TicketEngine.addTicketMessage(req.params.id, {
      sender_type: req.body.sender_type || 'employee',
      sender_id: req.user.employeeId || req.user.id,
      sender_name: req.user.name || null,
      message: req.body.message,
      is_internal: req.body.is_internal || false,
    });
    if (!result.success) return res.status(404).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const result = await TicketEngine.addTicketAttachment(req.params.id, req.body.message_id || null, {
      file_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      file_type: req.file.mimetype,
      uploaded_by: req.user.id,
    });
    if (!result.success) return res.status(404).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const result = await TicketEngine.deleteTicket(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
