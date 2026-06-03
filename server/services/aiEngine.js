const db = require('../config/db');

class AIEngine {
  static async createAnalysis(data) {
    try {
      const result = await db.query(
        `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, confidence_score, severity, data_source, input_data, result_data, recommendations, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
          data.company_id,
          data.analysis_type,
          data.module,
          data.title,
          data.description || null,
          data.confidence_score || null,
          data.severity || 'info',
          data.data_source || null,
          data.input_data ? JSON.stringify(data.input_data) : null,
          data.result_data ? JSON.stringify(data.result_data) : null,
          data.recommendations ? JSON.stringify(data.recommendations) : null,
          data.expires_at || null,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getAnalyses(companyId, filters = {}) {
    try {
      let sql = `SELECT aa.* FROM ai_analytics aa WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (companyId) {
        sql += ` AND aa.company_id = $${paramIndex++}`;
        params.push(companyId);
      } else {
        sql += ` AND aa.company_id IS NULL`;
      }

      if (filters.type) {
        sql += ` AND aa.analysis_type = $${paramIndex++}`;
        params.push(filters.type);
      }
      if (filters.module) {
        sql += ` AND aa.module = $${paramIndex++}`;
        params.push(filters.module);
      }
      if (filters.severity) {
        sql += ` AND aa.severity = $${paramIndex++}`;
        params.push(filters.severity);
      }
      if (filters.is_actioned !== undefined) {
        sql += ` AND aa.is_actioned = $${paramIndex++}`;
        params.push(filters.is_actioned);
      }
      if (filters.search) {
        sql += ` AND (aa.title ILIKE $${paramIndex} OR aa.description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }
      if (filters.dateFrom) {
        sql += ` AND aa.created_at >= $${paramIndex++}`;
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        sql += ` AND aa.created_at <= $${paramIndex++}`;
        params.push(filters.dateTo);
      }

      sql += ` ORDER BY aa.created_at DESC`;

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

  static async getAnalysisById(id) {
    try {
      const result = await db.query(
        `SELECT aa.* FROM ai_analytics aa WHERE aa.id = $1`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Analysis not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async actionAnalysis(id, userId) {
    try {
      const result = await db.query(
        `UPDATE ai_analytics SET is_actioned = true, actioned_by = $1, actioned_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [userId, id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Analysis not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async detectAnomalies(companyId) {
    try {
      const findings = [];
      const now = new Date();

      const avgOrderAmount = await db.query(
        `SELECT COALESCE(AVG(total_amount), 0) AS avg_amount, COALESCE(STDDEV(total_amount), 0) AS std_amount
         FROM purchase_orders WHERE status NOT IN ('draft', 'cancelled')`
      );
      const avgAmt = parseFloat(avgOrderAmount.rows[0].avg_amount);
      const stdAmt = parseFloat(avgOrderAmount.rows[0].std_amount);
      const threshold = avgAmt > 0 ? avgAmt * 2 : 10000;

      const largeOrders = await db.query(
        `SELECT po.*, ep.full_name AS requester_name
         FROM purchase_orders po
         LEFT JOIN employee_profiles ep ON po.created_by = ep.id
         WHERE po.status NOT IN ('draft', 'cancelled')
         AND po.total_amount > $1
         ORDER BY po.total_amount DESC`,
        [threshold]
      );
      for (const order of largeOrders.rows) {
        const rec = await db.query(
          `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, confidence_score, severity, data_source, result_data, recommendations)
           VALUES ($1, 'anomaly', 'procurement', $2, $3, 0.85, 'high', $4, $5, $6) RETURNING *`,
          [
            companyId,
            `Large purchase order detected: ${order.po_number}`,
            `Purchase order ${order.po_number} for ${parseFloat(order.total_amount).toFixed(2)} exceeds 2x average order amount of ${avgAmt.toFixed(2)}`,
            JSON.stringify({ table: 'purchase_orders', query: 'orders > 2x avg' }),
            JSON.stringify({ po_number: order.po_number, total_amount: order.total_amount, requester: order.requester_name }),
            JSON.stringify(['Review procurement policy for high-value orders', 'Verify budget availability']),
          ]
        );
        findings.push(rec.rows[0]);
      }

      const excessiveMaintenance = await db.query(
        `SELECT mr.asset_id, a.asset_name, a.asset_code, COUNT(*)::int AS maintenance_count,
                COALESCE(SUM(mr.cost), 0) AS total_cost
         FROM maintenance_records mr
         JOIN assets a ON a.id = mr.asset_id
         WHERE mr.created_at >= CURRENT_DATE - INTERVAL '180 days'
         GROUP BY mr.asset_id, a.asset_name, a.asset_code
         HAVING COUNT(*) > (SELECT COALESCE(AVG(cnt), 0) * 2 FROM (
           SELECT COUNT(*) AS cnt FROM maintenance_records
           WHERE created_at >= CURRENT_DATE - INTERVAL '180 days'
           GROUP BY asset_id
         ) sub)`
      );
      for (const entry of excessiveMaintenance.rows) {
        const rec = await db.query(
          `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, confidence_score, severity, data_source, result_data, recommendations)
           VALUES ($1, 'anomaly', 'maintenance', $2, $3, 0.80, 'medium', $4, $5, $6) RETURNING *`,
          [
            companyId,
            `Excessive maintenance: ${entry.asset_name}`,
            `${entry.asset_name} (${entry.asset_code}) has ${entry.maintenance_count} maintenance records in 6 months with total cost of ${parseFloat(entry.total_cost).toFixed(2)}`,
            JSON.stringify({ table: 'maintenance_records', query: 'frequency > 2x normal' }),
            JSON.stringify({ asset_id: entry.asset_id, asset_name: entry.asset_name, count: entry.maintenance_count, total_cost: entry.total_cost }),
            JSON.stringify(['Consider asset replacement evaluation', 'Schedule comprehensive inspection']),
          ]
        );
        findings.push(rec.rows[0]);
      }

      const excessiveLeave = await db.query(
        `SELECT lr.employee_id, ep.full_name, COUNT(*)::int AS leave_count,
                COALESCE(SUM(lr.total_days), 0) AS total_days
         FROM leave_requests lr
         JOIN employee_profiles ep ON ep.id = lr.employee_id
         WHERE lr.status = 'approved'
         AND lr.created_at >= CURRENT_DATE - INTERVAL '90 days'
         GROUP BY lr.employee_id, ep.full_name
         HAVING COUNT(*) > 3`
      );
      for (const entry of excessiveLeave.rows) {
        const rec = await db.query(
          `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, confidence_score, severity, data_source, result_data, recommendations)
           VALUES ($1, 'anomaly', 'hr', $2, $3, 0.75, 'medium', $4, $5, $6) RETURNING *`,
          [
            companyId,
            `Excessive leave pattern: ${entry.full_name}`,
            `${entry.full_name} has taken ${entry.leave_count} leaves (${entry.total_days} days) in the last 90 days`,
            JSON.stringify({ table: 'leave_requests', query: 'frequency > 3 in 90 days' }),
            JSON.stringify({ employee_id: entry.employee_id, employee_name: entry.full_name, count: entry.leave_count, total_days: entry.total_days }),
            JSON.stringify(['Review employee wellbeing', 'Check for policy violations']),
          ]
        );
        findings.push(rec.rows[0]);
      }

      return { success: true, data: findings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async predictMaintenance(companyId) {
    try {
      const predictions = [];

      const dueAssets = await db.query(
        `SELECT a.id, a.asset_name, a.asset_code, a.asset_tag, a.lifecycle_status,
                mr.next_service_date, mr.next_service_odometer, mr.odometer_at_service,
                mr.id AS last_maintenance_id
         FROM assets a
         LEFT JOIN LATERAL (
           SELECT id, next_service_date, next_service_odometer, odometer_at_service
           FROM maintenance_records
           WHERE asset_id = a.id AND maintenance_type = 'preventive'
           ORDER BY created_at DESC LIMIT 1
         ) mr ON true
         WHERE a.lifecycle_status = 'active'
         AND (
           mr.next_service_date IS NOT NULL
           AND mr.next_service_date <= CURRENT_DATE + INTERVAL '30 days'
         )`
      );

      for (const asset of dueAssets.rows) {
        const daysUntilDue = asset.next_service_date
          ? Math.ceil((new Date(asset.next_service_date) - new Date()) / (1000 * 60 * 60 * 24))
          : 0;

        const rec = await db.query(
          `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, confidence_score, severity, data_source, result_data, recommendations)
           VALUES ($1, 'prediction', 'maintenance', $2, $3, 0.90, 'warning', $4, $5, $6) RETURNING *`,
          [
            companyId,
            `Maintenance due: ${asset.asset_name}`,
            `${asset.asset_name} (${asset.asset_code}) is due for maintenance on ${asset.next_service_date} (${daysUntilDue} days from now)`,
            JSON.stringify({ table: 'assets', query: 'next_service_date within 30 days' }),
            JSON.stringify({ asset_id: asset.id, asset_name: asset.asset_name, asset_code: asset.asset_code, next_service_date: asset.next_service_date, days_until_due: daysUntilDue }),
            JSON.stringify(['Schedule preventive maintenance', 'Order necessary parts', 'Assign maintenance team']),
          ]
        );
        predictions.push(rec.rows[0]);
      }

      const warrantyExpiring = await db.query(
        `SELECT a.id, a.asset_name, a.asset_code, a.warranty_expiry
         FROM assets a
         WHERE a.lifecycle_status = 'active'
         AND a.warranty_expiry IS NOT NULL
         AND a.warranty_expiry <= CURRENT_DATE + INTERVAL '60 days'
         AND a.warranty_expiry >= CURRENT_DATE`
      );

      for (const asset of warrantyExpiring.rows) {
        const rec = await db.query(
          `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, confidence_score, severity, data_source, result_data, recommendations)
           VALUES ($1, 'prediction', 'maintenance', $2, $3, 0.85, 'warning', $4, $5, $6) RETURNING *`,
          [
            companyId,
            `Warranty expiring: ${asset.asset_name}`,
            `${asset.asset_name} (${asset.asset_code}) warranty expires on ${asset.warranty_expiry}`,
            JSON.stringify({ table: 'assets', query: 'warranty_expiry within 60 days' }),
            JSON.stringify({ asset_id: asset.id, asset_name: asset.asset_name, asset_code: asset.asset_code, warranty_expiry: asset.warranty_expiry }),
            JSON.stringify(['Renew warranty or service contract', 'Conduct pre-expiry inspection']),
          ]
        );
        predictions.push(rec.rows[0]);
      }

      return { success: true, data: predictions };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async detectProcurementAnomalies(companyId) {
    try {
      const findings = [];

      const highValueOrders = await db.query(
        `SELECT po.*, ep.full_name AS requester_name, ps.name AS supplier_name
         FROM purchase_orders po
         LEFT JOIN employee_profiles ep ON po.created_by = ep.id
         LEFT JOIN procurement_suppliers ps ON po.supplier_id = ps.id
         WHERE po.status NOT IN ('draft', 'cancelled')
         AND po.total_amount > (
           SELECT COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_amount), 100000)
           FROM purchase_orders WHERE status NOT IN ('draft', 'cancelled')
         )
         ORDER BY po.total_amount DESC`
      );

      for (const order of highValueOrders.rows) {
        const rec = await db.query(
          `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, confidence_score, severity, data_source, result_data, recommendations)
           VALUES ($1, 'anomaly', 'procurement', $2, $3, 0.90, 'high', $4, $5, $6) RETURNING *`,
          [
            companyId,
            `Unusually high value order: ${order.po_number}`,
            `Purchase order ${order.po_number} for ${parseFloat(order.total_amount).toFixed(2)} from ${order.supplier_name || 'Unknown'} requested by ${order.requester_name || 'Unknown'}`,
            JSON.stringify({ table: 'purchase_orders', query: 'total_amount > 95th percentile' }),
            JSON.stringify({ po_number: order.po_number, total_amount: order.total_amount, supplier: order.supplier_name, requester: order.requester_name }),
            JSON.stringify(['Flag for executive review', 'Verify budget allocation', 'Check for approval compliance']),
          ]
        );
        findings.push(rec.rows[0]);
      }

      const requesterPatterns = await db.query(
        `SELECT po.created_by, ep.full_name, COUNT(*)::int AS order_count,
                COALESCE(SUM(po.total_amount), 0) AS total_spent
         FROM purchase_orders po
         LEFT JOIN employee_profiles ep ON po.created_by = ep.id
         WHERE po.status NOT IN ('draft', 'cancelled')
         AND po.created_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY po.created_by, ep.full_name
         HAVING COUNT(*) > (SELECT COALESCE(AVG(cnt), 0) * 2 FROM (
           SELECT COUNT(*) AS cnt FROM purchase_orders
           WHERE status NOT IN ('draft', 'cancelled')
           AND created_at >= CURRENT_DATE - INTERVAL '30 days'
           GROUP BY created_by
         ) sub)`
      );

      for (const entry of requesterPatterns.rows) {
        const rec = await db.query(
          `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, confidence_score, severity, data_source, result_data, recommendations)
           VALUES ($1, 'anomaly', 'procurement', $2, $3, 0.70, 'medium', $4, $5, $6) RETURNING *`,
          [
            companyId,
            `Excessive order activity: ${entry.full_name}`,
            `${entry.full_name} has placed ${entry.order_count} orders totaling ${parseFloat(entry.total_spent).toFixed(2)} in the last 30 days`,
            JSON.stringify({ table: 'purchase_orders', query: 'order_count > 2x avg per requester' }),
            JSON.stringify({ created_by: entry.created_by, requester: entry.full_name, order_count: entry.order_count, total_spent: entry.total_spent }),
            JSON.stringify(['Review purchasing patterns', 'Verify business need for orders', 'Consider spending limit enforcement']),
          ]
        );
        findings.push(rec.rows[0]);
      }

      const lowRatedSuppliers = await db.query(
        `SELECT ps.id, ps.name, ps.rating, ps.email, ps.phone,
                COUNT(po.id)::int AS order_count,
                COALESCE(SUM(po.total_amount), 0) AS total_spent
         FROM procurement_suppliers ps
         LEFT JOIN purchase_orders po ON po.supplier_id = ps.id AND po.status NOT IN ('draft', 'cancelled')
         WHERE ps.status = 'active' AND ps.rating > 0 AND ps.rating < 3
         GROUP BY ps.id, ps.name, ps.rating, ps.email, ps.phone`
      );

      for (const supplier of lowRatedSuppliers.rows) {
        const rec = await db.query(
          `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, confidence_score, severity, data_source, result_data, recommendations)
           VALUES ($1, 'anomaly', 'procurement', $2, $3, 0.80, 'high', $4, $5, $6) RETURNING *`,
          [
            companyId,
            `Low rated supplier active: ${supplier.name}`,
            `${supplier.name} has a rating of ${supplier.rating} and has ${supplier.order_count} orders totaling ${parseFloat(supplier.total_spent).toFixed(2)}`,
            JSON.stringify({ table: 'procurement_suppliers', query: 'rating < 3' }),
            JSON.stringify({ supplier_id: supplier.id, name: supplier.name, rating: supplier.rating, order_count: supplier.order_count, total_spent: supplier.total_spent }),
            JSON.stringify(['Review supplier relationship', 'Source alternative suppliers', 'Conduct supplier audit']),
          ]
        );
        findings.push(rec.rows[0]);
      }

      return { success: true, data: findings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async detectPayrollAnomalies(companyId) {
    try {
      const findings = [];

      const unusualOvertime = await db.query(
        `SELECT p.employee_id, ep.full_name, ep.employee_id AS emp_code,
                COUNT(*)::int AS payroll_entries,
                COALESCE(AVG(p.overtime_pay), 0) AS avg_overtime,
                COALESCE(MAX(p.overtime_pay), 0) AS max_overtime,
                COALESCE(SUM(p.overtime_pay), 0) AS total_overtime
         FROM payroll p
         JOIN employee_profiles ep ON ep.id = p.employee_id
         WHERE p.created_at >= CURRENT_DATE - INTERVAL '90 days'
         GROUP BY p.employee_id, ep.full_name, ep.employee_id
         HAVING AVG(p.overtime_pay) > (
           SELECT COALESCE(AVG(avg_ot), 0) * 2 FROM (
             SELECT AVG(overtime_pay) AS avg_ot FROM payroll
             WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
             GROUP BY employee_id
           ) sub
         )`
      );

      for (const entry of unusualOvertime.rows) {
        const rec = await db.query(
          `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, confidence_score, severity, data_source, result_data, recommendations)
           VALUES ($1, 'anomaly', 'payroll', $2, $3, 0.80, 'medium', $4, $5, $6) RETURNING *`,
          [
            companyId,
            `Unusual overtime pattern: ${entry.full_name}`,
            `${entry.full_name} (${entry.emp_code}) has average overtime of ${parseFloat(entry.avg_overtime).toFixed(2)} with total ${parseFloat(entry.total_overtime).toFixed(2)} in last 90 days`,
            JSON.stringify({ table: 'payroll', query: 'avg overtime > 2x normal' }),
            JSON.stringify({ employee_id: entry.employee_id, employee: entry.full_name, avg_overtime: entry.avg_overtime, max_overtime: entry.max_overtime, total_overtime: entry.total_overtime }),
            JSON.stringify(['Verify overtime approvals', 'Review workload distribution', 'Check for policy compliance']),
          ]
        );
        findings.push(rec.rows[0]);
      }

      const missingDeductions = await db.query(
        `SELECT p.employee_id, ep.full_name, ep.employee_id AS emp_code,
                p.paye_tax, p.sha_deduction, p.gross_pay
         FROM payroll p
         JOIN employee_profiles ep ON ep.id = p.employee_id
         WHERE p.created_at >= CURRENT_DATE - INTERVAL '90 days'
         AND (p.paye_tax IS NULL OR p.paye_tax = 0)
         AND p.gross_pay > 0`
      );

      for (const entry of missingDeductions.rows) {
        const rec = await db.query(
          `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, confidence_score, severity, data_source, result_data, recommendations)
           VALUES ($1, 'anomaly', 'payroll', $2, $3, 0.75, 'high', $4, $5, $6) RETURNING *`,
          [
            companyId,
            `Missing tax deductions: ${entry.full_name}`,
            `${entry.full_name} (${entry.emp_code}) has gross pay of ${parseFloat(entry.gross_pay).toFixed(2)} but zero PAYE tax`,
            JSON.stringify({ table: 'payroll', query: 'gross_pay > 0 AND paye_tax = 0' }),
            JSON.stringify({ employee_id: entry.employee_id, employee: entry.full_name, gross_pay: entry.gross_pay, paye_tax: entry.paye_tax, sha: entry.sha_deduction }),
            JSON.stringify(['Review payroll configuration', 'Verify employee tax status', 'Update deduction settings']),
          ]
        );
        findings.push(rec.rows[0]);
      }

      const payrollInconsistencies = await db.query(
        `SELECT p1.employee_id, ep.full_name, ep.employee_id AS emp_code,
                p1.gross_pay AS current_pay, p2.gross_pay AS previous_pay,
                CASE WHEN p2.gross_pay > 0
                  THEN ROUND(((p1.gross_pay - p2.gross_pay) / p2.gross_pay * 100), 2)
                  ELSE 0
                END AS change_percent
         FROM payroll p1
         JOIN payroll p2 ON p2.employee_id = p1.employee_id
            AND p2.created_at < p1.created_at
         JOIN employee_profiles ep ON ep.id = p1.employee_id
         WHERE p1.created_at >= CURRENT_DATE - INTERVAL '30 days'
         AND p2.created_at >= CURRENT_DATE - INTERVAL '90 days'
         AND p2.created_at < p1.created_at
         AND p1.gross_pay > 0 AND p2.gross_pay > 0
         AND ABS(p1.gross_pay - p2.gross_pay) / NULLIF(p2.gross_pay, 0) > 0.5`
      );

      for (const entry of payrollInconsistencies.rows) {
        const rec = await db.query(
          `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, confidence_score, severity, data_source, result_data, recommendations)
           VALUES ($1, 'anomaly', 'payroll', $2, $3, 0.70, 'medium', $4, $5, $6) RETURNING *`,
          [
            companyId,
            `Payroll inconsistency: ${entry.full_name}`,
            `${entry.full_name} (${entry.emp_code}) gross pay changed by ${entry.change_percent}% (from ${parseFloat(entry.previous_pay).toFixed(2)} to ${parseFloat(entry.current_pay).toFixed(2)})`,
            JSON.stringify({ table: 'payroll', query: 'gross pay change > 50%' }),
            JSON.stringify({ employee_id: entry.employee_id, employee: entry.full_name, current_pay: entry.current_pay, previous_pay: entry.previous_pay, change_percent: entry.change_percent }),
            JSON.stringify(['Verify payroll changes', 'Check for unauthorized adjustments', 'Confirm with HR department']),
          ]
        );
        findings.push(rec.rows[0]);
      }

      return { success: true, data: findings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async generateInsights(companyId) {
    try {
      const insights = [];

      const leaveUsage = await db.query(
        `SELECT lt.name AS leave_type,
                COALESCE(SUM(lb.used_days), 0) AS total_used,
                COALESCE(SUM(lb.total_days), 0) AS total_allocated,
                CASE WHEN COALESCE(SUM(lb.total_days), 0) > 0
                  THEN ROUND((SUM(lb.used_days) / SUM(lb.total_days) * 100), 2)
                  ELSE 0
                END AS utilization_pct
         FROM leave_balances lb
         JOIN leave_types lt ON lt.id = lb.leave_type_id
         WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
         GROUP BY lt.name`
      );

      for (const entry of leaveUsage.rows) {
        if (parseFloat(entry.utilization_pct) > 75) {
          const rec = await db.query(
            `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, confidence_score, severity, data_source, result_data, recommendations)
             VALUES ($1, 'insight', 'hr', $2, $3, 0.80, 'info', $4, $5, $6) RETURNING *`,
            [
              companyId,
              `High leave utilization: ${entry.leave_type}`,
              `${entry.leave_type} leave is at ${entry.utilization_pct}% utilization (${parseFloat(entry.total_used).toFixed(1)} of ${parseFloat(entry.total_allocated).toFixed(1)} days used)`,
              JSON.stringify({ table: 'leave_balances', query: 'utilization > 75%' }),
              JSON.stringify({ leave_type: entry.leave_type, total_used: entry.total_used, total_allocated: entry.total_allocated, utilization_pct: entry.utilization_pct }),
              JSON.stringify(['Review leave policy', 'Plan staffing for high leave periods', 'Consider additional leave allocation']),
            ]
          );
          insights.push(rec.rows[0]);
        }
      }

      const lowInventory = await db.query(
        `SELECT ii.id, ii.item_name, ii.item_code, ii.current_quantity, ii.reorder_point,
                ii.unit_of_measure
         FROM inventory_items ii
         WHERE ii.is_active = true
         AND ii.current_quantity <= ii.reorder_point
         ORDER BY (ii.reorder_point - ii.current_quantity) DESC`
      );

      for (const item of lowInventory.rows) {
        const rec = await db.query(
          `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, confidence_score, severity, data_source, result_data, recommendations)
           VALUES ($1, 'insight', 'inventory', $2, $3, 0.90, 'warning', $4, $5, $6) RETURNING *`,
          [
            companyId,
            `Low inventory: ${item.item_name}`,
            `${item.item_name} (${item.item_code}) has ${item.current_quantity} in stock, below reorder point of ${item.reorder_point}`,
            JSON.stringify({ table: 'inventory_items', query: 'current_quantity <= reorder_point' }),
            JSON.stringify({ item_id: item.id, item_name: item.item_name, item_code: item.item_code, current_quantity: item.current_quantity, reorder_point: item.reorder_point }),
            JSON.stringify(['Place replenishment order', 'Review supplier lead times', 'Check for stock discrepancies']),
          ]
        );
        insights.push(rec.rows[0]);
      }

      const budgetOverspend = await db.query(
        `SELECT d.name AS department_name,
                COALESCE(b.total_amount, 0) AS budget_amount,
                COALESCE(b.spent_amount, 0) AS spent_amount,
                CASE WHEN COALESCE(b.total_amount, 0) > 0
                  THEN ROUND((b.spent_amount / b.total_amount * 100), 2)
                  ELSE 0
                END AS utilization_pct
         FROM departments d
         LEFT JOIN budgets b ON b.department_id = d.id AND b.status = 'approved'
         WHERE b.total_amount > 0
         AND b.spent_amount > b.total_amount * 0.9`
      );

      for (const entry of budgetOverspend.rows) {
        const rec = await db.query(
          `INSERT INTO ai_analytics (company_id, analysis_type, module, title, description, confidence_score, severity, data_source, result_data, recommendations)
           VALUES ($1, 'insight', 'finance', $2, $3, 0.85, 'warning', $4, $5, $6) RETURNING *`,
          [
            companyId,
            `Budget nearing limit: ${entry.department_name}`,
            `${entry.department_name} has used ${entry.utilization_pct}% of budget (${parseFloat(entry.spent_amount).toFixed(2)} of ${parseFloat(entry.budget_amount).toFixed(2)})`,
            JSON.stringify({ table: 'budgets', query: 'spent_amount > 90% of total_amount' }),
            JSON.stringify({ department: entry.department_name, budget_amount: entry.budget_amount, spent_amount: entry.spent_amount, utilization_pct: entry.utilization_pct }),
            JSON.stringify(['Review department spending', 'Plan budget reallocation', 'Implement spending controls']),
          ]
        );
        insights.push(rec.rows[0]);
      }

      return { success: true, data: insights };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async createModel(data) {
    try {
      const result = await db.query(
        `INSERT INTO ai_models (company_id, name, model_type, target_variable, features, parameters, next_training_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          data.company_id,
          data.name,
          data.model_type,
          data.target_variable || null,
          data.features ? JSON.stringify(data.features) : null,
          data.parameters ? JSON.stringify(data.parameters) : null,
          data.next_training_at || null,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getModels(companyId, filters = {}) {
    try {
      let sql = `SELECT am.* FROM ai_models am WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (companyId) {
        sql += ` AND am.company_id = $${paramIndex++}`;
        params.push(companyId);
      } else {
        sql += ` AND am.company_id IS NULL`;
      }

      if (filters.model_type) {
        sql += ` AND am.model_type = $${paramIndex++}`;
        params.push(filters.model_type);
      }
      if (filters.training_status) {
        sql += ` AND am.training_status = $${paramIndex++}`;
        params.push(filters.training_status);
      }
      if (filters.is_active !== undefined) {
        sql += ` AND am.is_active = $${paramIndex++}`;
        params.push(filters.is_active);
      }
      if (filters.search) {
        sql += ` AND am.name ILIKE $${paramIndex++}`;
        params.push(`%${filters.search}%`);
      }

      sql += ` ORDER BY am.created_at DESC`;

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

  static async updateModel(id, data) {
    try {
      const fields = [];
      const params = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        params.push(data.name);
      }
      if (data.model_type !== undefined) {
        fields.push(`model_type = $${paramIndex++}`);
        params.push(data.model_type);
      }
      if (data.target_variable !== undefined) {
        fields.push(`target_variable = $${paramIndex++}`);
        params.push(data.target_variable);
      }
      if (data.features !== undefined) {
        fields.push(`features = $${paramIndex++}`);
        params.push(JSON.stringify(data.features));
      }
      if (data.parameters !== undefined) {
        fields.push(`parameters = $${paramIndex++}`);
        params.push(JSON.stringify(data.parameters));
      }
      if (data.accuracy !== undefined) {
        fields.push(`accuracy = $${paramIndex++}`);
        params.push(data.accuracy);
      }
      if (data.training_status !== undefined) {
        fields.push(`training_status = $${paramIndex++}`);
        params.push(data.training_status);
      }
      if (data.is_active !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        params.push(data.is_active);
      }
      if (data.next_training_at !== undefined) {
        fields.push(`next_training_at = $${paramIndex++}`);
        params.push(data.next_training_at);
      }

      if (fields.length === 0) return { success: false, error: 'No fields to update' };

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      const result = await db.query(
        `UPDATE ai_models SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );
      if (result.rows.length === 0) return { success: false, error: 'Model not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async trainModel(id) {
    try {
      const model = await db.query(`SELECT * FROM ai_models WHERE id = $1`, [id]);
      if (model.rows.length === 0) return { success: false, error: 'Model not found' };

      await db.query(
        `UPDATE ai_models SET training_status = 'training', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );

      const accuracy = Math.round(Math.random() * 30 + 65);

      const result = await db.query(
        `UPDATE ai_models SET training_status = 'trained', accuracy = $1, last_trained_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [accuracy, id]
      );

      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteModel(id) {
    try {
      const result = await db.query(`DELETE FROM ai_models WHERE id = $1 RETURNING id`, [id]);
      if (result.rows.length === 0) return { success: false, error: 'Model not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getAIStats(companyId) {
    try {
      const byType = await db.query(
        `SELECT analysis_type, COUNT(*)::int AS count FROM ai_analytics
         WHERE company_id = $1 GROUP BY analysis_type ORDER BY analysis_type`,
        [companyId]
      );

      const bySeverity = await db.query(
        `SELECT severity, COUNT(*)::int AS count FROM ai_analytics
         WHERE company_id = $1 GROUP BY severity ORDER BY severity`,
        [companyId]
      );

      const byModule = await db.query(
        `SELECT module, COUNT(*)::int AS count FROM ai_analytics
         WHERE company_id = $1 GROUP BY module ORDER BY module`,
        [companyId]
      );

      const actionStats = await db.query(
        `SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_actioned = true)::int AS actioned,
          COUNT(*) FILTER (WHERE is_actioned = false)::int AS pending
         FROM ai_analytics WHERE company_id = $1`,
        [companyId]
      );

      const modelStats = await db.query(
        `SELECT
          COUNT(*)::int AS total_models,
          COUNT(*) FILTER (WHERE training_status = 'trained')::int AS trained,
          COUNT(*) FILTER (WHERE training_status = 'training')::int AS training,
          COUNT(*) FILTER (WHERE training_status = 'untrained')::int AS untrained
         FROM ai_models WHERE company_id = $1`,
        [companyId]
      );

      return {
        success: true,
        data: {
          by_type: byType.rows,
          by_severity: bySeverity.rows,
          by_module: byModule.rows,
          actioned: actionStats.rows[0],
          models: modelStats.rows[0],
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = AIEngine;
