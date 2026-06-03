const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { query } = require('../config/db');
const logger = require('../utils/logger');
const encryptionService = require('./encryptionService');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

async function createBackup(userId, type = 'full') {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `erp_backup_${type}_${timestamp}`;
  const filePath = path.join(BACKUP_DIR, `${filename}.sql`);
  const encryptedPath = path.join(BACKUP_DIR, `${filename}.enc`);

  try {
    await query('INSERT INTO backup_logs (backup_type, status, started_at, created_by) VALUES ($1, $2, $3, $4)',
      [type, 'running', new Date(), userId]);

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'erp_system',
    };

    await new Promise((resolve, reject) => {
      const args = [
        '-h', dbConfig.host,
        '-p', String(dbConfig.port),
        '-U', dbConfig.user,
        '-d', dbConfig.database,
        '-f', filePath,
        '--no-owner',
        '--no-privileges',
      ];
      const dump = spawn('pg_dump', args, { env: { ...process.env, PGPASSWORD: dbConfig.password } });
      dump.on('close', (code) => code === 0 ? resolve() : reject(new Error(`pg_dump exit code ${code}`)));
      dump.on('error', reject);
    });

    const fileBuffer = fs.readFileSync(filePath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const encrypted = encryptionService.encrypt(fileBuffer.toString('base64'));
    fs.writeFileSync(encryptedPath, encrypted);
    fs.unlinkSync(filePath);

    const stats = fs.statSync(encryptedPath);
    const duration = Date.now() - startTime;

    await query(
      `UPDATE backup_logs SET status = $1, file_path = $2, file_size = $3, checksum = $4,
       encryption_algorithm = $5, is_encrypted = true, completed_at = CURRENT_TIMESTAMP
       WHERE created_by = $6 AND status = 'running' AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'`,
      ['completed', encryptedPath, stats.size, checksum, 'aes-256-gcm', userId]
    );

    await query(
      `INSERT INTO security_health_checks (check_type, status, duration_ms, details)
       VALUES ($1, $2, $3, $4)`,
      ['database_backup', 'healthy', duration, JSON.stringify({ filename, size: stats.size, type })]
    );

    logger.info(`Backup completed: ${filename}.enc (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
    return { success: true, filePath: encryptedPath, size: stats.size, checksum, duration };
  } catch (e) {
    logger.error('Backup failed', { error: e.message });
    await query(
      "UPDATE backup_logs SET status = 'failed', error_message = $1 WHERE status = 'running' AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'",
      [e.message]
    );
    return { success: false, error: e.message };
  }
}

async function verifyBackup(backupId) {
  const backup = await query('SELECT * FROM backup_logs WHERE id = $1', [backupId]);
  if (!backup.rows.length) throw new Error('Backup not found');
  const b = backup.rows[0];
  if (!b.file_path || !fs.existsSync(b.file_path)) return { valid: false, error: 'Backup file not found' };

  try {
    const encrypted = fs.readFileSync(b.file_path, 'utf8');
    const decrypted = encryptionService.decrypt(encrypted);
    if (!decrypted) return { valid: false, error: 'Decryption failed (invalid key or corrupted data)' };
    const checksum = crypto.createHash('sha256').update(Buffer.from(decrypted, 'base64')).digest('hex');
    return { valid: checksum === b.checksum, checksum, expectedChecksum: b.checksum };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

async function getBackupLogs(limit = 20) {
  const result = await query(
    `SELECT bl.*, u.email as created_by_email FROM backup_logs bl
     LEFT JOIN users u ON bl.created_by = u.id ORDER BY bl.created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

module.exports = { createBackup, verifyBackup, getBackupLogs };
