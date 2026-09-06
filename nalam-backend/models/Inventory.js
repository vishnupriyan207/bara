const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: [true, 'Medicine ID is required']
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0
    },
    unitsPerPack: {
      type: Number,
      default: 10,
      min: 1
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required']
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0
    },
    gstPercent: {
      type: Number,
      default: 5.0,
      min: 0
    },
    supplierId: {
      type: String,
      default: 'Direct Pharma Supplier',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
inventorySchema.index({ medicineId: 1, batchNumber: 1 }, { unique: true });
inventorySchema.index({ medicineId: 1 });
inventorySchema.index({ expiryDate: 1 });
inventorySchema.index({ quantity: 1 });

const Inventory = mongoose.model('Inventory', inventorySchema);
module.exports = Inventory;
