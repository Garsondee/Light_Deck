import { MapPin, BookOpen, Users, Target, Zap, MessageCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useViewStore } from '../../store/viewStore';
import { useSceneStore } from '../../store/sceneStore';

const sections = [
  { id: 'location', icon: MapPin, label: 'Location' },
  { id: 'narrative', icon: BookOpen, label: 'Narrative' },
  { id: 'npcs', icon: Users, label: 'NPCs' },
  { id: 'checks', icon: Target, label: 'Checks' },
  { id: 'triggers', icon: Zap, label: 'Triggers' },
  { id: 'dialogue', icon: MessageCircle, label: 'Dialogue' },
] as const;

export function IndexBar() {
  const { activeSection, setActiveSection } = useViewStore();
  const { currentScene } = useSceneStore();

  // Determine which sections have content
  const availableSections = new Set<string>();
  if (currentScene) {
    if (currentScene.location || currentScene.environment) availableSections.add('location');
    if (currentScene.narrative) availableSections.add('narrative');
    if (currentScene.npcs?.length) availableSections.add('npcs');
    if (currentScene.challenges?.length) availableSections.add('checks');
    if (currentScene.triggers?.length) availableSections.add('triggers');
    if (currentScene.conversation) availableSections.add('dialogue');
  }

  const handleSelect = (id: string) => {
    setActiveSection(id);
    // Scroll to section in main panel
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav
      className={cn(
        'h-10 px-4 flex items-center gap-1',
        'bg-neutral-800 border-b border-neutral-700'
      )}
    >
      {sections.map(({ id, icon: Icon, label }) => {
        const available = availableSections.has(id);
        const active = activeSection === id;

        return (
          <button
            key={id}
            onClick={() => available && handleSelect(id)}
            disabled={!available}
            className={cn(
              'px-3 py-1 rounded flex items-center gap-1.5 text-sm transition-colors',
              active && 'bg-cyan-600 text-white',
              !active && available && 'hover:bg-neutral-700 text-neutral-300',
              !available && 'opacity-40 cursor-not-allowed text-neutral-500'
            )}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
