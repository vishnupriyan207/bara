const authService = require('../services/authService');
const User = require('../models/User');

const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const result = await authService.register(
      { name, email, password, phone, role },
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    );

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(
      { email, password },
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const doctorLogin = async (req, res, next) => {
  try {
    const { name, password, email } = req.body;
    const result = await authService.doctorLogin(
      { name: name || email, password },
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        message: 'Successfully logged out'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  doctorLogin,
  getCurrentUser,
  logout
};
