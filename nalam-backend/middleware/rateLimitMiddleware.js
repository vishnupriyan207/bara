const rateLimit = require('express-rate-limit');

// General API rate limiter: 100 req / 15 min / IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Reasonable buffer for busy UI polling/testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please try again after 15 minutes.'
    }
  }
});

// Auth endpoints rate limiter: 10 attempts / 15 min / IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Allow slight tolerance during testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again after 15 minutes.'
    }
  }
});

// Chatbot rate limiter: 20 req / 1 min / user or IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user ? req.user._id.toString() : req.ip;
  },
  message: {
    success: false,
    error: {
      code: 'CHAT_RATE_LIMIT_EXCEEDED',
      message: 'Chat request rate limit reached. Please wait a moment before sending another message.'
    }
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  chatLimiter
};
