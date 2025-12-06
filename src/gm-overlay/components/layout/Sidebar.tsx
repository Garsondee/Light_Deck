import { cn } from '../../utils/cn';
import { PlayerViewPreview } from '../sidebar/PlayerViewPreview';
import { ChatLogPanel } from '../sidebar/ChatLogPanel';
import { SceneInfo } from '../sidebar/SceneInfo';
import { SessionLog } from '../sidebar/SessionLog';
import { QuickActions } from '../sidebar/QuickActions';
import { SceneElements } from '../sidebar/SceneElements';
import { FlagsPanel } from '../sidebar/FlagsPanel';

export function Sidebar() {
  return (
    <aside
      className={cn(
        'flex-[4] overflow-y-auto',
        'bg-neutral-850',
        'scrollbar-thin'
      )}
    >
      <div className="p-4 space-y-4">
        {/* Player view preview at top */}
        <PlayerViewPreview />
        
        <div className="section-divider" />
        
        {/* Chat log */}
        <ChatLogPanel />
        
        <div className="section-divider" />
        
        {/* Existing sidebar content */}
        <SceneInfo />
        <SessionLog />
        <QuickActions />
        <SceneElements />
        <FlagsPanel />
      </div>
    </aside>
  );
}
