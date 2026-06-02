const BASE = 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('salus_token');
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Serveri viga');
  return data;
}

async function requestBlob(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Serveri viga');
  }
  return res.blob();
}

export const api = {
  // Auth
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  me: () => request('GET', '/auth/me'),
  forgotPassword: (email) => request('POST', '/auth/forgot', { email }),
  setPassword: (token, password) => request('POST', '/auth/set-password', { token, password }),
  updateProfile: (data) => request('PUT', '/auth/profile', data),
  changePassword: (currentPassword, newPassword) => request('PUT', '/auth/change-password', { currentPassword, newPassword }),

  // Kasutajad (admin)
  getUsers: () => request('GET', '/auth/users'),
  createUser: (data) => request('POST', '/auth/users', data),
  updateUser: (id, data) => request('PUT', `/auth/users/${id}`, data),
  deleteUser: (id) => request('DELETE', `/auth/users/${id}`),

  // Kliendid
  getClients: () => request('GET', '/clients'),
  getClient: (id) => request('GET', `/clients/${id}`),
  createClient: (data) => request('POST', '/clients', data),
  updateClient: (id, data) => request('PUT', `/clients/${id}`, data),
  addNote: (clientId, text) => request('POST', `/clients/${clientId}/notes`, { text }),

  // Seansid
  getSessions: (clientId) => request('GET', `/sessions/client/${clientId}`),
  createSession: (data) => request('POST', '/sessions', data),
  updateSession: (id, data) => request('PUT', `/sessions/${id}`, data),
  deleteSession: (id) => request('DELETE', `/sessions/${id}`),

  // Sagedused
  getFrequencies: () => request('GET', '/frequencies'),
  getCategories: () => request('GET', '/frequencies/categories'),
  updateFrequencyDescription: (id, description) => request('PUT', `/frequencies/${id}/description`, { description }),

  // Raport
  generateReport: (sessionId, lang) => requestBlob('POST', `/report/session/${sessionId}`, { lang }),

  // AI
  getAiSuggestion: (clientId, entries, clientContext) =>
    request('POST', '/ai/suggest', { clientId, entries, clientContext }),
};
