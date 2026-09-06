const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const AuditLog = require('../models/AuditLog');

const register = async ({ name, email, password, phone, role }, reqMeta = {}) => {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const error = new Error('A user with this email already exists');
    error.statusCode = 409;
    error.code = 'USER_ALREADY_EXISTS';
    throw error;
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name,
    email: normalizedEmail,
    phone: phone || '',
    passwordHash,
    role: role || 'patient',
    isActive: true
  });

  const token = signToken({ userId: user._id, role: user.role });

  // Audit log
  try {
    await AuditLog.create({
      userId: user._id,
      action: 'USER_REGISTER',
      resourceType: 'User',
      resourceId: user._id.toString(),
      ipAddress: reqMeta.ip || '',
      userAgent: reqMeta.userAgent || '',
      metadata: { role: user.role, email: user.email }
    });
  } catch (err) {
    console.error('AuditLog error:', err.message);
  }

  return {
    user: user.toJSON(),
    token
  };
};

const login = async ({ email, password }, reqMeta = {}) => {
  const normalizedIdentifier = email.toLowerCase().trim();
  // Allow login by email or phone
  const user = await User.findOne({
    $or: [{ email: normalizedIdentifier }, { phone: normalizedIdentifier }]
  }).select('+passwordHash');

  if (!user || !user.isActive) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const token = signToken({ userId: user._id, role: user.role });

  // If user is doctor, track login in 'doctors' collection
  let doctorRecord = null;
  if (user.role === 'doctor') {
    try {
      doctorRecord = await Doctor.findOne({ userId: user._id });
      if (!doctorRecord) {
        doctorRecord = await Doctor.create({
          userId: user._id,
          name: user.name || 'Dr. Nalam',
          email: user.email,
          phone: user.phone || '9025276457',
          specialization: 'General Physician',
          licenseNumber: 'LIC-' + Date.now().toString().slice(-6),
          lastLogin: new Date(),
          loginCount: 1,
          lastLoginIp: reqMeta.ip || '',
          isActive: true
        });
      } else {
        doctorRecord.lastLogin = new Date();
        doctorRecord.loginCount = (doctorRecord.loginCount || 0) + 1;
        doctorRecord.lastLoginIp = reqMeta.ip || '';
        await doctorRecord.save();
      }
    } catch (e) {
      console.warn('Notice updating Doctor collection on login:', e.message);
    }
  }

  // Audit log
  try {
    await AuditLog.create({
      userId: user._id,
      action: user.role === 'doctor' ? 'DOCTOR_LOGIN' : 'USER_LOGIN',
      resourceType: user.role === 'doctor' ? 'Doctor' : 'User',
      resourceId: doctorRecord ? doctorRecord._id.toString() : user._id.toString(),
      ipAddress: reqMeta.ip || '',
      userAgent: reqMeta.userAgent || '',
      metadata: { role: user.role }
    });
  } catch (err) {
    console.error('AuditLog error:', err.message);
  }

  return {
    user: user.toJSON(),
    doctor: doctorRecord,
    token
  };
};

/**
 * Doctor login supporting doctor name & PIN 2121 or password.
 * Guarantees storing/updating the Doctor record in the 'doctors' collection.
 */
const doctorLogin = async ({ name, password }, reqMeta = {}) => {
  const enteredPass = String(password || '').trim();
  const enteredName = String(name || '').trim();

  let user = null;
  if (enteredName && enteredName.includes('@')) {
    user = await User.findOne({ email: enteredName.toLowerCase().trim(), role: 'doctor' }).select('+passwordHash');
  }
  if (!user) {
    user = await User.findOne({ role: 'doctor' }).select('+passwordHash');
  }

  // Create seed doctor user if none exists
  if (!user) {
    const passwordHash = await hashPassword('DoctorPassword@123');
    user = await User.create({
      name: enteredName || 'Dr. Nalam',
      email: 'doctor@nalamclinic.com',
      phone: '9025276457',
      passwordHash,
      role: 'doctor',
      isActive: true
    });
  }

  // Allow PIN 2121 or password
  const isPin = enteredPass === '2121';
  let passwordOk = isPin;
  if (!isPin && user.passwordHash) {
    passwordOk = await comparePassword(enteredPass, user.passwordHash);
  }

  if (!passwordOk) {
    const error = new Error('Invalid doctor credentials or PIN');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  // Format doctor name
  let resolvedDoctorName = user.name || 'Dr. Nalam';
  if (enteredName && !enteredName.includes('@')) {
    resolvedDoctorName = enteredName.startsWith('Dr.') ? enteredName : `Dr. ${enteredName}`;
  }

  // Store & update Doctor in 'doctors' collection
  let doctor = await Doctor.findOne({ userId: user._id });
  if (!doctor) {
    doctor = await Doctor.create({
      userId: user._id,
      name: resolvedDoctorName,
      email: user.email,
      phone: user.phone || '9025276457',
      specialization: 'General Physician',
      licenseNumber: 'LIC-' + Date.now().toString().slice(-6),
      lastLogin: new Date(),
      loginCount: 1,
      lastLoginIp: reqMeta.ip || '',
      isActive: true
    });
  } else {
    doctor.name = resolvedDoctorName;
    doctor.lastLogin = new Date();
    doctor.loginCount = (doctor.loginCount || 0) + 1;
    doctor.lastLoginIp = reqMeta.ip || '';
    await doctor.save();
  }

  const token = signToken({ userId: user._id, role: user.role });

  try {
    await AuditLog.create({
      userId: user._id,
      action: 'DOCTOR_LOGIN',
      resourceType: 'Doctor',
      resourceId: doctor._id.toString(),
      ipAddress: reqMeta.ip || '',
      userAgent: reqMeta.userAgent || '',
      metadata: { doctorName: doctor.name, loginCount: doctor.loginCount }
    });
  } catch (e) {}

  return {
    user: user.toJSON(),
    doctor,
    token
  };
};

module.exports = {
  register,
  login,
  doctorLogin
};
