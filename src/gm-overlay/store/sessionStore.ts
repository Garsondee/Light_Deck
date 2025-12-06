import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  // Session notes (editable by GM)
  notes: string[];
  addNote: (note: string) => void;
  removeNote: (index: number) => void;
  updateNote: (index: number, note: string) => void;
  
  // Campaign flags
  flags: Record<string, boolean | string>;
  setFlag: (key: string, value: boolean | string) => void;
  toggleFlag: (key: string) => void;
  
  // Campaign clock
  campaignClock: {
    day: number;
    time: string;
  };
  advanceTime: (minutes: number) => void;
  setTime: (day: number, time: string) => void;
  
  // Recently visited scenes
  recentScenes: string[];
  addRecentScene: (sceneId: string) => void;
  
  // Favorites / hub locations
  favorites: string[];
  addFavorite: (sceneId: string) => void;
  removeFavorite: (sceneId: string) => void;
  
  // Undo history
  undoStack: UndoAction[];
  pushUndo: (action: UndoAction) => void;
  popUndo: () => UndoAction | undefined;
  
  // Persistence
  save: () => void;
  load: () => void;
  clear: () => void;
}

interface UndoAction {
  type: 'trigger' | 'check' | 'npc_state' | 'flag';
  label: string;
  timestamp: number;
  revert: () => void;
}

const STORAGE_KEY = 'gm-overlay-session';

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Session notes
      notes: [],
      addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),
      removeNote: (index) => set((state) => ({
        notes: state.notes.filter((_, i) => i !== index)
      })),
      updateNote: (index, note) => set((state) => ({
        notes: state.notes.map((n, i) => i === index ? note : n)
      })),

      // Campaign flags
      flags: {},
      setFlag: (key, value) => set((state) => ({
        flags: { ...state.flags, [key]: value }
      })),
      toggleFlag: (key) => set((state) => ({
        flags: { ...state.flags, [key]: !state.flags[key] }
      })),

      // Campaign clock
      campaignClock: { day: 1, time: '00:00' },
      advanceTime: (minutes) => set((state) => {
        const [hours, mins] = state.campaignClock.time.split(':').map(Number);
        let totalMins = hours * 60 + mins + minutes;
        let day = state.campaignClock.day;
        
        while (totalMins >= 24 * 60) {
          totalMins -= 24 * 60;
          day++;
        }
        while (totalMins < 0) {
          totalMins += 24 * 60;
          day = Math.max(1, day - 1);
        }
        
        const newHours = Math.floor(totalMins / 60);
        const newMins = totalMins % 60;
        const time = `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
        
        return { campaignClock: { day, time } };
      }),
      setTime: (day, time) => set({ campaignClock: { day, time } }),

      // Recently visited scenes
      recentScenes: [],
      addRecentScene: (sceneId) => set((state) => {
        const filtered = state.recentScenes.filter(id => id !== sceneId);
        return { recentScenes: [sceneId, ...filtered].slice(0, 10) };
      }),

      // Favorites
      favorites: [],
      addFavorite: (sceneId) => set((state) => ({
        favorites: state.favorites.includes(sceneId)
          ? state.favorites
          : [...state.favorites, sceneId]
      })),
      removeFavorite: (sceneId) => set((state) => ({
        favorites: state.favorites.filter(id => id !== sceneId)
      })),

      // Undo history
      undoStack: [],
      pushUndo: (action) => set((state) => ({
        undoStack: [...state.undoStack, action].slice(-20) // Keep last 20
      })),
      popUndo: () => {
        const { undoStack } = get();
        if (undoStack.length === 0) return undefined;
        
        const action = undoStack[undoStack.length - 1];
        set({ undoStack: undoStack.slice(0, -1) });
        return action;
      },

      // Persistence helpers
      save: () => {
        const state = get();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          notes: state.notes,
          flags: state.flags,
          campaignClock: state.campaignClock,
          recentScenes: state.recentScenes,
          favorites: state.favorites,
        }));
      },
      load: () => {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const data = JSON.parse(stored);
            set({
              notes: data.notes || [],
              flags: data.flags || {},
              campaignClock: data.campaignClock || { day: 1, time: '00:00' },
              recentScenes: data.recentScenes || [],
              favorites: data.favorites || [],
            });
          }
        } catch (error) {
          console.error('[SessionStore] Failed to load:', error);
        }
      },
      clear: () => {
        localStorage.removeItem(STORAGE_KEY);
        set({
          notes: [],
          flags: {},
          campaignClock: { day: 1, time: '00:00' },
          recentScenes: [],
          favorites: [],
          undoStack: [],
        });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        notes: state.notes,
        flags: state.flags,
        campaignClock: state.campaignClock,
        recentScenes: state.recentScenes,
        favorites: state.favorites,
      }),
    }
  )
);
