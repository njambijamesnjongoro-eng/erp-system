const { pool } = require('../config/db');
const { ForbiddenError } = require('../utils/errors');

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.roleName)) {
      return next(new ForbiddenError('Insufficient role permissions'));
    }

    next();
  };
}

function checkPermission(resource, action) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    pool.query(
      `SELECT 1 FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1 AND p.resource = $2 AND p.action = $3`,
      [req.user.roleId, resource, action]
    ).then(result => {
      if (result.rows.length === 0) {
        return next(new ForbiddenError(`Missing permission: ${action} ${resource}`));
      }
      next();
    }).catch(err => next(err));
  };
}

module.exports = { authorize, checkPermission };
