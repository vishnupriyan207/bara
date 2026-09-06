const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a valid string');
  }
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (plainPassword, hashedPassword) => {
  if (!plainPassword || !hashedPassword) {
    return false;
  }
  return bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword
};
