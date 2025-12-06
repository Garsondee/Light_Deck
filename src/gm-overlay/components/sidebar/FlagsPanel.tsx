import { useSceneStore } from '../../store/sceneStore';
import { useSessionStore } from '../../store/sessionStore';
import { cn } from '../../utils/cn';

export function FlagsPanel() {
  const { currentScene } = useSceneStore();
  const { flags, toggleFlag } = useSessionStore();

  // Get flags relevant to current scene
  const sceneFlags = currentScene?.flags || [];

  if (sceneFlags.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="section-header">Flags</h3>
      
      <ul className="space-y-1">
        {sceneFlags.map((flagKey) => {
          const isSet = !!flags[flagKey];
          
          return (
            <li key={flagKey}>
              <button
                onClick={() => toggleFlag(flagKey)}
                className={cn(
                  'flex items-center gap-2 w-full text-left px-2 py-1 rounded text-sm',
                  'hover:bg-neutral-700 transition-colors',
                  isSet ? 'text-green-400' : 'text-neutral-400'
                )}
              >
                <span className="font-mono">
                  {isSet ? '☑' : '☐'}
                </span>
                <span className="font-mono text-xs">{flagKey}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
