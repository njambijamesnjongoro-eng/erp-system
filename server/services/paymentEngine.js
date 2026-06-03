const db = require('../config/db');

class PaymentEngine {
  static async createPayment(data) {
    try {
      const result = await db.query(
        `INSERT INTO payment_transactions 
         (transaction_id, reference_type, reference_id, amount, currency, payment_type, provider, status, 
          payer_name, payer_phone, payer_email, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
          data.transaction_id || null,
          data.reference_type || null,
          data.reference_id || null,
          data.amount,
          data.currency || 'KES',
          data.payment_type || 'manual',
          data.provider || 'cash',
          data.status || 'pending',
          data.payer_name || null,
          data.payer_phone || null,
          data.payer_email || null,
          data.description || null,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getPayments(filters = {}) {
    try {
      let sql = `SELECT * FROM payment_transactions WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (filters.status) {
        sql += ` AND status = $${paramIndex++}`;
        params.push(filters.status);
      }
      if (filters.payment_type) {
        sql += ` AND payment_type = $${paramIndex++}`;
        params.push(filters.payment_type);
      }
      if (filters.provider) {
        sql += ` AND provider = $${paramIndex++}`;
        params.push(filters.provider);
      }
      if (filters.reference_type) {
        sql += ` AND reference_type = $${paramIndex++}`;
        params.push(filters.reference_type);
      }
      if (filters.reference_id) {
        sql += ` AND reference_id = $${paramIndex++}`;
        params.push(filters.reference_id);
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

  static async getPaymentById(id) {
    try {
      const result = await db.query(`SELECT * FROM payment_transactions WHERE id = $1`, [id]);
      if (result.rows.length === 0) return { success: false, error: 'Payment not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updatePaymentStatus(id, status, transactionId = null) {
    try {
      const updates = { status };
      if (status === 'completed') updates.paid_at = new Date();

      const result = await db.query(
        `UPDATE payment_transactions 
         SET status = $1, transaction_id = COALESCE($2, transaction_id), 
             paid_at = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 RETURNING *`,
        [status, transactionId, updates.paid_at || null, id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Payment not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getPaymentStats() {
    try {
      const byStatus = await db.query(
        `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
         FROM payment_transactions GROUP BY status ORDER BY status`
      );
      const byProvider = await db.query(
        `SELECT provider, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
         FROM payment_transactions GROUP BY provider ORDER BY provider`
      );
      const monthlyTotals = await db.query(
        `SELECT EXTRACT(YEAR FROM created_at)::int AS year,
                EXTRACT(MONTH FROM created_at)::int AS month,
                COUNT(*)::int AS count,
                COALESCE(SUM(amount), 0) AS total
         FROM payment_transactions
         WHERE created_at >= DATE_TRUNC('year', CURRENT_DATE)
         GROUP BY year, month
         ORDER BY year DESC, month DESC`
      );

      return {
        success: true,
        data: {
          by_status: byStatus.rows,
          by_provider: byProvider.rows,
          monthly_totals: monthlyTotals.rows,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async processMpesaPayment(data) {
    try {
      const integrationEngine = require('./integrationEngine');

      const payment = await this.createPayment({
        ...data,
        payment_type: data.payment_type || 'service',
        provider: 'mpesa',
        status: 'processing',
      });

      if (!payment.success) return payment;

      await integrationEngine.logIntegrationAction(
        null,
        'mpesa_stk_push',
        'processing',
        {
          request_data: { phone: data.payer_phone, amount: data.amount, reference: data.reference_type },
          response_data: { payment_id: payment.data.id },
        }
      );

      return payment;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async verifyPayment(transactionId) {
    try {
      const result = await db.query(
        `SELECT * FROM payment_transactions WHERE transaction_id = $1`,
        [transactionId]
      );
      if (result.rows.length === 0) return { success: false, error: 'Payment not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getPaymentsByReference(referenceType, referenceId) {
    try {
      const result = await db.query(
        `SELECT * FROM payment_transactions 
         WHERE reference_type = $1 AND reference_id = $2
         ORDER BY created_at DESC`,
        [referenceType, referenceId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = PaymentEngine;
