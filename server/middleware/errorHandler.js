const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(err.message, {
    code: err.code,
    statusCode: err.statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  if (err.name === 'ValidationError' && err.errors) {
    return res.status(err.statusCode || 422).json({
      success: false,
      code: err.code || 'VALIDATION_ERROR',
      message: err.message,
      errors: err.errors,
    });
  }

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    code: err.code || 'INTERNAL_ERROR',
    message: err.isOperational ? err.message : 'An unexpected error occurred',
  };

  if (process.env.NODE_ENV === 'development' && !err.isOperational) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
