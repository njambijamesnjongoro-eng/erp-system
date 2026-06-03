const { ValidationError } = require('../utils/errors');

function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    if (schema.body && req.body) {
      const bodyErrors = validateFields(schema.body, req.body, 'body');
      errors.push(...bodyErrors);
    }

    if (schema.params && req.params) {
      const paramsErrors = validateFields(schema.params, req.params, 'params');
      errors.push(...paramsErrors);
    }

    if (schema.query && req.query) {
      const queryErrors = validateFields(schema.query, req.query, 'query');
      errors.push(...queryErrors);
    }

    if (errors.length > 0) {
      return next(new ValidationError(errors));
    }

    next();
  };
}

function validateFields(rules, data, prefix) {
  const errors = [];
  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({ field: `${prefix}.${field}`, message: `${field} is required` });
      continue;
    }

    if (value === undefined || value === null || value === '') continue;

    if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.push({ field: `${prefix}.${field}`, message: `Invalid email format` });
    }

    if (rule.type === 'string' && rule.minLength && value.length < rule.minLength) {
      errors.push({ field: `${prefix}.${field}`, message: `Minimum ${rule.minLength} characters required` });
    }

    if (rule.type === 'string' && rule.maxLength && value.length > rule.maxLength) {
      errors.push({ field: `${prefix}.${field}`, message: `Maximum ${rule.maxLength} characters allowed` });
    }

    if (rule.type === 'string' && rule.pattern && !rule.pattern.test(value)) {
      errors.push({ field: `${prefix}.${field}`, message: rule.message || `Invalid format` });
    }

    if (rule.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push({ field: `${prefix}.${field}`, message: `Must be a number` });
      } else {
        if (rule.min !== undefined && num < rule.min) {
          errors.push({ field: `${prefix}.${field}`, message: `Minimum value is ${rule.min}` });
        }
        if (rule.max !== undefined && num > rule.max) {
          errors.push({ field: `${prefix}.${field}`, message: `Maximum value is ${rule.max}` });
        }
      }
    }

    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({ field: `${prefix}.${field}`, message: `Must be one of: ${rule.enum.join(', ')}` });
    }
  }
  return errors;
}

module.exports = { validate };
