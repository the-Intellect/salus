import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  activeSession: null,
  activeClientId: null,
  editingSessionId: null, // kui muudame olemasolevat seanssi

  startSession: (clientId) => {
    set({
      activeClientId: clientId,
      editingSessionId: null,
      activeSession: {
        clientId,
        entries: [],
        notes: '',
        therapist: 'Mari Mägi',
        branch: 'Tallinn',
      },
    });
  },

  // Laeb olemasoleva seansi muutmiseks
  loadSessionForEdit: (session, clientId) => {
    set({
      activeClientId: clientId,
      editingSessionId: session.id,
      activeSession: {
        clientId,
        entries: session.entries ? [...session.entries] : [],
        notes: session.notes || '',
        therapist: session.therapist || 'Mari Mägi',
        branch: session.branch || 'Tallinn',
      },
    });
  },

  addEntry: (entry) => {
    set(state => ({
      activeSession: {
        ...state.activeSession,
        entries: [entry, ...state.activeSession.entries],
      },
    }));
  },

  // Kustutab kirje aktiivsest seansist frequencyId järgi
  removeEntry: (frequencyId) => {
    set(state => ({
      activeSession: {
        ...state.activeSession,
        entries: state.activeSession.entries.filter(e => e.frequencyId !== frequencyId),
      },
    }));
  },

  // Uuendab olemasoleva kirje aktiivsest seansist
  updateEntry: (frequencyId, updatedEntry) => {
    set(state => ({
      activeSession: {
        ...state.activeSession,
        entries: state.activeSession.entries.map(e =>
          e.frequencyId === frequencyId ? { ...e, ...updatedEntry } : e
        ),
      },
    }));
  },

  updateSessionNotes: (notes) => {
    set(state => ({
      activeSession: { ...state.activeSession, notes },
    }));
  },

  clearSession: () => set({ activeSession: null, activeClientId: null, editingSessionId: null }),
}));
