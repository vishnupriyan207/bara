const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true
    },
    genericName: {
      type: String,
      default: '',
      trim: true
    },
    strength: {
      type: String,
      default: '',
      trim: true
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['strip', 'syrup', 'injection', 'ointment', 'drops', 'powder', 'device', 'other'],
      default: 'strip'
    },
    unitsPerStrip: {
      type: Number,
      default: 10,
      min: 1
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: 0
    },
    gstPercent: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 28
    },
    manufacturer: {
      type: String,
      default: 'Nalam Pharma',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
medicineSchema.index({ name: 1 });
medicineSchema.index({ genericName: 1 });
medicineSchema.index({ name: 'text', genericName: 'text' });

const Medicine = mongoose.model('Medicine', medicineSchema);
module.exports = Medicine;
