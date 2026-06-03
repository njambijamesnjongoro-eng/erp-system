const db = require('../config/db');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');
const execPromise = util.promisify(exec);

class BackupEngine {
  static async createBackup(backupType = 'manual', userId = null) {
    const record = await db.query(
      `INSERT INTO backup_records (backup_type, status, created_by, started_at, created_at)
       VALUES ($1, 'in_progress', $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [backupType, userId]
    );
    const backupId = record.rows[0].id;
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const fileName = `erp_backup_${backupId}_${Date.now()}.dump`;
    const filePath = path.join(backupDir, fileName);
    try {
      await execPromise(`pg_dump -U postgres -d erp_system -F c -f "${filePath}"`);
      const stats = fs.statSync(filePath);
      const fileBuffer = fs.readFileSync(filePath);
      const md5Hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
      await db.query(
        `UPDATE backup_records SET status = 'completed', file_path = $1, file_size = $2, md5_hash = $3, completed_at = CURRENT_TIMESTAMP WHERE id = $4`,
        [filePath, stats.size, md5Hash, backupId]
      );
    } catch (err) {
      await db.query(
        `UPDATE backup_records SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [err.message, backupId]
      );
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    const result = await db.query(`SELECT * FROM backup_records WHERE id = $1`, [backupId]);
    return result.rows[0];
  }

