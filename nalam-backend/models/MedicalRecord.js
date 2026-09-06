const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required']
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor ID is required']
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null
    },
    symptoms: {
      type: [String],
      default: []
    },
    observations: {
      type: String,
      trim: true,
      default: ''
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
      trim: true
    },
    treatmentPlan: {
      type: String,
      trim: true,
      default: ''
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
medicalRecordSchema.index({ patientId: 1 });
medicalRecordSchema.index({ doctorId: 1 });
medicalRecordSchema.index({ createdAt: -1 });

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);
module.exports = MedicalRecord;
