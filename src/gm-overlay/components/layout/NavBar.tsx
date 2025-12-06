import { ChevronLeft, ChevronRight, Map, Mic, BookOpen, Play } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useSceneStore } from '../../store/sceneStore';
import { useViewStore } from '../../store/viewStore';

export function NavBar() {
  const { 
    prevScene, 
    nextScene, 
    hasNext, 
    hasPrev, 
    activateCurrentScene, 
    isViewingActiveScene 
  } = useSceneStore();
  const { openModal, pushView } = useViewStore();

  const isActive = isViewingActiveScene();

  const handleJump = () => {
    openModal('sceneJumper');
  };

  const handleActivate = () => {
    if (!isActive) {
      activateCurrentScene();
    }
  };

  const handleKaraoke = () => {
    pushView('karaoke', null, 'Karaoke');
  };

  const handleGuide = () => {
    // Open guide modal or navigate to guide view
    openModal('globalSearch');
  };

  return (
    <nav
      className={cn(
        'h-14 px-4 flex items-center justify-between',
        'bg-neutral-800 border-t border-neutral-700'
      )}
    >
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        <NavButton
          onClick={prevScene}
          disabled={!hasPrev()}
          icon={<ChevronLeft size={16} />}
          label="PREV"
        />
        
        <NavButton
          onClick={handleJump}
          icon={<Map size={16} />}
          label="JUMP"
          shortcut="Cmd+J"
        />
        
        <NavButton
          onClick={nextScene}
          disabled={!hasNext()}
          icon={<ChevronRight size={16} />}
          label="NEXT"
          iconRight
        />
      </div>

      {/* Center: Activate Scene */}
      <div className="flex items-center">
        <NavButton
          onClick={handleActivate}
          disabled={isActive}
          icon={<Play size={16} />}
          label={isActive ? 'SCENE ACTIVE' : 'ACTIVATE SCENE'}
          variant={isActive ? 'active' : 'activate'}
          shortcut="Shift+Enter"
        />
      </div>

      {/* Right: Mode buttons */}
      <div className="flex items-center gap-2">
        <NavButton
          onClick={handleKaraoke}
          icon={<Mic size={16} />}
          label="KARAOKE"
          variant="accent"
        />
        
        <NavButton
          onClick={handleGuide}
          icon={<BookOpen size={16} />}
          label="GUIDE"
        />
      </div>
    </nav>
  );
}

interface NavButtonProps {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  iconRight?: boolean;
  variant?: 'default' | 'accent' | 'activate' | 'active';
}

function NavButton({
  onClick,
  disabled,
  icon,
  label,
  shortcut,
  iconRight,
  variant = 'default',
}: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={shortcut}
      className={cn(
        'px-3 py-2 rounded flex items-center gap-1.5 text-sm font-medium transition-colors',
        variant === 'default' && 'bg-neutral-700 hover:bg-neutral-600 text-neutral-100',
        variant === 'accent' && 'bg-amber-600 hover:bg-amber-500 text-white',
        variant === 'activate' && 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400/50',
        variant === 'active' && 'bg-green-700 text-green-100 cursor-default',
        disabled && variant !== 'active' && 'opacity-50 cursor-not-allowed hover:bg-neutral-700'
      )}
    >
      {!iconRight && icon}
      <span>{label}</span>
      {iconRight && icon}
    </button>
  );
}
