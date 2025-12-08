import { Settings, X, BookOpen, Play, FileDown, Users } from 'lucide-react';
import { cn } from '../../utils/cn';
import { usePlayerStore } from '../../store/playerStore';

interface HeaderProps {
  sceneLabel: string;
  position: string;
  activeSceneLabel?: string;
  isViewingActive: boolean;
  onSettings: () => void;
  onExportAll: () => void;
  onClose: () => void;
}

export function Header({ 
  sceneLabel, 
  position, 
  activeSceneLabel,
  isViewingActive,
  onSettings,
  onExportAll,
  onClose 
}: HeaderProps) {
  const { connectedPlayers, isPanelOpen, openPanel } = usePlayerStore();
  
  // Count only players (not GMs)
  const playerCount = connectedPlayers.filter(p => p.role === 'player').length;
  
  return (
    <header
      className={cn(
        'px-4 flex flex-col justify-center',
        'bg-neutral-800 border-b border-neutral-700',
        isViewingActive ? 'h-12' : 'h-16'
      )}
    >
      <div className="flex items-center justify-between">
        {/* Scene Labels */}
        <div className="flex-1 min-w-0">
          {isViewingActive ? (
            // Viewing the active scene - single line with green indicator
            <div className="flex items-center gap-2">
              <Play size={14} className="text-green-400 flex-shrink-0" />
              <h1 className="text-lg font-semibold truncate text-green-100">
                {sceneLabel}
              </h1>
            </div>
          ) : (
            // Browsing a different scene - show both
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <BookOpen size={12} className="text-amber-400 flex-shrink-0" />
                <span className="text-xs text-amber-400 uppercase tracking-wide">Viewing</span>
                <span className="text-sm font-medium text-neutral-100 truncate">
                  {sceneLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Play size={12} className="text-green-400 flex-shrink-0" />
                <span className="text-xs text-green-400 uppercase tracking-wide">Active</span>
                <span className="text-sm text-neutral-400 truncate">
                  {activeSceneLabel || 'None'}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-neutral-400 text-sm font-mono">{position}</span>

          {/* Player count button */}
          <button
            onClick={openPanel}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors',
              isPanelOpen 
                ? 'bg-cyan-600 text-white' 
                : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200',
              playerCount > 0 && 'ring-1 ring-green-400/50'
            )}
            title="Manage player characters"
          >
            <Users size={14} />
            <span>{playerCount}</span>
            {playerCount > 0 && (
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            )}
          </button>

          <button
            onClick={onExportAll}
            className="px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 bg-cyan-700 hover:bg-cyan-600 text-white"
            title="Export full adventure bundle for LLMs"
          >
            <FileDown size={14} />
            <span>Export All</span>
          </button>

          <button
            onClick={onSettings}
            className="p-1.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-neutral-100 transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-neutral-100 transition-colors"
            title="Close (G)"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
