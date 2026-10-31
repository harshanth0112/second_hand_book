export const validateBody = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return res.status(400).json({
        message: 'Validation failed',
        errors,
      });
    }

    req.body = result.data;
    next();
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return res.status(400).json({
        message: 'Validation failed',
        errors,
      });
    }

    req.query = result.data;
    next();
  };
};

export const validateParams = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return res.status(400).json({
        message: 'Validation failed',
        errors,
      });
    }

    req.params = result.data;
    next();
  };
};
