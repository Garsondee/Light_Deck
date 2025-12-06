import { useEffect, useState, useMemo } from 'react';
import { X, FileDown, Copy } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '../../utils/cn';
import { useViewStore } from '../../store/viewStore';

interface ExportSection {
  type: string;
  title: string;
  count?: number;
  content: unknown;
}

interface ExportResponse {
  exportedAt: string;
  adventure: string;
  sections: ExportSection[];
}

export function ExportAllModal() {
  const { activeModal, closeModal } = useViewStore();
  const isOpen = activeModal === 'exportAll';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportData, setExportData] = useState<ExportResponse | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams(window.location.search);
    const adventureId = params.get('adventure') || 'AChangeOfHeart';

    fetch(`/api/export/${adventureId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to export: ${res.statusText}`);
        return res.json();
      })
      .then((data: ExportResponse) => {
        setExportData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[GM Overlay] Export error:', err);
        setError(err instanceof Error ? err.message : 'Failed to export data');
        setLoading(false);
      });
  }, [isOpen]);

  const text = useMemo(() => {
    if (!exportData) return '';

    const { adventure, exportedAt } = exportData;

    const lines: string[] = [];

    // LLM_INSTRUCTION.MD header
    lines.push('# LLM_INSTRUCTION.MD');
    lines.push('');
    lines.push('You are an assistant helping a Game Master run a tabletop RPG adventure.');
    lines.push('The following file contains the complete structured data for one adventure,');
    lines.push('including world setting, adventure guide, scenes, NPCs, PCs, terminals,');
    lines.push('documents, and programs.');
    lines.push('');
    lines.push('## How to use this data');
    lines.push('- Always respect the intent of the Game Master.');
    lines.push('- Never reveal GM-only secrets, flags, or hidden information to players unless explicitly asked as GM.');
    lines.push('- Use `narrative` and `description` fields to describe scenes and characters.');
    lines.push('- Use `state_tracking`, `flags`, and `clues` to reason about what has been discovered.');
    lines.push('- Use `skills`, `dc`, and `checks` to suggest appropriate rolls, not to roll dice yourself unless asked.');
    lines.push('');
    lines.push('## Data layout');
    lines.push(`Adventure id: ${adventure}`);
    lines.push(`Exported at: ${exportedAt}`);
    lines.push('');
    lines.push('The JSON payload at the end of this file has the shape:');
    lines.push('');
    lines.push('```json');
    lines.push('{');
    lines.push('  "exportedAt": string,');
    lines.push('  "adventure": string,');
    lines.push('  "sections": [');
    lines.push('    {');
    lines.push('      "type": string,          // e.g. "world_setting", "guide", "scenes", "npcs"');
    lines.push('      "title": string,');
    lines.push('      "count"?: number,');
    lines.push('      "content": any           // see schemas below');
    lines.push('    }');
    lines.push('  ]');
    lines.push('}');
    lines.push('```');
    lines.push('');
    lines.push('## Key JSON schemas (approximate)');
    lines.push('');
    lines.push('### Scene');
    lines.push('```json');
    lines.push('{');
    lines.push('  "id": string,');
    lines.push('  "adventure": string,');
    lines.push('  "act": number,');
    lines.push('  "chapter": number,');
    lines.push('  "scene": number,');
    lines.push('  "title": string,');
    lines.push('  "location": string,');
    lines.push('  "tone"?: string,');
    lines.push('  "narrative": string,');
    lines.push('  "gmNotes"?: string,');
    lines.push('  "image"?: string,');
    lines.push('  "environment"?: {');
    lines.push('    "location": string,');
    lines.push('    "tone": string,');
    lines.push('    "lighting"?: { "description": string, "preset"?: string, "actuator"?: boolean },');
    lines.push('    "audio"?: { "description": string, "tracks"?: string[], "actuator"?: boolean },');
    lines.push('    "smell"?: string');
    lines.push('  },');
    lines.push('  "npcs": [{');
    lines.push('    "id": string,');
    lines.push('    "name": string,');
    lines.push('    "role": string,');
    lines.push('    "state": "active"|"passive"|"hidden"|"defeated",');
    lines.push('    "notes"?: string,');
    lines.push('    "statblock"?: string');
    lines.push('  }],');
    lines.push('  "challenges": [{');
    lines.push('    "id": string,');
    lines.push('    "name": string,');
    lines.push('    "skill": string,');
    lines.push('    "dc": number,');
    lines.push('    "type": "active"|"passive"|"hidden",');
    lines.push('    "description"?: string,');
    lines.push('    "success"?: string,');
    lines.push('    "fail"?: string');
    lines.push('  }],');
    lines.push('  "triggers": [{');
    lines.push('    "id": string,');
    lines.push('    "label": string,');
    lines.push('    "action": "chat"|"sound"|"scene"|"flag",');
    lines.push('    "text"?: string,');
    lines.push('    "sound"?: string,');
    lines.push('    "targetScene"?: string,');
    lines.push('    "setsFlag"?: string,');
    lines.push('    "irreversible"?: boolean');
    lines.push('  }],');
    lines.push('  "items"?: [{');
    lines.push('    "id": string,');
    lines.push('    "name": string,');
    lines.push('    "value"?: string,');
    lines.push('    "notes"?: string,');
    lines.push('    "visible": boolean');
    lines.push('  }],');
    lines.push('  "exits"?: [{');
    lines.push('    "id": string,');
    lines.push('    "label": string,');
    lines.push('    "targetSceneId": string');
    lines.push('  }]');
    lines.push('}');
    lines.push('```');
    lines.push('');
    lines.push('### NPC statblock (public/private structure)');
    lines.push('```json');
    lines.push('{');
    lines.push('  "id": string,');
    lines.push('  "name": string,');
    lines.push('  "type": string,');
    lines.push('  "archetype"?: string,');
    lines.push('  "public": {');
    lines.push('    "description": string,');
    lines.push('    "appearance"?: string,');
    lines.push('    "demeanor"?: string,');
    lines.push('    "known_facts"?: string[]');
    lines.push('  },');
    lines.push('  "private": {');
    lines.push('    "full_description"?: string,');
    lines.push('    "stats"?: { "stress": number, "stressMax": number, "wounds": number, "armor": number, "attack": number, "defense"?: number },');
    lines.push('    "attributes"?: { [key: string]: number },');
    lines.push('    "skills"?: { [key: string]: string|number|null },');
    lines.push('    "abilities"?: any[],');
    lines.push('    "weapons"?: any[],');
    lines.push('    "cyberware"?: string[],');
    lines.push('    "behavior"?: { "tactics"?: string, "morale"?: string, "motivation"?: string },');
    lines.push('    "secrets"?: { [key: string]: string },');
    lines.push('    "loot"?: { "item": string, "chance": number }[],');
    lines.push('    "gm_notes"?: string');
    lines.push('  }');
    lines.push('}');
    lines.push('```');
    lines.push('');
    lines.push('### Adventure guide (high level)');
    lines.push('```json');
    lines.push('{');
    lines.push('  "id": string,');
    lines.push('  "adventure": string,');
    lines.push('  "version": string,');
    lines.push('  "overview": string,');
    lines.push('  "content": { [sectionId: string]: any },');
    lines.push('  "state_tracking"?: any,');
    lines.push('  "items"?: any,');
    lines.push('  "clues"?: any');
    lines.push('}');
    lines.push('```');
    lines.push('');
    lines.push('### Other entities');
    lines.push('- Player characters (PCs): same general structure as NPCs, usually without `public`/`private` split.');
    lines.push('- Terminals: JSON definitions of in-world computer systems.');
    lines.push('- Documents: JSON documents with metadata and content.');
    lines.push('- Programs: JSON descriptions of terminal programs/minigames.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## RAW EXPORT DATA (for tools)');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(exportData, null, 2));
    lines.push('```');
    lines.push('');

    return lines.join('\n');
  }, [exportData]);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => {
        console.log('[GM Overlay] Export copied to clipboard');
      },
      (err) => {
        console.error('[GM Overlay] Failed to copy export:', err);
      }
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-[900px] max-h-[80vh] bg-neutral-900 rounded-lg shadow-xl z-50',
            'flex flex-col border border-neutral-700'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-700">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <FileDown size={18} />
              Export All (LLM Bundle)
            </Dialog.Title>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={!text || loading || !!error}
                className={cn(
                  'px-3 py-1.5 rounded text-sm flex items-center gap-1.5',
                  'bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <Copy size={14} /> Copy
              </button>
              <Dialog.Close className="p-1.5 hover:bg-neutral-700 rounded">
                <X size={18} />
              </Dialog.Close>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col">
            {loading && (
              <div className="p-4 text-sm text-neutral-400">Generating export

</div>
            )}
            {error && (
              <div className="p-4 text-sm text-red-400">Error: {error}</div>
            )}
            {!loading && !error && (
              <div className="p-4 flex-1 flex flex-col">
                <textarea
                  className="flex-1 w-full bg-neutral-950 text-neutral-100 text-xs font-mono rounded border border-neutral-700 p-3 resize-none"
                  value={text}
                  readOnly
                />
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
