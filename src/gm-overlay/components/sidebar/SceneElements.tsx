import { Users, Package, ArrowRight } from 'lucide-react';
import { useSceneStore } from '../../store/sceneStore';
import { useViewStore } from '../../store/viewStore';
import { cn } from '../../utils/cn';

export function SceneElements() {
  const { currentScene, goToSceneById } = useSceneStore();
  const { selectNPC, selectItem } = useViewStore();

  if (!currentScene) return null;

  const hasNPCs = currentScene.npcs && currentScene.npcs.length > 0;
  const hasItems = currentScene.items && currentScene.items.length > 0;
  const hasExits = currentScene.exits && currentScene.exits.length > 0;

  if (!hasNPCs && !hasItems && !hasExits) return null;

  return (
    <div className="space-y-3">
      <h3 className="section-header">Scene Elements</h3>

      {/* NPCs */}
      {hasNPCs && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <Users size={12} /> NPCs
          </div>
          <div className="flex flex-wrap gap-1">
            {currentScene.npcs.map((npc, index) => (
              <NPCBadge
                key={`npc-${npc.id}-${index}`}
                name={npc.name}
                state={npc.state}
                onClick={async () => {
                  try {
                    // GM gets full NPC data
                    const response = await fetch(`/api/npcs/${npc.statblock || npc.id}?role=gm`);
                    if (response.ok) {
                      const fullNPC = await response.json();
                      selectNPC(fullNPC);
                    }
                  } catch (error) {
                    console.error('Failed to load NPC:', error);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      {hasItems && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <Package size={12} /> Items
          </div>
          <div className="flex flex-wrap gap-1">
            {currentScene.items?.map((item, index) => (
              <button
                key={`item-${item.id}-${index}`}
                onClick={() => selectItem(item as any)}
                className={cn(
                  'badge badge-amber cursor-pointer',
                  !item.visible && 'opacity-50'
                )}
              >
                {item.name}
                {item.value && ` (${item.value})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Exits */}
      {hasExits && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <ArrowRight size={12} /> Exits
          </div>
          <div className="flex flex-wrap gap-1">
            {currentScene.exits?.map((exit, index) => (
              <button
                key={`exit-${exit.id}-${index}`}
                onClick={() => goToSceneById(exit.targetSceneId)}
                className="badge badge-green cursor-pointer"
              >
                → {exit.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface NPCBadgeProps {
  name: string;
  state: 'active' | 'passive' | 'hidden' | 'defeated';
  onClick: () => void;
}

function NPCBadge({ name, state, onClick }: NPCBadgeProps) {
  const stateStyles = {
    active: 'badge-cyan',
    passive: 'bg-neutral-700 text-neutral-300 border-neutral-600',
    hidden: 'bg-blue-900/50 text-blue-400 border-blue-700',
    defeated: 'bg-red-900/50 text-red-400 border-red-700 line-through',
  };

  const stateIcon = {
    active: '●',
    passive: '○',
    hidden: '◐',
    defeated: '✗',
  };

  return (
    <button
      onClick={onClick}
      className={cn('badge cursor-pointer', stateStyles[state])}
    >
      <span className="mr-1">{stateIcon[state]}</span>
      {name}
    </button>
  );
}
