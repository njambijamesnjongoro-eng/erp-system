const db = require('../config/db');

class BIEngine {
  static async generateAllInsights() {
    const insights = [];
    insights.push(...await this.checkHighMaintenanceCosts());
    insights.push(...await this.checkLowStock());
    insights.push(...await this.checkBudgetOverspending());
    insights.push(...await this.checkProcurementInefficiencies());
    insights.push(...await this.checkAttendanceAnomalies());
    insights.push(...await this.checkFinancialRisks());
    insights.push(...await this.checkAssetUtilization());
    insights.push(...await this.checkContractExpiry());
    return insights;
  }

  static async checkHighMaintenanceCosts() {
    const result = await db.query(
      `WITH monthly_costs AS (
        SELECT DATE_TRUNC('month', created_at) AS month, SUM(cost) AS total_cost
        FROM maintenance_records
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC LIMIT 2
      )
      SELECT
        LAG(total_cost) OVER (ORDER BY month) AS prev_month_cost,
        total_cost AS current_month_cost,
        month
      FROM monthly_costs`
    );
    const insights = [];
    if (result.rows.length >= 2) {
      const { prev_month_cost, current_month_cost, month } = result.rows[0];
      if (prev_month_cost > 0) {
        const increase = ((current_month_cost - prev_month_cost) / prev_month_cost) * 100;
        if (increase > 20) {
          const insight = await db.query(
            `INSERT INTO bi_insights (title, description, severity, category, recommendation)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [
              'High Maintenance Costs Detected',
              `Maintenance costs increased by ${Math.round(increase)}% compared to previous month. Current: $${parseFloat(current_month_cost).toFixed(2)}`,
              increase > 50 ? 'critical' : 'warning',
              'maintenance',
              'Review maintenance schedule and consider preventive maintenance to reduce costs.',
            ]
          );
          insights.push(insight.rows[0]);
        }
      }
    }
    return insights;
  }

  static async checkLowStock() {
    const items = await db.query(
      `SELECT ii.*, ic.category_name
       FROM inventory_items ii
       LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
       WHERE ii.is_active = true AND ii.current_quantity <= ii.reorder_point
       ORDER BY (ii.current_quantity::float / NULLIF(ii.reorder_point, 0)) ASC`
    );
    const insights = [];
    for (const item of items.rows) {
      const existing = await db.query(
        `SELECT id FROM bi_insights
         WHERE related_entity_type = 'inventory_item' AND related_entity_id = $1
           AND is_dismissed = false AND is_resolved = false`,
        [item.id]
      );
      if (existing.rows.length > 0) continue;
      const severity = item.current_quantity <= 0 ? 'critical' : 'warning';
      const insight = await db.query(
        `INSERT INTO bi_insights (title, description, severity, category, related_entity_type, related_entity_id, recommendation)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          `Low Stock: ${item.item_name}`,
          `Current quantity: ${item.current_quantity}, Reorder point: ${item.reorder_point}. Category: ${item.category_name || 'N/A'}`,
          severity,
          'inventory',
          'inventory_item',
          item.id,
          `Reorder ${item.reorder_quantity || item.reorder_point * 2} units to maintain optimal stock levels.`,
        ]
      );
      insights.push(insight.rows[0]);
    }
    return insights;
  }

  static async checkBudgetOverspending() {
    const budgets = await db.query(
      `SELECT b.*, d.name AS department_name
       FROM budgets b
       JOIN departments d ON b.department_id = d.id
       WHERE b.status = 'approved' AND b.total_amount > 0`
    );
    const insights = [];
    for (const b of budgets.rows) {
      const utilization = (parseFloat(b.spent_amount) / parseFloat(b.total_amount)) * 100;
      if (utilization > 100) {
        const existing = await db.query(
          `SELECT id FROM bi_insights WHERE related_entity_type = 'budget' AND related_entity_id = $1
           AND is_dismissed = false AND is_resolved = false`,
          [b.id]
        );
        if (existing.rows.length > 0) continue;
        const insight = await db.query(
          `INSERT INTO bi_insights (title, description, severity, category, department_id, related_entity_type, related_entity_id, recommendation)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [
            `Budget Exceeded: ${b.department_name}`,
            `${b.department_name} has exceeded its budget. Spent: $${parseFloat(b.spent_amount).toFixed(2)} of $${parseFloat(b.total_amount).toFixed(2)} (${Math.round(utilization)}%)`,
            'critical',
            'budget',
            b.department_id,
            'budget',
            b.id,
            'Request supplementary budget approval or implement cost-cutting measures immediately.',
          ]
        );
        insights.push(insight.rows[0]);
      } else if (utilization > 80) {
        const insight = await db.query(
          `INSERT INTO bi_insights (title, description, severity, category, department_id, related_entity_type, related_entity_id, recommendation)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [
            `Budget Near Limit: ${b.department_name}`,
            `${b.department_name} has used ${Math.round(utilization)}% of its budget. Spent: $${parseFloat(b.spent_amount).toFixed(2)} of $${parseFloat(b.total_amount).toFixed(2)}`,
            'warning',
            'budget',
            b.department_id,
            'budget',
            b.id,
            'Monitor spending closely and defer non-essential expenses.',
          ]
        );
        insights.push(insight.rows[0]);
      }
    }
    return insights;
  }

  static async checkProcurementInefficiencies() {
    const insights = [];
    const oldRequests = await db.query(
      `SELECT pr.*, ep.full_name AS requester_name, d.name AS department_name
       FROM procurement_requests pr
       JOIN employee_profiles ep ON pr.requester_id = ep.id
       LEFT JOIN departments d ON pr.department_id = d.id
       WHERE pr.status = 'pending' AND pr.submitted_at < CURRENT_DATE - INTERVAL '7 days'
       ORDER BY pr.submitted_at ASC`
    );
    for (const req of oldRequests.rows) {
      const insight = await db.query(
        `INSERT INTO bi_insights (title, description, severity, category, related_entity_type, related_entity_id, recommendation)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          `Stalled Procurement Request: ${req.request_number}`,
          `Request "${req.title}" by ${req.requester_name} has been pending for ${Math.ceil((new Date() - new Date(req.submitted_at)) / (1000 * 60 * 60 * 24))} days.`,
          'warning',
          'procurement',
          'procurement_request',
          req.id,
          'Review and expedite the approval process for this request.',
        ]
      );
      insights.push(insight.rows[0]);
    }
    const duplicateItems = await db.query(
      `SELECT pri.item_name, pr.department_id, d.name AS department_name, COUNT(*)::int AS request_count
       FROM procurement_request_items pri
       JOIN procurement_requests pr ON pri.request_id = pr.id
       LEFT JOIN departments d ON pr.department_id = d.id
       WHERE pr.status = 'pending' AND pr.created_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY pri.item_name, pr.department_id, d.name
       HAVING COUNT(*) > 2
       ORDER BY request_count DESC`
    );
    for (const dup of duplicateItems.rows) {
      const insight = await db.query(
        `INSERT INTO bi_insights (title, description, severity, category, recommendation)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          `Repeated Requests: ${dup.item_name}`,
          `"${dup.item_name}" has been requested ${dup.request_count} times in the last 30 days by ${dup.department_name || 'Unknown'}. This may indicate poor planning.`,
          'info',
          'procurement',
          'Consolidate requests into a single bulk order to save on processing and shipping costs.',
        ]
      );
      insights.push(insight.rows[0]);
    }
    return insights;
  }

