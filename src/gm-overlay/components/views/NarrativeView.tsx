import { MapPin, BookOpen, Users, Target, Zap, MessageCircle, Sun, Volume2, Play, Mic } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useViewStore } from '../../store/viewStore';
import type { Scene, NPCReference, SkillCheck, Trigger } from '../../types';
import { Section } from '../shared/Section';
import { NPCLink } from '../shared/NPCLink';
import { SceneTransitionPanel } from './SceneTransitionPanel';
import { SceneImageManager } from '../sidebar/SceneImageManager';

type SceneEnvironment = NonNullable<Scene['environment']>;

interface NarrativeViewProps {
  scene: Scene | null;
}

export function NarrativeView({ scene }: NarrativeViewProps) {
  if (!scene) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500">
        No scene loaded
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Location */}
      <Section id="location" title="Location" icon={MapPin}>
        <p className="text-lg font-medium text-neutral-100">{scene.location}</p>
        {scene.environment && (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {scene.environment.tone && (
              <>
                <dt className="text-neutral-400">Tone</dt>
                <dd className="text-neutral-200">{scene.environment.tone}</dd>
              </>
            )}
            {scene.environment.lighting && (
              <>
                <dt className="text-neutral-400 flex items-center gap-2">
                  <Sun size={14} /> Lighting
                  {scene.environment.lighting.actuator && (
                    <ActuatorButton
                      icon={<Sun size={12} />}
                      label="Apply"
                      onClick={() => applyLighting(scene.environment?.lighting)}
                    />
                  )}
                </dt>
                <dd className="text-neutral-200">{scene.environment.lighting.description}</dd>
              </>
            )}
            {scene.environment.audio && (
              <>
                <dt className="text-neutral-400 flex items-center gap-2">
                  <Volume2 size={14} /> Audio
                  {scene.environment.audio.actuator && (
                    <ActuatorButton
                      icon={<Play size={12} />}
                      label="Play"
                      onClick={() => playAudio(scene.environment?.audio)}
                    />
                  )}
                </dt>
                <dd className="text-neutral-200">{scene.environment.audio.description}</dd>
              </>
            )}
            {scene.environment.smell && (
              <>
                <dt className="text-neutral-400">Smell</dt>
                <dd className="text-neutral-200">{scene.environment.smell}</dd>
              </>
            )}
          </dl>
        )}
      </Section>

      {/* Narrative + Scene image (flow around) */}
      <Section
        id="narrative"
        title="Narrative"
        icon={BookOpen}
        action={
          <button
            onClick={() => useViewStore.getState().pushView('karaoke', scene, 'Karaoke')}
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
          >
            <Mic size={12} /> Karaoke
          </button>
        }
      >
        <div className="relative">
          {/* Float thumbnail so narrative text wraps around it */}
          <div className="float-right ml-6 mb-3 w-72 max-w-[40%]">
            <SceneImageManager />
          </div>

          <NarrativeText text={scene.narrative} />

          {/* Clear float so later sections don't wrap */}
          <div className="clear-both" />
        </div>
      </Section>

      {/* NPCs */}
      {scene.npcs && scene.npcs.length > 0 && (
        <Section id="npcs" title="NPCs in Scene" icon={Users}>
          <ul className="space-y-1">
            {scene.npcs.map((npc) => (
              <NPCListItem key={npc.id} npc={npc} />
            ))}
          </ul>
        </Section>
      )}

      {/* Skill Checks */}
      {scene.challenges && scene.challenges.length > 0 && (
        <Section id="checks" title="Skill Checks" icon={Target}>
          <ul className="space-y-2">
            {scene.challenges.map((check) => (
              <SkillCheckItem key={check.id} check={check} />
            ))}
          </ul>
        </Section>
      )}

      {/* Triggers */}
      {scene.triggers && scene.triggers.length > 0 && (
        <Section id="triggers" title="Triggers" icon={Zap}>
          <ul className="space-y-2">
            {scene.triggers.map((trigger) => (
              <TriggerItem key={trigger.id} trigger={trigger} />
            ))}
          </ul>
        </Section>
      )}

      {/* Conversation Guide Summary */}
      {scene.conversation && (
        <Section id="dialogue" title="Conversation Guide" icon={MessageCircle}>
          <ConversationSummary conversation={scene.conversation} />
        </Section>
      )}

      {/* Scene Transitions - Always at the end */}
      <SceneTransitionPanel scene={scene} />
    </div>
  );
}

// Sub-components

