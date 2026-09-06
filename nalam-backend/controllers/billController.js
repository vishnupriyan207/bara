const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const Patient = require('../models/Patient');
const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');
const { createBill } = require('../services/billingService');

const createPharmacyBill = async (req, res, next) => {
  try {
    const {
      patientId,
      customerName,
      customerPhone,
      items,
      discountPercent,
      paymentMethod,
      notes
    } = req.body;

    const result = await createBill(
      {
        patientId,
        customerName,
        customerPhone,
        pharmacyUserId: req.user ? req.user._id : null,
        items,
        discountPercent,
        paymentMethod,
        notes
      },
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    );

    res.status(201).json({
      success: true,
      data: {
        bill: result.bill,
        payment: result.payment
      }
    });
  } catch (error) {
    next(error);
  }
};

const getBills = async (req, res, next) => {
  try {
    const { limit = 50, page = 1, status } = req.query;
    const query = {};
    if (status) query.paymentStatus = status;

    if (req.user && req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) {
        return res.status(200).json({ success: true, data: { bills: [] } });
      }
      query.patientId = patient._id;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [bills, total] = await Promise.all([
      Bill.find(query)
        .populate('patientId', 'name phone patientCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Bill.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        bills,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getTodayBills = async (req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const bills = await Bill.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate('patientId', 'name phone patientCode')
      .sort({ createdAt: -1 });

    const totalSales = bills.reduce((acc, b) => acc + (b.paymentStatus === 'paid' ? b.grandTotal : 0), 0);

    res.status(200).json({
      success: true,
      data: {
        count: bills.length,
        totalSales: Number(totalSales.toFixed(2)),
        bills
      }
    });
  } catch (error) {
    next(error);
  }
};

const getBillById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findById(id).populate('patientId', 'name phone patientCode');

    if (!bill) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BILL_NOT_FOUND',
          message: 'Bill not found'
        }
      });
    }

    if (req.user && req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient || bill.patientId?._id.toString() !== patient._id.toString()) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not authorized to view another customer\'s bill'
          }
        });
      }
    }

    const payments = await Payment.find({ billId: bill._id });

    res.status(200).json({
      success: true,
      data: {
        bill,
        payments
      }
    });
  } catch (error) {
    next(error);
  }
};

const getBillsByPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    if (req.user && req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient || patient._id.toString() !== patientId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only view your own bills'
          }
        });
      }
    }

    const bills = await Bill.find({ patientId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { bills }
    });
  } catch (error) {
    next(error);
  }
};

const cancelBill = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findById(id);

    if (!bill) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BILL_NOT_FOUND',
          message: 'Bill not found'
        }
      });
    }

    if (bill.paymentStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_CANCELLED',
          message: 'This bill has already been cancelled'
        }
      });
    }

    // Rollback stock for cancelled items
    for (const item of bill.items) {
      if (item.batchId) {
        await Inventory.findByIdAndUpdate(item.batchId, {
          $inc: { quantity: item.quantity }
        });
      }
    }

    bill.paymentStatus = 'cancelled';
    await bill.save();

    await Payment.updateMany({ billId: bill._id }, { status: 'refunded' });

    try {
      await AuditLog.create({
        userId: req.user._id,
        action: 'BILL_CANCELLED',
        resourceType: 'Bill',
        resourceId: bill._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { billNumber: bill.billNumber }
      });
    } catch (e) {}

    res.status(200).json({
      success: true,
      data: {
        message: `Bill ${bill.billNumber} cancelled successfully. Inventory restored.`,
        bill
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPharmacyBill,
  getBills,
  getTodayBills,
  getBillById,
  getBillsByPatient,
  cancelBill
};
