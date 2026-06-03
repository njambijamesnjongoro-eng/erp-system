const db = require('../config/db');

class SystemConfigEngine {
  static async getSetting(key) {
    const result = await db.query(`SELECT * FROM system_settings WHERE setting_key = $1`, [key]);
    return result.rows[0] || null;
  }

  static async getSettings(category = null) {
    if (category) {
      const result = await db.query(
        `SELECT * FROM system_settings WHERE category = $1 ORDER BY setting_key ASC`,
        [category]
      );
      return result.rows;
    }
    const result = await db.query(`SELECT * FROM system_settings ORDER BY category, setting_key ASC`);
    return result.rows;
  }

  static async setSetting(key, value, type = 'string') {
    let castValue = value;
    if (type === 'number' || type === 'integer') castValue = Number(value);
    else if (type === 'boolean') castValue = value === true || value === 'true';
    else if (type === 'json') castValue = typeof value === 'string' ? value : JSON.stringify(value);
    else castValue = String(value);
    const result = await db.query(
      `INSERT INTO system_settings (setting_key, setting_value, setting_type, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, setting_type = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, castValue, type]
    );
    return result.rows[0];
  }

  static async updateSettings(settings) {
    const results = [];
    for (const setting of settings) {
      const result = await this.setSetting(setting.key, setting.value, setting.type || 'string');
      results.push(result);
    }
    return results;
  }

  static async deleteSetting(key) {
    const result = await db.query(`DELETE FROM system_settings WHERE setting_key = $1 RETURNING *`, [key]);
    return result.rows[0] || null;
  }

  static async getCategories() {
    const result = await db.query(
      `SELECT DISTINCT category FROM system_settings WHERE category IS NOT NULL ORDER BY category`
    );
    return result.rows.map(r => r.category);
  }

  static async getCompanyInfo() {
    const result = await db.query(
      `SELECT setting_key, setting_value FROM system_settings WHERE category = 'company'`
    );
    const info = {};
    for (const row of result.rows) {
      info[row.setting_key] = row.setting_value;
    }
    return info;
  }

  static async getSecurityPolicy() {
    const result = await db.query(
      `SELECT setting_key, setting_value FROM system_settings WHERE category = 'security'`
    );
    const policy = {};
    for (const row of result.rows) {
      policy[row.setting_key] = row.setting_value;
    }
    return policy;
  }

  static async getEmailConfig() {
    const result = await db.query(
      `SELECT setting_key, setting_value FROM system_settings WHERE category = 'email'`
    );
    const config = {};
    for (const row of result.rows) {
      config[row.setting_key] = row.setting_value;
    }
    return config;
  }

  static async isMaintenanceMode() {
    const result = await db.query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'maintenance_mode'`
    );
    return result.rows.length > 0 && result.rows[0].setting_value === 'true';
  }
}

module.exports = SystemConfigEngine;
