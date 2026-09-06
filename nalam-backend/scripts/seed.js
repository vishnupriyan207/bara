require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');
const Inventory = require('../models/Inventory');
const { hashPassword } = require('../utils/password');
const { generatePatientCode } = require('../utils/generateId');

const seedData = async () => {
  console.log('--- STARTING NALAM CLINIC SEED PROCESS ---');

  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_SEED) {
    console.error('Safety Check: Automatic seeding in production is disabled.');
    process.exit(1);
  }

  await connectDB();

  // 1. Seed Demo Users
  console.log('Seeding Demo Users...');

  // Demo Admin
  let adminUser = await User.findOne({ email: 'admin@nalamclinic.com' });
  if (!adminUser) {
    const adminHash = await hashPassword('AdminPassword@123');
    adminUser = await User.create({
      name: 'Nalam Super Admin',
      email: 'admin@nalamclinic.com',
      phone: '9000000001',
      passwordHash: adminHash,
      role: 'admin',
      isActive: true
    });
    console.log('Created Admin User: admin@nalamclinic.com');
  }

  // Demo Doctor
  let doctorUser = await User.findOne({ email: 'doctor@nalamclinic.com' });
  if (!doctorUser) {
    const docHash = await hashPassword('DoctorPassword@123');
    doctorUser = await User.create({
      name: 'Dr. Vigneshwaran',
      email: 'doctor@nalamclinic.com',
      phone: '9025276457',
      passwordHash: docHash,
      role: 'doctor',
      isActive: true
    });
    console.log('Created Doctor User: doctor@nalamclinic.com');
  }

  // Doctor Profile
  let doctorProfile = await Doctor.findOne({ userId: doctorUser._id });
  if (!doctorProfile) {
    doctorProfile = await Doctor.create({
      userId: doctorUser._id,
      name: 'Dr. Vigneshwaran MBBS',
      specialization: 'General Medicine & Family Health',
      licenseNumber: 'TN-MED-94821',
      phone: '9025276457',
      email: 'doctor@nalamclinic.com',
      availability: [
        { day: 'Monday', startTime: '09:00 AM', endTime: '08:00 PM' },
        { day: 'Tuesday', startTime: '09:00 AM', endTime: '08:00 PM' },
        { day: 'Wednesday', startTime: '09:00 AM', endTime: '08:00 PM' },
        { day: 'Thursday', startTime: '09:00 AM', endTime: '08:00 PM' },
        { day: 'Friday', startTime: '09:00 AM', endTime: '08:00 PM' },
        { day: 'Saturday', startTime: '10:00 AM', endTime: '06:00 PM' }
      ]
    });
    console.log('Created Doctor Profile for Dr. Vigneshwaran');
  }

  // Demo Pharmacy Staff
  let pharmacyUser = await User.findOne({ email: 'pharmacy@nalamclinic.com' });
  if (!pharmacyUser) {
    const pharmHash = await hashPassword('PharmacyPassword@123');
    pharmacyUser = await User.create({
      name: 'Nalam Head Pharmacist',
      email: 'pharmacy@nalamclinic.com',
      phone: '9000000003',
      passwordHash: pharmHash,
      role: 'pharmacy',
      isActive: true
    });
    console.log('Created Pharmacy User: pharmacy@nalamclinic.com');
  }

  // Demo Patient
  let patientUser = await User.findOne({ email: 'patient@nalamclinic.com' });
  if (!patientUser) {
    const patHash = await hashPassword('PatientPassword@123');
    patientUser = await User.create({
      name: 'Meera Jasmine',
      email: 'patient@nalamclinic.com',
      phone: '9876543210',
      passwordHash: patHash,
      role: 'patient',
      isActive: true
    });
    console.log('Created Patient User: patient@nalamclinic.com');
  }

  // Patient Profile
  let patientProfile = await Patient.findOne({ userId: patientUser._id });
  if (!patientProfile) {
    const patCode = await generatePatientCode();
    patientProfile = await Patient.create({
      userId: patientUser._id,
      patientCode: patCode,
      name: 'Meera Jasmine',
      age: 28,
      gender: 'female',
      phone: '9876543210',
      email: 'patient@nalamclinic.com',
      bloodGroup: 'O+',
      allergies: ['Penicillin']
    });
    console.log(`Created Patient Profile: ${patientProfile.patientCode}`);
  }

  // 2. Seed Sample Medicines & Batches
  console.log('Seeding Sample Medicines & Batches...');

  const sampleMedicines = [
    {
      name: 'Paracetamol',
      genericName: 'Acetaminophen',
      strength: '500mg Tablet',
      barcode: '8901030381014',
      type: 'strip',
      unitsPerStrip: 10,
      purchasePrice: 15.0,
      sellingPrice: 23.7,
      gstPercent: 5.0,
      batch: 'B221210',
      qty: 250,
      exp: new Date('2027-12-31')
    },
    {
      name: 'Dolo 650',
      genericName: 'Paracetamol',
      strength: '650mg Tablet',
      barcode: '8901148210344',
      type: 'strip',
      unitsPerStrip: 15,
      purchasePrice: 22.0,
      sellingPrice: 32.5,
      gstPercent: 5.0,
      batch: 'B330412',
      qty: 300,
      exp: new Date('2028-06-30')
    },
    {
      name: 'Azithromycin',
      genericName: 'Azithromycin Dihydrate',
      strength: '500mg Tablet',
      barcode: '8901234567890',
      type: 'strip',
      unitsPerStrip: 3,
      purchasePrice: 65.0,
      sellingPrice: 119.0,
      gstPercent: 5.0,
      batch: 'B441201',
      qty: 120,
      exp: new Date('2027-10-15')
    },
    {
      name: 'Amoxicillin',
      genericName: 'Amoxicillin Trihydrate',
      strength: '250mg Capsule',
      barcode: '8997025573544',
      type: 'strip',
      unitsPerStrip: 14,
      purchasePrice: 70.0,
      sellingPrice: 118.0,
      gstPercent: 5.0,
      batch: 'B485996',
      qty: 180,
      exp: new Date('2028-09-07')
    },
    {
      name: 'Cetirizine',
      genericName: 'Cetirizine Hydrochloride',
      strength: '10mg Tablet',
      barcode: '8904605458688',
      type: 'strip',
      unitsPerStrip: 15,
      purchasePrice: 8.0,
      sellingPrice: 18.0,
      gstPercent: 5.0,
      batch: 'B906689',
      qty: 400,
      exp: new Date('2028-12-01')
    },
    {
      name: 'Pan D',
      genericName: 'Pantoprazole + Domperidone',
      strength: '40mg Capsule',
      barcode: '8972286994257',
      type: 'strip',
      unitsPerStrip: 15,
      purchasePrice: 90.0,
      sellingPrice: 155.0,
      gstPercent: 5.0,
      batch: 'B439978',
      qty: 220,
      exp: new Date('2027-08-20')
    },
    {
      name: 'Cough Syrup',
      genericName: 'Dextromethorphan + Chlorpheniramine',
      strength: '100ml Bottle',
      barcode: '8901030998811',
      type: 'syrup',
      unitsPerStrip: 1,
      purchasePrice: 75.0,
      sellingPrice: 128.0,
      gstPercent: 5.0,
      batch: 'CS77102',
      qty: 90,
      exp: new Date('2027-05-18')
    },
    {
      name: 'Vitamin C',
      genericName: 'Ascorbic Acid Chewable',
      strength: '500mg Tablet',
      barcode: '8971163109938',
      type: 'strip',
      unitsPerStrip: 15,
      purchasePrice: 20.0,
      sellingPrice: 42.0,
      gstPercent: 5.0,
      batch: 'VC99103',
      qty: 350,
      exp: new Date('2028-01-30')
    },
    {
      name: 'Metformin',
      genericName: 'Metformin Hydrochloride',
      strength: '500mg Tablet',
      barcode: '8997134564798',
      type: 'strip',
      unitsPerStrip: 10,
      purchasePrice: 30.0,
      sellingPrice: 69.0,
      gstPercent: 5.0,
      batch: 'B997328',
      qty: 280,
      exp: new Date('2027-11-10')
    },
    {
      name: 'Amlodipine',
      genericName: 'Amlodipine Besylate',
      strength: '5mg Tablet',
      barcode: '8961785921039',
      type: 'strip',
      unitsPerStrip: 10,
      purchasePrice: 25.0,
      sellingPrice: 56.0,
      gstPercent: 5.0,
      batch: 'B492631',
      qty: 210,
      exp: new Date('2027-07-21')
    }
  ];

  for (const m of sampleMedicines) {
    let medicine = await Medicine.findOne({ name: m.name });
    if (!medicine) {
      medicine = await Medicine.create({
        name: m.name,
        genericName: m.genericName,
        strength: m.strength,
        barcode: m.barcode,
        type: m.type,
        unitsPerStrip: m.unitsPerStrip,
        purchasePrice: m.purchasePrice,
        sellingPrice: m.sellingPrice,
        gstPercent: m.gstPercent,
        manufacturer: 'Nalam Pharma',
        isActive: true
      });
      console.log(`Created Medicine: ${medicine.name}`);
    }

    let batch = await Inventory.findOne({ medicineId: medicine._id, batchNumber: m.batch });
    if (!batch) {
      batch = await Inventory.create({
        medicineId: medicine._id,
        batchNumber: m.batch,
        quantity: m.qty,
        unitsPerPack: m.unitsPerStrip,
        expiryDate: m.exp,
        purchasePrice: m.purchasePrice,
        sellingPrice: m.sellingPrice,
        gstPercent: m.gstPercent,
        supplierId: 'Direct Pharma Supplier'
      });
      console.log(`  -> Added Batch ${m.batch} with ${m.qty} units (Exp: ${m.exp.toISOString().slice(0, 10)})`);
    }
  }

  console.log('--- SEED COMPLETED SUCCESSFULLY ---');
  console.log('Demo Credentials:');
  console.log('Admin:    admin@nalamclinic.com    / AdminPassword@123');
  console.log('Doctor:   doctor@nalamclinic.com   / DoctorPassword@123');
  console.log('Pharmacy: pharmacy@nalamclinic.com / PharmacyPassword@123');
  console.log('Patient:  patient@nalamclinic.com  / PatientPassword@123');

  process.exit(0);
};

seedData().catch((err) => {
  console.error('Seed process failed:', err);
  process.exit(1);
});
