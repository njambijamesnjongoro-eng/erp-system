const { query } = require('../config/db');
const logger = require('../utils/logger');

const DETECTION_WINDOWS = {
  bruteForce: { threshold: 5, windowMs: 300000 },
  credentialStuffing: { threshold: 20, windowMs: 60000 },
  passwordSpraying: { threshold: 3, windowMs: 900000 },
  apiAbuse: { threshold: 100, windowMs: 60000 },
  dataExfiltration: { threshold: 50, windowMs: 600000 },
  downloadBurst: { threshold: 15, windowMs: 300000 },
  privilegeEscalation: { threshold: 2, windowMs: 3600000 },
  sessionAnomaly: { threshold: 1, windowMs: 300000 },
};

class SOCDetectionEngine {
  constructor() {
    this.eventCache = new Map();
  }

  async detect(event) {
    const detections = [];
    const cacheKey = this._cacheKey(event);

    if (!this.eventCache.has(cacheKey)) this.eventCache.set(cacheKey, []);
    const events = this.eventCache.get(cacheKey);
    events.push({ time: Date.now(), ...event });
    this._cleanCache(cacheKey);

    switch (event.type) {
      case 'login_failed':
        detections.push(...await this._detectBruteForce(cacheKey, events, event));
        detections.push(...await this._detectCredentialStuffing(events, event));
        break;
      case 'api_call':
        detections.push(...await this._detectAPIAbuse(cacheKey, events, event));
        break;
      case 'file_download':
        detections.push(...await this._detectDataExfiltration(cacheKey, events, event));
        detections.push(...await this._detectDownloadBurst(cacheKey, events, event));
        break;
      case 'permission_change':
        detections.push(...await this._detectPrivilegeEscalation(cacheKey, events, event));
        break;
      case 'session':
        detections.push(...await this._detectSessionAnomaly(cacheKey, events, event));
        break;
      default:
        break;
    }

    return detections;
  }

  _cacheKey(event) {
    if (event.type === 'login_failed') return `bf:${event.ip || 'unknown'}`;
    if (event.type === 'api_call') return `api:${event.ip || event.userId || 'unknown'}`;
    if (event.type === 'file_download') return `dl:${event.userId || 'unknown'}`;
    if (event.type === 'permission_change') return `perm:${event.userId || 'unknown'}`;
    if (event.type === 'session') return `session:${event.userId || event.sessionId || 'unknown'}`;
    return `${event.type}:${event.ip || event.userId || 'unknown'}`;
  }

  _cleanCache(cacheKey) {
    const events = this.eventCache.get(cacheKey);
    const cutoff = Date.now() - 3600000;
    const filtered = events.filter(e => e.time > cutoff);
    if (filtered.length === 0) this.eventCache.delete(cacheKey);
    else this.eventCache.set(cacheKey, filtered);
  }

  async _detectBruteForce(key, events, event) {
    const cfg = DETECTION_WINDOWS.bruteForce;
    const recent = events.filter(e => e.time > Date.now() - cfg.windowMs);
    if (recent.length >= cfg.threshold) {
      return [{
        type: 'brute_force', severity: 'critical',
        title: `Brute-Force Attack Detected — ${recent.length} failures from ${event.ip}`,
        source: 'detection_engine', userId: event.userId, ip: event.ip,
        riskScore: Math.min(1.0, recent.length / 20),
        details: { count: recent.length, windowMs: cfg.windowMs },
      }];
    }
    return [];
  }

  async _detectCredentialStuffing(events, event) {
    const cfg = DETECTION_WINDOWS.credentialStuffing;
    const recent = events.filter(e => e.time > Date.now() - cfg.windowMs);
    const uniqueUsers = new Set(recent.filter(e => e.userId).map(e => e.userId)).size;
    if (uniqueUsers >= cfg.threshold) {
      return [{
        type: 'credential_stuffing', severity: 'critical',
        title: `Credential Stuffing — ${uniqueUsers} different usernames from ${event.ip}`,
        source: 'detection_engine', userId: null, ip: event.ip,
        riskScore: 0.95,
        details: { uniqueUsers, windowMs: cfg.windowMs },
      }];
    }
    return [];
  }

  async _detectAPIAbuse(key, events, event) {
    const cfg = DETECTION_WINDOWS.apiAbuse;
    const recent = events.filter(e => e.time > Date.now() - cfg.windowMs);
    if (recent.length >= cfg.threshold) {
      return [{
        type: 'api_abuse', severity: 'high',
        title: `API Abuse — ${recent.length} calls from ${event.ip || event.userId}`,
        source: 'detection_engine', userId: event.userId, ip: event.ip,
        riskScore: Math.min(1.0, recent.length / 200),
        details: { count: recent.length, windowMs: cfg.windowMs },
      }];
    }
    return [];
  }

  async _detectDataExfiltration(key, events, event) {
    const cfg = DETECTION_WINDOWS.dataExfiltration;
    const recent = events.filter(e => e.time > Date.now() - cfg.windowMs);
    const totalSize = recent.reduce((sum, e) => sum + (e.fileSize || 1), 0);
    if (recent.length >= cfg.threshold) {
      return [{
        type: 'data_exfiltration', severity: 'critical',
        title: `Mass Download — ${recent.length} files (${this._fmtSize(totalSize)}) by user`,
        source: 'detection_engine', userId: event.userId, ip: event.ip,
        riskScore: Math.min(1.0, recent.length / 100),
        details: { count: recent.length, totalSize, windowMs: cfg.windowMs },
      }];
    }
    return [];
  }

  async _detectDownloadBurst(key, events, event) {
    const cfg = DETECTION_WINDOWS.downloadBurst;
    const recent = events.filter(e => e.time > Date.now() - cfg.windowMs);
    if (recent.length >= cfg.threshold) {
      return [{
        type: 'download_burst', severity: 'high',
        title: `Download Burst — ${recent.length} files in ${cfg.windowMs / 60000}min`,
        source: 'detection_engine', userId: event.userId, ip: event.ip,
        riskScore: Math.min(1.0, recent.length / 30),
        details: { count: recent.length, windowMs: cfg.windowMs },
      }];
    }
    return [];
  }

  async _detectPrivilegeEscalation(key, events, event) {
    const cfg = DETECTION_WINDOWS.privilegeEscalation;
    const recent = events.filter(e => e.time > Date.now() - cfg.windowMs);
    if (recent.length >= cfg.threshold) {
      return [{
        type: 'privilege_escalation', severity: 'critical',
        title: `Suspicious Permission Changes — ${recent.length} changes by user`,
        source: 'detection_engine', userId: event.userId, ip: event.ip,
        riskScore: 0.85,
        details: { count: recent.length, changes: recent.map(e => e.details).filter(Boolean) },
      }];
    }
    return [];
  }

  async _detectSessionAnomaly(key, events, event) {
    const cfg = DETECTION_WINDOWS.sessionAnomaly;
    const recent = events.filter(e => e.time > Date.now() - cfg.windowMs);
    if (recent.length >= cfg.threshold) {
      return [{
        type: 'session_hijack', severity: 'critical',
        title: `Session Anomaly — Different IP/location for same session`,
        source: 'detection_engine', userId: event.userId, ip: event.ip,
        riskScore: 0.9,
        details: { sessions: recent.map(e => ({ ip: e.ip, geo: e.geo })) },
      }];
    }
    return [];
  }

  _fmtSize(bytes) {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + 'GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + 'MB';
    return (bytes / 1024).toFixed(1) + 'KB';
  }
}

module.exports = new SOCDetectionEngine();
