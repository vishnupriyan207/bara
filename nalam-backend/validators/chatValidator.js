const { z } = require('zod');

const legacyChatSchema = z.object({
  sessionId: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1, 'Message content cannot be empty').max(5000, 'Message exceeds 5000 characters')
    })
  ).min(1, 'At least one message is required')
});

const createChatSessionSchema = z.object({
  title: z.string().max(100).optional().default('New Medical Consultation')
});

const sendChatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000, 'Message cannot exceed 5000 characters')
});

module.exports = {
  legacyChatSchema,
  createChatSessionSchema,
  sendChatMessageSchema
};
