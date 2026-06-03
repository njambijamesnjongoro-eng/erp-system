const db = require('../config/db');

class InventoryEngine {
  static async updateStock(itemId, quantity, movementType, unitCost, referenceType, referenceId, createdBy, notes) {
    const item = await db.query(`SELECT * FROM inventory_items WHERE id = $1`, [itemId]);
    if (item.rows.length === 0) throw new Error('Item not found');
    const currentQty = item.rows[0].current_quantity;
    const cost = unitCost || item.rows[0].average_cost || 0;
    const totalCost = cost * Math.abs(quantity);

    let newQuantity = currentQty;
    let effectiveQuantity = quantity;

    if (movementType === 'in' || movementType === 'return') {
      effectiveQuantity = Math.abs(quantity);
      newQuantity = currentQty + effectiveQuantity;
    } else if (movementType === 'out' || movementType === 'transfer') {
      effectiveQuantity = -Math.abs(quantity);
      newQuantity = currentQty + effectiveQuantity;
    } else if (movementType === 'adjustment') {
      newQuantity = quantity;
      effectiveQuantity = quantity - currentQty;
    }

    if (newQuantity < 0) throw new Error('Insufficient stock');

    await db.query(
      `INSERT INTO procurement_stock_movements (item_id, movement_type, quantity, unit_cost, total_cost, reference_type, reference_id, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [itemId, movementType, effectiveQuantity, cost, totalCost, referenceType, referenceId, notes, createdBy]
    );

    let newAvgCost = item.rows[0].average_cost;
    if (movementType === 'in' && unitCost > 0) {
      const totalQty = currentQty + effectiveQuantity;
      const totalValue = (currentQty * (item.rows[0].average_cost || 0)) + (effectiveQuantity * unitCost);
      newAvgCost = totalQty > 0 ? Math.round((totalValue / totalQty) * 100) / 100 : 0;
    }

    await db.query(
      `UPDATE inventory_items SET current_quantity = $1, average_cost = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [newQuantity, newAvgCost, itemId]
    );

    return { newQuantity, movement: effectiveQuantity };
  }

  static async getLowStockItems() {
    const result = await db.query(
      `SELECT ii.*, ic.category_name, w.name AS warehouse_name
       FROM inventory_items ii
       LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
       LEFT JOIN warehouses w ON ii.warehouse_id = w.id
       WHERE ii.is_active = true AND ii.current_quantity <= ii.reorder_point
       ORDER BY (ii.current_quantity::float / NULLIF(ii.reorder_point, 0)) ASC`
    );
    return result.rows;
  }

  static async getStockValue() {
    const result = await db.query(
      `SELECT
        COUNT(*)::int AS total_items,
        COALESCE(SUM(current_quantity * average_cost), 0) AS total_value,
        COALESCE(SUM(current_quantity * unit_cost), 0) AS total_cost_value,
        COUNT(*) FILTER (WHERE current_quantity <= reorder_point AND is_active = true)::int AS low_stock_count,
        COUNT(*) FILTER (WHERE current_quantity <= 0 AND is_active = true)::int AS out_of_stock_count
       FROM inventory_items WHERE is_active = true`
    );
    return result.rows[0];
  }

  static async generateItemCode(categoryId) {
    const catResult = await db.query(`SELECT category_code FROM inventory_categories WHERE id = $1`, [categoryId]);
    const prefix = catResult.rows[0]?.category_code || 'GEN';
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM inventory_items WHERE item_code LIKE $1`,
      [`${prefix}-%`]
    );
    const seq = String(result.rows[0].count + 1).padStart(4, '0');
    return `${prefix}-${seq}`;
  }

  static async generateGRNNumber() {
    const year = new Date().getFullYear();
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM goods_received_notes WHERE EXTRACT(YEAR FROM created_at) = $1`,
      [year]
    );
    const seq = String(result.rows[0].count + 1).padStart(4, '0');
    return `GRN-${year}-${seq}`;
  }

  static async generatePONumber() {
    const year = new Date().getFullYear();
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM purchase_orders WHERE EXTRACT(YEAR FROM created_at) = $1`,
      [year]
    );
    const seq = String(result.rows[0].count + 1).padStart(4, '0');
    return `PO-${year}-${seq}`;
  }

  static async generateAuditNumber() {
    const year = new Date().getFullYear();
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM inventory_audits WHERE EXTRACT(YEAR FROM created_at) = $1`,
      [year]
    );
    const seq = String(result.rows[0].count + 1).padStart(4, '0');
    return `AUD-${year}-${seq}`;
  }
}

module.exports = InventoryEngine;
