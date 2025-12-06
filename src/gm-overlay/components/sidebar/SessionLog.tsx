import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useSessionStore } from '../../store/sessionStore';

export function SessionLog() {
  const { notes, addNote, removeNote } = useSessionStore();
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim()) {
      addNote(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="section-header">Session Notes</h3>
      
      {/* Notes list */}
      <ul className="space-y-1 text-sm">
        {notes.map((note, i) => (
          <li key={i} className="flex items-start gap-2 group">
            <span className="text-neutral-400">•</span>
            <span className="flex-1 text-neutral-300">{note}</span>
            <button
              onClick={() => removeNote(i)}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
            >
              <X size={12} />
            </button>
          </li>
        ))}
      </ul>

      {/* Add note input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add note..."
          className="input flex-1 text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="btn btn-secondary p-2"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
