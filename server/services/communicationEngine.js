const db = require('../config/db');

class CommunicationEngine {
  static async createAnnouncement(data) {
    try {
      const result = await db.query(
        `INSERT INTO announcements (title, content, category, department_id, priority, created_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          data.title,
          data.content,
          data.category || 'general',
          data.department_id || null,
          data.priority || 'normal',
          data.created_by,
          data.expires_at || null,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getAnnouncements(filters = {}) {
    try {
      let sql = `SELECT a.*, ep.full_name AS created_by_name
                 FROM announcements a
                 LEFT JOIN employee_profiles ep ON a.created_by = ep.id
                 WHERE a.is_active = true`;
      const params = [];
      let paramIndex = 1;

      if (filters.department_id) {
        sql += ` AND (a.department_id IS NULL OR a.department_id = $${paramIndex++})`;
        params.push(filters.department_id);
      }
      if (filters.priority) {
        sql += ` AND a.priority = $${paramIndex++}`;
        params.push(filters.priority);
      }
      if (filters.search) {
        sql += ` AND (im.subject ILIKE $${paramIndex} OR im.message ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      sql += ` ORDER BY a.created_at DESC`;

      if (filters.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
      } else {
        sql += ` LIMIT 50`;
      }
      if (filters.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(filters.offset);
      }

      const result = await db.query(sql, params);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getAnnouncementById(id) {
    try {
      const result = await db.query(
        `SELECT a.*, ep.full_name AS created_by_name
         FROM announcements a
         LEFT JOIN employee_profiles ep ON a.created_by = ep.id
         WHERE a.id = $1`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Announcement not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async markAnnouncementRead(announcementId, employeeId) {
    try {
      const result = await db.query(
        `INSERT INTO announcement_reads (announcement_id, employee_id)
         VALUES ($1, $2)
         ON CONFLICT (announcement_id, employee_id) DO UPDATE SET read_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [announcementId, employeeId]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteAnnouncement(id) {
    try {
      const result = await db.query(
        `UPDATE announcements SET is_active = false WHERE id = $1 RETURNING id`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Announcement not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async sendMessage(senderId, data) {
    try {
      const msg = await db.query(
        `INSERT INTO internal_messages (sender_id, subject, message)
         VALUES ($1, $2, $3) RETURNING *`,
        [senderId, data.subject, data.message]
      );

      const recipients = Array.isArray(data.recipient_ids) ? data.recipient_ids : (data.recipient_id ? [data.recipient_id] : [data.recipient_ids]);
      for (const recipientId of recipients) {
        await db.query(
          `INSERT INTO message_recipients (message_id, recipient_id)
           VALUES ($1, $2)`,
          [msg.rows[0].id, recipientId]
        );
      }

      return { success: true, data: msg.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getSentMessages(senderId, filters = {}) {
    try {
      let sql = `SELECT im.* FROM internal_messages im WHERE im.sender_id = $1`;
      const params = [senderId];
      let paramIndex = 2;

      if (filters.search) {
        sql += ` AND (im.subject ILIKE $${paramIndex} OR im.body ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }
      if (filters.dateFrom) {
        sql += ` AND im.created_at >= $${paramIndex++}`;
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        sql += ` AND im.created_at <= $${paramIndex++}`;
        params.push(filters.dateTo);
      }

      sql += ` ORDER BY im.created_at DESC`;

      if (filters.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
      } else {
        sql += ` LIMIT 50`;
      }
      if (filters.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(filters.offset);
      }

      const result = await db.query(sql, params);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getReceivedMessages(recipientId, filters = {}) {
    try {
      let sql = `SELECT im.*, mr.is_read, mr.read_at, ep.full_name AS sender_name
                 FROM internal_messages im
                 JOIN message_recipients mr ON im.id = mr.message_id
                 LEFT JOIN employee_profiles ep ON im.sender_id = ep.id
                 WHERE mr.recipient_id = $1`;
      const params = [recipientId];
      let paramIndex = 2;

      if (filters.is_read !== undefined) {
        sql += ` AND mr.is_read = $${paramIndex++}`;
        params.push(filters.is_read);
      }
      if (filters.search) {
        sql += ` AND (im.subject ILIKE $${paramIndex} OR im.body ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }
      if (filters.dateFrom) {
        sql += ` AND im.created_at >= $${paramIndex++}`;
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        sql += ` AND im.created_at <= $${paramIndex++}`;
        params.push(filters.dateTo);
      }

      sql += ` ORDER BY im.created_at DESC`;

      if (filters.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
      } else {
        sql += ` LIMIT 50`;
      }
      if (filters.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(filters.offset);
      }

      const result = await db.query(sql, params);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async markMessageRead(messageId, recipientId) {
    try {
      const result = await db.query(
        `UPDATE message_recipients 
         SET is_read = true, read_at = CURRENT_TIMESTAMP 
         WHERE message_id = $1 AND recipient_id = $2 RETURNING *`,
        [messageId, recipientId]
      );
      if (result.rows.length === 0) return { success: false, error: 'Message recipient not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getUnreadMessageCount(recipientId) {
    try {
      const result = await db.query(
        `SELECT COUNT(*)::int AS count FROM message_recipients WHERE recipient_id = $1 AND is_read = false`,
        [recipientId]
      );
      return { success: true, data: { count: result.rows[0].count } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async sendBroadcast(senderId, data) {
    try {
      const msg = await db.query(
        `INSERT INTO internal_messages (sender_id, subject, message, is_broadcast)
         VALUES ($1, $2, $3, true) RETURNING *`,
        [senderId, data.subject, data.message]
      );

      const employees = await db.query(
        `SELECT id FROM employee_profiles WHERE employment_status = 'active'`
      );

      for (const emp of employees.rows) {
        await db.query(
          `INSERT INTO message_recipients (message_id, recipient_id)
           VALUES ($1, $2)`,
          [msg.rows[0].id, emp.id]
        );
      }

      return { success: true, data: msg.rows[0], recipient_count: employees.rows.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getUnreadAnnouncementCount(employeeId) {
    try {
      const result = await db.query(
        `SELECT COUNT(*)::int AS count
         FROM announcements a
         WHERE a.is_active = true
           AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
           AND NOT EXISTS (SELECT 1 FROM announcement_reads ar WHERE ar.announcement_id = a.id AND ar.employee_id = $1)`,
        [employeeId]
      );
      return { success: true, data: { count: result.rows[0].count } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = CommunicationEngine;
