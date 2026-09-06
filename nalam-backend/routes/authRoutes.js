const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateBody } = require('../validators/common');
const { registerSchema, loginSchema } = require('../validators/authValidator');
const { authenticate } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/doctor-login', authLimiter, authController.doctorLogin);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
