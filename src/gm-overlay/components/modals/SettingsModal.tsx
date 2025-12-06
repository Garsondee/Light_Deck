import { X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '../../utils/cn';
import { useViewStore } from '../../store/viewStore';
import { useSessionStore } from '../../store/sessionStore';

export function SettingsModal() {
  const { activeModal, closeModal } = useViewStore();
  const { clear: clearSession, campaignClock, setTime } = useSessionStore();

  const isOpen = activeModal === 'settings';

  const handleClearSession = () => {
    if (confirm('Clear all session data? This cannot be undone.')) {
      clearSession();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-[400px] bg-neutral-800 rounded-lg shadow-xl z-50'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-700">
            <Dialog.Title className="text-lg font-semibold">
              Settings
            </Dialog.Title>
            <Dialog.Close className="p-1 hover:bg-neutral-700 rounded">
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="p-4 space-y-6">
            {/* Campaign Clock */}
            <div>
              <h4 className="text-sm font-medium text-neutral-400 mb-2">
                Campaign Clock
              </h4>
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-xs text-neutral-500">Day</label>
                  <input
                    type="number"
                    value={campaignClock.day}
                    onChange={(e) => setTime(parseInt(e.target.value) || 1, campaignClock.time)}
                    className="input w-20"
                    min={1}
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Time</label>
                  <input
                    type="time"
                    value={campaignClock.time}
                    onChange={(e) => setTime(campaignClock.day, e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div>
              <h4 className="text-sm font-medium text-neutral-400 mb-2">
                Keyboard Shortcuts
              </h4>
              <ul className="text-sm space-y-1 text-neutral-300">
                <li><kbd className="kbd">G</kbd> Toggle GM Overlay</li>
                <li><kbd className="kbd">Cmd+J</kbd> Scene Jumper</li>
                <li><kbd className="kbd">Cmd+K</kbd> Global Search</li>
                <li><kbd className="kbd">Esc</kbd> Close modal / Go back</li>
                <li><kbd className="kbd">←</kbd> Previous scene</li>
                <li><kbd className="kbd">→</kbd> Next scene</li>
              </ul>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-neutral-700">
              <h4 className="text-sm font-medium text-red-400 mb-2">
                Danger Zone
              </h4>
              <button
                onClick={handleClearSession}
                className="btn btn-danger"
              >
                Clear Session Data
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
