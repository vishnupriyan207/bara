const Doctor = require('../models/Doctor');
const User = require('../models/User');

const getDoctors = async (req, res, next) => {
  try {
    const doctors = await Doctor.find({ isActive: true })
      .select('name specialization phone email availability licenseNumber')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: { doctors }
    });
  } catch (error) {
    next(error);
  }
};

const getDoctorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findById(id);

    if (!doctor || !doctor.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCTOR_NOT_FOUND',
          message: 'Doctor profile does not exist'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: { doctor }
    });
  } catch (error) {
    next(error);
  }
};

const createDoctor = async (req, res, next) => {
  try {
    const { userId, name, specialization, licenseNumber, phone, email, availability } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Referenced user ID for doctor does not exist'
        }
      });
    }

    const doctor = await Doctor.create({
      userId,
      name,
      specialization: specialization || 'General Physician',
      licenseNumber,
      phone,
      email,
      availability: availability || []
    });

    res.status(201).json({
      success: true,
      data: { doctor }
    });
  } catch (error) {
    next(error);
  }
};

const updateDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findById(id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCTOR_NOT_FOUND',
          message: 'Doctor profile not found'
        }
      });
    }

    // Only admin or the doctor themselves can update
    if (req.user.role === 'doctor' && doctor.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update your own doctor profile'
        }
      });
    }

    const updated = await Doctor.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    res.status(200).json({
      success: true,
      data: { doctor: updated }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor
};
