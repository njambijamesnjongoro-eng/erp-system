const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { UnauthorizedError } = require('../utils/errors');
const { checkPermission } = require('./rbac');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      `SELECT u.id, u.email, u.is_active, u.is_locked, u.role_id, r.name as role_name, ep.id as employee_id
       FROM users u JOIN roles r ON u.role_id = r.id LEFT JOIN employee_profiles ep ON ep.user_id = u.id WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new UnauthorizedError('Account is deactivated');
    }

    if (user.is_locked) {
      throw new UnauthorizedError('Account is locked');
    }

    req.user = {
      id: user.id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role_name,
      employeeId: user.employee_id,
    };

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    next(err);
  }
}

module.exports = { authenticate, authorize: checkPermission };
