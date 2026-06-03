class DepreciationEngine {
  static calculateStraightLine(purchaseCost, residualValue, usefulLifeYears) {
    const cost = parseFloat(purchaseCost) || 0;
    const residual = parseFloat(residualValue) || 0;
    const life = parseInt(usefulLifeYears) || 5;
    const depreciableAmount = cost - residual;
    const annualDepreciation = depreciableAmount / life;
    const monthlyDepreciation = annualDepreciation / 12;
    const rate = life > 0 ? (100 / life) : 0;
    return {
      annualDepreciation: Math.round(annualDepreciation * 100) / 100,
      monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100,
      depreciationRate: Math.round(rate * 100) / 100,
      depreciableAmount: Math.round(depreciableAmount * 100) / 100,
    };
  }

  static calculateDecliningBalance(purchaseCost, residualValue, usefulLifeYears, yearsElapsed) {
    const cost = parseFloat(purchaseCost) || 0;
    const residual = parseFloat(residualValue) || 0;
    const life = parseInt(usefulLifeYears) || 5;
    const rate = life > 0 ? (2 * (100 / life)) / 100 : 0;
    let currentValue = cost;
    let totalDepreciation = 0;

    for (let y = 0; y < (yearsElapsed || life); y++) {
      const dep = Math.max(currentValue * rate, 0);
      if (currentValue - dep < residual) {
        dep = currentValue - residual;
      }
      totalDepreciation += dep;
      currentValue -= dep;
      if (currentValue <= residual) { currentValue = residual; break; }
    }

    return {
      currentValue: Math.round(Math.max(currentValue, residual) * 100) / 100,
      accumulatedDepreciation: Math.round(totalDepreciation * 100) / 100,
      depreciationRate: Math.round(rate * 100 * 100) / 100,
      annualDepreciation: Math.round((cost - Math.max(currentValue, residual)) / (life || 1) * 100) / 100,
    };
  }

  static async runMonthlyDepreciation(db) {
    const assets = await db.query(
      `SELECT id, purchase_cost, residual_value, current_value, accumulated_depreciation, 
       depreciation_method, useful_life_years, purchase_date, monthly_depreciation
       FROM assets WHERE lifecycle_status = 'active' AND status != 'disposed'`
    );
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const results = [];

    for (const asset of assets.rows) {
      try {
        let depAmount = 0;
        const cost = parseFloat(asset.purchase_cost) || 0;
        const residual = parseFloat(asset.residual_value) || 0;
        const life = parseInt(asset.useful_life_years) || 5;

        if (asset.depreciation_method === 'declining_balance') {
          const elapsed = year - new Date(asset.purchase_date).getFullYear();
          const calc = this.calculateDecliningBalance(cost, residual, life, elapsed);
          depAmount = parseFloat(asset.monthly_depreciation) || calc.annualDepreciation / 12;
        } else {
          const calc = this.calculateStraightLine(cost, residual, life);
          depAmount = calc.monthlyDepreciation;
        }

        const currentValue = parseFloat(asset.current_value) || cost;
        const newValue = Math.max(currentValue - depAmount, residual);
        const actualDep = currentValue - newValue;
        const newAccum = (parseFloat(asset.accumulated_depreciation) || 0) + actualDep;

        await db.query(
          `UPDATE assets SET current_value = $1, accumulated_depreciation = $2, monthly_depreciation = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
          [newValue, newAccum, depAmount, asset.id]
        );

        await db.query(
          `INSERT INTO depreciation_records (asset_id, period_date, period_year, period_month, opening_value, depreciation_amount, closing_value, method)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (asset_id, period_year, period_month) 
           DO UPDATE SET depreciation_amount = EXCLUDED.depreciation_amount, closing_value = EXCLUDED.closing_value`,
          [asset.id, `${year}-${String(month).padStart(2, '0')}-01`, year, month, currentValue, actualDep, newValue, asset.depreciation_method]
        );

        results.push({ assetId: asset.id, depreciation: actualDep, newValue });
      } catch (err) {
        results.push({ assetId: asset.id, error: err.message });
      }
    }
    return results;
  }

  static calculateGainLoss(disposalValue, bookValue) {
    const disposal = parseFloat(disposalValue) || 0;
    const book = parseFloat(bookValue) || 0;
    return Math.round((disposal - book) * 100) / 100;
  }
}

module.exports = DepreciationEngine;
