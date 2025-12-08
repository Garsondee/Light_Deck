import { useState } from 'react';
import { X, Target } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '../../utils/cn';
import { useViewStore } from '../../store/viewStore';
import { useChatStore } from '../../store/chatStore';

const SKILLS = [
  'Athletics', 'Acrobatics', 'Sleight of Hand', 'Stealth',
  'Arcana', 'History', 'Investigation', 'Nature', 'Religion',
  'Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival',
  'Deception', 'Intimidation', 'Performance', 'Persuasion',
];

const DIFFICULTIES = [
  { label: 'Very Easy', dc: 5 },
  { label: 'Easy', dc: 10 },
  { label: 'Medium', dc: 15 },
  { label: 'Hard', dc: 20 },
  { label: 'Very Hard', dc: 25 },
  { label: 'Nearly Impossible', dc: 30 },
];

export function AdHocCheckModal() {
  const { activeModal, closeModal } = useViewStore();
  const { addSystemMessage } = useChatStore();
  
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [selectedDC, setSelectedDC] = useState<number | null>(null);
  const [customDC, setCustomDC] = useState('');

  const isOpen = activeModal === 'adHocCheck';

  const handleRoll = () => {
    if (!selectedSkill) return;
    
    const dc = selectedDC || parseInt(customDC) || 15;
    const roll = Math.floor(Math.random() * 20) + 1;
    const success = roll >= dc;
    
    const message = `[GM] ${selectedSkill} check (DC ${dc}): d20 = ${roll} - ${success ? '✓ SUCCESS' : '✗ FAIL'}`;
    addSystemMessage(message);
    
    // Broadcast to all players via SyncManager
    if ((window as any).GMOverlay?.chat?.send) {
      (window as any).GMOverlay.chat.send(message);
    }
    
    // Dispatch to main app for any additional handling
    window.dispatchEvent(new CustomEvent('gm-overlay:roll', {
      detail: { skill: selectedSkill, dc, roll, success }
    }));
    
    closeModal();
    resetForm();
  };

  const resetForm = () => {
    setSelectedSkill(null);
    setSelectedDC(null);
    setCustomDC('');
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-[500px] bg-neutral-800 rounded-lg shadow-xl z-50'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-700">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <Target size={18} className="text-amber-400" />
              Ad-Hoc Skill Check
            </Dialog.Title>
            <Dialog.Close className="p-1 hover:bg-neutral-700 rounded">
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="p-4 space-y-4">
            {/* Skill selection */}
            <div>
              <h4 className="text-sm font-medium text-neutral-400 mb-2">
                Select Skill
              </h4>
              <div className="grid grid-cols-3 gap-1">
                {SKILLS.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => setSelectedSkill(skill)}
                    className={cn(
                      'px-2 py-1 rounded text-sm text-left',
                      selectedSkill === skill
                        ? 'bg-cyan-600 text-white'
                        : 'bg-neutral-700 hover:bg-neutral-600'
                    )}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* DC selection */}
            <div>
              <h4 className="text-sm font-medium text-neutral-400 mb-2">
                Difficulty Class
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTIES.map(({ label, dc }) => (
                  <button
                    key={dc}
                    onClick={() => {
                      setSelectedDC(dc);
                      setCustomDC('');
                    }}
                    className={cn(
                      'px-2 py-2 rounded text-sm',
                      selectedDC === dc
                        ? 'bg-amber-600 text-white'
                        : 'bg-neutral-700 hover:bg-neutral-600'
                    )}
                  >
                    <div className="font-medium">{label}</div>
                    <div className="text-xs opacity-75">DC {dc}</div>
                  </button>
                ))}
              </div>

              {/* Custom DC */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-neutral-400">Custom DC:</span>
                <input
                  type="number"
                  value={customDC}
                  onChange={(e) => {
                    setCustomDC(e.target.value);
                    setSelectedDC(null);
                  }}
                  placeholder="15"
                  className="input w-20 text-center"
                  min={1}
                  max={40}
                />
              </div>
            </div>

            {/* Summary and Roll */}
            <div className="pt-4 border-t border-neutral-700">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  {selectedSkill ? (
                    <span>
                      <span className="text-cyan-400">{selectedSkill}</span>
                      {' check, '}
                      <span className="text-amber-400">
                        DC {selectedDC || customDC || '?'}
                      </span>
                    </span>
                  ) : (
                    <span className="text-neutral-500">Select a skill</span>
                  )}
                </div>
                <button
                  onClick={handleRoll}
                  disabled={!selectedSkill || (!selectedDC && !customDC)}
                  className="btn btn-primary px-6"
                >
                  Roll Check
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
