const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      default: 'General Physician',
      trim: true
    },
    licenseNumber: {
      type: String,
      required: [true, 'Medical license number is required'],
      unique: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    availability: [
      {
        day: {
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        },
        startTime: { type: String, default: '09:00 AM' },
        endTime: { type: String, default: '05:00 PM' }
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date,
      default: Date.now
    },
    loginCount: {
      type: Number,
      default: 0
    },
    lastLoginIp: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexes
doctorSchema.index({ userId: 1 }, { unique: true });

const Doctor = mongoose.model('Doctor', doctorSchema);
module.exports = Doctor;