  static async checkAttendanceAnomalies() {
    const result = await db.query(
      `SELECT
        a.employee_id,
        ep.full_name,
        ep.department_id,
        d.name AS department_name,
        COUNT(*) FILTER (WHERE a.status = 'present')::int AS present_days,
        COUNT(*)::int AS total_days,
        ROUND((COUNT(*) FILTER (WHERE a.status = 'present')::numeric / COUNT(*)) * 100, 2) AS attendance_rate
       FROM attendance a
       JOIN employee_profiles ep ON a.employee_id = ep.id
       LEFT JOIN departments d ON ep.department_id = d.id
       WHERE DATE_TRUNC('month', a.date) = DATE_TRUNC('month', CURRENT_DATE)
       GROUP BY a.employee_id, ep.full_name, ep.department_id, d.name
       HAVING (COUNT(*) FILTER (WHERE a.status = 'present')::numeric / COUNT(*)) < 0.8`
    );
    const insights = [];
    for (const row of result.rows) {
      const insight = await db.query(
        `INSERT INTO bi_insights (title, description, severity, category, department_id, related_entity_type, related_entity_id, recommendation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          `Low Attendance: ${row.full_name}`,
          `${row.full_name} (${row.department_name || 'N/A'}) has ${row.attendance_rate}% attendance this month (${row.present_days}/${row.total_days} days).`,
          'warning',
          'attendance',
          row.department_id,
          'employee',
          row.employee_id,
          'Schedule a meeting to discuss attendance concerns and offer support if needed.',
        ]
      );
      insights.push(insight.rows[0]);
    }
    return insights;
  }

  static async checkFinancialRisks() {
    const insights = [];
    const nearLimit = await db.query(
      `SELECT b.*, d.name AS department_name,
        ROUND((b.spent_amount::numeric / b.total_amount) * 100, 2) AS utilization
       FROM budgets b
       JOIN departments d ON b.department_id = d.id
       WHERE b.status = 'approved' AND b.total_amount > 0
         AND (b.spent_amount::numeric / b.total_amount) >= 0.9`
    );
    for (const b of nearLimit.rows) {
      const insight = await db.query(
        `INSERT INTO bi_insights (title, description, severity, category, department_id, related_entity_type, related_entity_id, recommendation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          `Department Near Budget Limit: ${b.department_name}`,
          `${b.department_name} has used ${b.utilization}% of its budget. Only $${parseFloat(b.total_amount - b.spent_amount).toFixed(2)} remaining.`,
          'critical',
          'financial',
          b.department_id,
          'budget',
          b.id,
          'Temporarily freeze non-essential spending for this department.',
        ]
      );
      insights.push(insight.rows[0]);
    }
    const overdueInvoices = await db.query(
      `SELECT * FROM invoices
       WHERE status IN ('pending', 'overdue') AND due_date < CURRENT_DATE
       ORDER BY due_date ASC`
    );
    for (const inv of overdueInvoices.rows) {
      const daysOverdue = Math.ceil((new Date() - new Date(inv.due_date)) / (1000 * 60 * 60 * 24));
      const insight = await db.query(
        `INSERT INTO bi_insights (title, description, severity, category, related_entity_type, related_entity_id, recommendation)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          `Overdue Invoice: ${inv.invoice_number}`,
          `Invoice #${inv.invoice_number} for $${parseFloat(inv.amount).toFixed(2)} is ${daysOverdue} days overdue. Client: ${inv.client_name}`,
          daysOverdue > 30 ? 'critical' : 'warning',
          'financial',
          'invoice',
          inv.id,
          `Send payment reminder to client. Consider escalation if overdue by 30+ days.`,
        ]
      );
      insights.push(insight.rows[0]);
    }
    return insights;
  }

  static async checkAssetUtilization() {
    const result = await db.query(
      `SELECT
        COUNT(*)::int AS total_assets,
        COUNT(*) FILTER (WHERE status = 'assigned' OR assigned_to IS NOT NULL)::int AS assigned_count,
        COUNT(*) FILTER (WHERE status = 'available' AND lifecycle_status = 'active')::int AS available_count
       FROM assets WHERE lifecycle_status = 'active'`
    );
    const insights = [];
    const { total_assets, assigned_count, available_count } = result.rows[0];
    const utilizationRate = total_assets > 0 ? (assigned_count / total_assets) * 100 : 0;

    if (total_assets > 0) {
      let severity = 'info';
      let recommendation = '';
      let title = '';
      let description = `Asset utilization rate is ${Math.round(utilizationRate)}% (${assigned_count} of ${total_assets} assets assigned).`;

      if (utilizationRate < 50) {
        severity = 'warning';
        title = 'Low Asset Utilization';
        description += ' Over half of assets are unused.';
        recommendation = 'Consider redistributing or selling unused assets to reduce carrying costs.';
      } else if (utilizationRate > 95) {
        severity = 'info';
        title = 'High Asset Utilization';
        description += ' Most assets are in use.';
        recommendation = 'Plan for additional asset purchases to meet demand.';
      }

      if (severity !== 'info') {
        const insight = await db.query(
          `INSERT INTO bi_insights (title, description, severity, category, recommendation)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [title, description, severity, 'assets', recommendation]
        );
        insights.push(insight.rows[0]);
      }
    }
    return insights;
  }

  static async checkContractExpiry() {
    const insights = [];
    const contracts = await db.query(
      `SELECT sc.*, ps.supplier_name
       FROM supplier_contracts sc
       JOIN procurement_suppliers ps ON sc.supplier_id = ps.id
       WHERE sc.status = 'active'
         AND sc.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
       ORDER BY sc.end_date ASC`
    );
    for (const c of contracts.rows) {
      const daysToExpiry = Math.ceil((new Date(c.end_date) - new Date()) / (1000 * 60 * 60 * 24));
      const insight = await db.query(
        `INSERT INTO bi_insights (title, description, severity, category, related_entity_type, related_entity_id, recommendation)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          `Contract Expiring: ${c.supplier_name}`,
          `Contract #${c.contract_number} with ${c.supplier_name} expires in ${daysToExpiry} days (${c.end_date}). Value: $${parseFloat(c.value).toFixed(2)}`,
          daysToExpiry <= 7 ? 'critical' : 'warning',
          'contracts',
          'supplier_contract',
          c.id,
          `Review contract terms and initiate renewal or send termination notice.`,
        ]
      );
      insights.push(insight.rows[0]);
    }
    const insurance = await db.query(
      `SELECT * FROM asset_insurance_policies
       WHERE status = 'active'
         AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
       ORDER BY end_date ASC`
    );
    for (const p of insurance.rows) {
      const insight = await db.query(
        `INSERT INTO bi_insights (title, description, severity, category, related_entity_type, related_entity_id, recommendation)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          `Insurance Policy Expiring: ${p.provider}`,
          `Policy #${p.policy_number} with ${p.provider} expires on ${p.end_date}. Coverage: $${parseFloat(p.coverage_amount).toFixed(2)}`,
          'warning',
          'insurance',
          'insurance_policy',
          p.id,
          'Contact provider for renewal before coverage lapses.',
        ]
      );
      insights.push(insight.rows[0]);
    }
    return insights;
  }

  static async getRecommendations() {
    const activeInsights = await db.query(
      `SELECT * FROM bi_insights
       WHERE is_dismissed = false AND is_resolved = false
       ORDER BY
         CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 WHEN 'info' THEN 3 END,
         created_at DESC
       LIMIT 20`
    );
    return activeInsights.rows.map(i => ({
      insightId: i.id,
      title: i.title,
      severity: i.severity,
      category: i.category,
      recommendation: i.recommendation,
    }));
  }

  static async getActiveInsights(departmentId = null, category = null) {
    let sql = `SELECT bi.*, d.name AS department_name
               FROM bi_insights bi
               LEFT JOIN departments d ON bi.department_id = d.id
               WHERE bi.is_dismissed = false AND bi.is_resolved = false`;
    const params = [];
    if (departmentId) {
      sql += ` AND (bi.department_id = $${params.length + 1} OR bi.department_id IS NULL)`;
      params.push(departmentId);
    }
    if (category) {
      sql += ` AND bi.category = $${params.length + 1}`;
      params.push(category);
    }
    sql += ` ORDER BY CASE bi.severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 WHEN 'info' THEN 3 END, bi.created_at DESC`;
    const result = await db.query(sql, params);
    return result.rows;
  }

  static async dismissInsight(insightId) {
    const result = await db.query(
      `UPDATE bi_insights SET is_dismissed = true WHERE id = $1 RETURNING *`,
      [insightId]
    );
    if (result.rows.length === 0) throw new Error('Insight not found');
    return result.rows[0];
  }

  static async resolveInsight(insightId) {
    const result = await db.query(
      `UPDATE bi_insights SET is_resolved = true WHERE id = $1 RETURNING *`,
      [insightId]
    );
    if (result.rows.length === 0) throw new Error('Insight not found');
    return result.rows[0];
  }
}

module.exports = BIEngine;
