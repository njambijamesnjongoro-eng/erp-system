const db = require('../config/db');

class PortalEngine {
  static async getEmployeeProfile(employeeId) {
    try {
      const result = await db.query(
        `         SELECT ep.*, u.email, r.name AS role_name, d.name AS department_name
         FROM employee_profiles ep
         JOIN users u ON ep.user_id = u.id
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN departments d ON ep.department_id = d.id
         WHERE ep.id = $1`,
        [employeeId]
      );
      if (result.rows.length === 0) return { success: false, error: 'Employee not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getEmployeePayslips(employeeId) {
    try {
      const result = await db.query(
        `SELECT id, payroll_period_id, gross_pay, total_deductions, net_pay, payment_status, 
                paye_tax, sha_deduction, created_at
         FROM payroll WHERE employee_id = $1 ORDER BY created_at DESC`,
        [employeeId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getEmployeeLeaveBalances(employeeId) {
    try {
      const result = await db.query(
        `SELECT id, leave_type, total_days, used_days, remaining_days, period
         FROM leave_balances WHERE employee_id = $1 ORDER BY leave_type`,
        [employeeId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getEmployeeAssignedAssets(employeeId) {
    try {
      const result = await db.query(
        `SELECT aa.id, aa.assigned_date, aa.expected_return_date, aa.status AS assignment_status,
                a.id AS asset_id, a.asset_name, a.asset_code, a.status AS asset_status
         FROM asset_assignments aa
         JOIN assets a ON aa.asset_id = a.id
         WHERE aa.assigned_to = $1
         ORDER BY aa.assigned_date DESC`,
        [employeeId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getEmployeeAttendance(employeeId, filters = {}) {
    try {
      let sql = `SELECT id, date, clock_in, clock_out, status, notes FROM attendance_records WHERE employee_id = $1`;
      const params = [employeeId];
      let paramIndex = 2;

      if (filters.dateFrom) {
        sql += ` AND date >= $${paramIndex++}`;
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        sql += ` AND date <= $${paramIndex++}`;
        params.push(filters.dateTo);
      }
      if (filters.status) {
        sql += ` AND status = $${paramIndex++}`;
        params.push(filters.status);
      }
      sql += ` ORDER BY date DESC`;
      if (filters.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
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

  static async getEmployeeTrainings(employeeId) {
    try {
      const result = await db.query(
        `SELECT id, training_name, training_date, completion_date, status, certificate_url, notes
         FROM training_records WHERE employee_id = $1 ORDER BY training_date DESC`,
        [employeeId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateEmployeeProfile(employeeId, data) {
    try {
      const allowedFields = ['phone', 'address', 'emergency_contact'];
      const updates = [];
      const params = [];
      let paramIndex = 1;

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updates.push(`${field} = $${paramIndex++}`);
          params.push(data[field]);
        }
      }
      if (updates.length === 0) return { success: false, error: 'No valid fields to update' };

      params.push(employeeId);
      const sql = `UPDATE employee_profiles SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
      const result = await db.query(sql, params);
      if (result.rows.length === 0) return { success: false, error: 'Employee not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getEmployeeNotifications(employeeId, filters = {}) {
    try {
      let sql = `SELECT n.* FROM notifications n
                 JOIN employee_profiles ep ON n.user_id = ep.user_id
                 WHERE ep.id = $1`;
      const params = [employeeId];
      let paramIndex = 2;

      if (filters.is_read !== undefined) {
        sql += ` AND is_read = $${paramIndex++}`;
        params.push(filters.is_read);
      }
      if (filters.type) {
        sql += ` AND type = $${paramIndex++}`;
        params.push(filters.type);
      }
      if (filters.dateFrom) {
        sql += ` AND created_at >= $${paramIndex++}`;
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        sql += ` AND created_at <= $${paramIndex++}`;
        params.push(filters.dateTo);
      }
      sql += ` ORDER BY created_at DESC`;
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

  static async markNotificationRead(notificationId) {
    try {
      const result = await db.query(
        `UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *`,
        [notificationId]
      );
      if (result.rows.length === 0) return { success: false, error: 'Notification not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getClientInvoices(clientEmail) {
    try {
      const result = await db.query(
        `SELECT id, invoice_number, amount, balance, status, issue_date, due_date, notes as description
         FROM invoices WHERE client_email = $1 ORDER BY issue_date DESC`,
        [clientEmail]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getClientTickets(clientId) {
    try {
      const result = await db.query(
        `SELECT id, ticket_number, title, category, priority, status, created_at, updated_at
         FROM support_tickets WHERE requester_type = 'client' AND requester_id = $1
         ORDER BY created_at DESC`,
        [clientId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getClientDocuments(clientId) {
    try {
      const result = await db.query(
        `SELECT sr.id, sr.access_token, sr.expires_at, sr.created_at,
                r.id AS report_id, r.name as report_name, r.type as report_type, r.created_at as generated_at
         FROM shared_reports sr
         JOIN reports r ON sr.report_id = r.id
         WHERE sr.shared_with_type = 'client' AND sr.shared_with_id = $1
         ORDER BY sr.created_at DESC`,
        [clientId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getSupplierPurchaseOrders(supplierId) {
    try {
      const result = await db.query(
        `SELECT id, po_number, order_date, expected_delivery_date, total_amount, status, notes
         FROM purchase_orders WHERE supplier_id = $1 ORDER BY order_date DESC`,
        [supplierId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getSupplierQuotations(supplierId) {
    try {
      return { success: true, data: [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async submitSupplierQuotation(supplierId, data) {
    try {
      return { success: true, data: { id: null, ...data, status: 'submitted' } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getSupplierDeliveries(supplierId) {
    try {
      const result = await db.query(
        `SELECT grn.id, grn.grn_number as delivery_number, grn.po_id as order_id, 
                grn.received_date as delivery_date, grn.status, grn.notes,
                ep.full_name as received_by
         FROM goods_received_notes grn
         JOIN purchase_orders po ON po.id = grn.po_id
         LEFT JOIN employee_profiles ep ON ep.id = grn.received_by
         WHERE po.supplier_id = $1 ORDER BY grn.received_date DESC`,
        [supplierId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateSupplierProfile(supplierId, data) {
    try {
      const updates = [];
      const params = [];
      let paramIndex = 1;

      const allowedFields = ['supplier_name', 'contact_person', 'email', 'phone', 'address', 'payment_terms'];
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updates.push(`${field} = $${paramIndex++}`);
          params.push(data[field]);
        }
      }
      if (updates.length === 0) return { success: false, error: 'No valid fields to update' };

      params.push(supplierId);
      const sql = `UPDATE procurement_suppliers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
      const result = await db.query(sql, params);
      if (result.rows.length === 0) return { success: false, error: 'Supplier not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = PortalEngine;
