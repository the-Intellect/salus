// Database layer using localStorage as persistent store
// In production this will be replaced with PostgreSQL via API

const DB_KEY = 'biotagasiside_db';

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : getInitialData();
  } catch {
    return getInitialData();
  }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getInitialData() {
  return {
    clients: [
      {
        id: 1,
        firstName: 'Karin',
        lastName: 'Lepp',
        dob: '15/03/1985',
        gender: 'Naine',
        email: 'karin@email.com',
        phone: '+372 5100 0000',
        branch: 'Tallinn',
        reason: 'Ärevus, unehäired, läbipõlemine',
        source: 'Sõbra soovitus',
        createdAt: '2025-11-01',
        notes: 'Klient on 40-aastane naine. Põhiprobleem: krooniline väsimus, ärevus tööl, unehäired. Eelmistel seanssidel on märkimisväärselt paranenud une kvaliteet.',
      },
      {
        id: 2,
        firstName: 'Mart',
        lastName: 'Tamm',
        dob: '02/07/1978',
        gender: 'Mees',
        email: 'mart@email.com',
        phone: '+372 5200 0000',
        branch: 'Tartu',
        reason: 'Stress, töö-elu tasakaal',
        source: 'Google',
        createdAt: '2026-02-15',
        notes: '',
      },
    ],
    sessions: [
      {
        id: 1,
        clientId: 1,
        date: '2026-05-23',
        therapist: 'Mari Mägi',
        branch: 'Tallinn',
        notes: '',
        entries: [
          { frequencyId: '3001', frequencyName: 'Vagus nerve', initial: 8, minutes: [52, 71, 87], final: 87 },
          { frequencyId: '1234', frequencyName: 'Distrust', initial: 12, minutes: [58, 89], final: 89 },
        ],
      },
      {
        id: 2,
        clientId: 1,
        date: '2026-05-09',
        therapist: 'Mari Mägi',
        branch: 'Tallinn',
        notes: '',
        entries: [
          { frequencyId: '2001', frequencyName: 'Anxiety generalised', initial: 22, minutes: [45, 67, 88], final: 88 },
        ],
      },
    ],
    nextClientId: 3,
    nextSessionId: 3,
  };
}

let _db = null;

function db() {
  if (!_db) _db = loadDB();
  return _db;
}

function persist() {
  saveDB(_db);
}

// --- Clients ---
export function getClients() {
  return db().clients;
}

export function getClient(id) {
  return db().clients.find(c => c.id === Number(id));
}

export function createClient(data) {
  const client = { ...data, id: db().nextClientId++, createdAt: new Date().toISOString().slice(0, 10), notes: '' };
  db().clients.push(client);
  persist();
  return client;
}

export function updateClient(id, data) {
  const idx = db().clients.findIndex(c => c.id === Number(id));
  if (idx === -1) return null;
  db().clients[idx] = { ...db().clients[idx], ...data };
  persist();
  return db().clients[idx];
}

// --- Sessions ---
export function getSessionsByClient(clientId) {
  return db().sessions
    .filter(s => s.clientId === Number(clientId))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getSession(id) {
  return db().sessions.find(s => s.id === Number(id));
}

export function createSession(data) {
  const session = {
    ...data,
    id: db().nextSessionId++,
    date: new Date().toISOString().slice(0, 10),
    entries: [],
  };
  db().sessions.push(session);
  persist();
  return session;
}

export function updateSession(id, data) {
  const idx = db().sessions.findIndex(s => s.id === Number(id));
  if (idx === -1) return null;
  db().sessions[idx] = { ...db().sessions[idx], ...data };
  persist();
  return db().sessions[idx];
}

// --- Frequency history per client ---
export function getFrequencyHistory(clientId) {
  const sessions = getSessionsByClient(clientId);
  const map = {};
  for (const session of sessions) {
    for (const entry of session.entries) {
      if (!map[entry.frequencyId]) {
        map[entry.frequencyId] = {
          frequencyId: entry.frequencyId,
          frequencyName: entry.frequencyName,
          history: [],
        };
      }
      map[entry.frequencyId].history.push({
        date: session.date,
        sessionId: session.id,
        initial: entry.initial,
        minutes: entry.minutes,
        final: entry.final,
      });
    }
  }
  return Object.values(map);
}
