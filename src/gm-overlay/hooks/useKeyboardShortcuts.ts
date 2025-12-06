import { useEffect } from 'react';
import { useViewStore } from '../store/viewStore';
import { useSceneStore } from '../store/sceneStore';

export function useKeyboardShortcuts() {
  const { toggle, openModal, closeModal, popView, activeModal, viewStack } = useViewStore();
  const { nextScene, prevScene, hasNext, hasPrev, activateCurrentScene, isViewingActiveScene } = useSceneStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        // Allow Escape to blur inputs
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      // Cmd/Ctrl + J: Scene Jumper
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        openModal('sceneJumper');
        return;
      }

      // Cmd/Ctrl + K: Global Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openModal('globalSearch');
        return;
      }

      // G: Toggle GM Overlay
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        toggle();
        return;
      }

      // Escape: Close modal or go back
      if (e.key === 'Escape') {
        if (activeModal) {
          closeModal();
        } else if (viewStack.length > 0) {
          popView();
        }
        return;
      }

      // Arrow keys: Scene navigation (browsing only, no activation)
      if (e.key === 'ArrowLeft' && hasPrev()) {
        prevScene();
        return;
      }
      if (e.key === 'ArrowRight' && hasNext()) {
        nextScene();
        return;
      }

      // Shift+Enter: Activate current scene for players
      if (e.key === 'Enter' && e.shiftKey && !isViewingActiveScene()) {
        e.preventDefault();
        activateCurrentScene();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    toggle,
    openModal,
    closeModal,
    popView,
    activeModal,
    viewStack,
    nextScene,
    prevScene,
    hasNext,
    hasPrev,
    activateCurrentScene,
    isViewingActiveScene,
  ]);
}
