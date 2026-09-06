const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const AuditLog = require('../models/AuditLog');

const createMedicalRecord = async (req, res, next) => {
  try {
    const data = req.body;
    // Auto-resolve doctorId from authenticated doctor
    if (!data.doctorId) {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only registered doctors can author medical records'
          }
        });
      }
      data.doctorId = doctor._id;
    }

    const record = await MedicalRecord.create(data);

    try {
      await AuditLog.create({
        userId: req.user._id,
        action: 'MEDICAL_RECORD_CREATED',
        resourceType: 'MedicalRecord',
        resourceId: record._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { patientId: record.patientId, diagnosis: record.diagnosis }
      });
    } catch (e) {}

    const populated = await MedicalRecord.findById(record._id)
      .populate('patientId', 'name age gender patientCode')
      .populate('doctorId', 'name specialization');

    res.status(201).json({
      success: true,
      data: { record: populated }
    });
  } catch (error) {
    next(error);
  }
};

const getMedicalRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await MedicalRecord.findById(id)
      .populate('patientId', 'name age gender patientCode')
      .populate('doctorId', 'name specialization');

    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: 'Medical record not found'
        }
      });
    }

    // Role verification
    if (req.user.role === 'patient') {
      const myPatient = await Patient.findOne({ userId: req.user._id });
      if (!myPatient || record.patientId._id.toString() !== myPatient._id.toString()) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only access your own medical records'
          }
        });
      }
    } else if (req.user.role === 'pharmacy') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Pharmacy staff cannot access full diagnostic medical records'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: { record }
    });
  } catch (error) {
    next(error);
  }
};

const getRecordsByPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    if (req.user.role === 'patient') {
      const myPatient = await Patient.findOne({ userId: req.user._id });
      if (!myPatient || myPatient._id.toString() !== patientId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only access your own medical records'
          }
        });
      }
    } else if (req.user.role === 'pharmacy') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Pharmacy staff cannot access patient medical records'
        }
      });
    }

    const records = await MedicalRecord.find({ patientId })
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { records }
    });
  } catch (error) {
    next(error);
  }
};

const updateMedicalRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await MedicalRecord.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: 'Medical record not found'
        }
      });
    }

    // Only doctor author or admin
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor || record.doctorId.toString() !== doctor._id.toString()) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only edit medical records you authored'
          }
        });
      }
    }

    const updated = await MedicalRecord.findByIdAndUpdate(id, req.body, { new: true })
      .populate('patientId', 'name age gender patientCode')
      .populate('doctorId', 'name specialization');

    res.status(200).json({
      success: true,
      data: { record: updated }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMedicalRecord,
  getMedicalRecordById,
  getRecordsByPatient,
  updateMedicalRecord
};
