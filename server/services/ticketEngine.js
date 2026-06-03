const db = require('../config/db');

class TicketEngine {
  static async createTicket(data) {
    try {
      const today = new Date();
      const yymmdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      const countResult = await db.query(
        `SELECT COUNT(*)::int + 1 AS counter FROM support_tickets WHERE created_at::date = CURRENT_DATE`,
        []
      );
      const counter = String(countResult.rows[0].counter).padStart(4, '0');
      const ticketNumber = `TKT-${yymmdd}-${counter}`;

      const result = await db.query(
        `INSERT INTO support_tickets (ticket_number, title, description, category, priority, status, requester_type, requester_id, requester_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          ticketNumber,
          data.title,
          data.description || null,
          data.category || 'general',
          data.priority || 'medium',
          data.status || 'open',
          data.requester_type || 'employee',
          data.requester_id,
          data.requester_email || null,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getTickets(filters = {}) {
    try {
      let sql = `SELECT st.*, 
                        assignee_ep.full_name AS assignee_name
                 FROM support_tickets st
                 LEFT JOIN employee_profiles assignee_ep ON st.assigned_to = assignee_ep.id
                 WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (filters.status) {
        sql += ` AND st.status = $${paramIndex++}`;
        params.push(filters.status);
      }
      if (filters.category) {
        sql += ` AND st.category = $${paramIndex++}`;
        params.push(filters.category);
      }
      if (filters.priority) {
        sql += ` AND st.priority = $${paramIndex++}`;
        params.push(filters.priority);
      }
      if (filters.requester_id) {
        sql += ` AND st.requester_id = $${paramIndex++}`;
        params.push(filters.requester_id);
      }
      if (filters.assigned_to) {
        sql += ` AND st.assigned_to = $${paramIndex++}`;
        params.push(filters.assigned_to);
      }
      if (filters.search) {
        sql += ` AND (st.title ILIKE $${paramIndex} OR st.description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }
      if (filters.dateFrom) {
        sql += ` AND st.created_at >= $${paramIndex++}`;
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        sql += ` AND st.created_at <= $${paramIndex++}`;
        params.push(filters.dateTo);
      }

      sql += ` ORDER BY st.created_at DESC`;

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

  static async getTicketById(ticketId) {
    try {
      const ticket = await db.query(
        `SELECT st.*, 
                assignee_ep.full_name AS assignee_name
         FROM support_tickets st
         LEFT JOIN employee_profiles assignee_ep ON st.assigned_to = assignee_ep.id
         WHERE st.id = $1`,
        [ticketId]
      );
      if (ticket.rows.length === 0) return { success: false, error: 'Ticket not found' };

      const msgCount = await db.query(
        `SELECT COUNT(*)::int AS count FROM ticket_messages WHERE ticket_id = $1`,
        [ticketId]
      );
      ticket.rows[0].message_count = msgCount.rows[0].count;

      return { success: true, data: ticket.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateTicketStatus(ticketId, status, userId) {
    try {
      const updates = { status };
      if (status === 'resolved') updates.resolved_at = new Date();
      if (status === 'closed') updates.closed_at = new Date();

      const result = await db.query(
        `UPDATE support_tickets 
         SET status = $1, 
             resolved_at = $2, 
             closed_at = $3, 
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 RETURNING *`,
        [
          status,
          updates.resolved_at || null,
          updates.closed_at || null,
          ticketId,
        ]
      );
      if (result.rows.length === 0) return { success: false, error: 'Ticket not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async assignTicket(ticketId, assigneeId, assignedBy) {
    try {
      const result = await db.query(
        `UPDATE support_tickets 
         SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [assigneeId, ticketId]
      );
      if (result.rows.length === 0) return { success: false, error: 'Ticket not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async addTicketMessage(ticketId, data) {
    try {
      const result = await db.query(
        `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, message, is_internal)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [ticketId, data.sender_type || 'employee', data.sender_id, data.sender_name || null, data.message, data.is_internal || false]
      );

      await db.query(
        `UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [ticketId]
      );

      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getTicketMessages(ticketId) {
    try {
      const result = await db.query(
        `SELECT tm.*
         FROM ticket_messages tm
         WHERE tm.ticket_id = $1
         ORDER BY tm.created_at ASC`,
        [ticketId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getTicketStats() {
    try {
      const byStatus = await db.query(
        `SELECT status, COUNT(*)::int AS count FROM support_tickets GROUP BY status ORDER BY status`
      );
      const byCategory = await db.query(
        `SELECT category, COUNT(*)::int AS count FROM support_tickets GROUP BY category ORDER BY category`
      );
      const openCounts = await db.query(
        `SELECT COUNT(*)::int AS open_count FROM support_tickets WHERE status NOT IN ('resolved', 'closed', 'cancelled')`
      );
      const avgResolution = await db.query(
        `SELECT COALESCE(
           EXTRACT(EPOCH FROM AVG(resolved_at - created_at)) / 3600, 0
         )::float AS avg_resolution_hours
         FROM support_tickets 
         WHERE status IN ('resolved', 'closed') AND resolved_at IS NOT NULL`
      );

      return {
        success: true,
        data: {
          by_status: byStatus.rows,
          by_category: byCategory.rows,
          open_count: openCounts.rows[0].open_count,
          avg_resolution_hours: Math.round(avgResolution.rows[0].avg_resolution_hours * 100) / 100,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async addTicketAttachment(ticketId, messageId, fileData) {
    try {
      const result = await db.query(
        `INSERT INTO ticket_attachments (ticket_id, message_id, file_name, file_path, file_size, file_type, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          ticketId,
          messageId || null,
          fileData.file_name,
          fileData.file_path,
          fileData.file_size || null,
          fileData.file_type || null,
          fileData.uploaded_by || null,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteTicket(ticketId) {
    try {
      await db.query(`DELETE FROM ticket_attachments WHERE ticket_id = $1`, [ticketId]);
      await db.query(`DELETE FROM ticket_messages WHERE ticket_id = $1`, [ticketId]);
      const result = await db.query(`DELETE FROM support_tickets WHERE id = $1 RETURNING id`, [ticketId]);
      if (result.rows.length === 0) return { success: false, error: 'Ticket not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = TicketEngine;
