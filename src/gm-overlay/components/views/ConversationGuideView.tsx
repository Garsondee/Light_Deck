import { useState } from 'react';
import { ArrowLeft, Check, X, ChevronDown, ChevronRight, Target } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useViewStore } from '../../store/viewStore';
import type { Conversation, ConversationTopic } from '../../types';

interface ConversationGuideViewProps {
  conversation: Conversation;
}

const dispositionEmoji: Record<string, string> = {
  neutral: '😐',
  sad: '😢',
  angry: '😠',
  happy: '😊',
  fearful: '😨',
};

const dispositionLabel: Record<string, string> = {
  neutral: 'NEUTRAL TOPICS',
  sad: 'SAD TOPICS (Makes NPC melancholy, more honest)',
  angry: 'ANGRY TOPICS (Makes NPC defensive, evasive)',
  happy: 'HAPPY TOPICS (Makes NPC friendly, talkative)',
  fearful: 'FEARFUL TOPICS (Makes NPC anxious, cautious)',
};

export function ConversationGuideView({ conversation }: ConversationGuideViewProps) {
  const { popView } = useViewStore();
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  // Group topics by disposition
  const topicsByDisposition = conversation.topics.reduce((acc, topic) => {
    if (!acc[topic.disposition]) {
      acc[topic.disposition] = [];
    }
    acc[topic.disposition].push(topic);
    return acc;
  }, {} as Record<string, ConversationTopic[]>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <button
        onClick={popView}
        className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
      >
        <ArrowLeft size={16} /> Back to Scene
      </button>

      <h2 className="text-xl font-bold">
        💬 Conversation: {conversation.npc_name || 'NPC'}
      </h2>

      {/* Imperatives */}
      <div className="space-y-2">
        <h3 className="font-semibold text-amber-400">⚠️ Scene Imperatives</h3>
        
        {conversation.imperatives.must.map((item, i) => (
          <div
            key={`must-${i}`}
            className={cn(
              'flex items-start gap-2 p-2 rounded',
              'bg-green-900/30 border border-green-700'
            )}
          >
            <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold text-green-400">MUST:</span>{' '}
              <span className="text-neutral-200">{item}</span>
            </div>
          </div>
        ))}

        {conversation.imperatives.must_not.map((item, i) => (
          <div
            key={`must-not-${i}`}
            className={cn(
              'flex items-start gap-2 p-2 rounded',
              'bg-red-900/30 border border-red-700'
            )}
          >
            <X size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold text-red-400">MUST NOT:</span>{' '}
              <span className="text-neutral-200">{item}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Topics by Disposition */}
      {['neutral', 'sad', 'angry', 'happy', 'fearful'].map((disposition) => {
        const topics = topicsByDisposition[disposition];
        if (!topics || topics.length === 0) return null;

        return (
          <div key={disposition} className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <span>{dispositionEmoji[disposition]}</span>
              <span>{dispositionLabel[disposition]}</span>
            </h3>

            <ul className="space-y-2">
              {topics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  expanded={expandedTopic === topic.id}
                  onToggle={() =>
                    setExpandedTopic(expandedTopic === topic.id ? null : topic.id)
                  }
                />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

interface TopicCardProps {
  topic: ConversationTopic;
  expanded: boolean;
  onToggle: () => void;
}

function TopicCard({ topic, expanded, onToggle }: TopicCardProps) {
  return (
    <li className="bg-neutral-800 rounded overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-neutral-750"
      >
        <span className="font-medium text-cyan-400">[{topic.label}]</span>
        {expanded ? (
          <ChevronDown size={16} className="text-neutral-400" />
        ) : (
          <ChevronRight size={16} className="text-neutral-400" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {topic.hints.map((hint, i) => (
            <p key={i} className="text-sm text-neutral-300 pl-4 border-l-2 border-neutral-600">
              → {hint}
            </p>
          ))}

          {topic.check && (
            <div className="mt-2 p-2 bg-amber-900/20 border border-amber-700 rounded flex items-center gap-2">
              <Target size={14} className="text-amber-400" />
              <span className="text-sm">
                <span className="text-amber-400">{topic.check.trigger}:</span>{' '}
                {topic.check.skill} DC {topic.check.dc}
              </span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
