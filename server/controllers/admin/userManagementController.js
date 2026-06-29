const db = require('../../config/db');
const bcrypt = require('bcryptjs');
const SessionEngine = require('../../services/sessionEngine');

const normalizeRoleName = (body) => body.role_name || body.role || null;

async function upsertEmployeeProfile(userId, email, fullName, roleName) {
  if (!fullName) return null;
  const existing = await db.query('SELECT id FROM employee_profiles WHERE user_id = $1', [userId]);
  if (existing.rows.length > 0) {
    const result = await db.query(
      `UPDATE employee_profiles
       SET full_name = $1, email = $2, position = COALESCE($3, position), updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $4
       RETURNING id, full_name`,
      [fullName, email, roleName, userId]
    );
    return result.rows[0];
  }

  const employeeId = `USR-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const result = await db.query(
    `INSERT INTO employee_profiles (employee_id, user_id, full_name, email, position, employment_type, employment_status, date_hired)
     VALUES ($1, $2, $3, $4, $5, 'full_time', 'active', CURRENT_DATE)
     RETURNING id, full_name`,
    [employeeId, userId, fullName, email, roleName]
  );
  return result.rows[0];
}

exports.listUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];
    let sql = `SELECT u.id, u.email, COALESCE(ep.full_name, u.email) AS full_name,
      r.name as role_name, u.is_active, u.is_locked, u.last_login, u.created_at, u.updated_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id`;
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
      conditions.push(`(u.email ILIKE $${params.length + 1} OR ep.full_name ILIKE $${params.length + 1})`);
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
      `SELECT u.id, u.email, COALESCE(ep.full_name, u.email) AS full_name,
        r.name as role_name, u.is_active, u.is_locked, u.last_login, u.password_changed_at,
        u.created_at, u.updated_at, r.permissions
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.id = $1`,
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
    const { email, password, full_name } = req.body;
    const role_name = normalizeRoleName(req.body);
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
    const profile = await upsertEmployeeProfile(result.rows[0].id, email, full_name, role_name);
    res.status(201).json({ success: true, data: { ...result.rows[0], role_name, full_name: profile?.full_name || full_name || null } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name } = req.body;
    const role_name = normalizeRoleName(req.body);
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
    if (fields.length === 0 && full_name === undefined) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    let result;
    if (fields.length > 0) {
      params.push(id);
      result = await db.query(
        `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length} RETURNING id, email, role_id, is_active, is_locked, updated_at`,
        params
      );
    } else {
      result = await db.query(
        `SELECT id, email, role_id, is_active, is_locked, updated_at FROM users WHERE id = $1`,
        [id]
      );
    }
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const nextEmail = email || result.rows[0].email;
    const profile = await upsertEmployeeProfile(id, nextEmail, full_name, role_name);
    res.json({ success: true, data: { ...result.rows[0], role_name, full_name: profile?.full_name || full_name || null } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot remove your own account while logged in' });
    }

    if (req.query.hard === 'true' || req.query.permanent === 'true') {
      try {
        await SessionEngine.terminateAllUserSessions(id);
        await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [id]);
        if (result.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.json({ success: true, data: { ...result.rows[0], deleted: true }, message: 'User permanently deleted' });
      } catch (deleteErr) {
        if (deleteErr.code !== '23503') throw deleteErr;
      }
    }

    const result = await db.query(
      `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, email, is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await SessionEngine.terminateAllUserSessions(id);
    res.json({
      success: true,
      data: result.rows[0],
      message: req.query.hard === 'true' || req.query.permanent === 'true'
        ? 'User has company records, so the account was deactivated instead of permanently deleted'
        : 'User deactivated',
    });
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
    if (!id) {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const sessions = await SessionEngine.getActiveSessions(limit);
      return res.json({ success: true, data: sessions });
    }
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
