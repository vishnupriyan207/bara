const Inventory = require('../models/Inventory');
const Medicine = require('../models/Medicine');
const { getLowStock, getExpiringSoon } = require('../services/inventoryService');
const AuditLog = require('../models/AuditLog');

const getInventoryList = async (req, res, next) => {
  try {
    const { filter, limit = 50, page = 1 } = req.query;
    let query = {};

    if (filter === 'low') {
      const lowStockItems = await getLowStock(10);
      return res.status(200).json({
        success: true,
        data: { inventory: lowStockItems }
      });
    }

    if (filter === 'exp') {
      const expiringItems = await getExpiringSoon(90);
      return res.status(200).json({
        success: true,
        data: { inventory: expiringItems }
      });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [inventory, total] = await Promise.all([
      Inventory.find(query)
        .populate('medicineId')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Inventory.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        inventory,
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

const getInventoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await Inventory.findById(id).populate('medicineId');

    if (!item) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVENTORY_NOT_FOUND',
          message: 'Inventory batch record not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: { item }
    });
  } catch (error) {
    next(error);
  }
};

const getInventoryByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    const medicine = await Medicine.findOne({ barcode, isActive: true });

    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BARCODE_NOT_FOUND',
          message: `No medicine associated with barcode ${barcode}`
        }
      });
    }

    const batches = await Inventory.find({ medicineId: medicine._id })
      .populate('medicineId')
      .sort({ expiryDate: 1 });

    res.status(200).json({
      success: true,
      data: {
        medicine,
        batches
      }
    });
  } catch (error) {
    next(error);
  }
};

const getLowStockItems = async (req, res, next) => {
  try {
    const threshold = Number(req.query.threshold) || 10;
    const items = await getLowStock(threshold);

    res.status(200).json({
      success: true,
      data: {
        count: items.length,
        items
      }
    });
  } catch (error) {
    next(error);
  }
};

const getExpiringItems = async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 60;
    const items = await getExpiringSoon(days);

    res.status(200).json({
      success: true,
      data: {
        count: items.length,
        items
      }
    });
  } catch (error) {
    next(error);
  }
};

const createInventoryBatch = async (req, res, next) => {
  try {
    const { medicineId, batchNumber, quantity, unitsPerPack, expiryDate, purchasePrice, sellingPrice, gstPercent, supplierId } = req.body;

    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEDICINE_NOT_FOUND',
          message: 'Referenced medicine does not exist'
        }
      });
    }

    const inventory = await Inventory.create({
      medicineId,
      batchNumber,
      quantity,
      unitsPerPack: unitsPerPack || medicine.unitsPerStrip || 10,
      expiryDate: new Date(expiryDate),
      purchasePrice: purchasePrice !== undefined ? purchasePrice : medicine.purchasePrice,
      sellingPrice: sellingPrice !== undefined ? sellingPrice : medicine.sellingPrice,
      gstPercent: gstPercent !== undefined ? gstPercent : medicine.gstPercent,
      supplierId: supplierId || 'Direct Pharma Supplier'
    });

    try {
      await AuditLog.create({
        userId: req.user._id,
        action: 'INVENTORY_BATCH_CREATED',
        resourceType: 'Inventory',
        resourceId: inventory._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { batchNumber, quantity, medicineName: medicine.name }
      });
    } catch (e) {}

    const populated = await Inventory.findById(inventory._id).populate('medicineId');

    res.status(201).json({
      success: true,
      data: { inventory: populated }
    });
  } catch (error) {
    next(error);
  }
};

const updateInventoryBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await Inventory.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVENTORY_NOT_FOUND',
          message: 'Inventory batch record not found'
        }
      });
    }

    const updated = await Inventory.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })
      .populate('medicineId');

    res.status(200).json({
      success: true,
      data: { inventory: updated }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventoryList,
  getInventoryById,
  getInventoryByBarcode,
  getLowStockItems,
  getExpiringItems,
  createInventoryBatch,
  updateInventoryBatch
};
