const db = require('../config/db');

class ForecastingEngine {
  static async createForecast(data) {
    try {
      const result = await db.query(
        `INSERT INTO forecast_records (company_id, forecast_type, module, period, period_start, period_end, predicted_value, confidence_lower, confidence_upper, features_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          data.company_id,
          data.forecast_type,
          data.module || 'general',
          data.period,
          data.period_start,
          data.period_end,
          data.predicted_value,
          data.confidence_lower || null,
          data.confidence_upper || null,
          data.features_used ? JSON.stringify(data.features_used) : null,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getForecasts(companyId, filters = {}) {
    try {
      let sql = `SELECT * FROM forecast_records WHERE company_id = $1`;
      const params = [companyId];
      let paramIndex = 2;

      if (filters.forecast_type) {
        sql += ` AND forecast_type = $${paramIndex++}`;
        params.push(filters.forecast_type);
      }
      if (filters.periodFrom) {
        sql += ` AND period_start >= $${paramIndex++}`;
        params.push(filters.periodFrom);
      }
      if (filters.periodTo) {
        sql += ` AND period_end <= $${paramIndex++}`;
        params.push(filters.periodTo);
      }
      if (filters.period) {
        sql += ` AND period = $${paramIndex++}`;
        params.push(filters.period);
      }

      sql += ` ORDER BY period_start ASC`;

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

  static async getForecastById(id) {
    try {
      const result = await db.query(
        `SELECT * FROM forecast_records WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Forecast not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async forecastRevenue(companyId, periods = 12) {
    try {
      const history = await db.query(
        `SELECT DATE_TRUNC('month', payment_date) AS month,
                SUM(amount) AS total
         FROM payments
         WHERE company_id = $1 AND payment_date >= CURRENT_DATE - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', payment_date)
         ORDER BY month ASC`,
        [companyId]
      );

      if (history.rows.length < 2) {
        return { success: false, error: 'Insufficient historical data for revenue forecast' };
      }

      const values = history.rows.map(r => parseFloat(r.total));
      const monthlyAverage = values.reduce((a, b) => a + b, 0) / values.length;

      let growthSum = 0;
      for (let i = 1; i < values.length; i++) {
        growthSum += (values[i] - values[i - 1]) / values[i - 1];
      }
      const avgGrowthRate = growthSum / (values.length - 1);

      const lastDate = new Date(history.rows[history.rows.length - 1].month);
      const created = [];

      for (let i = 1; i <= periods; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + i);
        const periodStart = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
        const periodEnd = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0);
        const periodLabel = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

        const lastValue = i === 1 ? values[values.length - 1] : created[i - 2].predicted_value;
        const forecastValue = lastValue * (1 + avgGrowthRate);

        const result = await db.query(
          `INSERT INTO forecast_records (company_id, forecast_type, module, period, period_start, period_end, predicted_value, confidence_lower, confidence_upper)
           VALUES ($1, 'revenue', 'finance', $2, $3, $4, $5, $6, $7) RETURNING *`,
          [
            companyId,
            periodLabel,
            periodStart,
            periodEnd,
            Math.round(forecastValue * 100) / 100,
            Math.round(forecastValue * 0.85 * 100) / 100,
            Math.round(forecastValue * 1.15 * 100) / 100,
          ]
        );
        created.push({ ...result.rows[0], predicted_value: Math.round(forecastValue * 100) / 100 });
      }

      return { success: true, data: created };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async forecastExpenses(companyId, periods = 12) {
    try {
      const history = await db.query(
        `SELECT DATE_TRUNC('month', expense_date) AS month,
                SUM(amount) AS total
         FROM expenses
         WHERE company_id = $1 AND expense_date >= CURRENT_DATE - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', expense_date)
         ORDER BY month ASC`,
        [companyId]
      );

      if (history.rows.length < 2) {
        return { success: false, error: 'Insufficient historical data for expense forecast' };
      }

      const values = history.rows.map(r => parseFloat(r.total));
      const monthlyAverage = values.reduce((a, b) => a + b, 0) / values.length;

      let growthSum = 0;
      for (let i = 1; i < values.length; i++) {
        growthSum += (values[i] - values[i - 1]) / values[i - 1];
      }
      const avgGrowthRate = growthSum / (values.length - 1);

      const lastDate = new Date(history.rows[history.rows.length - 1].month);
      const created = [];

      for (let i = 1; i <= periods; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + i);
        const periodStart = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
        const periodEnd = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0);
        const periodLabel = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

        const lastValue = i === 1 ? values[values.length - 1] : created[i - 2].predicted_value;
        const forecastValue = lastValue * (1 + avgGrowthRate);

        const result = await db.query(
          `INSERT INTO forecast_records (company_id, forecast_type, module, period, period_start, period_end, predicted_value, confidence_lower, confidence_upper)
           VALUES ($1, 'expense', 'finance', $2, $3, $4, $5, $6, $7) RETURNING *`,
          [
            companyId,
            periodLabel,
            periodStart,
            periodEnd,
            Math.round(forecastValue * 100) / 100,
            Math.round(forecastValue * 0.85 * 100) / 100,
            Math.round(forecastValue * 1.15 * 100) / 100,
          ]
        );
        created.push({ ...result.rows[0], predicted_value: Math.round(forecastValue * 100) / 100 });
      }

      return { success: true, data: created };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async forecastInventoryDemand(companyId, periods = 6) {
    try {
      const history = await db.query(
        `SELECT DATE_TRUNC('month', order_date) AS month,
                SUM(quantity) AS total_qty
         FROM procurement_orders
         WHERE company_id = $1 AND order_date >= CURRENT_DATE - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', order_date)
         ORDER BY month ASC`,
        [companyId]
      );

      if (history.rows.length < 2) {
        return { success: false, error: 'Insufficient historical data for inventory forecast' };
      }

      const values = history.rows.map(r => parseInt(r.total_qty, 10));
      const monthlyAverage = values.reduce((a, b) => a + b, 0) / values.length;

      let growthSum = 0;
      for (let i = 1; i < values.length; i++) {
        growthSum += values[i - 1] > 0 ? (values[i] - values[i - 1]) / values[i - 1] : 0;
      }
      const avgGrowthRate = growthSum / (values.length - 1);

      const lastDate = new Date(history.rows[history.rows.length - 1].month);
      const created = [];

      for (let i = 1; i <= periods; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + i);
        const periodStart = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
        const periodEnd = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0);
        const periodLabel = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

        const lastValue = i === 1 ? values[values.length - 1] : created[i - 2].predicted_value;
        const forecastValue = Math.round(lastValue * (1 + avgGrowthRate));

        const result = await db.query(
          `INSERT INTO forecast_records (company_id, forecast_type, module, period, period_start, period_end, predicted_value, confidence_lower, confidence_upper)
           VALUES ($1, 'inventory_demand', 'inventory', $2, $3, $4, $5, $6, $7) RETURNING *`,
          [
            companyId,
            periodLabel,
            periodStart,
            periodEnd,
            forecastValue,
            Math.round(forecastValue * 0.85),
            Math.round(forecastValue * 1.15),
          ]
        );
        created.push({ ...result.rows[0], predicted_value: forecastValue });
      }

      return { success: true, data: created };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getForecastStats(companyId) {
    try {
      const byType = await db.query(
        `SELECT forecast_type, COUNT(*)::int AS count, ROUND(AVG(predicted_value)::numeric, 2) AS avg_value
         FROM forecast_records
         WHERE company_id = $1
         GROUP BY forecast_type ORDER BY forecast_type`,
        [companyId]
      );

      const accuracy = await db.query(
        `SELECT forecast_type, ROUND(AVG(accuracy)::numeric, 2) AS avg_accuracy
         FROM forecast_records
         WHERE company_id = $1 AND actual_value IS NOT NULL AND accuracy IS NOT NULL
         GROUP BY forecast_type ORDER BY forecast_type`,
        [companyId]
      );

      const totalForecasts = await db.query(
        `SELECT COUNT(*)::int AS count FROM forecast_records WHERE company_id = $1`,
        [companyId]
      );

      const recordedActuals = await db.query(
        `SELECT COUNT(*)::int AS count FROM forecast_records WHERE company_id = $1 AND actual_value IS NOT NULL`,
        [companyId]
      );

      return {
        success: true,
        data: {
          by_type: byType.rows,
          accuracy: accuracy.rows,
          total_forecasts: totalForecasts.rows[0].count,
          recorded_actuals: recordedActuals.rows[0].count,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async recordActual(id, actualValue) {
    try {
      const forecast = await db.query(
        `SELECT predicted_value FROM forecast_records WHERE id = $1`,
        [id]
      );
      if (forecast.rows.length === 0) return { success: false, error: 'Forecast not found' };

      const forecastValue = parseFloat(forecast.rows[0].predicted_value);
      const accuracyVal = forecastValue > 0
        ? Math.round((1 - Math.abs(actualValue - forecastValue) / forecastValue) * 10000) / 100
        : 0;

      const result = await db.query(
        `UPDATE forecast_records
         SET actual_value = $1, accuracy = $2
         WHERE id = $3 RETURNING *`,
        [actualValue, accuracyVal, id]
      );

      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = ForecastingEngine;