  static async restoreBackup(backupId) {
    const record = await db.query(`SELECT * FROM backup_records WHERE id = $1`, [backupId]);
    if (record.rows.length === 0) throw new Error('Backup not found');
    const backup = record.rows[0];
    if (!backup.file_path || !fs.existsSync(backup.file_path)) throw new Error('Backup file not found');
    await db.query(
      `INSERT INTO restore_logs (backup_id, status, started_at, created_at)
       VALUES ($1, 'in_progress', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [backupId]
    );
    try {
      await execPromise(`pg_restore -U postgres -d erp_system -c "${backup.file_path}"`);
      await db.query(
        `UPDATE restore_logs SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE backup_id = $1 AND status = 'in_progress'`,
        [backupId]
      );
      return { success: true, message: 'Restore completed successfully' };
    } catch (err) {
      await db.query(
        `UPDATE restore_logs SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP WHERE backup_id = $2 AND status = 'in_progress'`,
        [err.message, backupId]
      );
      return { success: false, error: err.message };
    }
  }

  static async verifyBackup(backupId, userId) {
    const record = await db.query(`SELECT * FROM backup_records WHERE id = $1`, [backupId]);
    if (record.rows.length === 0) throw new Error('Backup not found');
    const backup = record.rows[0];
    let status = 'verified';
    let errorMessage = null;
    if (!backup.file_path || !fs.existsSync(backup.file_path)) {
      status = 'failed';
      errorMessage = 'Backup file not found on disk';
    } else {
      const fileBuffer = fs.readFileSync(backup.file_path);
      const md5Hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
      if (md5Hash !== backup.md5_hash) {
        status = 'failed';
        errorMessage = 'MD5 hash mismatch - file may be corrupted';
      }
    }
    await db.query(
      `UPDATE backup_records SET verification_status = $1, verified_by = $2, verified_at = CURRENT_TIMESTAMP, verification_error = $3 WHERE id = $4`,
      [status, userId, errorMessage, backupId]
    );
    return { backup_id: backupId, status, error: errorMessage };
  }

  static async deleteBackup(backupId) {
    const record = await db.query(`SELECT * FROM backup_records WHERE id = $1`, [backupId]);
    if (record.rows.length === 0) throw new Error('Backup not found');
    if (record.rows[0].file_path && fs.existsSync(record.rows[0].file_path)) {
      fs.unlinkSync(record.rows[0].file_path);
    }
    await db.query(`DELETE FROM backup_records WHERE id = $1`, [backupId]);
    return { deleted: true };
  }

  static async getBackups(filters = {}) {
    const params = [];
    const conditions = [];
    let sql = `SELECT * FROM backup_records`;
    if (filters.backup_type) {
      conditions.push(`backup_type = $${params.length + 1}`);
      params.push(filters.backup_type);
    }
    if (filters.status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(filters.status);
    }
    if (filters.date_from) {
      conditions.push(`created_at >= $${params.length + 1}`);
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push(`created_at <= $${params.length + 1}`);
      params.push(filters.date_to);
    }
    if (conditions.length > 0) sql += ` WHERE ` + conditions.join(' AND ');
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await db.query(sql, params);
    return result.rows;
  }

  static async getBackupById(id) {
    const result = await db.query(`SELECT * FROM backup_records WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  static async getBackupStats() {
    const totalResult = await db.query(`SELECT COUNT(*)::int AS total_backups FROM backup_records`);
    const sizeResult = await db.query(`SELECT COALESCE(SUM(file_size), 0)::bigint AS total_size FROM backup_records`);
    const lastBackup = await db.query(`SELECT created_at FROM backup_records WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1`);
    const lastVerified = await db.query(`SELECT verified_at FROM backup_records WHERE status = 'verified' ORDER BY verified_at DESC LIMIT 1`);
    const byType = await db.query(`SELECT backup_type, COUNT(*)::int AS cnt FROM backup_records WHERE status = 'completed' GROUP BY backup_type`);
    const byTypeObj = {};
    for (const r of byType.rows) byTypeObj[r.backup_type] = r.cnt;
    return {
      total_backups: totalResult.rows[0]?.total_backups || 0,
      total_size: sizeResult.rows[0]?.total_size || 0,
      last_backup: lastBackup.rows[0]?.created_at || null,
      last_verified: lastVerified.rows[0]?.verified_at || null,
      backups_by_type: byTypeObj,
    };
  }

  static async checkScheduledBackups() {
    const result = await db.query(
      `SELECT * FROM backup_schedules WHERE is_active = true AND (next_run_at <= CURRENT_TIMESTAMP OR next_run_at IS NULL)`
    );
    for (const schedule of result.rows) {
      await this.runScheduledBackup(schedule.id);
    }
    return result.rows;
  }

  static async runScheduledBackup(backupScheduleId) {
    const schedule = await db.query(`SELECT * FROM backup_schedules WHERE id = $1`, [backupScheduleId]);
    if (schedule.rows.length === 0) throw new Error('Schedule not found');
    const backup = await this.createBackup('scheduled', null);
    const sched = schedule.rows[0];
    let nextRun = null;
    if (sched.frequency === 'daily') {
      nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (sched.frequency === 'weekly') {
      nextRun = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else if (sched.frequency === 'monthly') {
      nextRun = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    await db.query(
      `UPDATE backup_schedules SET last_run_at = CURRENT_TIMESTAMP, next_run_at = $1, last_backup_id = $2 WHERE id = $3`,
      [nextRun, backup.id, backupScheduleId]
    );
    return backup;
  }

  static async getSchedules() {
    const result = await db.query(`SELECT * FROM backup_schedules ORDER BY created_at DESC`);
    return result.rows;
  }

  static async createSchedule(data) {
    const result = await db.query(
      `INSERT INTO backup_schedules (frequency, backup_type, retention_days, is_active, next_run_at, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
      [data.frequency, data.backup_type || 'full', data.retention_days || 30, data.is_active !== false, data.next_run_at || null]
    );
    return result.rows[0];
  }

  static async updateSchedule(id, data) {
    const fields = [];
    const params = [];
    if (data.frequency !== undefined) { fields.push(`frequency = $${params.length + 1}`); params.push(data.frequency); }
    if (data.backup_type !== undefined) { fields.push(`backup_type = $${params.length + 1}`); params.push(data.backup_type); }
    if (data.retention_days !== undefined) { fields.push(`retention_days = $${params.length + 1}`); params.push(data.retention_days); }
    if (data.is_active !== undefined) { fields.push(`is_active = $${params.length + 1}`); params.push(data.is_active); }
    if (data.next_run_at !== undefined) { fields.push(`next_run_at = $${params.length + 1}`); params.push(data.next_run_at); }
    if (fields.length === 0) throw new Error('No fields to update');
    params.push(id);
    const result = await db.query(
      `UPDATE backup_schedules SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length} RETURNING *`,
      params
    );
    return result.rows[0];
  }

  static async deleteSchedule(id) {
    const result = await db.query(`DELETE FROM backup_schedules WHERE id = $1 RETURNING *`, [id]);
    return result.rows[0] || null;
  }

  static async getDisasterRecoveryStatus() {
    const result = await db.query(
      `SELECT
        (SELECT COUNT(*)::int FROM backup_records WHERE status = 'completed') AS total_backups,
        (SELECT MAX(created_at) FROM backup_records WHERE status = 'completed') AS latest_backup,
        (SELECT COUNT(*)::int FROM backup_records WHERE verification_status = 'verified') AS verified_backups,
        (SELECT COUNT(*)::int FROM backup_schedules WHERE is_active = true) AS active_schedules,
        EXISTS(SELECT 1 FROM backup_records WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours' AND status = 'completed') AS has_recent_backup`
    );
    return result.rows[0];
  }

  static async cleanupOldBackups() {
    const schedules = await db.query(`SELECT * FROM backup_schedules WHERE is_active = true AND retention_days IS NOT NULL`);
    let deletedCount = 0;
    for (const sched of schedules.rows) {
      const oldBackups = await db.query(
        `SELECT * FROM backup_records WHERE backup_type = $1 AND created_at < CURRENT_TIMESTAMP - ($2 || ' days')::interval AND status = 'completed'`,
        [sched.backup_type, String(sched.retention_days)]
      );
      for (const backup of oldBackups.rows) {
        if (backup.file_path && fs.existsSync(backup.file_path)) {
          fs.unlinkSync(backup.file_path);
        }
        await db.query(`DELETE FROM backup_records WHERE id = $1`, [backup.id]);
        deletedCount++;
      }
    }
    return { deleted: deletedCount };
  }
}

module.exports = BackupEngine;
