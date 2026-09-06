const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { optionalAuthenticate, authenticate } = require('../middleware/authMiddleware');
const { chatLimiter } = require('../middleware/rateLimitMiddleware');
const { validateBody, validateParams, idParamSchema } = require('../validators/common');
const {
  legacyChatSchema,
  createChatSessionSchema,
  sendChatMessageSchema
} = require('../validators/chatValidator');

// Backward compatibility endpoint for original frontend
router.post('/', chatLimiter, optionalAuthenticate, validateBody(legacyChatSchema), chatController.legacyChat);

// Session endpoints
router.post('/sessions', optionalAuthenticate, validateBody(createChatSessionSchema), chatController.createSession);
router.get('/sessions', optionalAuthenticate, chatController.getSessions);
router.get('/sessions/:id', optionalAuthenticate, validateParams(idParamSchema), chatController.getSessionById);
router.delete('/sessions/:id', optionalAuthenticate, validateParams(idParamSchema), chatController.deleteSession);
router.post('/sessions/:id/messages', chatLimiter, optionalAuthenticate, validateParams(idParamSchema), validateBody(sendChatMessageSchema), chatController.sendMessageInSession);

module.exports = router;
