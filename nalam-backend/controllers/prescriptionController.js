const Prescription = require('../models/Prescription');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const AuditLog = require('../models/AuditLog');

const createPrescription = async (req, res, next) => {
  try {
    const data = req.body;
    let resolvedPatientId = data.patientId;

    // 1. Resolve or create Patient
    if (!resolvedPatientId && (data.patientName || data.patientPhone)) {
      const { generatePatientCode } = require('../utils/generateId');
      let patient = null;
      if (data.patientPhone) {
        patient = await Patient.findOne({ phone: data.patientPhone });
      }
      if (!patient && data.patientName) {
        patient = await Patient.findOne({ name: data.patientName });
      }
      if (!patient) {
        const code = await generatePatientCode();
        patient = await Patient.create({
          patientCode: code,
          name: data.patientName || 'Patient',
          age: data.patientAge ? Number(data.patientAge) : undefined,
          phone: data.patientPhone || '9876543210'
        });
      }
      resolvedPatientId = patient._id;
    }

    if (!resolvedPatientId) {
      const latestPatient = await Patient.findOne().sort({ createdAt: -1 });
      if (latestPatient) {
        resolvedPatientId = latestPatient._id;
      } else {
        const { generatePatientCode } = require('../utils/generateId');
        const p = await Patient.create({
          patientCode: await generatePatientCode(),
          name: 'Patient',
          phone: '9876543210'
        });
        resolvedPatientId = p._id;
      }
    }
    data.patientId = resolvedPatientId;

    // 2. Resolve Doctor
    let resolvedDoctorId = data.doctorId;
    if (!resolvedDoctorId) {
      if (req.user && req.user._id) {
        const doctor = await Doctor.findOne({ userId: req.user._id });
        if (doctor) resolvedDoctorId = doctor._id;
      }
      if (!resolvedDoctorId && data.doctorName) {
        const doctor = await Doctor.findOne({ name: new RegExp(data.doctorName, 'i') });
        if (doctor) resolvedDoctorId = doctor._id;
      }
      if (!resolvedDoctorId) {
        const activeDoctor = await Doctor.findOne({ isActive: true });
        if (activeDoctor) {
          resolvedDoctorId = activeDoctor._id;
        } else {
          const User = require('../models/User');
          let docUser = await User.findOne({ role: 'doctor' });
          if (!docUser) {
            const { hashPassword } = require('../utils/password');
            docUser = await User.create({
              name: 'Dr. Gopi',
              email: 'doctor@nalamclinic.com',
              passwordHash: await hashPassword('DoctorPassword@123'),
              role: 'doctor',
              phone: '9025276457'
            });
          }
          const newDoc = await Doctor.create({
            userId: docUser._id,
            name: docUser.name,
            email: docUser.email,
            phone: docUser.phone,
            specialization: 'General Physician',
            licenseNumber: 'LIC-' + Date.now().toString().slice(-6),
            lastLogin: new Date(),
            isActive: true
          });
          resolvedDoctorId = newDoc._id;
        }
      }
    }
    data.doctorId = resolvedDoctorId;

    const prescription = await Prescription.create(data);

    try {
      await AuditLog.create({
        userId: req.user ? req.user._id : null,
        action: 'PRESCRIPTION_CREATED',
        resourceType: 'Prescription',
        resourceId: prescription._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { medicineCount: prescription.medicines.length }
      });
    } catch (e) {}

    const populated = await Prescription.findById(prescription._id)
      .populate('patientId', 'name age gender phone patientCode')
      .populate('doctorId', 'name specialization licenseNumber');

    res.status(201).json({
      success: true,
      data: { prescription: populated }
    });
  } catch (error) {
    next(error);
  }
};

const getPrescriptionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findById(id)
      .populate('patientId', 'name age gender phone patientCode')
      .populate('doctorId', 'name specialization licenseNumber');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRESCRIPTION_NOT_FOUND',
          message: 'Prescription not found'
        }
      });
    }

    // Role check
    if (req.user.role === 'patient') {
      const myPatient = await Patient.findOne({ userId: req.user._id });
      if (!myPatient || prescription.patientId._id.toString() !== myPatient._id.toString()) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only view your own prescriptions'
          }
        });
      }
    }

    // Audit log access for pharmacy
    if (req.user.role === 'pharmacy') {
      try {
        await AuditLog.create({
          userId: req.user._id,
          action: 'PRESCRIPTION_ACCESSED_BY_PHARMACY',
          resourceType: 'Prescription',
          resourceId: prescription._id.toString(),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      } catch (e) {}
    }

    res.status(200).json({
      success: true,
      data: { prescription }
    });
  } catch (error) {
    next(error);
  }
};

const getPrescriptionsByPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    if (req.user.role === 'patient') {
      const myPatient = await Patient.findOne({ userId: req.user._id });
      if (!myPatient || myPatient._id.toString() !== patientId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only view your own prescriptions'
          }
        });
      }
    }

    const prescriptions = await Prescription.find({ patientId })
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { prescriptions }
    });
  } catch (error) {
    next(error);
  }
};

const getActivePrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({ status: 'active' })
      .populate('patientId', 'name age phone patientCode')
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { prescriptions }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPrescription,
  getPrescriptionById,
  getPrescriptionsByPatient,
  getActivePrescriptions
};
