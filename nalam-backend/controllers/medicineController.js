const Medicine = require('../models/Medicine');
const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');

const getMedicines = async (req, res, next) => {
  try {
    const { limit = 100, page = 1, search } = req.query;
    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { barcode: search }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [medicines, total] = await Promise.all([
      Medicine.find(query).sort({ name: 1 }).skip(skip).limit(Number(limit)),
      Medicine.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        medicines,
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

const searchMedicines = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.status(200).json({
        success: true,
        data: { medicines: [] }
      });
    }

    const regex = new RegExp(q.trim(), 'i');
    const medicines = await Medicine.find({
      isActive: true,
      $or: [{ name: regex }, { genericName: regex }, { barcode: q.trim() }]
    })
      .limit(10)
      .select('name genericName strength barcode sellingPrice unitsPerStrip type gstPercent');

    res.status(200).json({
      success: true,
      data: { medicines }
    });
  } catch (error) {
    next(error);
  }
};

const getMedicineById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const medicine = await Medicine.findById(id);

    if (!medicine || !medicine.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEDICINE_NOT_FOUND',
          message: 'Medicine not found'
        }
      });
    }

    // Attach inventory batches
    const batches = await Inventory.find({
      medicineId: medicine._id,
      quantity: { $gt: 0 }
    }).sort({ expiryDate: 1 });

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

const getMedicineByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    const medicine = await Medicine.findOne({ barcode, isActive: true });

    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BARCODE_NOT_FOUND',
          message: `No active medicine found with barcode "${barcode}"`
        }
      });
    }

    const batches = await Inventory.find({
      medicineId: medicine._id,
      quantity: { $gt: 0 }
    }).sort({ expiryDate: 1 });

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

const createMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.create(req.body);

    try {
      await AuditLog.create({
        userId: req.user._id,
        action: 'MEDICINE_CREATED',
        resourceType: 'Medicine',
        resourceId: medicine._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { name: medicine.name, sellingPrice: medicine.sellingPrice }
      });
    } catch (e) {}

    res.status(201).json({
      success: true,
      data: { medicine }
    });
  } catch (error) {
    next(error);
  }
};

const updateMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const medicine = await Medicine.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEDICINE_NOT_FOUND',
          message: 'Medicine not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: { medicine }
    });
  } catch (error) {
    next(error);
  }
};

const deleteMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const medicine = await Medicine.findById(id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEDICINE_NOT_FOUND',
          message: 'Medicine not found'
        }
      });
    }

    medicine.isActive = false;
    await medicine.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Medicine deactivated successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMedicines,
  searchMedicines,
  getMedicineById,
  getMedicineByBarcode,
  createMedicine,
  updateMedicine,
  deleteMedicine
};
