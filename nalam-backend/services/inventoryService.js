const Inventory = require('../models/Inventory');
const Medicine = require('../models/Medicine');

/**
 * Finds all active batches for a medicine with stock > 0 and expiry in the future
 */
const getAvailableBatches = async (medicineId) => {
  const now = new Date();
  return Inventory.find({
    medicineId,
    quantity: { $gt: 0 },
    expiryDate: { $gt: now }
  }).sort({ expiryDate: 1 }); // FEFO: First Expired, First Out
};

/**
 * Validates whether requested quantity is available and unexpired
 */
const validateBatchAvailability = async (medicineId, requestedQty, specificBatchId = null) => {
  const now = new Date();
  if (specificBatchId) {
    const batch = await Inventory.findOne({
      _id: specificBatchId,
      medicineId
    });

    if (!batch) {
      throw new Error('Specified inventory batch does not exist');
    }
    if (new Date(batch.expiryDate) <= now) {
      throw new Error(`Cannot dispense medicine from batch ${batch.batchNumber}: batch has expired on ${new Date(batch.expiryDate).toLocaleDateString()}`);
    }
    if (batch.quantity < requestedQty) {
      throw new Error(`Insufficient stock in batch ${batch.batchNumber}. Requested: ${requestedQty}, Available: ${batch.quantity}`);
    }
    return [{ batch, deductQty: requestedQty }];
  }

  // Automatic FEFO batch allocation
  const availableBatches = await getAvailableBatches(medicineId);
  const totalAvailable = availableBatches.reduce((acc, b) => acc + b.quantity, 0);

  if (totalAvailable < requestedQty) {
    const med = await Medicine.findById(medicineId);
    const medName = med ? med.name : 'Selected medicine';
    throw new Error(`Insufficient unexpired stock for ${medName}. Requested: ${requestedQty}, Total Available: ${totalAvailable}`);
  }

  let remaining = requestedQty;
  const allocations = [];

  for (const batch of availableBatches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    allocations.push({ batch, deductQty: take });
    remaining -= take;
  }

  return allocations;
};

/**
 * Deducts stock from batch safely ensuring quantity never drops below 0
 */
const deductStock = async (batchId, quantity, session = null) => {
  const query = {
    _id: batchId,
    quantity: { $gte: quantity }
  };

  const update = {
    $inc: { quantity: -quantity }
  };

  const options = session ? { session, new: true } : { new: true };
  const updated = await Inventory.findOneAndUpdate(query, update, options);

  if (!updated) {
    throw new Error(`Failed to deduct ${quantity} units: Stock exhausted or insufficient`);
  }

  return updated;
};

/**
 * Low stock items (quantity <= 10)
 */
const getLowStock = async (threshold = 10) => {
  return Inventory.find({ quantity: { $lte: threshold } })
    .populate('medicineId')
    .sort({ quantity: 1 });
};

/**
 * Expiring soon items (e.g. within 60 days)
 */
const getExpiringSoon = async (days = 60) => {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return Inventory.find({
    expiryDate: { $gte: now, $lte: future },
    quantity: { $gt: 0 }
  })
    .populate('medicineId')
    .sort({ expiryDate: 1 });
};

module.exports = {
  getAvailableBatches,
  validateBatchAvailability,
  deductStock,
  getLowStock,
  getExpiringSoon
};
