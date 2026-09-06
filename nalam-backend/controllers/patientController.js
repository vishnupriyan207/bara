const Patient = require('../models/Patient');
const { generatePatientCode } = require('../utils/generateId');
const AuditLog = require('../models/AuditLog');

const createPatient = async (req, res, next) => {
  try {
    const data = req.body;
    let userId = null;

    if (req.user && req.user.role === 'patient') {
      userId = req.user._id;
      const existing = await Patient.findOne({ userId });
      if (existing) {
        return res.status(200).json({
          success: true,
          data: { patient: existing }
        });
      }
    }

    const patientCode = await generatePatientCode();
    const patient = await Patient.create({
      ...data,
      userId,
      patientCode
    });

    try {
      await AuditLog.create({
        userId: req.user ? req.user._id : null,
        action: 'PATIENT_CREATED',
        resourceType: 'Patient',
        resourceId: patient._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { patientCode: patient.patientCode }
      });
    } catch (e) {
      console.error('AuditLog error:', e.message);
    }

    res.status(201).json({
      success: true,
      data: { patient }
    });
  } catch (error) {
    next(error);
  }
};

const getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id);

    if (!patient || !patient.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: 'Patient profile does not exist'
        }
      });
    }

    // Authorization: if user is patient, verify they own this record
    if (req.user.role === 'patient') {
      if (!patient.userId || patient.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not authorized to view another patient\'s medical profile'
          }
        });
      }
    }

    // Minimum necessary data for pharmacy role
    if (req.user.role === 'pharmacy') {
      return res.status(200).json({
        success: true,
        data: {
          patient: {
            _id: patient._id,
            patientCode: patient.patientCode,
            name: patient.name,
            phone: patient.phone,
            allergies: patient.allergies
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      data: { patient }
    });
  } catch (error) {
    next(error);
  }
};

const getMyProfile = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PATIENT_PROFILE_NOT_FOUND',
          message: 'No patient record linked to current user account'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: { patient }
    });
  } catch (error) {
    next(error);
  }
};

const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: 'Patient profile not found'
        }
      });
    }

    if (req.user.role === 'patient') {
      if (!patient.userId || patient.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You cannot update another patient\'s record'
          }
        });
      }
    }

    // Disallow altering patientCode or userId via update
    const updates = { ...req.body };
    delete updates.patientCode;
    delete updates.userId;

    const updated = await Patient.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    try {
      await AuditLog.create({
        userId: req.user._id,
        action: 'PATIENT_UPDATED',
        resourceType: 'Patient',
        resourceId: updated._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (e) {}

    res.status(200).json({
      success: true,
      data: { patient: updated }
    });
  } catch (error) {
    next(error);
  }
};

const listPatients = async (req, res, next) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { patientCode: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [patients, total] = await Promise.all([
      Patient.find(query)
        .select('patientCode name age gender phone email bloodGroup createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Patient.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        patients,
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

module.exports = {
  createPatient,
  getPatientById,
  getMyProfile,
  updatePatient,
  listPatients
};
