const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required prior to permission check'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Forbidden: This action requires one of the following roles: [${roles.join(', ')}]. Current role: ${req.user.role}`
        }
      });
    }

    next();
  };
};

module.exports = {
  requireRole
};
