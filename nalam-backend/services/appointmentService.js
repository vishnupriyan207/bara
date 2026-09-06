const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const { generatePatientCode } = require('../utils/generateId');
const AuditLog = require('../models/AuditLog');

const createAppointment = async ({
  patientId,
  patientName,
  patientAge,
  patientPhone,
  doctorId,
  appointmentDate,
  startTime,
  endTime,
  reason,
  priority,
  status,
  notes
}, authenticatedUser = null, reqMeta = {}) => {
  let resolvedPatientId = patientId;

  // If user is a logged-in patient and didn't provide a patientId, locate or create their patient record
  if (authenticatedUser && authenticatedUser.role === 'patient') {
    let patient = await Patient.findOne({ userId: authenticatedUser._id });
    if (!patient) {
      const code = await generatePatientCode();
      patient = await Patient.create({
        userId: authenticatedUser._id,
        patientCode: code,
        name: authenticatedUser.name,
        phone: authenticatedUser.phone || patientPhone || '0000000000',
        email: authenticatedUser.email
      });
    }
    resolvedPatientId = patient._id;
  }

  // If patientId is still missing, but quick-booking fields are provided
  if (!resolvedPatientId && patientPhone) {
    let patient = await Patient.findOne({ phone: patientPhone });
    if (!patient) {
      const code = await generatePatientCode();
      patient = await Patient.create({
        patientCode: code,
        name: patientName || 'Patient',
        age: patientAge ? Number(patientAge) : undefined,
        phone: patientPhone
      });
    }
    resolvedPatientId = patient._id;
  }

  if (!resolvedPatientId) {
    const err = new Error('Patient identity or contact details (name & phone) are required');
    err.statusCode = 400;
    throw err;
  }

  const appt = await Appointment.create({
    patientId: resolvedPatientId,
    doctorId: doctorId || null,
    appointmentDate: appointmentDate ? new Date(appointmentDate) : new Date(),
    startTime: startTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    endTime: endTime || '',
    reason,
    priority: priority || 'normal',
    status: status || 'waiting',
    notes: notes || ''
  });

  // Audit log
  try {
    await AuditLog.create({
      userId: authenticatedUser ? authenticatedUser._id : null,
      action: 'APPOINTMENT_CREATED',
      resourceType: 'Appointment',
      resourceId: appt._id.toString(),
      ipAddress: reqMeta.ip || '',
      userAgent: reqMeta.userAgent || '',
      metadata: { reason: appt.reason, priority: appt.priority }
    });
  } catch (err) {
    console.error('AuditLog error:', err.message);
  }

  return Appointment.findById(appt._id)
    .populate('patientId', 'name age phone patientCode')
    .populate('doctorId', 'name specialization');
};

module.exports = {
  createAppointment
};
