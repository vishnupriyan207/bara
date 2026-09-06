const Payment = require('../models/Payment');
const Bill = require('../models/Bill');
const AuditLog = require('../models/AuditLog');

const createPayment = async (req, res, next) => {
  try {
    const { billId, amount, method, transactionReference } = req.body;

    const bill = await Bill.findById(billId);
    if (!bill) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BILL_NOT_FOUND',
          message: 'Referenced bill not found'
        }
      });
    }

    const payment = await Payment.create({
      billId,
      amount,
      method,
      status: 'success',
      transactionReference: transactionReference || `TXN-${Date.now()}`
    });

    // Update bill payment status if paid in full
    bill.paymentStatus = 'paid';
    await bill.save();

    try {
      await AuditLog.create({
        userId: req.user ? req.user._id : null,
        action: 'PAYMENT_CREATED',
        resourceType: 'Payment',
        resourceId: payment._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { amount, method }
      });
    } catch (e) {}

    res.status(201).json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id).populate('billId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment record not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

const getPaymentsByBill = async (req, res, next) => {
  try {
    const { billId } = req.params;
    const payments = await Payment.find({ billId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { payments }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  getPaymentById,
  getPaymentsByBill
};
