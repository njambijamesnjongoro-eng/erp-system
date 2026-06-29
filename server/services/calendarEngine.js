const db = require('../config/db');

class CalendarEngine {
  static normalizeEventInput(data) {
    return {
      ...data,
      start_time: data.start_time || data.start_date || data.start,
      end_time: data.end_time || data.end_date || data.end || null,
      is_all_day: data.is_all_day ?? data.all_day ?? false,
      department_id: data.department_id || null,
    };
  }

  static eventSelect() {
    return `ce.*,
      ce.start_time AS start_date,
      ce.end_time AS end_date,
      ce.start_time AS start,
      ce.end_time AS "end",
      ce.is_all_day AS all_day`;
  }

  static async createEvent(data) {
    try {
      const event = this.normalizeEventInput(data);
      const result = await db.query(
        `INSERT INTO calendar_events (title, description, event_type, start_time, end_time, is_all_day, location, department_id, created_by, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          event.title,
          event.description || null,
          event.event_type || 'meeting',
          event.start_time,
          event.end_time,
          event.is_all_day,
          event.location || null,
          event.department_id,
          event.created_by,
          event.color || null,
        ]
      );

      if (data.participants && Array.isArray(data.participants)) {
        for (const participantId of data.participants) {
          await db.query(
            `INSERT INTO event_participants (event_id, employee_id) VALUES ($1, $2)`,
            [result.rows[0].id, participantId]
          );
        }
      }

      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getEvents(filters = {}) {
    try {
      let sql = `SELECT ${this.eventSelect()}, ep.full_name AS created_by_name
                 FROM calendar_events ce
                 LEFT JOIN employee_profiles ep ON ce.created_by = ep.id
                 WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      const dateFrom = filters.dateFrom || filters.date_from || filters.start;
      const dateTo = filters.dateTo || filters.date_to || filters.end;

      if (dateFrom) {
        sql += ` AND COALESCE(ce.end_time, ce.start_time) >= $${paramIndex++}`;
        params.push(dateFrom);
      }
      if (dateTo) {
        sql += ` AND ce.start_time <= $${paramIndex++}`;
        params.push(dateTo);
      }
      if (filters.department_id) {
        sql += ` AND (ce.department_id IS NULL OR ce.department_id = $${paramIndex++})`;
        params.push(filters.department_id);
      }
      if (filters.event_type) {
        sql += ` AND ce.event_type = $${paramIndex++}`;
        params.push(filters.event_type);
      }
      if (filters.created_by) {
        sql += ` AND ce.created_by = $${paramIndex++}`;
        params.push(filters.created_by);
      }
      if (filters.employee_id) {
        sql += ` AND (ce.created_by = $${paramIndex} OR ce.id IN (SELECT event_id FROM event_participants WHERE employee_id = $${paramIndex}))`;
        params.push(filters.employee_id);
        paramIndex++;
      }

      sql += ` ORDER BY ce.start_time ASC`;

      if (filters.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
      } else {
        sql += ` LIMIT 100`;
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

  static async getEventById(eventId) {
    try {
      const event = await db.query(
        `SELECT ${this.eventSelect()}, ep.full_name AS created_by_name
         FROM calendar_events ce
         LEFT JOIN employee_profiles ep ON ce.created_by = ep.id
         WHERE ce.id = $1`,
        [eventId]
      );
      if (event.rows.length === 0) return { success: false, error: 'Event not found' };

      const participants = await db.query(
        `SELECT ep.*, e.full_name
         FROM event_participants ep
         LEFT JOIN employee_profiles e ON ep.employee_id = e.id
         WHERE ep.event_id = $1
         ORDER BY ep.created_at`,
        [eventId]
      );
      event.rows[0].participants = participants.rows;

      return { success: true, data: event.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateEvent(eventId, data) {
    try {
      const event = this.normalizeEventInput(data);
      const updates = [];
      const params = [];
      let paramIndex = 1;

      const allowedFields = ['title', 'description', 'event_type', 'start_time', 'end_time', 'is_all_day', 'location', 'department_id', 'color'];
      for (const field of allowedFields) {
        if (event[field] !== undefined) {
          updates.push(`${field} = $${paramIndex++}`);
          params.push(event[field]);
        }
      }
      if (updates.length === 0) return { success: false, error: 'No fields to update' };

      params.push(eventId);
      const sql = `UPDATE calendar_events SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
      const result = await db.query(sql, params);
      if (result.rows.length === 0) return { success: false, error: 'Event not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteEvent(eventId) {
    try {
      await db.query(`DELETE FROM event_participants WHERE event_id = $1`, [eventId]);
      const result = await db.query(`DELETE FROM calendar_events WHERE id = $1 RETURNING id`, [eventId]);
      if (result.rows.length === 0) return { success: false, error: 'Event not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async addParticipant(eventId, data) {
    try {
      const result = await db.query(
        `INSERT INTO event_participants (event_id, employee_id) VALUES ($1, $2) RETURNING *`,
        [eventId, data.employee_id]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      if (error.code === '23505') return { success: false, error: 'Participant already added' };
      return { success: false, error: error.message };
    }
  }

  static async updateParticipantResponse(eventId, participantId, response) {
    try {
      const validResponses = ['accepted', 'declined', 'tentative'];
      if (!validResponses.includes(response)) return { success: false, error: 'Invalid response status' };

      const result = await db.query(
        `UPDATE event_participants SET response = $1, responded_at = CURRENT_TIMESTAMP WHERE event_id = $2 AND id = $3 RETURNING *`,
        [response, eventId, participantId]
      );
      if (result.rows.length === 0) return { success: false, error: 'Participant not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async removeParticipant(eventId, participantId) {
    try {
      const result = await db.query(
        `DELETE FROM event_participants WHERE event_id = $1 AND id = $2 RETURNING id`,
        [eventId, participantId]
      );
      if (result.rows.length === 0) return { success: false, error: 'Participant not found' };
      return { success: true, data: { removed: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getUpcomingEvents(days = 7, departmentId = null) {
    try {
      let sql = `SELECT ${this.eventSelect()}, ep.full_name AS created_by_name
                 FROM calendar_events ce
                 LEFT JOIN employee_profiles ep ON ce.created_by = ep.id
                 WHERE ce.start_time >= CURRENT_DATE
                   AND ce.start_time <= CURRENT_DATE + $1::int * INTERVAL '1 day'`;
      const params = [days];
      let paramIndex = 2;

      if (departmentId) {
        sql += ` AND (ce.department_id IS NULL OR ce.department_id = $${paramIndex})`;
        params.push(departmentId);
      }

      sql += ` ORDER BY ce.start_time ASC`;

      const result = await db.query(sql, params);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getCalendarStats() {
    try {
      const byType = await db.query(
        `SELECT event_type, COUNT(*)::int AS count FROM calendar_events GROUP BY event_type ORDER BY count DESC`
      );
      const thisWeek = await db.query(
        `SELECT COUNT(*)::int AS count 
         FROM calendar_events 
         WHERE start_time >= DATE_TRUNC('week', CURRENT_DATE)
           AND start_time < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'`
      );
      const thisMonth = await db.query(
        `SELECT COUNT(*)::int AS count 
         FROM calendar_events 
         WHERE start_time >= DATE_TRUNC('month', CURRENT_DATE)
           AND start_time < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`
      );

      return {
        success: true,
        data: {
          by_type: byType.rows,
          this_week: thisWeek.rows[0].count,
          this_month: thisMonth.rows[0].count,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = CalendarEngine;
