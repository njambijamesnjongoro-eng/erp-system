const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class FileStorageEngine {
  static columnCache = null;

  static async getStorageColumns() {
    if (this.columnCache) return this.columnCache;
    const result = await db.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'file_storage'`
    );
    this.columnCache = new Set(result.rows.map((row) => row.column_name));
    return this.columnCache;
  }

  static firstColumn(columns, names) {
    return names.find((name) => columns.has(name)) || null;
  }

  static async getColumnMap() {
    const columns = await this.getStorageColumns();
    return {
      columns,
      size: this.firstColumn(columns, ['file_size', 'size_bytes', 'size']),
      hash: this.firstColumn(columns, ['md5_hash', 'file_hash', 'sha256_hash', 'checksum']),
      originalName: this.firstColumn(columns, ['original_name', 'filename', 'name']),
      storedName: this.firstColumn(columns, ['stored_name', 'storage_key']),
      mimeType: this.firstColumn(columns, ['mime_type', 'file_type', 'content_type']),
    };
  }

  static fileSelect(map) {
    const sizeExpr = map.size ? map.size : '0::bigint';
    const hashExpr = map.hash ? map.hash : 'NULL::text';
    const originalExpr = map.originalName ? map.originalName : (map.storedName || 'id::text');
    const storedExpr = map.storedName ? map.storedName : originalExpr;
    const mimeExpr = map.mimeType ? map.mimeType : 'NULL::text';
    const categoryExpr = map.columns.has('category') ? 'category' : 'NULL::text';
    const uploadedByExpr = map.columns.has('uploaded_by') ? 'uploaded_by' : 'NULL::uuid';
    const encryptedExpr = map.columns.has('is_encrypted') ? 'is_encrypted' : 'false';
    const accessCountExpr = map.columns.has('access_count') ? 'access_count' : '0::int';
    const createdExpr = map.columns.has('created_at') ? 'created_at' : 'NULL::timestamp';
    const lastAccessExpr = map.columns.has('last_accessed_at') ? 'last_accessed_at' : 'NULL::timestamp';
    return `id,
      ${originalExpr} AS original_name,
      ${storedExpr} AS stored_name,
      ${mimeExpr} AS mime_type,
      ${sizeExpr} AS file_size,
      ${hashExpr} AS file_hash,
      ${categoryExpr} AS category,
      ${uploadedByExpr} AS uploaded_by,
      ${encryptedExpr} AS is_encrypted,
      ${accessCountExpr} AS access_count,
      ${createdExpr} AS created_at,
      ${lastAccessExpr} AS last_accessed_at`;
  }

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
    const map = await this.getColumnMap();
    const valuesByColumn = {
      original_name: file.originalname || file.name || 'unnamed',
      stored_name: storedName,
      file_path: storedPath,
      mime_type: file.mimetype || file.type || 'application/octet-stream',
      file_type: file.mimetype || file.type || 'application/octet-stream',
      file_size: stats.size,
      md5_hash: fileHash,
      file_hash: fileHash,
      category,
      uploaded_by: uploadedBy,
      is_encrypted: isEncrypted,
      access_count: 0,
    };
    const fields = Object.keys(valuesByColumn).filter((field) => map.columns.has(field));
    const params = fields.map((field) => valuesByColumn[field]);
    const placeholders = fields.map((_, index) => `$${index + 1}`);
    const result = await db.query(
      `INSERT INTO file_storage (${fields.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      params
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
    const map = await this.getColumnMap();
    const result = await db.query(
      `SELECT ${this.fileSelect(map)}
       FROM file_storage WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async listFiles(filters = {}) {
    const map = await this.getColumnMap();
    const params = [];
    const conditions = [];
    let sql = `SELECT ${this.fileSelect(map)} FROM file_storage`;
    if (filters.category && map.columns.has('category')) {
      conditions.push(`category = $${params.length + 1}`);
      params.push(filters.category);
    }
    if (filters.uploaded_by && map.columns.has('uploaded_by')) {
      conditions.push(`uploaded_by = $${params.length + 1}`);
      params.push(filters.uploaded_by);
    }
    if (filters.mime_type && map.columns.has('mime_type')) {
      conditions.push(`mime_type = $${params.length + 1}`);
      params.push(filters.mime_type);
    }
    if (filters.search && map.originalName && map.storedName) {
      conditions.push(`(${map.originalName} ILIKE $${params.length + 1} OR ${map.storedName} ILIKE $${params.length + 1})`);
      params.push(`%${filters.search}%`);
    }
    if (filters.date_from && map.columns.has('created_at')) {
      conditions.push(`created_at >= $${params.length + 1}`);
      params.push(filters.date_from);
    }
    if (filters.date_to && map.columns.has('created_at')) {
      conditions.push(`created_at <= $${params.length + 1}`);
      params.push(filters.date_to);
    }
    if (conditions.length > 0) sql += ` WHERE ` + conditions.join(' AND ');
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const orderColumn = map.columns.has('created_at') ? 'created_at' : 'id';
    sql += ` ORDER BY ${orderColumn} DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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
    const map = await this.getColumnMap();
    if (!map.columns.has('category')) {
      const result = await db.query(
        `SELECT COUNT(*)::int AS total_files,
          0::bigint AS total_size_bytes,
          0::int AS document_count,
          0::int AS image_count,
          0::int AS attachment_count,
          0::int AS backup_count,
          '{}'::json AS size_by_category
         FROM file_storage`
      );
      return result.rows[0];
    }

    const result = await db.query(
      `SELECT
        COUNT(*)::int AS total_files,
        0::bigint AS total_size_bytes,
        COUNT(*) FILTER (WHERE category = 'document')::int AS document_count,
        COUNT(*) FILTER (WHERE category = 'image')::int AS image_count,
        COUNT(*) FILTER (WHERE category = 'attachment')::int AS attachment_count,
        COUNT(*) FILTER (WHERE category = 'backup')::int AS backup_count,
        COALESCE(json_object_agg(COALESCE(category, 'uncategorized'), 0), '{}'::json) AS size_by_category
       FROM file_storage`
    );
    return result.rows[0];
  }

  static async getFilesByUploader(userId) {
    const map = await this.getColumnMap();
    if (!map.columns.has('uploaded_by')) return [];
    const orderColumn = map.columns.has('created_at') ? 'created_at' : 'id';
    const result = await db.query(
      `SELECT ${this.fileSelect(map)}
       FROM file_storage WHERE uploaded_by = $1 ORDER BY ${orderColumn} DESC`,
      [userId]
    );
    return result.rows;
  }

  static async incrementAccessCount(id) {
    const columns = await this.getStorageColumns();
    const updates = [];
    if (columns.has('access_count')) updates.push('access_count = access_count + 1');
    if (columns.has('last_accessed_at')) updates.push('last_accessed_at = CURRENT_TIMESTAMP');
    if (updates.length === 0) return;
    await db.query(`UPDATE file_storage SET ${updates.join(', ')} WHERE id = $1`, [id]);
  }
}

module.exports = FileStorageEngine;
