import { useState, useMemo } from 'react';
import { X, Search, Star, Clock, Play, Eye } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '../../utils/cn';
import { useViewStore } from '../../store/viewStore';
import { useSceneStore } from '../../store/sceneStore';
import { useSessionStore } from '../../store/sessionStore';

export function SceneJumperModal() {
  const { activeModal, closeModal } = useViewStore();
  const { scenes, goToSceneById, activateScene, currentScene, activeSceneId } = useSceneStore();
  const { favorites, recentScenes, addFavorite, removeFavorite } = useSessionStore();
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites' | 'recent'>('all');

  const isOpen = activeModal === 'sceneJumper';

  // Filter and search scenes
  const filteredScenes = useMemo(() => {
    let result = scenes;

    // Apply filter
    if (filter === 'favorites') {
      result = result.filter((s) => favorites.includes(s.id));
    } else if (filter === 'recent') {
      result = recentScenes
        .map((id) => scenes.find((s) => s.id === id))
        .filter(Boolean) as typeof scenes;
    }

    // Apply search
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.location.toLowerCase().includes(query)
      );
    }

    return result;
  }, [scenes, filter, search, favorites, recentScenes]);

  // Group by act/chapter
  const groupedScenes = useMemo(() => {
    const groups: Record<string, typeof scenes> = {};
    filteredScenes.forEach((scene) => {
      const key = `Act ${scene.act} / Chapter ${scene.chapter}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(scene);
    });
    return groups;
  }, [filteredScenes]);

  const handleView = (sceneId: string) => {
    goToSceneById(sceneId);
    closeModal();
    setSearch('');
  };

  const handleActivate = (sceneId: string) => {
    activateScene(sceneId);
    goToSceneById(sceneId);
    closeModal();
    setSearch('');
  };

  const toggleFavorite = (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (favorites.includes(sceneId)) {
      removeFavorite(sceneId);
    } else {
      addFavorite(sceneId);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-[600px] max-h-[80vh] bg-neutral-800 rounded-lg shadow-xl z-50',
            'flex flex-col'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-700">
            <Dialog.Title className="text-lg font-semibold">
              Scene Jumper
            </Dialog.Title>
            <Dialog.Close className="p-1 hover:bg-neutral-700 rounded">
              <X size={18} />
            </Dialog.Close>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-neutral-700">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search scenes..."
                className="input w-full pl-9"
                autoFocus
              />
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mt-3">
              <FilterTab
                active={filter === 'all'}
                onClick={() => setFilter('all')}
                label="All"
              />
              <FilterTab
                active={filter === 'favorites'}
                onClick={() => setFilter('favorites')}
                icon={<Star size={12} />}
                label="Favorites"
              />
              <FilterTab
                active={filter === 'recent'}
                onClick={() => setFilter('recent')}
                icon={<Clock size={12} />}
                label="Recent"
              />
            </div>
          </div>

          {/* Scene list */}
          <div className="flex-1 overflow-y-auto p-4">
            {Object.entries(groupedScenes).map(([group, groupScenes]) => (
              <div key={group} className="mb-4">
                <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-2">
                  {group}
                </h4>
                <ul className="space-y-1">
                  {groupScenes.map((scene) => {
                    const isActive = scene.id === activeSceneId;
                    const isViewing = scene.id === currentScene?.id;
                    
                    return (
                      <li key={scene.id}>
                        <div
                          className={cn(
                            'flex items-center justify-between p-2 rounded',
                            'bg-neutral-750 border',
                            isActive && 'border-green-600 bg-green-900/20',
                            isViewing && !isActive && 'border-cyan-600 bg-cyan-900/20',
                            !isActive && !isViewing && 'border-neutral-700 hover:bg-neutral-700'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {isActive && (
                                <Play size={12} className="text-green-400 flex-shrink-0" fill="currentColor" />
                              )}
                              <span className="font-medium truncate">
                                Scene {scene.scene}: {scene.title}
                              </span>
                              {isActive && (
                                <span className="text-xs text-green-400 flex-shrink-0">(ACTIVE)</span>
                              )}
                            </div>
                            <div className="text-sm text-neutral-400 truncate">
                              {scene.location}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <button
                              onClick={(e) => toggleFavorite(scene.id, e)}
                              className={cn(
                                'p-1.5 rounded hover:bg-neutral-600',
                                favorites.includes(scene.id)
                                  ? 'text-amber-400'
                                  : 'text-neutral-500'
                              )}
                              title="Toggle favorite"
                            >
                              <Star size={14} fill={favorites.includes(scene.id) ? 'currentColor' : 'none'} />
                            </button>
                            
                            <button
                              onClick={() => handleView(scene.id)}
                              className="px-2 py-1 text-xs bg-neutral-600 hover:bg-neutral-500 rounded flex items-center gap-1"
                              title="View scene (GM only)"
                            >
                              <Eye size={12} />
                              View
                            </button>
                            
                            <button
                              onClick={() => handleActivate(scene.id)}
                              disabled={isActive}
                              className={cn(
                                'px-2 py-1 text-xs rounded flex items-center gap-1',
                                isActive
                                  ? 'bg-green-800/50 text-green-400 cursor-not-allowed'
                                  : 'bg-amber-600 hover:bg-amber-500 text-white'
                              )}
                              title="Activate scene for players"
                            >
                              <Play size={12} />
                              {isActive ? 'Active' : 'Activate'}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {filteredScenes.length === 0 && (
              <div className="text-center text-neutral-500 py-8">
                No scenes found
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface FilterTabProps {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}

function FilterTab({ active, onClick, icon, label }: FilterTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded text-sm flex items-center gap-1',
        active
          ? 'bg-cyan-600 text-white'
          : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
      )}
    >
      {icon}
      {label}
    </button>
  );
}
