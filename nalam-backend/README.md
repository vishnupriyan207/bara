# Nalam Clinic - Backend Architecture & REST API Documentation

Production-grade, secure, and scalable backend for the **Nalam Clinic** healthcare web application. Built with Node.js, Express.js, MongoDB Atlas (Mongoose), JWT authentication, Zod validation, and the Groq AI Chatbot API.

---

## 1. System Architecture

```
[ Frontend: index.html | chatbot.html | pharmacy.html ]
                           │
                 HTTPS REST API / JSON
                           ▼
          [ Node.js + Express Server (:5000) ]
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
 [ MongoDB Atlas ]                     [ Groq Cloud API ]
  - Users & Roles                       - LLaMA / gpt-oss-20b
  - Patients & Doctors                  - Medical Guidance Assistant
  - Appointments & Medical Records
  - Prescriptions & Inventory Batches
  - Bills, Payments & Audit Logs
```

---

## 2. Technology Stack

- **Runtime**: Node.js (CommonJS, async/await)
- **Framework**: Express.js
- **Database**: MongoDB Atlas via Mongoose
- **Authentication**: JWT (`jsonwebtoken`) & `bcryptjs`
- **Validation**: `zod`
- **Security**: `helmet`, `cors`, `express-rate-limit`
- **Logging**: `morgan` (with sanitized request token masking)
- **AI Integration**: Groq API (`openai/gpt-oss-20b`, temperature: 0.3, max tokens: 600)

---

## 3. Directory Structure

```
nalam-backend/
├── .env                  # Environment secrets (ignored by git)
├── .env.example          # Environment template
├── .gitignore            # Git exclusion rules
├── package.json          # Dependencies and npm scripts
├── server.js             # Express application & server bootstrap
├── README.md             # Complete documentation
├── config/
│   └── db.js             # MongoDB Atlas connection lifecycle
├── models/
│   ├── User.js           # Authentication user & roles
│   ├── Patient.js        # Patient profiles (PAT-XXXXXX)
│   ├── Doctor.js         # Doctor profiles & availability
│   ├── Appointment.js    # Appointments & scheduling
│   ├── MedicalRecord.js  # Clinical diagnostic records
│   ├── Prescription.js   # Prescribed medicines
│   ├── ChatSession.js    # Chat consultation sessions
│   ├── ChatMessage.js    # Messages (user & assistant)
│   ├── Medicine.js       # Master drug catalog & pricing
│   ├── Inventory.js      # Batch-based inventory & expiry
│   ├── Bill.js           # Invoices (INV-XXXX)
│   ├── Payment.js        # Transactions (cash, upi, card)
│   └── AuditLog.js       # Security & clinical audit trail
├── controllers/
│   ├── authController.js
│   ├── patientController.js
│   ├── doctorController.js
│   ├── appointmentController.js
│   ├── medicalRecordController.js
│   ├── prescriptionController.js
│   ├── chatController.js
│   ├── medicineController.js
│   ├── inventoryController.js
│   ├── billController.js
│   ├── paymentController.js
│   └── reportController.js
├── routes/
│   ├── authRoutes.js
│   ├── patientRoutes.js
│   ├── doctorRoutes.js
│   ├── appointmentRoutes.js
│   ├── medicalRecordRoutes.js
│   ├── prescriptionRoutes.js
│   ├── chatRoutes.js
│   ├── medicineRoutes.js
│   ├── inventoryRoutes.js
│   ├── billRoutes.js
│   ├── paymentRoutes.js
│   └── reportRoutes.js
├── middleware/
│   ├── authMiddleware.js      # JWT verification & req.user attachment
│   ├── roleMiddleware.js      # Role authorization (admin, doctor, etc.)
│   ├── errorMiddleware.js     # Centralized error handler & status codes
│   └── rateLimitMiddleware.js # General, Auth, and Chat rate limiters
├── services/
│   ├── authService.js         # User registration & credential checks
│   ├── groqService.js         # Groq API medical completion client
│   ├── billingService.js      # 100% server-side bill & tax calculations
│   ├── inventoryService.js    # Batch checks, FEFO allocation & stock deductions
│   └── appointmentService.js  # Patient auto-registration & scheduling rules
├── validators/
│   ├── common.js              # ObjectId schema & validation middleware
│   ├── authValidator.js
│   ├── patientValidator.js
│   ├── appointmentValidator.js
│   ├── medicalRecordValidator.js
│   ├── prescriptionValidator.js
│   ├── chatValidator.js
│   ├── medicineValidator.js
│   ├── inventoryValidator.js
│   ├── billValidator.js
│   └── paymentValidator.js
├── utils/
│   ├── jwt.js                 # Token signing & verification
│   ├── password.js            # bcryptjs hashing & comparison
│   ├── logger.js              # Morgan logger & security event logger
│   └── generateId.js          # Sequential PAT-XXXXXX and INV-XXXX counters
└── scripts/
    ├── seed.js                # Initial database seed script
    └── test-api.js            # Automated integration test suite (44 tests)
```

