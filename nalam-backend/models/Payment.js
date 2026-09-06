const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    method: {
      type: String,
      enum: ['cash', 'upi', 'card', 'net_banking'],
      required: true,
      default: 'cash'
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'success'
    },
    transactionReference: {
      type: String,
      default: () => 'TXN-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000),
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
paymentSchema.index({ billId: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
