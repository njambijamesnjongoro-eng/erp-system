const { query } = require('../config/db');
const logger = require('../utils/logger');

class SOCEventCorrelator {
  async evaluate(events) {
    if (!events || events.length < 2) return [];

    const correlations = [];

    // Pattern 1: Failed logins → successful login from new device → data download = Account Takeover
    const failedLogins = events.filter(e => e.action === 'login_failed');
    const newDeviceLogins = events.filter(e => e.action === 'login_success' && e.details?.is_new_device);
    const dataDownloads = events.filter(e => e.action === 'file_download');
    if (failedLogins.length >= 3 && newDeviceLogins.length >= 1 && dataDownloads.length >= 5) {
      correlations.push(await this._createCorrelation('credential_compromise', 'critical',
        'Account Takeover Pattern', `Failed logins → new device → bulk download`, events));
    }

    // Pattern 2: Rapid permission changes + sensitive data access = Insider Threat
    const permChanges = events.filter(e => e.action === 'permission_change');
    const sensitiveAccess = events.filter(e => e.action === 'sensitive_access');
    if (permChanges.length >= 2 && sensitiveAccess.length >= 1) {
      correlations.push(await this._createCorrelation('insider_threat', 'high',
        'Insider Threat Pattern', `Permission escalation followed by sensitive data access`, events));
    }

    // Pattern 3: Multiple IP logins from different geos = Session Hijack
    const geoLogins = events.filter(e => e.action === 'login_success' && e.details?.geo_country);
    const uniqueCountries = new Set(geoLogins.map(e => e.details?.geo_country)).size;
    if (uniqueCountries >= 3) {
      correlations.push(await this._createCorrelation('session_hijack', 'critical',
        'Session Hijack / Account Sharing', `Logins from ${uniqueCountries} different countries`, events));
    }

    // Pattern 4: API abuse + data export = Data Exfiltration
    const apiCalls = events.filter(e => e.action === 'api_call');
    const exports = events.filter(e => e.action === 'export' || e.action === 'mass_download');
    if (apiCalls.length >= 50 && exports.length >= 3) {
      correlations.push(await this._createCorrelation('data_exfiltration', 'critical',
        'Automated Data Exfiltration', `High API volume + ${exports.length} exports`, events));
    }

    // Pattern 5: Multiple account lockouts = Password Spraying
    const lockouts = events.filter(e => e.action === 'account_locked');
    const uniqueLocked = new Set(lockouts.map(e => e.userId)).size;
    if (uniqueLocked >= 3) {
      correlations.push(await this._createCorrelation('password_spraying', 'critical',
        'Password Spraying Attack', `${uniqueLocked} accounts locked in short period`, events));
    }

    for (const corr of correlations) {
      await this._saveCorrelation(corr);
    }
    return correlations;
  }

  async _createCorrelation(type, severity, title, description, events) {
    return {
      correlationType: type,
      correlationPattern: type,
      severity,
      title,
      description,
      relatedEventIds: events.map(e => e.id).filter(Boolean),
      eventIds: events.map(e => e.id).filter(Boolean),
      threatChain: events.map(e => e.action),
      details: { eventCount: events.length, timeRange: { from: events[0]?.time, to: events[events.length - 1]?.time } },
    };
  }

  async _saveCorrelation(corr) {
    try {
      await query(
        `INSERT INTO soc_event_correlations (correlation_type, correlation_pattern, severity, title, description,
         related_event_ids, threat_chain, details)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
        [corr.correlationType, corr.correlationPattern, corr.severity, corr.title, corr.description,
         corr.relatedEventIds, corr.threatChain, corr.details]
      );
    } catch (e) { logger.error('Failed to save correlation', { error: e.message }); }
  }

  async getCorrelations(filters = {}) {
    let sql = 'SELECT * FROM soc_event_correlations WHERE 1=1';
    const params = []; let idx = 1;
    if (filters.severity) { sql += ` AND severity = $${idx++}`; params.push(filters.severity); }
    if (filters.correlationType) { sql += ` AND correlation_type = $${idx++}`; params.push(filters.correlationType); }
    sql += ' ORDER BY created_at DESC LIMIT $' + (idx++) + ' OFFSET $' + (idx++);
    params.push(parseInt(filters.limit) || 50, parseInt(filters.offset) || 0);
    return (await query(sql, params)).rows;
  }
}

module.exports = new SOCEventCorrelator();
