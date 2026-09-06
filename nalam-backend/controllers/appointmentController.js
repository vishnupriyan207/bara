const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const appointmentService = require('../services/appointmentService');

const createAppointment = async (req, res, next) => {
  try {
    const data = req.body;
    // Security: If authenticated as patient, ensure they cannot book for someone else's patientId
    if (req.user && req.user.role === 'patient') {
      const myPatient = await Patient.findOne({ userId: req.user._id });
      if (myPatient) {
        data.patientId = myPatient._id;
      }
    }

    const appointment = await appointmentService.createAppointment(
      data,
      req.user || null,
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    );

    res.status(201).json({
      success: true,
      data: { appointment }
    });
  } catch (error) {
    next(error);
  }
};

const getAppointments = async (req, res, next) => {
  try {
    const query = {};
    const { status, date, priority } = req.query;

    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
    }

    // Role filtering
    if (req.user && req.user.role === 'patient') {
      const myPatient = await Patient.findOne({ userId: req.user._id });
      if (!myPatient) {
        return res.status(200).json({ success: true, data: { appointments: [] } });
      }
      query.patientId = myPatient._id;
    } else if (req.user && req.user.role === 'doctor') {
      const myDoctor = await Doctor.findOne({ userId: req.user._id });
      if (myDoctor) {
        query.$or = [{ doctorId: myDoctor._id }, { doctorId: null }];
      }
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name age phone patientCode gender')
      .populate('doctorId', 'name specialization')
      .sort({ appointmentDate: -1, startTime: 1 });

    res.status(200).json({
      success: true,
      data: { appointments }
    });
  } catch (error) {
    next(error);
  }
};

const getTodayAppointments = async (req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      appointmentDate: { $gte: startOfDay, $lte: endOfDay }
    };

    if (req.query.status) {
      if (req.query.status !== 'all') {
        query.status = req.query.status;
      }
    } else {
      query.status = { $nin: ['completed', 'cancelled'] };
    }

    if (req.user && req.user.role === 'doctor') {
      const myDoctor = await Doctor.findOne({ userId: req.user._id });
      if (myDoctor) {
        query.$or = [{ doctorId: myDoctor._id }, { doctorId: null }];
      }
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name age phone patientCode gender')
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { appointments }
    });
  } catch (error) {
    next(error);
  }
};

const getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id)
      .populate('patientId', 'name age phone patientCode gender')
      .populate('doctorId', 'name specialization');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APPOINTMENT_NOT_FOUND',
          message: 'Appointment not found'
        }
      });
    }

    // Role check for patient
    if (req.user.role === 'patient') {
      const myPatient = await Patient.findOne({ userId: req.user._id });
      if (!myPatient || appointment.patientId._id.toString() !== myPatient._id.toString()) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not authorized to view another patient\'s appointment'
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      data: { appointment }
    });
  } catch (error) {
    next(error);
  }
};

const getAppointmentsByPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    if (req.user.role === 'patient') {
      const myPatient = await Patient.findOne({ userId: req.user._id });
      if (!myPatient || myPatient._id.toString() !== patientId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You cannot view appointments for another patient'
          }
        });
      }
    }

    const appointments = await Appointment.find({ patientId })
      .populate('doctorId', 'name specialization')
      .sort({ appointmentDate: -1 });

    res.status(200).json({
      success: true,
      data: { appointments }
    });
  } catch (error) {
    next(error);
  }
};

const getAppointmentsByDoctor = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const appointments = await Appointment.find({ doctorId })
      .populate('patientId', 'name age phone patientCode gender')
      .sort({ appointmentDate: -1 });

    res.status(200).json({
      success: true,
      data: { appointments }
    });
  } catch (error) {
    next(error);
  }
};

const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APPOINTMENT_NOT_FOUND',
          message: 'Appointment not found'
        }
      });
    }

    // Patients can only cancel their own appointment
    if (req.user.role === 'patient') {
      const myPatient = await Patient.findOne({ userId: req.user._id });
      if (!myPatient || appointment.patientId.toString() !== myPatient._id.toString()) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You cannot modify another patient\'s appointment'
          }
        });
      }
      // Patients are only permitted to cancel
      if (req.body.status && req.body.status !== 'cancelled') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Patients can only cancel appointments'
          }
        });
      }
    }

    const updated = await Appointment.findByIdAndUpdate(id, req.body, { new: true })
      .populate('patientId', 'name age phone patientCode')
      .populate('doctorId', 'name specialization');

    res.status(200).json({
      success: true,
      data: { appointment: updated }
    });
  } catch (error) {
    next(error);
  }
};

const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APPOINTMENT_NOT_FOUND',
          message: 'Appointment not found'
        }
      });
    }

    // Soft delete: set status to cancelled
    appointment.status = 'cancelled';
    await appointment.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Appointment marked as cancelled',
        appointment
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  getTodayAppointments,
  getAppointmentById,
  getAppointmentsByPatient,
  getAppointmentsByDoctor,
  updateAppointment,
  deleteAppointment
};
