const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access denied. No authorization token provided.'
        }
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access denied. Malformed authorization header.'
        }
      });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE_OR_NOT_FOUND',
          message: 'The user account associated with this token no longer exists or is inactive.'
        }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
          message: error.name === 'TokenExpiredError'
            ? 'Your session has expired. Please login again.'
            : 'Invalid authentication token.'
        }
      });
    }
    next(error);
  }
};

// Optional auth: attaches req.user if token provided, but doesn't block if absent
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId);
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }
  } catch (err) {
    // Ignore error for optional authentication
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate
};
