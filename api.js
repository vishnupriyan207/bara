/**
 * NALAM CLINIC - FRONTEND API CLIENT
 * Connects the existing UI to the Nalam REST API backend.
 * Provides unified state handling, JWT authorization, and server-side computation.
 */

function resolveApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location) {
    // If running on backend server itself (port 5000)
    if (window.location.port === '5000') {
      return '/api';
    }
    // If running on a static server like Live Server (e.g. port 8080, 5500, 3000)
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:5000/api`;
  }
  return 'http://localhost:5000/api';
}

const NALAM_API_CONFIG = {
  get BASE_URL() {
    return resolveApiBaseUrl();
  },
  TOKEN_KEY: 'nalam_auth_token',
  USER_KEY: 'nalam_auth_user'
};

// --- AUTH TOKEN HELPERS ---
function getAuthToken() {
  return localStorage.getItem(NALAM_API_CONFIG.TOKEN_KEY);
}

function setAuthToken(token) {
  if (token) {
    localStorage.setItem(NALAM_API_CONFIG.TOKEN_KEY, token);
  } else {
    localStorage.removeItem(NALAM_API_CONFIG.TOKEN_KEY);
  }
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(NALAM_API_CONFIG.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setStoredUser(user) {
  if (user) {
    localStorage.setItem(NALAM_API_CONFIG.USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(NALAM_API_CONFIG.USER_KEY);
  }
}

// --- CORE FETCH HELPER ---
async function apiRequest(endpoint, options = {}) {
  const url = `${NALAM_API_CONFIG.BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getAuthToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
    ...(options.body ? { body: typeof options.body === 'string' ? options.body : JSON.stringify(options.body) } : {})
  };

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.error?.message || data?.error || `HTTP ${response.status} Request Failed`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.code = data?.error?.code || 'API_ERROR';
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    console.error(`[NalamAPI Error] ${options.method || 'GET'} ${endpoint}:`, err.message);
    throw err;
  }
}

// --- AUTHENTICATION APIS ---
async function login(email, password) {
  const res = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  if (res.success && res.data?.token) {
    setAuthToken(res.data.token);
    setStoredUser(res.data.user);
  }
  return res.data;
}

async function doctorLogin(name, password) {
  const res = await apiRequest('/auth/doctor-login', {
    method: 'POST',
    body: { name, password }
  });
  if (res.success && res.data?.token) {
    setAuthToken(res.data.token);
    setStoredUser(res.data.user);
  }
  return res.data;
}

async function register(userData) {
  const res = await apiRequest('/auth/register', {
    method: 'POST',
    body: userData
  });
  if (res.success && res.data?.token) {
    setAuthToken(res.data.token);
    setStoredUser(res.data.user);
  }
  return res.data;
}

async function getCurrentUser() {
  const res = await apiRequest('/auth/me');
  if (res.success && res.data?.user) {
    setStoredUser(res.data.user);
  }
  return res.data?.user;
}

function logout() {
  setAuthToken(null);
  setStoredUser(null);
}

// --- APPOINTMENTS APIS ---
async function getAppointments(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await apiRequest(`/appointments${query ? '?' + query : ''}`);
  return res.data?.appointments || [];
}

async function getTodayAppointments() {
  const res = await apiRequest('/appointments/today');
  return res.data?.appointments || [];
}

async function createAppointment(appointmentData) {
  const res = await apiRequest('/appointments', {
    method: 'POST',
    body: appointmentData
  });
  return res.data?.appointment;
}

async function updateAppointmentStatus(id, status) {
  const res = await apiRequest(`/appointments/${id}`, {
    method: 'PATCH',
    body: { status }
  });
  return res.data?.appointment;
}

// --- PATIENTS APIS ---
async function getPatients(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await apiRequest(`/patients${query}`);
  return res.data?.patients || [];
}

async function getPatient(id) {
  const res = await apiRequest(`/patients/${id}`);
  return res.data?.patient;
}

async function createPatient(patientData) {
  const res = await apiRequest('/patients', {
    method: 'POST',
    body: patientData
  });
  return res.data?.patient;
}

// --- MEDICAL RECORDS & PRESCRIPTIONS ---
async function getMedicalRecords(patientId) {
  const res = await apiRequest(`/medical-records/patient/${patientId}`);
  return res.data?.records || [];
}

