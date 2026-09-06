const mongoose = require('mongoose');
const { z } = require('zod');

// Zod schema for valid MongoDB ObjectId
const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid MongoDB ObjectId'
});

// Middleware factory for validating req.body
const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware factory for validating req.params (e.g., :id)
const validateParams = (schema) => (req, res, next) => {
  try {
    req.params = schema.parse(req.params);
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware factory for validating req.query
const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (error) {
    next(error);
  }
};

// Param schema expecting :id
const idParamSchema = z.object({
  id: objectIdSchema
});

module.exports = {
  objectIdSchema,
  validateBody,
  validateParams,
  validateQuery,
  idParamSchema
};
