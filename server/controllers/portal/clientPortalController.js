const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const PortalEngine = require('../../services/portalEngine');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const result = await db.query(`SELECT * FROM client_users WHERE email = $1`, [email]);
    if (result.rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const client = result.rows[0];
    const valid = await bcrypt.compare(password, client.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { clientId: client.id, email: client.email, type: 'client' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ success: true, data: { token, client: { id: client.id, name: client.contact_name, email: client.email } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { contact_name, email, password, phone, company_name } = req.body;
    if (!contact_name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password required' });

    const existing = await db.query(`SELECT id FROM client_users WHERE email = $1`, [email]);
    if (existing.rows.length > 0) return res.status(409).json({ success: false, message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO client_users (contact_name, company_name, email, password_hash, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, contact_name, company_name, email, phone`,
      [contact_name, company_name || null, email, passwordHash, phone || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const clientId = req.user.clientId;
    const allowedFields = ['contact_name', 'phone', 'company_name', 'address', 'city', 'country'];
    const updates = [];
    const params = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        params.push(req.body[field]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No valid fields to update' });

    params.push(clientId);
    const sql = `UPDATE client_users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING id, contact_name, company_name, email, phone, address`;
    const result = await db.query(sql, params);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const result = await PortalEngine.getClientInvoices(req.user.email);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTickets = async (req, res) => {
  try {
    const clientId = req.user.clientId || req.user.id;
    const result = await PortalEngine.getClientTickets(clientId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const clientId = req.user.clientId || req.user.id;
    const result = await PortalEngine.getClientDocuments(clientId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
