import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useSceneStore } from '../../store/sceneStore';

export function SceneInfo() {
  const { currentScene } = useSceneStore();
  const [expanded, setExpanded] = useState(false);

  if (!currentScene?.gmNotes) {
    return null;
  }

  const lines = currentScene.gmNotes.split('\n');
  const preview = lines.slice(0, 3).join('\n');
  const hasMore = lines.length > 3;

  return (
    <div className="space-y-2">
      <h3 className="section-header">GM Notes</h3>
      <div className="text-sm text-neutral-300 whitespace-pre-wrap">
        {expanded ? currentScene.gmNotes : preview}
        {hasMore && !expanded && '...'}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
        >
          {expanded ? (
            <>
              <ChevronUp size={12} /> Collapse
            </>
          ) : (
            <>
              <ChevronDown size={12} /> Expand
            </>
          )}
        </button>
      )}
    </div>
  );
}
