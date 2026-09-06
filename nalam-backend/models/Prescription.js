const mongoose = require('mongoose');

const prescribedMedicineSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      default: null
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    strength: {
      type: String,
      default: '',
      trim: true
    },
    instructions: {
      type: String,
      default: '1-0-1 After food',
      trim: true
    },
    duration: {
      type: String,
      default: '5 days',
      trim: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    }
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
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
    medicines: {
      type: [prescribedMedicineSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Prescription must contain at least one medicine'
      }
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'dispensed', 'cancelled'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
prescriptionSchema.index({ patientId: 1 });
prescriptionSchema.index({ doctorId: 1 });
prescriptionSchema.index({ status: 1 });
prescriptionSchema.index({ createdAt: -1 });

const Prescription = mongoose.model('Prescription', prescriptionSchema);
module.exports = Prescription;
