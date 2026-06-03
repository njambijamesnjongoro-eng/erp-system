const PaymentEngine = require('../../services/paymentEngine');

exports.getAll = async (req, res) => {
  try {
    const result = await PaymentEngine.getPayments(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const result = await PaymentEngine.getPaymentStats();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await PaymentEngine.getPaymentById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await PaymentEngine.createPayment(req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.processMpesa = async (req, res) => {
  try {
    const result = await PaymentEngine.processMpesaPayment(req.body);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const result = await PaymentEngine.updatePaymentStatus(req.params.id, req.body.status, req.body.transaction_id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getByReference = async (req, res) => {
  try {
    const result = await PaymentEngine.getPaymentsByReference(req.params.type, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
