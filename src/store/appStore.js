import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set, get) => ({
  // Aktiivne seanss — salvestatud kirjed
  activeSession: null,
  activeClientId: null,
  editingSessionId: null,

  // Pooleli vormid — püsivad lehevahete üle
  entryDrafts: {},

  // Järjekorda märgitud sagedused (ilma numbriteta veel)
  queuedIds: [],

  startSession: (clientId) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const rawMin = now.getMinutes();
    const roundedMin = Math.floor(rawMin / 5) * 5;
    const mm = String(roundedMin).padStart(2, '0');
    set({
      activeClientId: clientId,
      editingSessionId: null,
      entryDrafts: {},
      queuedIds: [],
      activeSession: {
        clientId,
        entries: [],
        notes: '',
        duration: 60,
        startTime: `${hh}:${mm}`,
        therapist: 'Mari Mägi',
        branch: 'Tallinn',
      },
    });
  },

  loadSessionForEdit: (session, clientId) => {
    set({
      activeClientId: clientId,
      editingSessionId: session.id,
      entryDrafts: {},
      queuedIds: [],
      activeSession: {
        clientId,
        entries: session.entries ? [...session.entries] : [],
        notes: session.notes || '',
        duration: session.duration_minutes || 60,
        startTime: session.start_time || '',
        clientRecommendation: session.client_recommendation || '',
        therapist: session.therapist || 'Mari Mägi',
        branch: session.branch || 'Tallinn',
      },
    });
  },

  // Salvestatud kirjed
  addEntry: (entry) => {
    set(state => ({
      activeSession: {
        ...state.activeSession,
        entries: [...state.activeSession.entries, entry],
      },
      // Tühjenda draft pärast salvestamist
      entryDrafts: Object.fromEntries(
        Object.entries(state.entryDrafts).filter(([k]) => k !== entry.frequencyId)
      ),
    }));
  },

  removeEntry: (frequencyId) => {
    set(state => ({
      activeSession: {
        ...state.activeSession,
        entries: state.activeSession.entries.filter(e => e.frequencyId !== frequencyId),
      },
      // Kustuta ka draft
      entryDrafts: Object.fromEntries(
        Object.entries(state.entryDrafts).filter(([k]) => k !== frequencyId)
      ),
    }));
  },

  updateEntry: (frequencyId, updatedEntry) => {
    set(state => ({
      activeSession: {
        ...state.activeSession,
        entries: state.activeSession.entries.map(e =>
          e.frequencyId === frequencyId ? { ...e, ...updatedEntry } : e
        ),
      },
      entryDrafts: Object.fromEntries(
        Object.entries(state.entryDrafts).filter(([k]) => k !== frequencyId)
      ),
    }));
  },

  // Pooleli vormi andmed — salvestatakse store'i
  setEntryDraft: (frequencyId, draft) => {
    set(state => ({
      entryDrafts: { ...state.entryDrafts, [frequencyId]: draft },
    }));
  },

  clearEntryDraft: (frequencyId) => {
    set(state => ({
      entryDrafts: Object.fromEntries(
        Object.entries(state.entryDrafts).filter(([k]) => k !== frequencyId)
      ),
    }));
  },

  // Lisa sagedus järjekorda
  addToQueue: (frequencyId) => {
    set(state => ({
      queuedIds: state.queuedIds.includes(frequencyId)
        ? state.queuedIds
        : [...state.queuedIds, frequencyId],
    }));
  },

  // Eemalda järjekorrast
  removeFromQueue: (frequencyId) => {
    set(state => ({
      queuedIds: state.queuedIds.filter(id => id !== frequencyId),
    }));
  },

  updateSessionNotes: (notes) => {
    set(state => ({
      activeSession: { ...state.activeSession, notes },
    }));
  },

  setStartTime: (startTime) => {
    set(state => ({
      activeSession: { ...state.activeSession, startTime },
    }));
  },

  setDuration: (duration) => {
    set(state => ({
      activeSession: { ...state.activeSession, duration },
    }));
  },

  clearSession: () => set({
    activeSession: null,
    activeClientId: null,
    editingSessionId: null,
    entryDrafts: {},
    queuedIds: [],
  }),

  // Kas on pooleli andmeid (salvestamata draft'id)
  hasDrafts: () => Object.keys(get().entryDrafts).length > 0,
    }),
    {
      name: 'salus-active-session', // localStorage võti
      partialize: (state) => ({
        activeSession: state.activeSession,
        activeClientId: state.activeClientId,
        editingSessionId: state.editingSessionId,
        entryDrafts: state.entryDrafts,
        queuedIds: state.queuedIds,
      }),
    }
  )
);
