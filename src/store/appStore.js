import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  // Current session being built
  activeSession: null,
  activeClientId: null,

  startSession: (clientId) => {
    set({
      activeClientId: clientId,
      activeSession: {
        clientId,
        entries: [],
        notes: '',
        therapist: 'Mari Mägi', // TODO: from login
        branch: 'Tallinn',
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

  updateSessionNotes: (notes) => {
    set(state => ({
      activeSession: { ...state.activeSession, notes },
    }));
  },

  clearSession: () => set({ activeSession: null, activeClientId: null }),

  // UI state
  sidebarOpen: true,
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
}));
