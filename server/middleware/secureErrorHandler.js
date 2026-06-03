const logger = require('../utils/logger');

const {
  UnauthorizedError, BadRequestError, NotFoundError, ConflictError,
  ForbiddenError, ValidationError, ThreatValidationError,
} = require('../utils/errors');

function createSecureErrorHandler() {
  return (err, req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';

    if (err instanceof UnauthorizedError) {
      return res.status(401).json({ success: false, message: err.message || 'Authentication required' });
    }

    if (err instanceof ForbiddenError) {
      return res.status(403).json({ success: false, message: err.message || 'Access denied' });
    }

    if (err instanceof NotFoundError) {
      return res.status(404).json({ success: false, message: err.message || 'Resource not found' });
    }

    if (err instanceof ConflictError) {
      return res.status(409).json({ success: false, message: err.message || 'Resource conflict' });
    }

    if (err instanceof BadRequestError) {
      return res.status(400).json({ success: false, message: err.message || 'Bad request' });
    }

    if (err instanceof ValidationError) {
      const messages = Array.isArray(err.message) ? err.message : [{ message: err.message }];
      return res.status(422).json({ success: false, message: 'Validation failed', errors: messages });
    }

    if (err instanceof ThreatValidationError) {
      return res.status(403).json({ success: false, message: 'Request blocked for security reasons' });
    }

    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Resource already exists' });
    }

    if (err.code === '23503') {
      return res.status(409).json({ success: false, message: 'Referenced resource not found' });
    }

    if (err.code === '22P02') {
      return res.status(400).json({ success: false, message: 'Invalid input format' });
    }

    // Log all server errors
    logger.error('Unhandled error', {
      message: err.message,
      stack: isProduction ? undefined : err.stack,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });

    // Secure: never expose internals in production
    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message,
      ...(isProduction ? {} : { stack: err.stack }),
    });
  };
}

module.exports = { createSecureErrorHandler };
