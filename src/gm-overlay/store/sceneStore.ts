import { create } from 'zustand';
import type { Scene } from '../types';

interface SceneState {
  scenes: Scene[];
  currentIndex: number;
  currentScene: Scene | null;
  loading: boolean;
  error: string | null;

  // Active scene state (what players see)
  activeSceneId: string | null;
  activeSceneIndex: number;
  activeScene: Scene | null;

  // Actions
  loadScenes: (adventureId: string) => Promise<void>;
  goToScene: (index: number) => void;
  goToSceneById: (sceneId: string) => void;
  nextScene: () => void;
  prevScene: () => void;
  hasNext: () => boolean;
  hasPrev: () => boolean;
  
  // Scene activation (pushes to players)
  activateScene: (sceneId: string) => void;
  activateCurrentScene: () => void;
  isActiveScene: (sceneId?: string) => boolean;
  isViewingActiveScene: () => boolean;
  
  // Scene image management
  updateSceneImage: (sceneId: string, image: string | null, imageUrl: string | null) => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scenes: [],
  currentIndex: 0,
  currentScene: null,
  loading: false,
  error: null,
  
  // Active scene defaults to first scene
  activeSceneId: null,
  activeSceneIndex: 0,
  activeScene: null,

  loadScenes: async (adventureId: string) => {
    set({ loading: true, error: null });
    try {
      // Fetch scenes from API
      const response = await fetch(`/api/adventures/${adventureId}/scenes`);
      if (!response.ok) {
        throw new Error(`Failed to load scenes: ${response.statusText}`);
      }
      const scenes = await response.json();
      const firstScene = scenes[0] || null;
      set({
        scenes,
        currentIndex: 0,
        currentScene: firstScene,
        loading: false,
        // Set first scene as active by default
        activeSceneId: firstScene?.id || null,
        activeSceneIndex: 0,
        activeScene: firstScene,
      });
    } catch (error) {
      console.error('[SceneStore] Failed to load scenes:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load scenes',
        loading: false,
      });
      
      // Try to load from local scene backgrounds as fallback
      try {
        const fallbackResponse = await fetch('/api/scenes');
        if (fallbackResponse.ok) {
          const scenes = await fallbackResponse.json();
          const firstScene = scenes[0] || null;
          set({
            scenes,
            currentIndex: 0,
            currentScene: firstScene,
            loading: false,
            error: null,
            // Also set active scene on fallback
            activeSceneId: firstScene?.id || null,
            activeSceneIndex: 0,
            activeScene: firstScene,
          });
        }
      } catch {
        // Keep original error
      }
    }
  },

  goToScene: (index: number) => {
    const { scenes } = get();
    if (index >= 0 && index < scenes.length) {
      set({ currentIndex: index, currentScene: scenes[index] });
      
      // Notify main app of scene change
      window.dispatchEvent(new CustomEvent('gm-overlay:scene-change', {
        detail: { scene: scenes[index], index }
      }));
    }
  },

  goToSceneById: (sceneId: string) => {
    const { scenes, goToScene } = get();
    const index = scenes.findIndex(s => s.id === sceneId);
    if (index !== -1) {
      goToScene(index);
    }
  },

  nextScene: () => {
    const { currentIndex, scenes, goToScene } = get();
    if (currentIndex < scenes.length - 1) {
      goToScene(currentIndex + 1);
    }
  },

  prevScene: () => {
    const { currentIndex, goToScene } = get();
    if (currentIndex > 0) {
      goToScene(currentIndex - 1);
    }
  },

  hasNext: () => {
    const { currentIndex, scenes } = get();
    return currentIndex < scenes.length - 1;
  },

  hasPrev: () => {
    const { currentIndex } = get();
    return currentIndex > 0;
  },

  // Scene activation - pushes scene to players
  activateScene: (sceneId: string) => {
    const { scenes } = get();
    const index = scenes.findIndex(s => s.id === sceneId);
    if (index === -1) return;
    
    const scene = scenes[index];
    set({
      activeSceneId: sceneId,
      activeSceneIndex: index,
      activeScene: scene,
    });
    
    // Broadcast to players via SyncManager
    window.dispatchEvent(new CustomEvent('gm-overlay:activate-scene', {
      detail: { sceneId, scene, index }
    }));
    
    console.log('[SceneStore] Scene activated:', scene.title);
  },

  activateCurrentScene: () => {
    const { currentScene } = get();
    if (currentScene) {
      get().activateScene(currentScene.id);
    }
  },

  isActiveScene: (sceneId?: string) => {
    const { activeSceneId, currentScene } = get();
    const id = sceneId ?? currentScene?.id;
    return id === activeSceneId;
  },

  isViewingActiveScene: () => {
    const { currentScene, activeSceneId } = get();
    return currentScene?.id === activeSceneId;
  },

  // Update a scene's image in the local store (after server upload/delete)
  updateSceneImage: (sceneId: string, image: string | null, imageUrl: string | null) => {
    const { scenes, currentScene, activeScene } = get();
    
    // Update in scenes array
    const updatedScenes = scenes.map(s => 
      s.id === sceneId 
        ? { ...s, image: image ?? undefined, imageUrl: imageUrl ?? undefined }
        : s
    );
    
    // Update currentScene if it matches
    const updatedCurrentScene = currentScene?.id === sceneId
      ? { ...currentScene, image: image ?? undefined, imageUrl: imageUrl ?? undefined }
      : currentScene;
    
    // Update activeScene if it matches
    const updatedActiveScene = activeScene?.id === sceneId
      ? { ...activeScene, image: image ?? undefined, imageUrl: imageUrl ?? undefined }
      : activeScene;
    
    set({
      scenes: updatedScenes,
      currentScene: updatedCurrentScene,
      activeScene: updatedActiveScene,
    });
    
    console.log(`[SceneStore] Updated image for scene ${sceneId}:`, image);
  },
}));
