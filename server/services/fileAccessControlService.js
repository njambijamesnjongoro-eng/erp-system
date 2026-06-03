const { query } = require('../config/db');
const logger = require('../utils/logger');

class FileAccessControlService {
  async canAccess(user, file, action = 'view') {
    if (!user) return false;

    const isOwner = file.uploaded_by === user.id;
    if (isOwner) return true;

    const isAdmin = ['System Admin'].includes(user.role_name);
    if (isAdmin) return true;

    const classification = file.classification || 'internal';
    const classificationConfig = await this._getClassificationConfig(classification);
    if (!classificationConfig || !classificationConfig.is_active) return false;

    const hasRole = classificationConfig.allowed_roles?.includes('all') || classificationConfig.allowed_roles?.includes(user.role_name);
    const hasDepartment = classificationConfig.allowed_departments?.includes('all') || classificationConfig.allowed_departments?.includes(user.department_name);

    if (!hasRole || !hasDepartment) {
      const explicitPerm = await this._checkExplicitPermission(file.id, user.id, action);
      if (!explicitPerm) return false;
    }

    if (['download', 'delete'].includes(action) && classificationConfig.max_access_level > 0) {
      const userLevel = await this._getUserAccessLevel(user);
      if (userLevel < classificationConfig.max_access_level) return false;
    }

    return true;
  }

  async _getClassificationConfig(name) {
    const result = await query('SELECT * FROM file_classifications WHERE name = $1', [name]);
    return result.rows[0] || null;
  }

  async _checkExplicitPermission(fileId, userId, permission) {
    const result = await query(
      `SELECT * FROM file_permissions WHERE file_id = $1 AND user_id = $2
       AND permission = $3 AND is_granted = true
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [fileId, userId, permission]
    );
    return result.rows.length > 0;
  }

  async _getUserAccessLevel(user) {
    if (['System Admin', 'CEO'].includes(user.role_name)) return 10;
    if (['Manager', 'Auditor'].includes(user.role_name)) return 5;
    return 1;
  }

  async grantPermission(fileId, userId, permission, grantedBy, expiresAt = null) {
    await query(
      `INSERT INTO file_permissions (file_id, user_id, permission, granted_by, expires_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (file_id, user_id, role_id, permission)
       DO UPDATE SET is_granted = true, granted_by = $4, expires_at = $5`,
      [fileId, userId, permission, grantedBy, expiresAt]
    );
    return true;
  }

  async revokePermission(fileId, userId, permission) {
    await query(
      `UPDATE file_permissions SET is_granted = false WHERE file_id = $1 AND user_id = $2 AND permission = $3`,
      [fileId, userId, permission]
    );
    return true;
  }

  async getPermissions(fileId) {
    const result = await query(
      `SELECT p.*, u.full_name AS user_name, u.email FROM file_permissions p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.file_id = $1 ORDER BY p.created_at DESC`,
      [fileId]
    );
    return result.rows;
  }
}

module.exports = new FileAccessControlService();