---

## 4. Environment Variables Configuration

Create a `.env` file inside `nalam-backend/`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/nalam_clinic?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b
FRONTEND_URL=http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:3000
```

---

## 5. Getting Started & Running Locally

### 1. Install Dependencies
```bash
cd nalam-backend
npm install
```

### 2. Seed Initial Demo Accounts & Catalog
```bash
npm run seed
```
Seeds the following demo accounts:
- **Admin**: `admin@nalamclinic.com` / `AdminPassword@123`
- **Doctor**: `doctor@nalamclinic.com` / `DoctorPassword@123`
- **Pharmacy**: `pharmacy@nalamclinic.com` / `PharmacyPassword@123`
- **Patient**: `patient@nalamclinic.com` / `PatientPassword@123`

### 3. Start Server in Development Mode
```bash
npm run dev
```

### 4. Run Automated Test Suite
```bash
npm test
```
Executes all 44 test cases across health, authentication, roles, patient privacy, appointment flows, medical records, Groq AI chatbot, batch inventory, and server-side billing calculation integrity.

---

## 6. MongoDB Atlas Setup Guide

1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a Free / Shared Cluster.
3. In **Database Access**, create a user with read/write privileges (e.g., `vishnupriyan207_db_user`).
4. In **Network Access**, allow access from anywhere (`0.0.0.0/0`) or your server's IP address.
5. In **Database Deployments**, click **Connect** -> **Drivers** (Node.js).
6. Copy the connection string and insert the database name `nalam_clinic`:
   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/nalam_clinic?retryWrites=true&w=majority
   ```
7. Set `MONGODB_URI` in `.env`.

---

## 7. Role Permission Matrix

| Resource / Action | Patient | Doctor | Pharmacy | Admin |
| :--- | :---: | :---: | :---: | :---: |
| Register / Login | Allowed | Allowed | Allowed | Allowed |
| View Own Profile | Allowed | Allowed | Allowed | Allowed |
| View Other Patient Records | **Denied (403)** | Allowed | Restricted (Min data) | Allowed |
| Create Appointment | Allowed | Allowed | Allowed | Allowed |
| Author Medical Record | **Denied (403)** | Allowed | **Denied (403)** | Allowed |
| Prescribe Medicines | **Denied (403)** | Allowed | **Denied (403)** | Allowed |
| View Active Prescriptions | Own Only | Allowed | Allowed | Allowed |
| Modify Prescription | **Denied (403)** | Author Only | **Denied (403)** | Allowed |
| Chatbot Private Session | Own Only | Own Only | Own Only | Allowed |
| Create / Edit Medicine Catalog | **Denied (403)** | **Denied (403)** | Allowed | Allowed |
| Add / Adjust Inventory Batches | **Denied (403)** | **Denied (403)** | Allowed | Allowed |
| Create Pharmacy Bill | **Denied (403)** | **Denied (403)** | Allowed | Allowed |
| Cancel Pharmacy Bill | **Denied (403)** | **Denied (403)** | Allowed | Allowed |
| View Sales Reports | **Denied (403)** | **Denied (403)** | Allowed | Allowed |

---

## 8. Complete REST API Reference

