import { cn } from '../../utils/cn';
import { useViewStore } from '../../store/viewStore';
import { useSceneStore } from '../../store/sceneStore';
import { NarrativeView } from '../views/NarrativeView';
import { NPCDetailView } from '../views/NPCDetailView';
import { ItemDetailView } from '../views/ItemDetailView';
import { ConversationGuideView } from '../views/ConversationGuideView';
import { DashboardView } from '../views/DashboardView';
import { KaraokeView } from '../views/KaraokeView';

export function MainPanel() {
  const { currentView, selectedNPC, selectedItem } = useViewStore();
  const { currentScene } = useSceneStore();

  return (
    <div
      className={cn(
        'flex-[6] overflow-y-auto',
        'border-r border-neutral-700',
        'scrollbar-thin'
      )}
    >
      <div className="p-4">
        {currentView === 'narrative' && <NarrativeView scene={currentScene} />}
        {currentView === 'npc' && selectedNPC && <NPCDetailView npc={selectedNPC} />}
        {currentView === 'item' && selectedItem && <ItemDetailView item={selectedItem} />}
        {currentView === 'conversation' && currentScene?.conversation && (
          <ConversationGuideView conversation={currentScene.conversation} />
        )}
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'karaoke' && currentScene && <KaraokeView scene={currentScene} />}
      </div>
    </div>
  );
}
