import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Filter, Dice1 } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { cn } from '../../utils/cn';
import type { ChatMessage } from '../../types';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'player', label: 'Players' },
  { value: 'system', label: 'System' },
  { value: 'rolls', label: 'Rolls' },
  { value: 'gm', label: 'GM' },
] as const;

/**
 * Chat log panel showing messages from players, system events, and dice rolls.
 * Includes filtering and the ability to send GM messages.
 */
export function ChatLogPanel() {
  const { messages, filter, setFilter, addMessage, getFilteredMessages } = useChatStore();
  const [input, setInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredMessages = getFilteredMessages();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    if (input.trim()) {
      const text = input.trim();
      
      // Add to local chat immediately
      addMessage({
        type: 'gm',
        sender: 'GM',
        text,
      });
      setInput('');
      
      // Broadcast via GMOverlay API (which uses Socket.io)
      if (typeof (window as any).GMOverlay !== 'undefined') {
        const GMOverlay = (window as any).GMOverlay;
        if (GMOverlay.chat?.send) {
          GMOverlay.chat.send(text);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-64">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="section-header flex items-center gap-2">
          <MessageSquare size={14} />
          Chat Log
        </h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'p-1 rounded text-neutral-400 hover:text-neutral-100 transition-colors',
            showFilters && 'bg-neutral-700 text-neutral-100'
          )}
          title="Filter messages"
        >
          <Filter size={14} />
        </button>
      </div>

      {/* Filter tabs */}
      {showFilters && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                'px-2 py-0.5 rounded text-xs transition-colors',
                filter === opt.value
                  ? 'bg-cyan-600 text-white'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Messages list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1 scrollbar-thin bg-neutral-800/50 rounded p-2"
      >
        {filteredMessages.length === 0 ? (
          <p className="text-xs text-neutral-500 text-center py-4">
            No messages yet
          </p>
        ) : (
          filteredMessages.map((msg) => (
            <ChatMessageItem key={msg.id} message={msg} formatTime={formatTime} />
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send GM message..."
          className="input flex-1 text-sm"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="btn btn-primary p-2"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

interface ChatMessageItemProps {
  message: ChatMessage;
  formatTime: (timestamp: number) => string;
}

function ChatMessageItem({ message, formatTime }: ChatMessageItemProps) {
  const typeStyles: Record<string, string> = {
    system: 'text-neutral-400 italic',
    player: 'text-cyan-300',
    rolls: 'text-amber-300',
    gm: 'text-green-300',
  };

  const typeIcons: Record<string, React.ReactNode> = {
    rolls: <Dice1 size={10} className="inline mr-1" />,
  };

  return (
    <div className={cn('text-xs', typeStyles[message.type] || 'text-neutral-300')}>
      <span className="text-neutral-500 mr-1">[{formatTime(message.timestamp)}]</span>
      {typeIcons[message.type]}
      {message.sender && (
        <span className="font-medium mr-1">{message.sender}:</span>
      )}
      <span>{message.text}</span>
    </div>
  );
}
