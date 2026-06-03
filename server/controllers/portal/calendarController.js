const CalendarEngine = require('../../services/calendarEngine');

exports.getAll = async (req, res) => {
  try {
    const result = await CalendarEngine.getEvents(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUpcoming = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const departmentId = req.query.department_id || null;
    const result = await CalendarEngine.getUpcomingEvents(days, departmentId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const result = await CalendarEngine.getCalendarStats();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await CalendarEngine.getEventById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await CalendarEngine.createEvent({ ...req.body, created_by: req.user.employeeId || req.user.id });
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const result = await CalendarEngine.updateEvent(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const result = await CalendarEngine.deleteEvent(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addParticipant = async (req, res) => {
  try {
    const result = await CalendarEngine.addParticipant(req.params.id, req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateParticipantResponse = async (req, res) => {
  try {
    const result = await CalendarEngine.updateParticipantResponse(req.params.id, req.params.participantId, req.body.response);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeParticipant = async (req, res) => {
  try {
    const result = await CalendarEngine.removeParticipant(req.params.id, req.params.participantId);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
