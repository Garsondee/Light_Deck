import { ArrowRight, GitBranch, Map, Play } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useSceneStore } from '../../store/sceneStore';
import { useViewStore } from '../../store/viewStore';
import type { Scene, SceneTransition } from '../../types';

interface SceneTransitionPanelProps {
  scene: Scene;
}

export function SceneTransitionPanel({ scene }: SceneTransitionPanelProps) {
  const { scenes, goToSceneById, activateScene, isActiveScene } = useSceneStore();
  const { openModal } = useViewStore();

  // Get transitions from scene data, or fall back to next scene in sequence
  const transitions = scene.transitions;
  const currentIndex = scenes.findIndex(s => s.id === scene.id);
  const nextScene = currentIndex >= 0 && currentIndex < scenes.length - 1 
    ? scenes[currentIndex + 1] 
    : null;

  // If no explicit transitions defined, create a default "next scene" transition
  const nextTransitions: SceneTransition[] = transitions?.next || (nextScene ? [{
    targetSceneId: nextScene.id,
    label: `Scene ${nextScene.scene}: ${nextScene.title}`,
    description: nextScene.narrative?.substring(0, 100) + '...',
  }] : []);

  const branchTransitions = transitions?.branches || [];

  const handleView = (sceneId: string) => {
    goToSceneById(sceneId);
  };

  const handleActivate = (sceneId: string) => {
    activateScene(sceneId);
    goToSceneById(sceneId);
  };

  const handleJumpToAny = () => {
    openModal('sceneJumper');
  };

  // Don't show if this is the last scene and no transitions defined
  if (nextTransitions.length === 0 && branchTransitions.length === 0) {
    return (
      <div className="mt-8 pt-6 border-t-2 border-neutral-600">
        <div className="text-center text-neutral-500 py-4">
          <p className="text-sm">End of adventure</p>
          <button
            onClick={handleJumpToAny}
            className="mt-3 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm flex items-center gap-2 mx-auto"
          >
            <Map size={14} />
            Jump to Any Scene...
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t-2 border-neutral-600">
      <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2 mb-4">
        <Play size={18} />
        Scene Transitions
      </h3>

      {/* Next Scene(s) */}
      {nextTransitions.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-neutral-400 mb-2">Continue to:</p>
          <div className="space-y-2">
            {nextTransitions.map((transition, i) => (
              <TransitionCard
                key={transition.targetSceneId || i}
                transition={transition}
                icon={<ArrowRight size={16} />}
                isActive={isActiveScene(transition.targetSceneId)}
                onView={() => handleView(transition.targetSceneId)}
                onActivate={() => handleActivate(transition.targetSceneId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Branch Scenes */}
      {branchTransitions.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-neutral-400 mb-2">Or branch to:</p>
          <div className="space-y-2">
            {branchTransitions.map((transition, i) => (
              <TransitionCard
                key={transition.targetSceneId || i}
                transition={transition}
                icon={<GitBranch size={16} />}
                isActive={isActiveScene(transition.targetSceneId)}
                onView={() => handleView(transition.targetSceneId)}
                onActivate={() => handleActivate(transition.targetSceneId)}
                variant="branch"
              />
            ))}
          </div>
        </div>
      )}

      {/* Jump to any scene */}
      <div className="pt-4 border-t border-neutral-700">
        <button
          onClick={handleJumpToAny}
          className="w-full px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm flex items-center justify-center gap-2"
        >
          <Map size={14} />
          Jump to Any Scene...
        </button>
      </div>
    </div>
  );
}

interface TransitionCardProps {
  transition: SceneTransition;
  icon: React.ReactNode;
  isActive: boolean;
  onView: () => void;
  onActivate: () => void;
  variant?: 'next' | 'branch';
}

function TransitionCard({
  transition,
  icon,
  isActive,
  onView,
  onActivate,
  variant = 'next',
}: TransitionCardProps) {
  return (
    <div
      className={cn(
        'p-3 rounded border',
        variant === 'branch'
          ? 'bg-purple-900/20 border-purple-700/50'
          : 'bg-neutral-800 border-neutral-700',
        isActive && 'ring-2 ring-green-500/50'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className={cn(
            'mt-0.5',
            variant === 'branch' ? 'text-purple-400' : 'text-cyan-400'
          )}>
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-neutral-100 truncate">
              {transition.label}
              {isActive && (
                <span className="ml-2 text-xs text-green-400">(ACTIVE)</span>
              )}
            </p>
            {transition.description && (
              <p className="text-sm text-neutral-400 mt-1 line-clamp-2">
                {transition.description}
              </p>
            )}
            {transition.condition && (
              <p className="text-xs text-amber-400 mt-1 italic">
                Condition: {transition.condition}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onView}
            className="px-3 py-1.5 text-xs bg-neutral-700 hover:bg-neutral-600 rounded"
          >
            View
          </button>
          <button
            onClick={onActivate}
            disabled={isActive}
            className={cn(
              'px-3 py-1.5 text-xs rounded font-medium',
              isActive
                ? 'bg-green-900/50 text-green-400 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            )}
          >
            {isActive ? 'Active' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}
