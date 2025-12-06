import { ArrowLeft, ExternalLink, Eye, MapPin, EyeOff, Skull, Lock } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useViewStore } from '../../store/viewStore';
import type { NPC } from '../../types';
import { Section } from '../shared/Section';

interface NPCDetailViewProps {
  npc: NPC;
}

export function NPCDetailView({ npc }: NPCDetailViewProps) {
  const { popView } = useViewStore();

  const handlePopout = () => {
    // Open NPC in new window
    window.open(`/npc/${npc.id}`, '_blank', 'width=600,height=800');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={popView}
          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
        >
          <ArrowLeft size={16} /> Back to Scene
        </button>
        <button
          onClick={handlePopout}
          className="text-neutral-400 hover:text-neutral-100"
          title="Pop out"
        >
          <ExternalLink size={16} />
        </button>
      </div>

      {/* Identity */}
      <header className="border-b border-neutral-700 pb-4">
        <h2 className="text-2xl font-bold">{npc.name}</h2>
        <p className="text-neutral-400">
          {npc.pronouns && `(${npc.pronouns}) `}
          {npc.species && `[${npc.species}] `}
          {npc.faction && `[Faction: ${npc.faction}]`}
        </p>
        <p className="text-lg text-neutral-200">
          {npc.role}
          {npc.archetype && ` | ${npc.archetype}`}
        </p>

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton icon={<Eye size={14} />} label="Show Image" onClick={() => showImage(npc)} />
          <ActionButton icon={<MapPin size={14} />} label="Ping Token" onClick={() => pingToken(npc)} />
          <ActionButton icon={<EyeOff size={14} />} label="Hide" onClick={() => hideNPC(npc)} />
          <ActionButton
            icon={<Skull size={14} />}
            label="Kill"
            variant="danger"
            onClick={() => killNPC(npc)}
          />
        </div>
      </header>

      {/* Description */}
      <Section title="Description">
        <p className="text-neutral-300">{npc.description}</p>
      </Section>

      {/* Appearance (public) */}
      {npc.appearance && (
        <Section title="Appearance">
          <p className="text-neutral-300">{npc.appearance}</p>
        </Section>
      )}

      {/* Demeanor (public) */}
      {npc.demeanor && (
        <Section title="Demeanor">
          <p className="text-neutral-300">{npc.demeanor}</p>
        </Section>
      )}

      {/* Known Facts (public) */}
      {npc.known_facts && npc.known_facts.length > 0 && (
        <Section title="Known Facts">
          <ul className="list-disc list-inside space-y-1 text-neutral-300">
            {npc.known_facts.map((fact, i) => (
              <li key={i}>{fact}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Linked Entities */}
      {npc.linked_entities && npc.linked_entities.length > 0 && (
        <Section title="Linked Entities">
          <div className="flex flex-wrap gap-2">
            {npc.linked_entities.map((entity) => (
              <span
                key={entity.id}
                className={cn(
                  'badge',
                  entity.type === 'faction' && 'badge-amber',
                  entity.type === 'location' && 'badge-green',
                  entity.type === 'npc' && 'badge-cyan',
                  entity.type === 'item' && 'badge-red'
                )}
              >
                {entity.label}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Stats */}
      {npc.stats && (
        <Section title="Stats">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <StatBox label="Stress" value={`${npc.stats.stress}/${npc.stats.stressMax}`} />
            <StatBox label="Wounds" value={npc.stats.wounds} />
            <StatBox label="Armor" value={npc.stats.armor} />
            <StatBox label="Attack" value={`+${npc.stats.attack}`} />
            {npc.stats.defense && <StatBox label="Defense" value={npc.stats.defense} />}
          </div>
        </Section>
      )}

      {/* Attributes */}
      {npc.attributes && (
        <Section title="Attributes">
          <div className="flex flex-wrap gap-3 text-sm font-mono">
            {Object.entries(npc.attributes).map(([key, value]) => (
              <span key={key} className="text-neutral-300">
                <span className="text-neutral-500">{key.toUpperCase()}</span>{' '}
                <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {value >= 0 ? '+' : ''}{value}
                </span>
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Skills */}
      {npc.skills && (
        <Section title="Skills">
          <div className="space-y-1 text-sm">
            {Object.entries(npc.skills).map(([key, value]) => (
              value && (
                <div key={key} className="flex justify-between">
                  <span className="text-neutral-400 capitalize">{key}:</span>
                  <span className="text-neutral-200">{value}</span>
                </div>
              )
            ))}
          </div>
        </Section>
      )}

      {/* Abilities */}
      {npc.abilities && npc.abilities.length > 0 && (
        <Section title="Abilities">
          <div className="space-y-3">
            {npc.abilities.map((ability, i) => (
              <div key={i} className="p-2 bg-neutral-800 rounded">
                <div className="flex items-center gap-2 font-medium">
                  {ability.icon && <span>{ability.icon}</span>}
                  {ability.name}
                </div>
                <p className="text-sm text-neutral-400 mt-1">{ability.description}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Weapons */}
      {npc.weapons && npc.weapons.length > 0 && (
        <Section title="Weapons">
          <div className="space-y-2">
            {npc.weapons.map((weapon, i) => (
              <div key={i} className="flex justify-between text-sm p-2 bg-neutral-800 rounded">
                <span className="font-medium">{weapon.name}</span>
                <span className="text-amber-400">{weapon.damage}</span>
                {weapon.range && <span className="text-neutral-400">{weapon.range}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Cyberware */}
      {npc.cyberware && npc.cyberware.length > 0 && (
        <Section title="Cyberware">
          <ul className="list-disc list-inside space-y-1 text-neutral-300 text-sm">
            {npc.cyberware.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Loot */}
      {npc.loot && npc.loot.length > 0 && (
        <Section title="Loot">
          <div className="space-y-1 text-sm">
            {npc.loot.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-neutral-300">{item.item}</span>
                <span className="text-neutral-500">{item.chance}%</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Secrets */}
      {npc.secrets && Object.keys(npc.secrets).length > 0 && (
        <Section title="Secrets" icon={Lock} variant="secret">
          <div className="space-y-2">
            {Object.entries(npc.secrets).map(([key, value]) => (
              <div key={key} className="p-2 bg-red-900/20 border border-red-800 rounded">
                <span className="text-red-400 font-medium capitalize">{key}:</span>{' '}
                <span className="text-neutral-300">{value}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Behavior */}
      {npc.behavior && (
        <Section title="Behavior">
          <div className="space-y-2 text-sm">
            {npc.behavior.tactics && (
              <div>
                <span className="text-neutral-400">Tactics:</span>{' '}
                <span className="text-neutral-200">{npc.behavior.tactics}</span>
              </div>
            )}
            {npc.behavior.morale && (
              <div>
                <span className="text-neutral-400">Morale:</span>{' '}
                <span className="text-neutral-200">{npc.behavior.morale}</span>
              </div>
            )}
            {npc.behavior.motivation && (
              <div>
                <span className="text-neutral-400">Motivation:</span>{' '}
                <span className="text-neutral-200">{npc.behavior.motivation}</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* GM Notes */}
      {npc.notes && (
        <Section title="GM Notes">
          <p className="text-neutral-300 text-sm">{npc.notes}</p>
        </Section>
      )}
    </div>
  );
}

// Sub-components

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-2 bg-neutral-800 rounded text-center">
      <div className="text-neutral-400 text-xs">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  variant = 'default',
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'btn flex items-center gap-1.5',
        variant === 'default' && 'btn-secondary',
        variant === 'danger' && 'btn-danger'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// Placeholder action functions
function showImage(npc: NPC) {
  console.log('[GM] Show image:', npc.image);
  window.dispatchEvent(new CustomEvent('gm-overlay:show-image', { detail: npc }));
}

function pingToken(npc: NPC) {
  console.log('[GM] Ping token:', npc.token);
  window.dispatchEvent(new CustomEvent('gm-overlay:ping-token', { detail: npc }));
}

function hideNPC(npc: NPC) {
  console.log('[GM] Hide NPC:', npc.id);
  window.dispatchEvent(new CustomEvent('gm-overlay:hide-npc', { detail: npc }));
}

function killNPC(npc: NPC) {
  console.log('[GM] Kill NPC:', npc.id);
  window.dispatchEvent(new CustomEvent('gm-overlay:kill-npc', { detail: npc }));
}
