const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    title: {
      type: String,
      default: 'New Medical Consultation',
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'deleted'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
chatSessionSchema.index({ patientId: 1 });
chatSessionSchema.index({ userId: 1 });
chatSessionSchema.index({ updatedAt: -1 });

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
module.exports = ChatSession;
