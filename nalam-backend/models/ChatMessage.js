const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters']
    },
    model: {
      type: String,
      default: 'openai/gpt-oss-20b'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });
chatMessageSchema.index({ patientId: 1 });
chatMessageSchema.index({ createdAt: 1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
module.exports = ChatMessage;
