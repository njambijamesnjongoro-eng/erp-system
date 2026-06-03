const db = require('../../config/db');
const bcrypt = require('bcryptjs');
const SessionEngine = require('../../services/sessionEngine');

exports.listUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];
    let sql = `SELECT u.id, u.email, r.name as role_name, u.is_active, u.is_locked, u.last_login, u.created_at, u.updated_at FROM users u JOIN roles r ON u.role_id = r.id`;
    if (role) {
      conditions.push(`r.name = $${params.length + 1}`);
      params.push(role);
    }
    if (status === 'active') {
      conditions.push(`u.is_active = true`);
    } else if (status === 'inactive') {
      conditions.push(`u.is_active = false`);
    } else if (status === 'locked') {
      conditions.push(`u.is_locked = true`);
    }
    if (search) {
      conditions.push(`u.email ILIKE $${params.length + 1}`);
      params.push(`%${search}%`);
    }
    if (conditions.length > 0) sql += ` WHERE ` + conditions.join(' AND ');
    const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM (${sql}) sub`, params);
    const total = countResult.rows[0].total;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);
    const result = await db.query(sql, params);
    res.json({ success: true, data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userResult = await db.query(
      `SELECT u.id, u.email, r.name as role_name, u.is_active, u.is_locked, u.last_login, u.password_changed_at, u.created_at, u.updated_at, r.permissions FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
      [id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const sessions = await SessionEngine.getUserSessions(id);
    res.json({ success: true, data: { ...userResult.rows[0], sessions } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, password, role_name } = req.body;
    if (!email || !password || !role_name) {
      return res.status(400).json({ success: false, message: 'Email, password, and role are required' });
    }
    const existing = await db.query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    const roleResult = await db.query(`SELECT id FROM roles WHERE name = $1`, [role_name]);
    if (roleResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const role_id = roleResult.rows[0].id;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (email, password_hash, role_id, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id, email, role_id, is_active, created_at`,
      [email, hashedPassword, role_id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role_name } = req.body;
    const fields = [];
    const params = [];
    if (email !== undefined) { fields.push(`email = $${params.length + 1}`); params.push(email); }
    if (role_name !== undefined) {
      const roleResult = await db.query(`SELECT id FROM roles WHERE name = $1`, [role_name]);
      if (roleResult.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }
      fields.push(`role_id = $${params.length + 1}`); params.push(roleResult.rows[0].id);
    }
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    params.push(id);
    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length} RETURNING id, email, role_id, is_active, is_locked, updated_at`,
      params
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, email, is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await SessionEngine.terminateAllUserSessions(id);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.activateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE users SET is_active = true, is_locked = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, email, is_active, is_locked`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, email, is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await SessionEngine.terminateAllUserSessions(id);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.lockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE users SET is_locked = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, email, is_locked`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await SessionEngine.terminateAllUserSessions(id);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.unlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE users SET is_locked = false, login_attempts = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, email, is_locked`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserSessions = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.query(`SELECT id FROM users WHERE id = $1`, [id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const sessions = await SessionEngine.getUserSessions(id);
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.terminateUserSession = async (req, res) => {
  try {
    const { id, sessionId } = req.params;
    const session = await SessionEngine.terminateSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.terminateAllSessions = async (req, res) => {
  try {
    const { id } = req.params;
    const sessions = await SessionEngine.terminateAllUserSessions(id);
    res.json({ success: true, data: { terminated_count: sessions.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.forceLogout = async (req, res) => {
  try {
    const { id } = req.params;
    const sessions = await SessionEngine.terminateAllUserSessions(id);
    await db.query(
      `UPDATE users SET last_logout = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    res.json({ success: true, data: { terminated_sessions: sessions.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLoginHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM login_attempts WHERE user_id = $1`,
      [id]
    );
    const result = await db.query(
      `SELECT * FROM login_attempts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [id, parseInt(limit), offset]
    );
    res.json({ success: true, data: result.rows, total: countResult.rows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
