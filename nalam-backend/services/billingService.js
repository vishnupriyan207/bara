const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const Inventory = require('../models/Inventory');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const { generateBillNumber } = require('../utils/generateId');
const { validateBatchAvailability, deductStock } = require('./inventoryService');

/**
 * Server-side calculation and transaction execution for Pharmacy Bill
 */
const createBill = async ({
  patientId,
  customerName,
  customerPhone,
  pharmacyUserId,
  items,
  discountPercent = 0,
  paymentMethod = 'cash',
  notes = ''
}, reqMeta = {}) => {
  // Validate items
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('Bill must contain at least one item');
    err.statusCode = 400;
    throw err;
  }

  // Cap discount between 0 and 50% max authorized discount
  const safeDiscountPct = Math.min(Math.max(Number(discountPercent) || 0, 0), 50);

  // We will build the calculated items from database
  const calculatedItems = [];
  const inventoryDeductionPlan = [];
  let subtotal = 0;
  let totalGst = 0;

  for (const item of items) {
    const medicine = await Medicine.findById(item.medicineId);
    if (!medicine || !medicine.isActive) {
      const err = new Error(`Medicine with ID ${item.medicineId} not found or inactive`);
      err.statusCode = 400;
      throw err;
    }

    const requestedQty = Number(item.quantity);
    if (isNaN(requestedQty) || requestedQty <= 0) {
      const err = new Error(`Invalid quantity for medicine: ${medicine.name}`);
      err.statusCode = 400;
      throw err;
    }

    // Determine unit price based on mode ('strip' or 'tablet'/'unit')
    let basePrice = medicine.sellingPrice;
    if (item.mode === 'tablet' || item.mode === 'unit') {
      basePrice = medicine.sellingPrice / (medicine.unitsPerStrip || 1);
    }
    // Round unit price to 2 decimals
    basePrice = Number(basePrice.toFixed(2));

    // Validate unexpired batch availability
    const allocations = await validateBatchAvailability(medicine._id, requestedQty, item.batchId);

    for (const alloc of allocations) {
      inventoryDeductionPlan.push({
        batchId: alloc.batch._id,
        quantity: alloc.deductQty
      });

      const lineTotalBeforeTax = basePrice * alloc.deductQty;
      const gstRate = alloc.batch.gstPercent !== undefined ? alloc.batch.gstPercent : medicine.gstPercent;
      const gstAmount = Number(((lineTotalBeforeTax * gstRate) / 100).toFixed(2));
      const lineTotal = Number((lineTotalBeforeTax + gstAmount).toFixed(2));

      subtotal += lineTotalBeforeTax;
      totalGst += gstAmount;

      calculatedItems.push({
        medicineId: medicine._id,
        batchId: alloc.batch._id,
        name: medicine.name,
        strength: medicine.strength,
        quantity: alloc.deductQty,
        unitPrice: basePrice,
        gstPercent: gstRate,
        gstAmount,
        total: lineTotal
      });
    }
  }

  subtotal = Number(subtotal.toFixed(2));
  totalGst = Number(totalGst.toFixed(2));
  const discountAmount = Number(((subtotal * safeDiscountPct) / 100).toFixed(2));
  const grandTotal = Number((subtotal + totalGst - discountAmount).toFixed(2));

  // Generate unique server-side sequential bill number
  const billNumber = await generateBillNumber();

  // Execute database operations with transaction where replica set is available
  let session = null;
  let useTransaction = false;

  try {
    session = await mongoose.startSession();
    // Test if transactions are supported (requires replica set)
    session.startTransaction();
    useTransaction = true;
  } catch (err) {
    // Standalone MongoDB does not support transactions; proceed safely without session
    session = null;
    useTransaction = false;
  }

  try {
    // 1. Deduct Stock from each batch
    for (const plan of inventoryDeductionPlan) {
      await deductStock(plan.batchId, plan.quantity, useTransaction ? session : null);
    }

    // 2. Create Bill record
    const billData = {
      billNumber,
      patientId: patientId || null,
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '',
      pharmacyUserId: pharmacyUserId || null,
      items: calculatedItems,
      subtotal,
      gstAmount: totalGst,
      discount: discountAmount,
      grandTotal,
      paymentStatus: 'paid',
      paymentMethod,
      notes
    };

    const bill = new Bill(billData);
    if (useTransaction) {
      await bill.save({ session });
    } else {
      await bill.save();
    }

    // 3. Create Payment record
    const paymentData = {
      billId: bill._id,
      amount: grandTotal,
      method: paymentMethod,
      status: 'success',
      transactionReference: `TXN-${bill.billNumber}-${Date.now().toString().slice(-4)}`
    };

    const payment = new Payment(paymentData);
    if (useTransaction) {
      await payment.save({ session });
      await session.commitTransaction();
    } else {
      await payment.save();
    }

    // 4. Audit Log
    try {
      await AuditLog.create({
        userId: pharmacyUserId || null,
        action: 'BILL_CREATED',
        resourceType: 'Bill',
        resourceId: bill._id.toString(),
        ipAddress: reqMeta.ip || '',
        userAgent: reqMeta.userAgent || '',
        metadata: {
          billNumber: bill.billNumber,
          grandTotal: bill.grandTotal,
          itemCount: calculatedItems.length
        }
      });
    } catch (auditErr) {
      console.error('AuditLog error:', auditErr.message);
    }

    return {
      bill,
      payment
    };
  } catch (error) {
    if (useTransaction && session) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

module.exports = {
  createBill
};
