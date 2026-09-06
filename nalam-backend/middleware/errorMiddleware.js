const { ZodError } = require('zod');

// Centralized Error Handling Middleware
const errorHandler = (err, req, res, next) => {
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // 1. Handle Zod Validation Errors
  if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    const issues = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    message = issues.join(', ');
  }
  // 2. Handle Mongoose CastError (e.g. invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_IDENTIFIER';
    message = `Invalid ${err.path}: "${err.value}" is not a valid identifier`;
  }
  // 3. Handle Mongoose ValidationError
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    const msgs = Object.values(err.errors).map((e) => e.message);
    message = msgs.join(', ');
  }
  // 4. Handle MongoDB Duplicate Key (code 11000)
  else if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_KEY_ERROR';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const val = err.keyValue ? err.keyValue[field] : '';
    message = `A record with ${field} "${val}" already exists`;
  }
  // 5. Handle JWT Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Authentication token is invalid or malformed';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired. Please login again';
  }
  // 6. Handle Groq / AI Service Errors
  else if (err.isGroqError) {
    statusCode = 503;
    errorCode = 'AI_SERVICE_UNAVAILABLE';
    message = 'The AI service is temporarily unavailable. Please try again later.';
  }

  // Log error for debugging, masking any sensitive tokens or passwords
  if (statusCode >= 500) {
    console.error(`[SERVER ERROR] ${req.method} ${req.originalUrl}:`, err.stack || err.message);
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: message
    }
  });
};

// 404 Not Found Handler
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
