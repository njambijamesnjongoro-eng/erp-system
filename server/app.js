require('express-async-errors');
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const { createApiGateway } = require('./services/apiGateway');
const { createValidationMiddleware } = require('./middleware/requestValidation');
const { createSecureErrorHandler } = require('./middleware/secureErrorHandler');

// Original error handler kept for reference but will be replaced
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Trust proxy for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// CORS
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean);
const isAllowedOrigin = (origin) => corsOrigins.some((allowed) => {
  if (allowed === origin) return true;
  if (allowed.startsWith('https://*.')) {
    const suffix = allowed.slice('https://*.'.length);
    return origin.startsWith('https://') && origin.endsWith(`.${suffix}`);
  }
  if (allowed.startsWith('http://*.')) {
    const suffix = allowed.slice('http://*.'.length);
    return origin.startsWith('http://') && origin.endsWith(`.${suffix}`);
  }
  return false;
});

// Security headers via Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", ...corsOrigins],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  frameguard: { action: 'deny' },
  dnsPrefetchControl: { allow: false },
}));

// Cookie parser for secure cookie handling
app.use(cookieParser());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Fingerprint', 'X-CSRF-Token'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting - high limit for general API, strict for auth
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 500,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 900000,
  max: 10,
  message: { success: false, message: 'Too many login attempts, please try again later' },
  skipSuccessfulRequests: true,
});
app.use('/api/auth/login', authLimiter);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Phase 3 Security Middleware Chain: Gateway → Validation → Threat Detection
app.use('/api', createApiGateway());
app.use('/api', createValidationMiddleware());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/employees', require('./routes/employees'));

