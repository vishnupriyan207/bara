const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      default: null
    },
    name: {
      type: String,
      required: true
    },
    strength: {
      type: String,
      default: ''
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    gstPercent: {
      type: Number,
      default: 5.0,
      min: 0
    },
    gstAmount: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null
    },
    customerName: {
      type: String,
      default: 'Walk-in Customer'
    },
    customerPhone: {
      type: String,
      default: ''
    },
    pharmacyUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    items: {
      type: [billItemSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Bill must have at least one item'
      }
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    gstAmount: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'cancelled'],
      default: 'paid'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card', 'net_banking'],
      default: 'cash'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexes
billSchema.index({ patientId: 1 });
billSchema.index({ createdAt: -1 });
billSchema.index({ paymentStatus: 1 });

const Bill = mongoose.model('Bill', billSchema);
module.exports = Bill;