async function createMedicalRecord(recordData) {
  const res = await apiRequest('/medical-records', {
    method: 'POST',
    body: recordData
  });
  return res.data?.record;
}

async function getPrescriptions(patientId) {
  const res = await apiRequest(`/prescriptions/patient/${patientId}`);
  return res.data?.prescriptions || [];
}

async function getActivePrescriptions() {
  const res = await apiRequest('/prescriptions/active');
  return res.data?.prescriptions || [];
}

async function createPrescription(prescriptionData) {
  const res = await apiRequest('/prescriptions', {
    method: 'POST',
    body: prescriptionData
  });
  return res.data?.prescription;
}

// --- CHATBOT APIS ---
async function getChatSessions(sessionIds = []) {
  const query = sessionIds && sessionIds.length > 0 ? `?ids=${sessionIds.join(',')}` : '';
  const res = await apiRequest(`/chat/sessions${query}`);
  return res.data?.sessions || [];
}

async function getChatSession(sessionId) {
  const res = await apiRequest(`/chat/sessions/${sessionId}`);
  return res.data; // { session, messages }
}

async function createChatSession(title = 'New Medical Consultation') {
  const res = await apiRequest('/chat/sessions', {
    method: 'POST',
    body: { title }
  });
  return res.data?.session;
}

async function sendChatMessage(sessionId, message) {
  const res = await apiRequest(`/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: { message }
  });
  return res.data?.message; // { role: 'assistant', content: '...' }
}

async function deleteChatSession(sessionId) {
  const res = await apiRequest(`/chat/sessions/${sessionId}`, {
    method: 'DELETE'
  });
  return res.data;
}

// Legacy backward-compatible chat helper with sessionId support
async function sendLegacyChatMessage(messages, sessionId = null) {
  const payload = { messages };
  if (sessionId) {
    payload.sessionId = sessionId;
  }
  const res = await apiRequest('/chat', {
    method: 'POST',
    body: payload
  });
  return res;
}

// --- PHARMACY MEDICINES & INVENTORY ---
async function getMedicines(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await apiRequest(`/medicines${query}`);
  return res.data?.medicines || [];
}

async function searchMedicines(q) {
  const res = await apiRequest(`/medicines/search?q=${encodeURIComponent(q)}`);
  return res.data?.medicines || [];
}

async function getMedicineByBarcode(barcode) {
  const res = await apiRequest(`/medicines/barcode/${barcode}`);
  return res.data; // { medicine, batches }
}

async function getInventory(filter = 'all') {
  const res = await apiRequest(`/inventory?filter=${filter}`);
  return res.data?.inventory || [];
}

async function getLowStockMedicines() {
  const res = await apiRequest('/inventory/low-stock');
  return res.data?.items || [];
}

// --- PHARMACY BILLING & SALES ---
async function createBill(billPayload) {
  const res = await apiRequest('/bills', {
    method: 'POST',
    body: billPayload
  });
  return res.data; // { bill, payment }
}

async function getBills() {
  const res = await apiRequest('/bills');
  return res.data?.bills || [];
}

async function getTodayBills() {
  const res = await apiRequest('/bills/today');
  return res.data;
}

async function getSalesReport(range = 'today', startDate = null, endDate = null) {
  let url = `/reports/sales?range=${range}`;
  if (startDate && endDate) {
    url += `&startDate=${startDate}&endDate=${endDate}`;
  }
  const res = await apiRequest(url);
  return res.data;
}

// Export for browser window and ES modules
if (typeof window !== 'undefined') {
  window.NalamAPI = {
    getAuthToken,
    isAuthenticated: () => !!getAuthToken(),
    login,
    doctorLogin,
    register,
    getCurrentUser,
    logout,
    getAppointments,
    getTodayAppointments,
    createAppointment,
    updateAppointmentStatus,
    getPatients,
    getPatient,
    createPatient,
    getMedicalRecords,
    createMedicalRecord,
    getPrescriptions,
    getActivePrescriptions,
    createPrescription,
    getChatSessions,
    getChatSession,
    createChatSession,
    sendChatMessage,
    deleteChatSession,
    sendLegacyChatMessage,
    getMedicines,
    searchMedicines,
    getMedicineByBarcode,
    getInventory,
    getLowStockMedicines,
    createBill,
    getBills,
    getTodayBills,
    getSalesReport
  };
}
