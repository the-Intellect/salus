import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  // Aktiivne seanss — salvestatud kirjed
  activeSession: null,
  activeClientId: null,
  editingSessionId: null,

  // Pooleli vormid — püsivad lehevahete üle
  entryDrafts: {},

  startSession: (clientId) => {
    set({
      activeClientId: clientId,
      editingSessionId: null,
      entryDrafts: {},
      activeSession: {
        clientId,
        entries: [],
        notes: '',
        duration: 60,
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
      activeSession: {
        clientId,
        entries: session.entries ? [...session.entries] : [],
        notes: session.notes || '',
        duration: session.duration_minutes || 60,
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

  updateSessionNotes: (notes) => {
    set(state => ({
      activeSession: { ...state.activeSession, notes },
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
  }),

  // Kas on pooleli andmeid (salvestamata draft'id)
  hasDrafts: () => Object.keys(get().entryDrafts).length > 0,
}));
