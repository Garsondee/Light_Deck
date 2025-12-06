import { useEffect } from 'react';
import { GMOverlayShell } from './components/layout/GMOverlayShell';
import { Header } from './components/layout/Header';
import { Breadcrumbs } from './components/layout/Breadcrumbs';
import { IndexBar } from './components/layout/IndexBar';
import { MainPanel } from './components/layout/MainPanel';
import { Sidebar } from './components/layout/Sidebar';
import { NavBar } from './components/layout/NavBar';
import { useSceneStore } from './store/sceneStore';
import { useViewStore } from './store/viewStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSyncManager } from './hooks/useSyncManager';
import type { Breadcrumb } from './types';

// Modals
import { SceneJumperModal } from './components/modals/SceneJumperModal';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { AdHocCheckModal } from './components/modals/AdHocCheckModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { ExportAllModal } from './components/modals/ExportAllModal';

export function App() {
  const { 
    currentScene, 
    loadScenes, 
    currentIndex, 
    scenes,
    activeScene,
    isViewingActiveScene 
  } = useSceneStore();
  const { isVisible, setVisible, breadcrumbs, resetToNarrative, openModal } = useViewStore();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Bridge to existing SyncManager
  useSyncManager();

  // Load initial scene data
  useEffect(() => {
    // Try to load from URL params or default adventure
    const params = new URLSearchParams(window.location.search);
    const adventureId = params.get('adventure') || 'AChangeOfHeart';
    loadScenes(adventureId);
  }, [loadScenes]);

  const handleClose = () => {
    setVisible(false);
    // Notify main app that overlay is closing
    window.dispatchEvent(new CustomEvent('gm-overlay:close'));
  };

  const handleSettings = () => {
    useViewStore.getState().openModal('settings');
  };

  const handleExportAll = () => {
    openModal('exportAll');
  };

  const handleBreadcrumbClick = (index: number) => {
    const crumb = breadcrumbs[index];
    if (crumb) {
      useViewStore.getState().navigateToBreadcrumb(index);
    }
  };

  const handleHub = () => {
    resetToNarrative();
    // Could navigate to a hub scene if defined
  };

  const sceneLabel = currentScene
    ? `Act ${currentScene.act} / Ch ${currentScene.chapter} / Scene ${currentScene.scene}: ${currentScene.title}`
    : 'Loading...';

  const activeSceneLabel = activeScene
    ? `Act ${activeScene.act} / Ch ${activeScene.chapter} / Scene ${activeScene.scene}: ${activeScene.title}`
    : undefined;

  const position = scenes.length > 0 ? `${currentIndex + 1} / ${scenes.length}` : '';

  return (
    <GMOverlayShell isVisible={isVisible}>
      <Header
        sceneLabel={sceneLabel}
        position={position}
        activeSceneLabel={activeSceneLabel}
        isViewingActive={isViewingActiveScene()}
        onSettings={handleSettings}
        onExportAll={handleExportAll}
        onClose={handleClose}
      />

      <Breadcrumbs
        trail={breadcrumbs.map((crumb: Breadcrumb, i: number) => ({
          label: crumb.label,
          onClick: () => handleBreadcrumbClick(i),
        }))}
        hubLabel="Hub"
        onHub={handleHub}
      />

      <IndexBar />

      <div className="flex-1 flex overflow-hidden">
        <MainPanel />
        <Sidebar />
      </div>

      <NavBar />

      {/* Modals */}
      <SceneJumperModal />
      <GlobalSearchModal />
      <AdHocCheckModal />
      <SettingsModal />
      <ExportAllModal />
    </GMOverlayShell>
  );
}
