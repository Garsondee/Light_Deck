import { create } from 'zustand';
import type { PlayerCharacter, ConnectedPlayer } from '../types';

interface PlayerState {
  // Connected players (from Socket.io presence)
  connectedPlayers: ConnectedPlayer[];
  setConnectedPlayers: (players: ConnectedPlayer[]) => void;
  addConnectedPlayer: (player: ConnectedPlayer) => void;
  removeConnectedPlayer: (socketId: string) => void;
  
  // All saved characters (from server)
  characters: PlayerCharacter[];
  isLoading: boolean;
  error: string | null;
  
  // Character management panel state
  isPanelOpen: boolean;
  isPanelMinimized: boolean;
  panelPosition: { x: number; y: number };
  selectedCharacterId: string | null;
  
  // Actions
  openPanel: () => void;
  closePanel: () => void;
  toggleMinimize: () => void;
  setPanelPosition: (x: number, y: number) => void;
  selectCharacter: (id: string | null) => void;
  
  // Character CRUD
  loadCharacters: () => Promise<void>;
  saveCharacter: (character: PlayerCharacter) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  createNewCharacter: () => PlayerCharacter;
}

// Generate a unique character ID
function generateCharacterId(): string {
  return 'char_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// Create a blank character template
function createBlankCharacter(): PlayerCharacter {
  return {
    id: generateCharacterId(),
    name: '',
    handle: '',
    background: 'street',
    portrait: null,
    pronouns: '',
    
    attributes: {
      reflex: 0,
      body: 0,
      tech: 0,
      neural: 0,
      edge: 0,
      presence: 0,
    },
    
    skills: {
      firearms: 0,
      heavy_weapons: 0,
      melee: 0,
      evasion: 0,
      netrunning: 0,
      hardware: 0,
      rigging: 0,
      medicine: 0,
      persuasion: 0,
      intimidation: 0,
      deception: 0,
      streetwise: 0,
      perception: 0,
      investigation: 0,
      stealth: 0,
      survival: 0,
    },
    
    derived: {
      stress: 0,
      stressMax: 5,
      wounds: [
        { slot: 1, name: null, penalty: -1 },
        { slot: 2, name: null, penalty: -2 },
        { slot: 3, name: null, penalty: 'out' },
      ],
      armor: 0,
    },
    
    cyberware: [],
    gear: [],
    weapons: [],
    contacts: [],
    notes: '',
    credits: 0,
    experience: 0,
    
    meta: {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    },
  };
}

export const usePlayerStore = create<PlayerState>((set) => ({
  // Connected players
  connectedPlayers: [],
  setConnectedPlayers: (players) => set({ connectedPlayers: players }),
  addConnectedPlayer: (player) => set((state) => ({
    connectedPlayers: [...state.connectedPlayers.filter(p => p.socketId !== player.socketId), player],
  })),
  removeConnectedPlayer: (socketId) => set((state) => ({
    connectedPlayers: state.connectedPlayers.filter(p => p.socketId !== socketId),
  })),
  
  // Characters
  characters: [],
  isLoading: false,
  error: null,
  
  // Panel state
  isPanelOpen: false,
  isPanelMinimized: false,
  panelPosition: { x: 100, y: 100 },
  selectedCharacterId: null,
  
  // Panel actions
  openPanel: () => set({ isPanelOpen: true, isPanelMinimized: false }),
  closePanel: () => set({ isPanelOpen: false, selectedCharacterId: null }),
  toggleMinimize: () => set((state) => ({ isPanelMinimized: !state.isPanelMinimized })),
  setPanelPosition: (x, y) => set({ panelPosition: { x, y } }),
  selectCharacter: (id) => set({ selectedCharacterId: id }),
  
  // Load all characters from server
  loadCharacters: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/characters');
      if (!res.ok) throw new Error('Failed to load characters');
      
      // Get full character data for each
      const summaries = await res.json();
      const characters: PlayerCharacter[] = await Promise.all(
        summaries.map(async (s: { id: string }) => {
          const charRes = await fetch(`/api/characters/${s.id}`);
          return charRes.json();
        })
      );
      
      set({ characters, isLoading: false });
    } catch (err) {
      console.error('[PlayerStore] Failed to load characters:', err);
      set({ error: (err as Error).message, isLoading: false });
    }
  },
  
  // Save character (create or update)
  saveCharacter: async (character) => {
    try {
      character.meta = character.meta || {};
      character.meta.lastModified = new Date().toISOString();
      
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(character),
      });
      
      if (!res.ok) throw new Error('Failed to save character');
      
      // Update local state
      set((state) => {
        const existing = state.characters.findIndex(c => c.id === character.id);
        if (existing >= 0) {
          const updated = [...state.characters];
          updated[existing] = character;
          return { characters: updated };
        } else {
          return { characters: [...state.characters, character] };
        }
      });
    } catch (err) {
      console.error('[PlayerStore] Failed to save character:', err);
      throw err;
    }
  },
  
  // Delete character
  deleteCharacter: async (id) => {
    try {
      const res = await fetch(`/api/characters/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete character');
      
      set((state) => ({
        characters: state.characters.filter(c => c.id !== id),
        selectedCharacterId: state.selectedCharacterId === id ? null : state.selectedCharacterId,
      }));
    } catch (err) {
      console.error('[PlayerStore] Failed to delete character:', err);
      throw err;
    }
  },
  
  // Create new character
  createNewCharacter: () => {
    const newChar = createBlankCharacter();
    set((state) => ({
      characters: [...state.characters, newChar],
      selectedCharacterId: newChar.id,
    }));
    return newChar;
  },
}));