### Response Format
All successful responses adhere to:
```json
{
  "success": true,
  "data": {}
}
```
All errors adhere to:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable description"
  }
}
```

---

### Health Check
- `GET /api/health`
  - Response:
  ```json
  {
    "success": true,
    "data": {
      "api": "ok",
      "database": "connected",
      "connected": true,
      "environment": "development",
      "timestamp": "2026-09-06T16:22:15.000Z"
    }
  }
  ```

---

### Authentication (`/api/auth`)
- `POST /api/auth/register`
  - Request: `{ "name": "...", "email": "...", "password": "...", "phone": "...", "role": "patient" }`
  - Response: `201 Created` with `{ user, token }`
- `POST /api/auth/login`
  - Request: `{ "email": "...", "password": "..." }`
  - Response: `200 OK` with `{ user, token }`
- `GET /api/auth/me`
  - Auth: Required (`Bearer <token>`)
  - Response: `200 OK` with `{ user }`
- `POST /api/auth/logout`
  - Response: `200 OK`

---

### Patients (`/api/patients`)
- `POST /api/patients`: Create or link patient profile (generates sequential `PAT-XXXXXX`).
- `GET /api/patients/me`: Get current authenticated patient profile.
- `GET /api/patients`: List patients (Search `?search=`). Allowed for doctors/admin/pharmacy.
- `GET /api/patients/:id`: Get patient by ID (Patients can only access their own profile).
- `PATCH /api/patients/:id`: Update patient profile.

---

### Doctors (`/api/doctors`)
- `GET /api/doctors`: List active doctors and specialties.
- `GET /api/doctors/:id`: Get doctor details.
- `POST /api/doctors`: Create doctor (Admin only).
- `PATCH /api/doctors/:id`: Update doctor details (Admin or self).

---

### Appointments (`/api/appointments`)
- `POST /api/appointments`: Create appointment (Patients can book for themselves; quick booking creates/links patient record).
- `GET /api/appointments`: List appointments with filters (`?status=`, `?date=`, `?priority=`).
- `GET /api/appointments/today`: Today's appointments for doctor dashboard.
- `GET /api/appointments/:id`: Appointment details.
- `PATCH /api/appointments/:id`: Update status (`waiting`, `in_progress`, `completed`, `cancelled`).
- `DELETE /api/appointments/:id`: Soft delete / cancel appointment.
- `GET /api/appointments/patient/:patientId`: Patient's appointment history.
- `GET /api/appointments/doctor/:doctorId`: Doctor's appointments.

---

### Medical Records (`/api/medical-records`)
- `POST /api/medical-records`: Author diagnostic record (Doctor only).
- `GET /api/medical-records/:id`: Record details (Doctor or patient owner).
- `GET /api/medical-records/patient/:patientId`: Patient diagnostic history (Doctor or patient owner).
- `PATCH /api/medical-records/:id`: Update record (Author doctor only).

---

### Prescriptions (`/api/prescriptions`)
- `POST /api/prescriptions`: Prescribe medicines (Doctor only).
- `GET /api/prescriptions/active`: Active prescriptions for dispensing (Pharmacy / Doctor).
- `GET /api/prescriptions/:id`: Prescription details.
- `GET /api/prescriptions/patient/:patientId`: Patient prescription history.

---

### AI Chatbot (`/api/chat`)
- `POST /api/chat`: Backward compatible endpoint with `{ messages: [...] }`.
- `POST /api/chat/sessions`: Create new session with `{ title: "..." }`.
- `GET /api/chat/sessions`: List user's sessions.
- `GET /api/chat/sessions/:id`: Get session and message history.
- `POST /api/chat/sessions/:id/messages`: Send user message; calls Groq API with medical guidelines and stores assistant response.
- `DELETE /api/chat/sessions/:id`: Soft delete / close session.

---

### Medicines & Inventory (`/api/medicines`, `/api/inventory`)
- `GET /api/medicines`: Master medicine catalog with pagination and search.
- `GET /api/medicines/search?q=`: Live search suggestions.
- `GET /api/medicines/barcode/:barcode`: Barcode scanning lookup.
- `POST /api/medicines`, `PATCH /api/medicines/:id`, `DELETE /api/medicines/:id`: Pharmacy/admin catalog management.
- `GET /api/inventory`: Batch inventory list (`?filter=all|low|exp`).
- `GET /api/inventory/low-stock`: Medicines with stock <= 10 units.
- `GET /api/inventory/expiring`: Batches expiring within 60-90 days.
- `POST /api/inventory`: Create new batch with batchNumber, quantity, and expiryDate.

---

### Pharmacy Billing & Payments (`/api/bills`, `/api/payments`)
- `POST /api/bills`: **Server-Side Calculated Billing**. Accepts `{ items: [{ medicineId, quantity, mode }], discountPercent, paymentMethod }`.
  - Reads prices and GST from MongoDB.
  - Checks stock and verifies non-expired batches (FEFO).
  - Calculates subtotal, GST, discounts, and grandTotal.
  - Automatically decrements inventory batch stock.
  - Generates unique sequential bill number `INV-XXXX`.
  - Creates payment transaction record.
- `GET /api/bills`: List bills.
- `GET /api/bills/today`: Today's sales summary.
- `GET /api/bills/:id`: Bill invoice details and payments.
- `POST /api/bills/:id/cancel`: Cancels bill and restores inventory stock.

---

### Reports (`/api/reports`)
- `GET /api/reports/sales/today`: Real-time calculation of today's sales, bills count, and CGST/SGST breakdown.
- `GET /api/reports/sales?range=today|week|month|custom`: Filtered sales aggregation from MongoDB.
- `GET /api/reports/inventory`: Batch valuation, low stock count, expired count.
- `GET /api/reports/patients`: Total patient count and new patient registrations today.
- `GET /api/reports/appointments`: Breakdown of scheduled, completed, and cancelled appointments today.

---

## 9. Frontend Migration Guide

The frontend UI remains 100% untouched in its visual presentation. A frontend client is provided in `api.js` in the project root.

| File | Current Frontend Function | Previous Mock Behavior | New API Endpoint | Migration Integration |
| :--- | :--- | :--- | :--- | :--- |
| `index.html` | `verifyDoctorLogin()` | Hardcoded `pass === "2121"` | `POST /api/auth/login` | `NalamAPI.login(name, pass)` |
| `index.html` | `submitPatientForm()` | Pushed to local `todayAppointments` | `POST /api/appointments` | `NalamAPI.createAppointment({ name, age, phone, reason })` |
| `index.html` | `renderAppointments()` | Rendered from local array | `GET /api/appointments/today` | `NalamAPI.getTodayAppointments().then(render)` |
| `index.html` | `handleVisited()` | Shifted to local `patientArchives` | `PATCH /api/appointments/:id` | `NalamAPI.updateAppointmentStatus(id, 'completed')` |
| `chatbot.html` | `sendUserChatMessage()` | Cached in `localStorage` | `POST /api/chat/sessions/:id/messages` | `NalamAPI.sendChatMessage(sessionId, msg)` |
| `chatbot.html` | `loadChatHistoryFromStorage()` | Read from `localStorage` | `GET /api/chat/sessions` | `NalamAPI.getChatSessions()` |
| `chatbot.html` | `clearAllChatHistory()` | Cleared `localStorage` | `DELETE /api/chat/sessions/:id` | `NalamAPI.deleteChatSession(id)` |
| `pharmacy.html` | Login verification | Hardcoded `pass === "2121"` | `POST /api/auth/login` | `NalamAPI.login(email, pass)` |
| `pharmacy.html` | `renderInventory()` | Loaded from `window.revenueData` | `GET /api/inventory` | `NalamAPI.getInventory()` |
| `pharmacy.html` | `onSearch()` | Filtered in-memory array | `GET /api/medicines/search?q=` | `NalamAPI.searchMedicines(q)` |
| `pharmacy.html` | `onScanSuccess()` | Mock scanned product | `GET /api/medicines/barcode/:code` | `NalamAPI.getMedicineByBarcode(code)` |
| `pharmacy.html` | `openPaymentModal()` | Pushed to local `transactions` | `POST /api/bills` | `NalamAPI.createBill({ items, paymentMethod })` |
| `pharmacy.html` | `updateDashboard()` | Computed from local array | `GET /api/reports/sales/today` | `NalamAPI.getTodayBills()` |
| `pharmacy.html` | `selectReportRange()` | Filtered local `transactions` | `GET /api/reports/sales?range=` | `NalamAPI.getSalesReport(range)` |
