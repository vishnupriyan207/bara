require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { app, startServer } = require('../server');

const TEST_PORT = 5055;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

let server;

// Simple test runner helper
let passedCount = 0;
let failedCount = 0;

const assert = (condition, message) => {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
  }
};

const runAllTests = async () => {
  console.log('==================================================');
  console.log('🧪 RUNNING NALAM CLINIC COMPREHENSIVE BACKEND TESTS');
  console.log('==================================================\n');

  // Start test server on TEST_PORT
  server = await startServer(TEST_PORT);

  let doctorToken = '';
  let pharmacyToken = '';
  let patientToken = '';
  let secondPatientToken = '';
  let testPatientId = '';
  let secondPatientId = '';
  let testAppointmentId = '';
  let testMedicineId = '';
  let testBatchId = '';
  let testChatSessionId = '';

  try {
    // ----------------------------------------------------
    // TEST SUITE 1: HEALTH CHECK
    // ----------------------------------------------------
    console.log('Suite 1: Health & Connectivity');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health endpoint returns HTTP 200');
    assert(healthData.success === true, 'Health check returns success: true');
    assert(healthData.data.api === 'ok', 'Health check reports api: ok');
    assert(healthData.data.connected === true, 'Database status reports connected: true');

    // ----------------------------------------------------
    // TEST SUITE 2: AUTHENTICATION & ROLES
    // ----------------------------------------------------
    console.log('\nSuite 2: Authentication & Role Authorizations');

    // Login Doctor
    const docLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor@nalamclinic.com', password: 'DoctorPassword@123' })
    });
    const docLoginData = await docLoginRes.json();
    assert(docLoginRes.status === 200, 'Doctor login succeeds (HTTP 200)');
    assert(!!docLoginData.data.token, 'Doctor login returns valid JWT token');
    assert(docLoginData.data.user.role === 'doctor', 'Doctor role matches "doctor"');
    assert(!docLoginData.data.user.passwordHash, 'Password hash is NEVER returned in response');
    doctorToken = docLoginData.data.token;

    // Login Pharmacy
    const pharmLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pharmacy@nalamclinic.com', password: 'PharmacyPassword@123' })
    });
    const pharmLoginData = await pharmLoginRes.json();
    assert(pharmLoginRes.status === 200, 'Pharmacy login succeeds (HTTP 200)');
    pharmacyToken = pharmLoginData.data.token;

    // Register Patient 1
    const testPatEmail = `patient_${Date.now()}@nalamtest.com`;
    const patRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kavitha S',
        email: testPatEmail,
        password: 'PatientPassword@123',
        phone: '9840112233',
        role: 'patient'
      })
    });
    const patRegData = await patRegRes.json();
    assert(patRegRes.status === 201, 'Patient registration succeeds (HTTP 201)');
    patientToken = patRegData.data.token;

    // Register Patient 2 (for authorization testing)
    const pat2RegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ramesh K',
        email: `patient2_${Date.now()}@nalamtest.com`,
        password: 'PatientPassword@123',
        phone: '9840998877',
        role: 'patient'
      })
    });
    const pat2RegData = await pat2RegRes.json();
    secondPatientToken = pat2RegData.data.token;

    // Reject duplicate registration
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate',
        email: testPatEmail,
        password: 'Password123'
      })
    });
    assert(dupRes.status === 409, 'Duplicate user registration rejected with HTTP 409');

    // Reject invalid password
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor@nalamclinic.com', password: 'WrongPassword' })
    });
    assert(badLoginRes.status === 401, 'Wrong password returns HTTP 401');

    // GET /api/auth/me
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'GET /api/auth/me returns current user');
    assert(meData.data.user.email === testPatEmail, 'Current user email matches authenticated patient');

    // ----------------------------------------------------
    // TEST SUITE 3: PATIENT PROFILES & ISOLATION
    // ----------------------------------------------------
    console.log('\nSuite 3: Patient Profile Management & Privacy');

    // Create Patient Profile
    const patProfileRes = await fetch(`${BASE_URL}/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        name: 'Kavitha S',
        age: 32,
        gender: 'female',
        phone: '9840112233',
        bloodGroup: 'B+'
      })
    });
    const patProfileData = await patProfileRes.json();
    assert(patProfileRes.status === 201 || patProfileRes.status === 200, 'Patient profile created / linked');
    testPatientId = patProfileData.data.patient._id;
    assert(patProfileData.data.patient.patientCode.startsWith('PAT-'), 'PatientCode adheres to PAT-XXXXXX format');

    // Create Patient 2 Profile
    const pat2ProfileRes = await fetch(`${BASE_URL}/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secondPatientToken}`
      },
      body: JSON.stringify({
        name: 'Ramesh K',
        age: 45,
        gender: 'male',
        phone: '9840998877'
      })
    });
    const pat2ProfileData = await pat2ProfileRes.json();
    secondPatientId = pat2ProfileData.data.patient._id;

    // PRIVACY TEST: Patient 1 attempts to access Patient 2's profile
    const unauthPatRes = await fetch(`${BASE_URL}/patients/${secondPatientId}`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    assert(unauthPatRes.status === 403, 'Cross-patient access blocked with HTTP 403 Forbidden');

    // Doctor can view Patient's profile
    const docViewPatRes = await fetch(`${BASE_URL}/patients/${testPatientId}`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    assert(docViewPatRes.status === 200, 'Doctor can view patient medical profile');

    // ----------------------------------------------------
    // TEST SUITE 4: APPOINTMENTS
    // ----------------------------------------------------
    console.log('\nSuite 4: Appointment Scheduling');

    const apptRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        reason: 'Recurrent severe migraine headaches',
        priority: 'urgent',
        startTime: '10:30 AM'
      })
    });
    const apptData = await apptRes.json();
    assert(apptRes.status === 201, 'Appointment created successfully (HTTP 201)');
    testAppointmentId = apptData.data.appointment._id;

    // Today's appointments for doctor dashboard
    const todayApptRes = await fetch(`${BASE_URL}/appointments/today`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    const todayApptData = await todayApptRes.json();
    assert(todayApptRes.status === 200, 'Doctor can fetch today\'s appointments');
    assert(todayApptData.data.appointments.length > 0, 'Today\'s appointments list contains records');

    // ----------------------------------------------------
    // TEST SUITE 5: MEDICAL RECORDS & PRESCRIPTIONS
    // ----------------------------------------------------
    console.log('\nSuite 5: Medical Records & Prescriptions');

    // Doctor gets doctor profile id
    const docMeRes = await fetch(`${BASE_URL}/doctors`);
    const docMeData = await docMeRes.json();
    const activeDoctorId = docMeData.data.doctors[0]?._id;

    // Doctor creates medical record
    const medRecRes = await fetch(`${BASE_URL}/medical-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`
      },
      body: JSON.stringify({
        patientId: testPatientId,
        doctorId: activeDoctorId,
        appointmentId: testAppointmentId,
        diagnosis: 'Acute Migraine without aura',
        symptoms: ['Throbbing unilateral headache', 'Photophobia'],
        treatmentPlan: 'Adequate hydration, stress relief, prescribe analgesics'
      })
    });
    const medRecData = await medRecRes.json();
    assert(medRecRes.status === 201, 'Doctor creates medical record successfully');
    const testRecordId = medRecData.data.record._id;

    // Patient 1 views own record
    const patRecRes = await fetch(`${BASE_URL}/medical-records/${testRecordId}`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    assert(patRecRes.status === 200, 'Patient can view their own medical record');

    // Patient 2 attempts to view Patient 1's record
    const unauthRecRes = await fetch(`${BASE_URL}/medical-records/${testRecordId}`, {
      headers: { Authorization: `Bearer ${secondPatientToken}` }
    });
    assert(unauthRecRes.status === 403, 'Cross-patient medical record access rejected with 403');

    // Doctor creates prescription
    const prescRes = await fetch(`${BASE_URL}/prescriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`
      },
      body: JSON.stringify({
        patientId: testPatientId,
        doctorId: activeDoctorId,
        appointmentId: testAppointmentId,
        medicines: [
          { name: 'Paracetamol', strength: '500mg', instructions: '1-0-1 After food', duration: '3 days', quantity: 6 }
        ],
        notes: 'Review if headache persists after 3 days'
      })
    });
    const prescData = await prescRes.json();
    assert(prescRes.status === 201, 'Doctor creates prescription successfully');

    // Pharmacy views active prescriptions
    const pharmPrescRes = await fetch(`${BASE_URL}/prescriptions/active`, {
      headers: { Authorization: `Bearer ${pharmacyToken}` }
    });
    assert(pharmPrescRes.status === 200, 'Pharmacy can view active prescriptions for dispensing');

    // ----------------------------------------------------
    // TEST SUITE 6: GROQ AI CHATBOT
    // ----------------------------------------------------
    console.log('\nSuite 6: Groq AI Chatbot Integration');

    // Backward compatibility endpoint
    console.log('  Testing legacy POST /api/chat...');
    const legacyChatRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello, what services does Nalam Clinic offer?' }]
      })
    });
    const legacyChatData = await legacyChatRes.json();
    assert(legacyChatRes.status === 200, 'Legacy /api/chat endpoint responds with HTTP 200');
    assert(typeof legacyChatData.response === 'string' && legacyChatData.response.length > 5, 'Groq returns medical assistant reply');

    // Session-based chat flow
    console.log('  Testing session-based chat flow...');
    const sessionRes = await fetch(`${BASE_URL}/chat/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`
      },
      body: JSON.stringify({ title: 'Headache inquiry' })
    });
    const sessionData = await sessionRes.json();
    assert(sessionRes.status === 201, 'Chat session created in MongoDB');
    testChatSessionId = sessionData.data.session._id;

    // Send message in session
    const msgRes = await fetch(`${BASE_URL}/chat/sessions/${testChatSessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`
      },
      body: JSON.stringify({ message: 'I have had a mild headache for 2 hours.' })
    });
    const msgData = await msgRes.json();
    assert(msgRes.status === 200, 'Message processed and response saved');
    assert(msgData.data.message.role === 'assistant', 'Assistant message returned');

    // Another patient cannot access this chat session
    const unauthChatRes = await fetch(`${BASE_URL}/chat/sessions/${testChatSessionId}`, {
      headers: { Authorization: `Bearer ${secondPatientToken}` }
    });
    assert(unauthChatRes.status === 403, 'Cross-user chat session access rejected with 403');

    // ----------------------------------------------------
    // TEST SUITE 7: MEDICINE & INVENTORY & BILLING INTEGRITY
    // ----------------------------------------------------
    console.log('\nSuite 7: Pharmacy Inventory & Server-side Billing Integrity');

    // Lookup medicines
    const medListRes = await fetch(`${BASE_URL}/medicines`);
    const medListData = await medListRes.json();
    const paracetamol = medListData.data.medicines.find(m => m.name === 'Paracetamol');
    assert(!!paracetamol, 'Paracetamol medicine found in catalog');
    testMedicineId = paracetamol._id;

    // Barcode lookup
    const barcodeRes = await fetch(`${BASE_URL}/medicines/barcode/${paracetamol.barcode}`);
    assert(barcodeRes.status === 200, `Barcode search for ${paracetamol.barcode} succeeds`);

    // Fetch batch for Paracetamol
    const invRes = await fetch(`${BASE_URL}/inventory?filter=all`);
    const invData = await invRes.json();
    const paraBatch = invData.data.inventory.find(i => i.medicineId?._id === testMedicineId || i.medicineId === testMedicineId);
    assert(!!paraBatch, 'Inventory batch for Paracetamol exists');
    testBatchId = paraBatch._id;
    const initialQty = paraBatch.quantity;

    // BILLING ATTACK TEST:
    // Client attempts to send forged price (unitPrice: 0.50) and forged grandTotal: 1.00
    console.log('  Testing server-side billing calculation vs client manipulation...');
    const billRes = await fetch(`${BASE_URL}/bills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pharmacyToken}`
      },
      body: JSON.stringify({
        customerName: 'Walk-in Test',
        customerPhone: '9000012345',
        items: [
          {
            medicineId: testMedicineId,
            batchId: testBatchId,
            quantity: 2,
            mode: 'strip',
            unitPrice: 0.50, // ATTACK: sending 50 paise instead of real price 23.70
            total: 1.00
          }
        ],
        grandTotal: 1.00, // ATTACK: sending 1 rupee
        paymentMethod: 'cash'
      })
    });
    const billData = await billRes.json();
    assert(billRes.status === 201, 'Bill generated successfully');
    const createdBill = billData.data.bill;
    assert(createdBill.billNumber.startsWith('INV-'), 'Server generates INV-XXXX bill number');

    // Expected price: 23.70 * 2 = 47.40 + 5% GST (2.37) = 49.77
    assert(createdBill.grandTotal > 40, `Server recalculates true total (${createdBill.grandTotal}) and completely ignores client's 1.00 manipulation!`);

    // Verify stock was reduced atomically
    const postInvRes = await fetch(`${BASE_URL}/inventory/${testBatchId}`);
    const postInvData = await postInvRes.json();
    assert(postInvData.data.item.quantity === initialQty - 2, `Inventory decreased atomically from ${initialQty} to ${postInvData.data.item.quantity}`);

    // Reports API
    const salesReportRes = await fetch(`${BASE_URL}/reports/sales/today`);
    const salesReportData = await salesReportRes.json();
    assert(salesReportRes.status === 200, 'Sales report API succeeds');
    assert(salesReportData.data.totalSales >= createdBill.grandTotal, 'Sales report computes accurate sum from MongoDB bills');

    // ----------------------------------------------------
    // TEST SUITE 8: SECURITY & EDGE CASES
    // ----------------------------------------------------
    console.log('\nSuite 8: Security & Input Validation');

    // Invalid ObjectId returns 400 not 500
    const invalidIdRes = await fetch(`${BASE_URL}/patients/not-a-valid-id`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    assert(invalidIdRes.status === 400, 'Invalid MongoDB ObjectId returns 400 Bad Request');

    // Patient cannot patch medicines (403)
    const patPatchMedRes = await fetch(`${BASE_URL}/medicines/${testMedicineId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`
      },
      body: JSON.stringify({ sellingPrice: 0 })
    });
    assert(patPatchMedRes.status === 403, 'Patient cannot modify pharmacy medicines (403 Forbidden)');

    // Missing body returns 400
    const emptyBodyRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(emptyBodyRes.status === 400, 'Empty login payload returns 400 Validation Error');

  } catch (err) {
    console.error('Test execution error:', err);
    failedCount++;
  } finally {
    if (server) {
      server.close();
    }
    console.log('\n==================================================');
    console.log(`📊 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('==================================================\n');

    process.exit(failedCount > 0 ? 1 : 0);
  }
};

runAllTests();
