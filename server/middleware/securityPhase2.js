const mfaService = require('../services/mfaService');
const riskEngine = require('../services/riskEngine');
const geoipService = require('../services/geoipService');
const deviceTrustService = require('../services/deviceTrustService');
const { logSecurityEvent } = require('../services/securityEngine');

async function requireMFA(req, res, next) {
  try {
    const mfaStatus = await mfaService.getMFAStatus(req.user.id);
    if (mfaStatus.enabled) {
      const mfaVerified = req.session?.mfaVerified;
      if (!mfaVerified) {
        return res.status(403).json({
          success: false,
          message: 'MFA verification required',
          mfaRequired: true,
          mfaMethod: mfaStatus.method,
        });
      }
    }
    next();
  } catch (err) { next(err); }
}

async function checkGeoRestriction(req, res, next) {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const geo = geoipService.getGeoData(ip);
    const result = await geoipService.checkCountryRestriction(req.user.id, geo.countryCode);
    if (result.blocked) {
      await logSecurityEvent(req.user.id, 'geo_blocked', 'warning',
        `Login blocked from ${geo.country} (${geo.city}) - ${result.reason}`, ip, req.headers['user-agent']);
      return res.status(403).json({ success: false, message: `Access restricted from your location: ${geo.country}` });
    }
    next();
  } catch (err) { next(err); }
}

async function scoreAndEnforceRisk(req, res, next) {
  try {
    if (!req.user?.id) return next();
    const riskSummary = await riskEngine.getRiskSummary(req.user.id);
    if (riskSummary.currentRisk && riskSummary.currentRisk.risk_score >= 80) {
      return res.status(403).json({
        success: false,
        message: 'Access denied due to high-risk login activity. Contact your administrator.',
      });
    }
    if (riskSummary.unresolvedSuspicious >= 3) {
      return res.status(403).json({
        success: false,
        message: 'Account restricted due to multiple suspicious activities. Contact your administrator.',
      });
    }
    next();
  } catch (err) { next(err); }
}

async function verifyDevice(req, res, next) {
  try {
    if (!req.user?.id) return next();
    const deviceFingerprint = req.headers['x-device-fingerprint'] || req.body?.deviceFingerprint;
    if (deviceFingerprint) {
      const info = {
        fingerprint: deviceFingerprint,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      };
      const result = await deviceTrustService.registerDeviceFingerprint(req.user.id, info);
      if (!result.known && result.device) {
        await logSecurityEvent(req.user.id, 'new_device_detected', 'info',
          'New device detected during request', req.ip, req.headers['user-agent']);
      }
    }
    next();
  } catch (err) { next(err); }
}

module.exports = { requireMFA, checkGeoRestriction, scoreAndEnforceRisk, verifyDevice };
