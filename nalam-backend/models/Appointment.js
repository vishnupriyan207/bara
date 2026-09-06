const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required']
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
      default: Date.now
    },
    startTime: {
      type: String,
      default: '09:00 AM'
    },
    endTime: {
      type: String,
      default: '09:30 AM'
    },
    reason: {
      type: String,
      required: [true, 'Reason for visit is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show'],
      default: 'waiting'
    },
    priority: {
      type: String,
      enum: ['normal', 'urgent'],
      default: 'normal'
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexes
appointmentSchema.index({ patientId: 1 });
appointmentSchema.index({ doctorId: 1 });
appointmentSchema.index({ appointmentDate: 1 });
appointmentSchema.index({ status: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;
