import { useState, useMemo } from 'react';
import { X, Search, Users, MapPin, Package } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '../../utils/cn';
import { useViewStore } from '../../store/viewStore';
import { useSceneStore } from '../../store/sceneStore';

type SearchCategory = 'all' | 'scenes' | 'npcs' | 'items';

interface SearchResult {
  type: 'scene' | 'npc' | 'item';
  id: string;
  title: string;
  subtitle: string;
  data: unknown;
}

export function GlobalSearchModal() {
  const { activeModal, closeModal, selectNPC, selectItem } = useViewStore();
  const { scenes, goToSceneById } = useSceneStore();
  
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');

  const isOpen = activeModal === 'globalSearch';

  // Search across all content
  const results = useMemo((): SearchResult[] => {
    if (!search.trim()) return [];
    
    const query = search.toLowerCase();
    const results: SearchResult[] = [];

    // Search scenes
    if (category === 'all' || category === 'scenes') {
      scenes.forEach((scene) => {
        if (
          scene.title.toLowerCase().includes(query) ||
          scene.location.toLowerCase().includes(query) ||
          scene.narrative.toLowerCase().includes(query)
        ) {
          results.push({
            type: 'scene',
            id: scene.id,
            title: scene.title,
            subtitle: scene.location,
            data: scene,
          });
        }
      });
    }

    // Search NPCs in scenes
    if (category === 'all' || category === 'npcs') {
      scenes.forEach((scene) => {
        scene.npcs?.forEach((npc) => {
          if (
            npc.name.toLowerCase().includes(query) ||
            npc.role.toLowerCase().includes(query)
          ) {
            results.push({
              type: 'npc',
              id: npc.id,
              title: npc.name,
              subtitle: `${npc.role} (${scene.title})`,
              data: npc,
            });
          }
        });
      });
    }

    // Search items in scenes
    if (category === 'all' || category === 'items') {
      scenes.forEach((scene) => {
        scene.items?.forEach((item) => {
          if (item.name.toLowerCase().includes(query)) {
            results.push({
              type: 'item',
              id: item.id,
              title: item.name,
              subtitle: `${item.value || 'Item'} (${scene.title})`,
              data: item,
            });
          }
        });
      });
    }

    return results.slice(0, 50); // Limit results
  }, [search, category, scenes]);

  const handleSelect = async (result: SearchResult) => {
    switch (result.type) {
      case 'scene':
        goToSceneById(result.id);
        break;
      case 'npc':
        // Fetch full NPC data (GM gets full access)
        try {
          const response = await fetch(`/api/npcs/${result.id}?role=gm`);
          if (response.ok) {
            const npc = await response.json();
            selectNPC(npc);
          }
        } catch (error) {
          console.error('Failed to load NPC:', error);
        }
        break;
      case 'item':
        selectItem(result.data as any);
        break;
    }
    closeModal();
    setSearch('');
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'scene':
        return <MapPin size={14} className="text-green-400" />;
      case 'npc':
        return <Users size={14} className="text-cyan-400" />;
      case 'item':
        return <Package size={14} className="text-amber-400" />;
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
              Global Search
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
                placeholder="Search everything..."
                className="input w-full pl-9"
                autoFocus
              />
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 mt-3">
              <CategoryTab
                active={category === 'all'}
                onClick={() => setCategory('all')}
                label="All"
              />
              <CategoryTab
                active={category === 'scenes'}
                onClick={() => setCategory('scenes')}
                icon={<MapPin size={12} />}
                label="Scenes"
              />
              <CategoryTab
                active={category === 'npcs'}
                onClick={() => setCategory('npcs')}
                icon={<Users size={12} />}
                label="NPCs"
              />
              <CategoryTab
                active={category === 'items'}
                onClick={() => setCategory('items')}
                icon={<Package size={12} />}
                label="Items"
              />
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-4">
            {results.length > 0 ? (
              <ul className="space-y-1">
                {results.map((result) => (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      onClick={() => handleSelect(result)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded text-left',
                        'hover:bg-neutral-700 transition-colors'
                      )}
                    >
                      {getIcon(result.type)}
                      <div>
                        <div className="font-medium">{result.title}</div>
                        <div className="text-sm text-neutral-400">
                          {result.subtitle}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : search.trim() ? (
              <div className="text-center text-neutral-500 py-8">
                No results found
              </div>
            ) : (
              <div className="text-center text-neutral-500 py-8">
                Start typing to search...
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface CategoryTabProps {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}

function CategoryTab({ active, onClick, icon, label }: CategoryTabProps) {
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
