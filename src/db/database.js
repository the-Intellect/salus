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
    clients: [],
    sessions: [],
    nextClientId: 1,
    nextSessionId: 1,
  };
}

let _db = null;
function db() {
  if (!_db) _db = loadDB();
  return _db;
}
function persist() { saveDB(_db); }

// --- Kliendid ---
export function getClients() { return db().clients; }
export function getClient(id) { return db().clients.find(c => c.id === Number(id)); }

export function createClient(data) {
  const client = {
    ...data,
    id: db().nextClientId++,
    createdAt: new Date().toISOString().slice(0, 10),
    notes: '',
    notesHistory: [],
  };
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

export function addNote(clientId, text) {
  const idx = db().clients.findIndex(c => c.id === Number(clientId));
  if (idx === -1) return null;
  const entry = { text, savedAt: new Date().toISOString() };
  if (!db().clients[idx].notesHistory) db().clients[idx].notesHistory = [];
  db().clients[idx].notesHistory.unshift(entry);
  db().clients[idx].notes = text;
  persist();
  return db().clients[idx];
}

// --- Seansid ---
export function getSessionsByClient(clientId) {
  return db().sessions
    .filter(s => s.clientId === Number(clientId))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getSession(id) { return db().sessions.find(s => s.id === Number(id)); }

export function createSession(data) {
  const session = {
    ...data,
    id: db().nextSessionId++,
    date: new Date().toISOString().slice(0, 10),
    entries: data.entries || [],
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

// --- Sageduste ajalugu kliendi kaupa ---
// Koondab KÕIK sama ID-ga sagedused ühe kirje alla, ajalugu kuupäeva järgi
export function getFrequencyHistory(clientId) {
  const sessions = getSessionsByClient(clientId);

  // Kasuta Map-i et tagada iga frequencyId esineb täpselt üks kord
  const map = new Map();

  for (const session of sessions) {
    for (const entry of (session.entries || [])) {
      const key = entry.frequencyId;

      if (!map.has(key)) {
        map.set(key, {
          frequencyId: entry.frequencyId,
          frequencyName: entry.frequencyName,
          frequencyDescription: entry.frequencyDescription || '',
          history: [],
        });
      }

      map.get(key).history.push({
        date: session.date,
        sessionId: session.id,
        initial: entry.initial,
        minutes: entry.minutes,
        final: entry.final,
      });
    }
  }

  // Sorteeri iga sageduse ajalugu — uusim ees
  const result = Array.from(map.values());
  for (const item of result) {
    item.history.sort((a, b) => b.date.localeCompare(a.date));
  }

  // Sorteeri sagedused viimase kasutuse järgi — hiljutisemad ees
  result.sort((a, b) => b.history[0].date.localeCompare(a.history[0].date));

  return result;
}

export function deleteSession(id) {
  _db.sessions = _db.sessions.filter(s => s.id !== Number(id));
  persist();
}
