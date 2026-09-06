const mongoose = require('mongoose');
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const Patient = require('../models/Patient');
const { getGroqChatCompletion } = require('../services/groqService');
const AuditLog = require('../models/AuditLog');

/**
 * Backward compatibility endpoint for current frontend
 * POST /api/chat
 */
const legacyChat = async (req, res, next) => {
  try {
    const { messages, sessionId } = req.body;
    const result = await getGroqChatCompletion(messages);

    // Persist chat session and messages to MongoDB Atlas
    let session = null;
    try {
      let patientId = null;
      let userId = req.user ? req.user._id : null;

      if (req.user && req.user.role === 'patient') {
        const patient = await Patient.findOne({ userId: req.user._id });
        if (patient) {
          patientId = patient._id;
        }
      }

      // Check if session exists in MongoDB
      if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
        session = await ChatSession.findById(sessionId);
      }

      const lastUserMsg = messages && messages.length > 0 ? messages[messages.length - 1] : null;
      const userText = lastUserMsg ? String(lastUserMsg.content || '') : '';
      const titleSnippet = userText ? (userText.slice(0, 40) + (userText.length > 40 ? '...' : '')) : 'New Medical Consultation';

      if (!session || session.status === 'deleted') {
        session = await ChatSession.create({
          patientId,
          userId,
          title: titleSnippet,
          status: 'active'
        });
      } else {
        // Link authenticated user if session was started anonymously
        let modified = false;
        if (!session.userId && userId) {
          session.userId = userId;
          modified = true;
        }
        if (!session.patientId && patientId) {
          session.patientId = patientId;
          modified = true;
        }
        if (session.title === 'New Medical Consultation' && titleSnippet !== 'New Medical Consultation') {
          session.title = titleSnippet;
          modified = true;
        }
        session.updatedAt = new Date();
        await session.save();
      }

      // Save user prompt
      if (lastUserMsg && lastUserMsg.role === 'user') {
        await ChatMessage.create({
          sessionId: session._id,
          patientId: session.patientId || patientId,
          role: 'user',
          content: userText,
          model: 'openai/gpt-oss-20b'
        });
      }

      // Save assistant response
      if (result && result.content) {
        await ChatMessage.create({
          sessionId: session._id,
          patientId: session.patientId || patientId,
          role: 'assistant',
          content: result.content,
          model: result.model || 'openai/gpt-oss-20b'
        });
      }
    } catch (dbErr) {
      console.error('[ChatController] Error persisting chat to MongoDB:', dbErr);
    }

    res.status(200).json({
      success: true,
      response: result.content,
      sessionId: session ? session._id.toString() : null,
      data: {
        sessionId: session ? session._id.toString() : null,
        response: result.content
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a new chat consultation session
 * POST /api/chat/sessions
 */
const createSession = async (req, res, next) => {
  try {
    const { title } = req.body;
    let patientId = null;
    let userId = req.user ? req.user._id : null;

    if (req.user && req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (patient) {
        patientId = patient._id;
      }
    }

    const session = await ChatSession.create({
      patientId,
      userId,
      title: title || 'New Medical Consultation',
      status: 'active'
    });

    try {
      await AuditLog.create({
        userId,
        action: 'CHAT_SESSION_CREATED',
        resourceType: 'ChatSession',
        resourceId: session._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (e) {}

    res.status(201).json({
      success: true,
      data: { session }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists chat sessions belonging to the user
 * GET /api/chat/sessions
 */
const getSessions = async (req, res, next) => {
  try {
    const query = { status: { $ne: 'deleted' } };

    if (req.user) {
      if (req.user.role === 'patient') {
        const patient = await Patient.findOne({ userId: req.user._id });
        query.$or = [
          { userId: req.user._id },
          ...(patient ? [{ patientId: patient._id }] : [])
        ];
      } else if (req.user.role === 'admin') {
        // Admin can list all sessions
      } else {
        query.userId = req.user._id;
      }
    } else if (req.query.ids) {
      const idList = req.query.ids.split(',').map(s => s.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
      query._id = { $in: idList };
    }

    const sessions = await ChatSession.find(query).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: { sessions }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets a session and its message history
 * GET /api/chat/sessions/:id
 */
const getSessionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await ChatSession.findById(id);

    if (!session || session.status === 'deleted') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Chat session not found'
        }
      });
    }

    // Ownership check
    if (req.user && req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      const isOwner =
        (session.userId && session.userId.toString() === req.user._id.toString()) ||
        (patient && session.patientId && session.patientId.toString() === patient._id.toString());

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not authorized to view another user\'s chat session'
          }
        });
      }
    }

    const messages = await ChatMessage.find({ sessionId: session._id })
      .select('role content model createdAt')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        session,
        messages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sends a message in a session, invokes Groq, and persists the conversation
 * POST /api/chat/sessions/:id/messages
 */
const sendMessageInSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const session = await ChatSession.findById(id);
    if (!session || session.status === 'deleted') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Chat session not found'
        }
      });
    }

    // Ownership check
    if (req.user && req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      const isOwner =
        (session.userId && session.userId.toString() === req.user._id.toString()) ||
        (patient && session.patientId && session.patientId.toString() === patient._id.toString());

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You cannot send messages into another user\'s chat session'
          }
        });
      }
    }

    // 1. Save user message
    const userMsg = await ChatMessage.create({
      sessionId: session._id,
      patientId: session.patientId,
      role: 'user',
      content: message
    });

    // Auto-update session title from first message if it's default
    if (session.title === 'New Medical Consultation') {
      session.title = message.slice(0, 40) + (message.length > 40 ? '...' : '');
    }
    session.updatedAt = new Date();
    await session.save();

    // 2. Fetch recent conversation history (last 10 messages)
    const history = await ChatMessage.find({ sessionId: session._id })
      .sort({ createdAt: -1 })
      .limit(10);
    history.reverse();

    const conversationPayload = history.map((m) => ({
      role: m.role,
      content: m.content
    }));

    // 3. Call Groq API
    const completion = await getGroqChatCompletion(conversationPayload);

    // 4. Save assistant response
    const assistantMsg = await ChatMessage.create({
      sessionId: session._id,
      patientId: session.patientId,
      role: 'assistant',
      content: completion.content,
      model: completion.model
    });

    res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        message: {
          role: assistantMsg.role,
          content: assistantMsg.content,
          createdAt: assistantMsg.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft deletes / closes a chat session
 * DELETE /api/chat/sessions/:id
 */
const deleteSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await ChatSession.findById(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Chat session not found'
        }
      });
    }

    if (req.user && req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      const isOwner =
        (session.userId && session.userId.toString() === req.user._id.toString()) ||
        (patient && session.patientId && session.patientId.toString() === patient._id.toString());

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You cannot delete another user\'s chat session'
          }
        });
      }
    }

    session.status = 'deleted';
    await session.save();

    try {
      await AuditLog.create({
        userId: req.user ? req.user._id : null,
        action: 'CHAT_SESSION_DELETED',
        resourceType: 'ChatSession',
        resourceId: session._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (e) {}

    res.status(200).json({
      success: true,
      data: {
        message: 'Chat session deleted successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  legacyChat,
  createSession,
  getSessions,
  getSessionById,
  sendMessageInSession,
  deleteSession
};
