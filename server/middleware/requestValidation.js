const logger = require('../utils/logger');
const { ThreatValidationError } = require('../utils/errors');

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /on\w+\s*=\s*['"][^'"]*['"]/gi,
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /expression\s*\(/gi,
  /<iframe\b/gi,
  /<embed\b/gi,
  /<object\b/gi,
  /<svg\b/gi,
  /onerror\s*=/gi,
  /onload\s*=/gi,
];

const SQL_META_CHARS = /['"%;\-\-]|\/\*|\*\//g;

const MAX_BODY_SIZE = 1024 * 1024;
const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 1000;

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeValue(value) {
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') return sanitizeObject(value);
  return value;
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeValue(value);
  }
  return sanitized;
}

function containsXSS(value) {
  if (typeof value === 'string') {
    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(value)) return true;
    }
  }
  return false;
}

function scanForXSS(obj, path = '') {
  if (!obj || typeof obj !== 'object') return [];
  const findings = [];
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof value === 'string') {
      if (containsXSS(value)) {
        findings.push({ path: currentPath, pattern: 'XSS' });
      }
    } else if (value && typeof value === 'object') {
      findings.push(...scanForXSS(value, currentPath));
    }
  }
  return findings;
}

function validatePayloadSize(req, res, next) {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > MAX_BODY_SIZE) {
    return res.status(413).json({ success: false, message: 'Request entity too large' });
  }
  next();
}

function validateStringLengths(obj, path = '') {
  if (!obj || typeof obj !== 'object') return [];
  const violations = [];
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      violations.push({ path: currentPath, length: value.length, max: MAX_STRING_LENGTH });
    } else if (Array.isArray(value) && value.length > MAX_ARRAY_LENGTH) {
      violations.push({ path: currentPath, length: value.length, max: MAX_ARRAY_LENGTH });
    } else if (value && typeof value === 'object') {
      violations.push(...validateStringLengths(value, currentPath));
    }
  }
  return violations;
}

function createValidationMiddleware() {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      const xssFindings = scanForXSS(req.body);
      if (xssFindings.length > 0) {
        logger.warn('XSS detected in request body', { path: req.originalUrl, findings: xssFindings });
        return res.status(400).json({ success: false, message: 'Request contains invalid characters' });
      }

      const lengthViolations = validateStringLengths(req.body);
      if (lengthViolations.length > 0) {
        return res.status(400).json({ success: false, message: 'Request contains values that exceed maximum length' });
      }

      req.body = sanitizeObject(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          req.query[key] = sanitizeString(value);
        }
      }
    }

    next();
  };
}

module.exports = { createValidationMiddleware, sanitizeObject, sanitizeString, containsXSS, scanForXSS };