function NarrativeText({ text }: { text: string }) {
  // Parse [NPC Name] links in narrative text
  const parts = text.split(/(\[[^\]]+\])/g);

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      {parts.map((part, i) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          const name = part.slice(1, -1);
          return <NPCLink key={i} name={name} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

function NPCListItem({ npc }: { npc: NPCReference }) {
  const { selectNPC } = useViewStore();

  const stateIcon = {
    active: '●',
    passive: '○',
    hidden: '◐',
    defeated: '✗',
  }[npc.state];

  const stateColor = {
    active: 'text-green-400',
    passive: 'text-neutral-400',
    hidden: 'text-blue-400',
    defeated: 'text-red-400',
  }[npc.state];

  const handleClick = async () => {
    // Fetch full NPC data (GM gets full access)
    try {
      const response = await fetch(`/api/npcs/${npc.statblock || npc.id}?role=gm`);
      if (response.ok) {
        const fullNPC = await response.json();
        selectNPC(fullNPC);
      }
    } catch (error) {
      console.error('Failed to load NPC:', error);
    }
  };

  return (
    <li>
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-2 w-full text-left px-2 py-1 rounded',
          'hover:bg-neutral-700 transition-colors'
        )}
      >
        <span className={stateColor}>{stateIcon}</span>
        <span className="text-cyan-400 hover:text-cyan-300">[{npc.name}]</span>
        <span className="text-neutral-400">- {npc.role}</span>
      </button>
    </li>
  );
}

function SkillCheckItem({ check }: { check: SkillCheck }) {
  const typeLabel = {
    active: 'ACTIVE',
    passive: 'PASSIVE',
    hidden: 'HIDDEN',
  }[check.type];

  const typeColor = {
    active: 'badge-cyan',
    passive: 'badge-green',
    hidden: 'badge-amber',
  }[check.type];

  const handleRoll = () => {
    // Trigger skill check roll
    const roll = Math.floor(Math.random() * 20) + 1;
    const success = roll >= check.dc;
    console.log(`[GM] ${check.name} (DC ${check.dc}): d20 = ${roll} - ${success ? 'SUCCESS' : 'FAIL'}`);
    // TODO: Broadcast to chat
  };

  return (
    <li className="flex items-center justify-between p-2 bg-neutral-800 rounded">
      <div className="flex items-center gap-2">
        <Target size={14} className="text-amber-400" />
        <span className="font-medium">{check.skill}</span>
        <span className="text-neutral-400">DC {check.dc}</span>
        <span className="text-neutral-300">- {check.name}</span>
        <span className={cn('badge', typeColor)}>{typeLabel}</span>
      </div>
      <button
        onClick={handleRoll}
        className="btn btn-secondary text-xs"
      >
        Roll
      </button>
    </li>
  );
}

function TriggerItem({ trigger }: { trigger: Trigger }) {
  const handleFire = () => {
    console.log('[GM] Trigger fired:', trigger.label);
    // TODO: Execute trigger action
  };

  return (
    <li className="flex items-center justify-between p-2 bg-neutral-800 rounded">
      <div className="flex items-center gap-2">
        <Zap size={14} className="text-yellow-400" />
        <span className="font-medium">{trigger.label}</span>
        {trigger.text && (
          <span className="text-neutral-400 text-sm truncate max-w-xs">
            - {trigger.text}
          </span>
        )}
        {trigger.irreversible && (
          <span className="badge badge-red">Irreversible</span>
        )}
      </div>
      <button
        onClick={handleFire}
        className="btn btn-secondary text-xs"
      >
        Fire
      </button>
    </li>
  );
}

function ConversationSummary({ conversation }: { conversation: Scene['conversation'] }) {
  if (!conversation) return null;

  return (
    <div className="space-y-3">
      {/* Imperatives */}
      <div className="space-y-1">
        {conversation.imperatives.must.map((item, i) => (
          <div key={i} className="text-sm px-2 py-1 bg-green-900/30 border border-green-700 rounded">
            <span className="text-green-400 font-medium">MUST:</span> {item}
          </div>
        ))}
        {conversation.imperatives.must_not.map((item, i) => (
          <div key={i} className="text-sm px-2 py-1 bg-red-900/30 border border-red-700 rounded">
            <span className="text-red-400 font-medium">MUST NOT:</span> {item}
          </div>
        ))}
      </div>

      {/* Topic count */}
      <p className="text-sm text-neutral-400">
        {conversation.topics.length} conversation topics available
      </p>

      <button
        onClick={() => useViewStore.getState().pushView('conversation', conversation, 'Conversation')}
        className="btn btn-secondary text-sm"
      >
        Open Full Guide
      </button>
    </div>
  );
}

// Actuator button for lighting/audio
function ActuatorButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="ml-2 px-1.5 py-0.5 text-xs bg-cyan-600 hover:bg-cyan-500 rounded flex items-center gap-1"
    >
      {icon}
      {label}
    </button>
  );
}

// Placeholder functions for actuators
function applyLighting(lighting: SceneEnvironment['lighting'] | undefined) {
  if (!lighting) return;
  console.log('[GM] Applying lighting:', lighting.preset || lighting.description);
  // TODO: Dispatch to main app
  window.dispatchEvent(new CustomEvent('gm-overlay:lighting', { detail: lighting }));
}

function playAudio(audio: SceneEnvironment['audio'] | undefined) {
  if (!audio) return;
  console.log('[GM] Playing audio:', audio.tracks || audio.description);
  // TODO: Dispatch to main app
  window.dispatchEvent(new CustomEvent('gm-overlay:audio', { detail: audio }));
}
