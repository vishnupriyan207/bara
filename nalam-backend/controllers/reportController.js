const Bill = require('../models/Bill');
const Inventory = require('../models/Inventory');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

const getTodaySalesReport = async (req, res, next) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const bills = await Bill.find({
      createdAt: { $gte: start, $lte: end },
      paymentStatus: 'paid'
    });

    const totalSales = bills.reduce((sum, b) => sum + b.grandTotal, 0);
    const totalGst = bills.reduce((sum, b) => sum + b.gstAmount, 0);
    const totalTaxable = bills.reduce((sum, b) => sum + b.subtotal, 0);

    res.status(200).json({
      success: true,
      data: {
        filter: 'today',
        totalSales: Number(totalSales.toFixed(2)),
        totalBills: bills.length,
        taxableAmount: Number(totalTaxable.toFixed(2)),
        totalGst: Number(totalGst.toFixed(2)),
        cgst: Number((totalGst / 2).toFixed(2)),
        sgst: Number((totalGst / 2).toFixed(2)),
        bills
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSalesReport = async (req, res, next) => {
  try {
    const { range = 'today', startDate, endDate } = req.query;
    let start = new Date();
    let end = new Date();
    end.setHours(23, 59, 59, 999);

    if (range === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (range === 'week') {
      start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (range === 'month') {
      start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (range === 'custom' && startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setHours(0, 0, 0, 0);
    }

    const bills = await Bill.find({
      createdAt: { $gte: start, $lte: end },
      paymentStatus: 'paid'
    }).sort({ createdAt: -1 });

    const totalSales = bills.reduce((sum, b) => sum + b.grandTotal, 0);
    const totalGst = bills.reduce((sum, b) => sum + b.gstAmount, 0);
    const totalTaxable = bills.reduce((sum, b) => sum + b.subtotal, 0);

    res.status(200).json({
      success: true,
      data: {
        filter: range,
        totalSales: Number(totalSales.toFixed(2)),
        totalBills: bills.length,
        taxableAmount: Number(totalTaxable.toFixed(2)),
        totalGst: Number(totalGst.toFixed(2)),
        cgst: Number((totalGst / 2).toFixed(2)),
        sgst: Number((totalGst / 2).toFixed(2)),
        bills
      }
    });
  } catch (error) {
    next(error);
  }
};

const getInventoryReport = async (req, res, next) => {
  try {
    const inventory = await Inventory.find().populate('medicineId');
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    let totalValuation = 0;
    let lowStockCount = 0;
    let expiredCount = 0;
    let expiringSoonCount = 0;

    for (const item of inventory) {
      totalValuation += item.quantity * item.sellingPrice;
      if (item.quantity <= 10) lowStockCount++;
      if (new Date(item.expiryDate) <= now) expiredCount++;
      else if (new Date(item.expiryDate) <= thresholdDate) expiringSoonCount++;
    }

    res.status(200).json({
      success: true,
      data: {
        totalBatches: inventory.length,
        totalValuation: Number(totalValuation.toFixed(2)),
        lowStockCount,
        expiredCount,
        expiringSoonCount
      }
    });
  } catch (error) {
    next(error);
  }
};

const getPatientsReport = async (req, res, next) => {
  try {
    const totalPatients = await Patient.countDocuments({ isActive: true });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const newPatientsToday = await Patient.countDocuments({
      createdAt: { $gte: todayStart }
    });

    res.status(200).json({
      success: true,
      data: {
        totalPatients,
        newPatientsToday
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAppointmentsReport = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [totalToday, waiting, completed, cancelled] = await Promise.all([
      Appointment.countDocuments({ appointmentDate: { $gte: todayStart, $lte: todayEnd } }),
      Appointment.countDocuments({ appointmentDate: { $gte: todayStart, $lte: todayEnd }, status: 'waiting' }),
      Appointment.countDocuments({ appointmentDate: { $gte: todayStart, $lte: todayEnd }, status: 'completed' }),
      Appointment.countDocuments({ appointmentDate: { $gte: todayStart, $lte: todayEnd }, status: 'cancelled' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalToday,
        waiting,
        completed,
        cancelled
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTodaySalesReport,
  getSalesReport,
  getInventoryReport,
  getPatientsReport,
  getAppointmentsReport
};
