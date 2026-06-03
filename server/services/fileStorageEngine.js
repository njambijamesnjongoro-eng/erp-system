const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class FileStorageEngine {
  static async storeFile(file, category = 'document', uploadedBy = null, isEncrypted = false) {
    const fileBuffer = fs.readFileSync(file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const ext = path.extname(file.originalname || file.name || 'file');
    const storedName = `${fileHash}${ext}`;
    const storageDir = path.join(__dirname, '..', 'uploads', category);
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
    const storedPath = path.join(storageDir, storedName);
    fs.copyFileSync(file.path, storedPath);
    const stats = fs.statSync(storedPath);
    const result = await db.query(
      `INSERT INTO file_storage (original_name, stored_name, file_path, mime_type, file_size, file_hash, category, uploaded_by, is_encrypted, access_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        file.originalname || file.name || 'unnamed',
        storedName,
        storedPath,
        file.mimetype || file.type || 'application/octet-stream',
        stats.size,
        fileHash,
        category,
        uploadedBy,
        isEncrypted
      ]
    );
    return result.rows[0];
  }

  static async getFile(id) {
    const result = await db.query(`SELECT * FROM file_storage WHERE id = $1`, [id]);
    if (result.rows.length === 0) return null;
    const record = result.rows[0];
    if (!fs.existsSync(record.file_path)) return null;
    const stream = fs.createReadStream(record.file_path);
    await this.incrementAccessCount(id);
    return { stream, record };
  }

  static async getFileRecord(id) {
    const result = await db.query(
      `SELECT id, original_name, stored_name, mime_type, file_size, file_hash, category, uploaded_by, is_encrypted, access_count, created_at, last_accessed_at
       FROM file_storage WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async listFiles(filters = {}) {
    const params = [];
    const conditions = [];
    let sql = `SELECT id, original_name, stored_name, mime_type, file_size, file_hash, category, uploaded_by, is_encrypted, access_count, created_at, last_accessed_at FROM file_storage`;
    if (filters.category) {
      conditions.push(`category = $${params.length + 1}`);
      params.push(filters.category);
    }
    if (filters.uploaded_by) {
      conditions.push(`uploaded_by = $${params.length + 1}`);
      params.push(filters.uploaded_by);
    }
    if (filters.mime_type) {
      conditions.push(`mime_type = $${params.length + 1}`);
      params.push(filters.mime_type);
    }
    if (filters.search) {
      conditions.push(`(original_name ILIKE $${params.length + 1} OR stored_name ILIKE $${params.length + 1})`);
      params.push(`%${filters.search}%`);
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

  static async deleteFile(id) {
    const result = await db.query(`SELECT * FROM file_storage WHERE id = $1`, [id]);
    if (result.rows.length === 0) return null;
    const record = result.rows[0];
    if (fs.existsSync(record.file_path)) {
      fs.unlinkSync(record.file_path);
    }
    await db.query(`DELETE FROM file_storage WHERE id = $1`, [id]);
    return { deleted: true, record };
  }

  static async getStorageStats() {
    const result = await db.query(
      `SELECT
        COUNT(*)::int AS total_files,
        COALESCE(SUM(file_size), 0)::bigint AS total_size_bytes,
        COUNT(*) FILTER (WHERE category = 'document')::int AS document_count,
        COUNT(*) FILTER (WHERE category = 'image')::int AS image_count,
        COUNT(*) FILTER (WHERE category = 'attachment')::int AS attachment_count,
        COUNT(*) FILTER (WHERE category = 'backup')::int AS backup_count,
        json_object_agg(category, cat_size) AS size_by_category
       FROM (
         SELECT category, COALESCE(SUM(file_size), 0)::bigint AS cat_size FROM file_storage GROUP BY category
       ) sub`
    );
    return result.rows[0];
  }

  static async getFilesByUploader(userId) {
    const result = await db.query(
      `SELECT id, original_name, mime_type, file_size, category, access_count, created_at
       FROM file_storage WHERE uploaded_by = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async incrementAccessCount(id) {
    await db.query(
      `UPDATE file_storage SET access_count = access_count + 1, last_accessed_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
  }
}

module.exports = FileStorageEngine;
