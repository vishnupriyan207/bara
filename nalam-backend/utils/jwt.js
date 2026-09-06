const jwt = require('jsonwebtoken');

const signToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  // Only keep essential fields: userId, role
  const safePayload = {
    userId: payload.userId || payload.id,
    role: payload.role
  };

  return jwt.sign(safePayload, secret, { expiresIn });
};

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return jwt.verify(token, secret);
};

module.exports = {
  signToken,
  verifyToken
};
