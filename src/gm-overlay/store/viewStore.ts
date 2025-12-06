import { create } from 'zustand';
import type { ViewType, ModalType, Breadcrumb, NPC, Item } from '../types';

interface ViewState {
  // Visibility
  isVisible: boolean;
  setVisible: (visible: boolean) => void;
  toggle: () => void;

  // Current view
  currentView: ViewType;
  viewStack: { view: ViewType; data?: unknown }[];
  
  // Selected entities
  selectedNPC: NPC | null;
  selectedItem: Item | null;
  
  // Breadcrumbs
  breadcrumbs: Breadcrumb[];
  
  // Active section in narrative view
  activeSection: string;
  setActiveSection: (section: string) => void;
  
  // Modal state
  activeModal: ModalType;
  modalData: unknown;
  openModal: (modal: ModalType, data?: unknown) => void;
  closeModal: () => void;

  // Navigation actions
  pushView: (view: ViewType, data?: unknown, label?: string) => void;
  popView: () => void;
  resetToNarrative: () => void;
  navigateToBreadcrumb: (index: number) => void;
  
  // NPC/Item selection
  selectNPC: (npc: NPC) => void;
  selectItem: (item: Item) => void;
}

export const useViewStore = create<ViewState>((set, get) => ({
  // Visibility
  isVisible: true,
  setVisible: (visible) => set({ isVisible: visible }),
  toggle: () => set((state) => ({ isVisible: !state.isVisible })),

  // Current view
  currentView: 'narrative',
  viewStack: [],
  
  // Selected entities
  selectedNPC: null,
  selectedItem: null,
  
  // Breadcrumbs
  breadcrumbs: [],
  
  // Active section
  activeSection: 'narrative',
  setActiveSection: (section) => set({ activeSection: section }),
  
  // Modal state
  activeModal: null,
  modalData: null,
  openModal: (modal, data) => set({ activeModal: modal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Navigation actions
  pushView: (view, data, label) => {
    const { currentView, viewStack, breadcrumbs } = get();
    
    // Determine label for breadcrumb
    let crumbLabel = label || view;
    if (view === 'npc' && data && typeof data === 'object' && 'name' in data) {
      crumbLabel = (data as NPC).name;
    } else if (view === 'item' && data && typeof data === 'object' && 'name' in data) {
      crumbLabel = (data as Item).name;
    }
    
    set({
      viewStack: [...viewStack, { view: currentView, data }],
      currentView: view,
      selectedNPC: view === 'npc' ? (data as NPC) : null,
      selectedItem: view === 'item' ? (data as Item) : null,
      breadcrumbs: [...breadcrumbs, { label: crumbLabel, view, data }],
    });
  },

  popView: () => {
    const { viewStack, breadcrumbs } = get();
    if (viewStack.length === 0) return;

    const prev = viewStack[viewStack.length - 1];
    set({
      viewStack: viewStack.slice(0, -1),
      currentView: prev.view,
      selectedNPC: prev.view === 'npc' ? (prev.data as NPC) : null,
      selectedItem: prev.view === 'item' ? (prev.data as Item) : null,
      breadcrumbs: breadcrumbs.slice(0, -1),
    });
  },

  resetToNarrative: () => {
    set({
      currentView: 'narrative',
      viewStack: [],
      selectedNPC: null,
      selectedItem: null,
      breadcrumbs: [],
      activeSection: 'narrative',
    });
  },

  navigateToBreadcrumb: (index: number) => {
    const { breadcrumbs } = get();
    if (index < 0 || index >= breadcrumbs.length) return;
    
    const target = breadcrumbs[index];
    set({
      currentView: target.view,
      viewStack: [],
      selectedNPC: target.view === 'npc' ? (target.data as NPC) : null,
      selectedItem: target.view === 'item' ? (target.data as Item) : null,
      breadcrumbs: breadcrumbs.slice(0, index + 1),
    });
  },

  selectNPC: (npc) => {
    get().pushView('npc', npc, npc.name);
  },

  selectItem: (item) => {
    get().pushView('item', item, item.name);
  },
}));
