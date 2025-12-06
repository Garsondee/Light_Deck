import { create } from 'zustand';
import type { ChatMessage } from '../types';

interface ChatState {
  messages: ChatMessage[];
  filter: 'all' | 'system' | 'player' | 'rolls' | 'gm';
  
  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  addSystemMessage: (text: string) => void;
  addGMNote: (text: string) => void;
  setFilter: (filter: ChatState['filter']) => void;
  clearMessages: () => void;
  
  // Filtered messages
  getFilteredMessages: () => ChatMessage[];
}

let messageId = 0;

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  filter: 'all',

  addMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${++messageId}`,
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage].slice(-500) // Keep last 500
    }));
  },

  addSystemMessage: (text) => {
    get().addMessage({ type: 'system', text });
  },

  addGMNote: (text) => {
    get().addMessage({ type: 'gm', sender: 'GM', text });
  },

  setFilter: (filter) => set({ filter }),

  clearMessages: () => set({ messages: [] }),

  getFilteredMessages: () => {
    const { messages, filter } = get();
    if (filter === 'all') return messages;
    return messages.filter(m => m.type === filter);
  },
}));
