const morgan = require('morgan');

// Custom Morgan token to mask sensitive information
morgan.token('body', (req) => {
  if (!req.body || typeof req.body !== 'object') return '';
  const sanitized = { ...req.body };
  if (sanitized.password) sanitized.password = '***';
  if (sanitized.passwordHash) sanitized.passwordHash = '***';
  if (sanitized.token) sanitized.token = '***';
  return JSON.stringify(sanitized);
});

const morganMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms'
);

const logSecurityEvent = (eventType, details) => {
  console.warn(`[SECURITY EVENT] [${new Date().toISOString()}] ${eventType}:`, details);
};

const logInfo = (message, meta = {}) => {
  console.log(`[INFO] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? meta : '');
};

const logError = (message, error = null) => {
  console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error ? error.message || error : '');
};

module.exports = {
  morganMiddleware,
  logSecurityEvent,
  logInfo,
  logError
};
