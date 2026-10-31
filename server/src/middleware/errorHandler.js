import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(err.stack || err.message);

  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid id format',
    });
  }

  if (err.name === 'ValidationError') {
    const errors = Object.keys(err.errors).map((field) => ({
      field,
      message: err.errors[field].message,
    }));
    return res.status(400).json({
      message: 'Validation failed',
      errors,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
    });
  }

  if (err.status) {
    const response = { message: err.message };
    if (err.errors) {
      response.errors = err.errors;
    }
    return res.status(err.status).json(response);
  }

  res.status(500).json({
    message: 'Something went wrong',
  });
};