// HR Module Routes
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/insurance', require('./routes/insurance'));
app.use('/api/training', require('./routes/training'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/hr/dashboard', require('./routes/hr-dashboard'));

// Finance Module Routes
app.use('/api/finance/dashboard', require('./routes/finance/dashboard'));
app.use('/api/finance/payroll', require('./routes/finance/payroll'));
app.use('/api/finance/expenses', require('./routes/finance/expenses'));
app.use('/api/finance/budgets', require('./routes/finance/budgets'));
app.use('/api/finance/taxes', require('./routes/finance/taxes'));
app.use('/api/finance/loans', require('./routes/finance/loans'));
app.use('/api/finance/accounts', require('./routes/finance/accounts'));
app.use('/api/finance/reports', require('./routes/finance/reports'));

// Assets Module Routes
app.use('/api/assets/assignments', require('./routes/assets/assignments'));
app.use('/api/assets/fleet', require('./routes/assets/fleet'));
app.use('/api/assets/maintenance', require('./routes/assets/maintenance'));
app.use('/api/assets/insurance', require('./routes/assets/insurance'));
app.use('/api/assets/spare-parts', require('./routes/assets/spareparts'));
app.use('/api/assets/vendors', require('./routes/assets/vendors'));
app.use('/api/assets/dashboard', require('./routes/assets/dashboard'));
app.use('/api/assets', require('./routes/assets/assets'));

// Procurement Module Routes
app.use('/api/procurement/requests', require('./routes/procurement/requests'));
app.use('/api/procurement/approvals', require('./routes/procurement/approvals'));
app.use('/api/procurement/suppliers', require('./routes/procurement/suppliers'));
app.use('/api/procurement/purchase-orders', require('./routes/procurement/purchase-orders'));
app.use('/api/procurement/inventory', require('./routes/procurement/inventory'));
app.use('/api/procurement/warehouses', require('./routes/procurement/warehouses'));
app.use('/api/procurement/goods-receipt', require('./routes/procurement/goods-receipt'));
app.use('/api/procurement/dashboard', require('./routes/procurement/dashboard'));
app.use('/api/procurement/reports', require('./routes/procurement/reports'));

// Analytics & BI Module
app.use('/api/analytics/dashboard', require('./routes/analytics/dashboard'));
app.use('/api/analytics/analytics', require('./routes/analytics/analytics'));
app.use('/api/analytics/notifications', require('./routes/analytics/notifications'));
app.use('/api/analytics/reports', require('./routes/analytics/reports'));
app.use('/api/analytics/audit-logs', require('./routes/analytics/audit-logs'));
app.use('/api/analytics/bi-insights', require('./routes/analytics/bi-insights'));
app.use('/api/analytics/system-monitor', require('./routes/analytics/system-monitor'));

// User-facing Security Routes
app.use('/api/security', require('./routes/security'));

// Security Phase 2 Routes (MFA, Devices, Risk, Analytics)
app.use('/api/security-phase2', require('./routes/securityPhase2'));

// Security Phase 3 Routes (Gateway, Audit, Threats, Backups, Infrastructure)
app.use('/api/security-phase3', require('./routes/securityPhase3'));

// Security Phase 4 Routes (File Security, DLP, Sharing, Storage)
app.use('/api/file-security', require('./routes/fileSecurity'));

// Security Phase 5 Routes (SOC - Security Operations Center)
app.use('/api/soc', require('./routes/soc'));

// Phase 6 - GRC Routes
app.use('/api/grc', require('./routes/grc'));

// Phase 7 - AI Security Routes
app.use('/api/ai-security', require('./routes/aiSecurity'));

// Phase 8 - Infrastructure Security Routes
app.use('/api/infrastructure', require('./routes/infrastructureSecurity'));

// Phase 9 - Enterprise Ultimate Security Routes
app.use('/api/phase9', require('./routes/phase9'));

// Admin & Security Module
app.use('/api/admin/dashboard', require('./routes/admin/dashboard'));
app.use('/api/admin/users', require('./routes/admin/users'));
app.use('/api/admin/security', require('./routes/admin/security'));
app.use('/api/admin/backups', require('./routes/admin/backups'));
app.use('/api/admin/settings', require('./routes/admin/settings'));
app.use('/api/admin/api-keys', require('./routes/admin/api-keys'));
app.use('/api/admin/audit', require('./routes/admin/audit'));
app.use('/api/admin/files', require('./routes/admin/files'));
app.use('/api/admin/deployment', require('./routes/admin/deployment'));

// Portal, Communication & Integrations Module Routes
app.use('/api/portal/ess', require('./routes/portal/ess-portal'));
app.use('/api/portal/client', require('./routes/portal/client-portal'));
app.use('/api/portal/vendor', require('./routes/portal/vendor-portal'));
app.use('/api/portal/tickets', require('./routes/portal/tickets'));
app.use('/api/portal/announcements', require('./routes/portal/announcements'));
app.use('/api/portal/messages', require('./routes/portal/messages'));
app.use('/api/portal/calendar', require('./routes/portal/calendar'));
app.use('/api/portal/integrations', require('./routes/portal/integrations'));
app.use('/api/portal/payments', require('./routes/portal/payments'));

// Enterprise AI, Compliance, Multi-Company & Scaling Module Routes
app.use('/api/enterprise/companies', require('./routes/enterprise/companies'));
app.use('/api/enterprise/forecasts', require('./routes/enterprise/forecasts'));
app.use('/api/enterprise/branches', require('./routes/enterprise/branches'));
app.use('/api/enterprise/company-users', require('./routes/enterprise/companyUsers'));
app.use('/api/enterprise/compliance', require('./routes/enterprise/compliance'));
app.use('/api/enterprise/ai', require('./routes/enterprise/ai'));
app.use('/api/enterprise/workflows', require('./routes/enterprise/workflows'));
app.use('/api/enterprise/risks', require('./routes/enterprise/risks'));
app.use('/api/enterprise/policies', require('./routes/enterprise/policies'));
app.use('/api/enterprise/settings', require('./routes/enterprise/enterpriseSettings'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ERP System API is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Phase 3 Secure Error Handler
app.use(createSecureErrorHandler());

module.exports = app;
