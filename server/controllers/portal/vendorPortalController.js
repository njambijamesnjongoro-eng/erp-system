const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const PortalEngine = require('../../services/portalEngine');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const result = await db.query(`SELECT * FROM procurement_suppliers WHERE email = $1`, [email]);
    if (result.rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const supplier = result.rows[0];
    const valid = await bcrypt.compare(password, supplier.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { supplierId: supplier.id, email: supplier.email, type: 'supplier' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ success: true, data: { token, supplier: { id: supplier.id, name: supplier.supplier_name, email: supplier.email } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPurchaseOrders = async (req, res) => {
  try {
    const result = await PortalEngine.getSupplierPurchaseOrders(req.user.supplierId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getQuotations = async (req, res) => {
  try {
    const result = await PortalEngine.getSupplierQuotations(req.user.supplierId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitQuotation = async (req, res) => {
  try {
    const result = await PortalEngine.submitSupplierQuotation(req.user.supplierId, req.body);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDeliveries = async (req, res) => {
  try {
    const result = await PortalEngine.getSupplierDeliveries(req.user.supplierId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const result = await PortalEngine.updateSupplierProfile(req.user.supplierId, req.body);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
