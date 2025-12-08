import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  X, Minus, Plus, Users, Trash2, Save, 
  ChevronDown, ChevronRight, User, Zap 
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { usePlayerStore } from '../../store/playerStore';
import type { PlayerCharacter } from '../../types';

// Debounce hook for auto-save
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

// Character list item
function CharacterListItem({ 
  character, 
  isSelected, 
  isOnline,
  onClick 
}: { 
  character: PlayerCharacter; 
  isSelected: boolean;
  isOnline: boolean;
  onClick: () => void;
}) {
  // Some existing character JSONs store background as an object
  // (e.g. { key, name, skills, gear, debt, creditor }) instead of a plain string.
  // Derive a safe label so we never render the raw object.
  const backgroundValue: any = (character as any).background;
  const backgroundLabel =
    typeof backgroundValue === 'string'
      ? backgroundValue
      : backgroundValue?.name || backgroundValue?.key || 'custom';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors',
        isSelected 
          ? 'bg-cyan-600 text-white' 
          : 'hover:bg-neutral-700 text-neutral-200'
      )}
    >
      <div className="relative">
        <User size={16} />
        {isOnline && (
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">
          {character.name || 'Unnamed'}
        </div>
        <div className="text-xs opacity-70 truncate">
          {character.handle ? `"${character.handle}"` : 'No handle'} • {backgroundLabel}
        </div>
      </div>
    </button>
  );
}

// Collapsible section
function Section({ 
  title, 
  children, 
  defaultOpen = true 
}: { 
  title: string; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-neutral-700 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700/50"
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </button>
      {isOpen && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// Attribute/Skill input row
function StatRow({ 
  label, 
  value, 
  onChange,
  min = 0,
  max = 5 
}: { 
  label: string; 
  value: number; 
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-neutral-300 capitalize">
        {label.replace(/_/g, ' ')}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="p-0.5 hover:bg-neutral-600 rounded"
          disabled={value <= min}
        >
          <Minus size={12} />
        </button>
        <span className="w-6 text-center font-mono text-sm">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="p-0.5 hover:bg-neutral-600 rounded"
          disabled={value >= max}
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

// Ensure we can safely edit legacy/partial character data
function normalizeCharacter(character: PlayerCharacter): PlayerCharacter {
  const anyChar: any = character as any;

  // Normalize background which may be stored as an object in older JSON
  const rawBackground: any = anyChar.background;
  const background: string =
    typeof rawBackground === 'string'
      ? rawBackground
      : rawBackground?.name || rawBackground?.key || 'street';

  // Default attribute block
  const baseAttributes = {
    reflex: 0,
    body: 0,
    tech: 0,
    neural: 0,
    edge: 0,
    presence: 0,
  };

  // Default skills block (matches createBlankCharacter)
  const baseSkills = {
    firearms: 0,
    heavy_weapons: 0,
    melee: 0,
    evasion: 0,
    netrunning: 0,
    hardware: 0,
    rigging: 0,
    medicine: 0,
    persuasion: 0,
    intimidation: 0,
    deception: 0,
    streetwise: 0,
    perception: 0,
    investigation: 0,
    stealth: 0,
    survival: 0,
  } as const;

  const attrs = character.attributes || (baseAttributes as any);
  const skills = (character as any).skills || (baseSkills as any);

  // Default derived block
  const baseDerived = {
    stress: 0,
    stressMax: 5,
    wounds: [
      { slot: 1, name: null, penalty: -1 },
      { slot: 2, name: null, penalty: -2 },
      { slot: 3, name: null, penalty: 'out' as const },
    ],
    armor: 0,
  };

  const derived = (character as any).derived || (baseDerived as any);

  return {
    // spread original so we keep any extra fields
    ...(character as any),
    background,
    attributes: { ...baseAttributes, ...attrs },
    skills: { ...baseSkills, ...skills },
    derived: {
      ...baseDerived,
      ...derived,
      // ensure wounds at least has the base structure
      wounds: Array.isArray(derived.wounds) && derived.wounds.length > 0
        ? derived.wounds
        : baseDerived.wounds,
    },
  } as PlayerCharacter;
}

// Character editor form
function CharacterEditor({ 
  character, 
  onUpdate 
}: { 
  character: PlayerCharacter; 
  onUpdate: (char: PlayerCharacter) => void;
}) {
  const [localChar, setLocalChar] = useState(() => normalizeCharacter(character));
  const debouncedChar = useDebounce(localChar, 500);
  
  // Sync when character changes externally
  useEffect(() => {
    setLocalChar(normalizeCharacter(character));
  }, [character.id]);
  
  // Auto-save on debounced changes
  useEffect(() => {
    if (debouncedChar.id === character.id && debouncedChar !== character) {
      onUpdate(debouncedChar);
    }
  }, [debouncedChar, character.id, onUpdate]);
  
  const updateField = <K extends keyof PlayerCharacter>(
    field: K, 
    value: PlayerCharacter[K]
  ) => {
    setLocalChar(prev => ({ ...prev, [field]: value }));
  };
  
  const updateAttribute = (attr: string, value: number) => {
    setLocalChar(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [attr]: value },
    }));
  };
  
  const updateSkill = (skill: string, value: number) => {
    setLocalChar(prev => ({
      ...prev,
      skills: { ...prev.skills, [skill]: value },
    }));
  };
  
  const updateDerived = (field: string, value: number) => {
    setLocalChar(prev => ({
      ...prev,
      derived: { ...prev.derived, [field]: value },
    }));
  };
  
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Identity */}
      <Section title="Identity" defaultOpen={true}>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-neutral-500">Name</label>
            <input
              type="text"
              value={localChar.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="input w-full"
              placeholder="Character name"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-neutral-500">Handle</label>
              <input
                type="text"
                value={localChar.handle}
                onChange={(e) => updateField('handle', e.target.value)}
                className="input w-full"
                placeholder="Street name"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-neutral-500">Pronouns</label>
              <input
                type="text"
                value={localChar.pronouns || ''}
                onChange={(e) => updateField('pronouns', e.target.value)}
                className="input w-full"
                placeholder="they/them"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-500">Background</label>
            <select
              value={localChar.background}
              onChange={(e) => updateField('background', e.target.value)}
              className="input w-full"
            >
              <option value="street">Street</option>
              <option value="corporate">Corporate</option>
              <option value="techie">Techie</option>
              <option value="nomad">Nomad</option>
              <option value="fixer">Fixer</option>
              <option value="enforcer">Enforcer</option>
            </select>
          </div>
        </div>
      </Section>
      
      {/* Attributes */}
      <Section title="Attributes" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-x-4">
          {Object.entries(localChar.attributes).map(([attr, val]) => (
            <StatRow
              key={attr}
              label={attr}
              value={val}
              onChange={(v) => updateAttribute(attr, v)}
              min={-2}
              max={5}
            />
          ))}
        </div>
      </Section>
      
      {/* Skills */}
      <Section title="Skills" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-x-4">
          {Object.entries(localChar.skills).map(([skill, val]) => (
            <StatRow
              key={skill}
              label={skill}
              value={val as number}
              onChange={(v) => updateSkill(skill, v)}
              min={0}
              max={5}
            />
          ))}
        </div>
      </Section>
      
      {/* Derived Stats */}
      <Section title="Status" defaultOpen={true}>
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-neutral-500">Stress</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={localChar.derived.stressMax}
                  value={localChar.derived.stress}
                  onChange={(e) => updateDerived('stress', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="font-mono text-sm w-12 text-right">
                  {localChar.derived.stress}/{localChar.derived.stressMax}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <label className="text-xs text-neutral-500">Max Stress</label>
              <input
                type="number"
                value={localChar.derived.stressMax}
                onChange={(e) => updateDerived('stressMax', parseInt(e.target.value) || 5)}
                className="input w-16"
                min={1}
                max={20}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Armor</label>
              <input
                type="number"
                value={localChar.derived.armor}
                onChange={(e) => updateDerived('armor', parseInt(e.target.value) || 0)}
                className="input w-16"
                min={0}
                max={10}
              />
            </div>
          </div>
        </div>
      </Section>
      
      {/* Resources */}
      <Section title="Resources" defaultOpen={false}>
        <div className="flex gap-4">
          <div>
            <label className="text-xs text-neutral-500">Credits (¢)</label>
            <input
              type="number"
              value={localChar.credits}
              onChange={(e) => updateField('credits', parseInt(e.target.value) || 0)}
              className="input w-28"
              min={0}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Experience</label>
            <input
              type="number"
              value={localChar.experience}
              onChange={(e) => updateField('experience', parseInt(e.target.value) || 0)}
              className="input w-20"
              min={0}
            />
          </div>
        </div>
      </Section>
      
      {/* Notes */}
      <Section title="Notes" defaultOpen={false}>
        <textarea
          value={localChar.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          className="input w-full h-24 resize-none"
          placeholder="Character notes..."
        />
      </Section>
    </div>
  );
}

// Main panel component
export function PlayerManagerPanel() {
  const {
    isPanelOpen,
    isPanelMinimized,
    panelPosition,
    characters,
    connectedPlayers,
    selectedCharacterId,
    isLoading,
    closePanel,
    toggleMinimize,
    setPanelPosition,
    selectCharacter,
    loadCharacters,
    saveCharacter,
    deleteCharacter,
    createNewCharacter,
  } = usePlayerStore();
  
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  
  // Load characters on mount
  useEffect(() => {
    if (isPanelOpen && characters.length === 0) {
      loadCharacters();
    }
  }, [isPanelOpen, characters.length, loadCharacters]);
  
  // Drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) return;
    
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: panelPosition.x,
      startPosY: panelPosition.y,
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelPosition]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    setPanelPosition(
      dragRef.current.startPosX + dx,
      dragRef.current.startPosY + dy
    );
  }, [setPanelPosition]);
  
  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);
  
  const handleSaveCharacter = useCallback(async (char: PlayerCharacter) => {
    try {
      await saveCharacter(char);
    } catch (err) {
      console.error('Failed to save character:', err);
    }
  }, [saveCharacter]);
  
  const handleDeleteCharacter = useCallback(async () => {
    if (!selectedCharacterId) return;
    if (!confirm('Delete this character? This cannot be undone.')) return;
    
    try {
      await deleteCharacter(selectedCharacterId);
    } catch (err) {
      console.error('Failed to delete character:', err);
    }
  }, [selectedCharacterId, deleteCharacter]);
  
  const handleCreateNew = useCallback(() => {
    const newChar = createNewCharacter();
    // Auto-save the new character
    saveCharacter(newChar);
  }, [createNewCharacter, saveCharacter]);
  
  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);
  
  // Check if a character is online
  const isCharacterOnline = (charId: string) => 
    connectedPlayers.some(p => p.characterId === charId);
  
  if (!isPanelOpen) return null;
  
  const playerCount = connectedPlayers.filter(p => p.role === 'player').length;
  
  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed z-50 bg-neutral-800 rounded-lg shadow-2xl border border-neutral-600',
        'flex flex-col',
        isPanelMinimized ? 'w-64' : 'w-[600px]'
      )}
      style={{
        left: panelPosition.x,
        top: panelPosition.y,
        maxHeight: isPanelMinimized ? 'auto' : 'calc(100vh - 100px)',
      }}
    >
      {/* Header - draggable */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-neutral-700 rounded-t-lg cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Users size={16} className="text-cyan-400" />
          <span className="font-medium text-sm">
            Players
            {playerCount > 0 && (
              <span className="ml-1 text-green-400">({playerCount} online)</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleMinimize}
            className="p-1 hover:bg-neutral-600 rounded"
            title={isPanelMinimized ? 'Expand' : 'Minimize'}
          >
            <Minus size={14} />
          </button>
          <button
            onClick={closePanel}
            className="p-1 hover:bg-neutral-600 rounded"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      {!isPanelMinimized && (
        <div className="flex flex-1 min-h-0" style={{ height: '500px' }}>
          {/* Character list sidebar */}
          <div className="w-48 border-r border-neutral-700 flex flex-col">
            <div className="p-2 border-b border-neutral-700">
              <button
                onClick={handleCreateNew}
                className="w-full btn btn-primary text-xs flex items-center justify-center gap-1"
              >
                <Plus size={14} />
                New Character
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoading ? (
                <div className="text-center text-neutral-500 py-4 text-sm">
                  Loading...
                </div>
              ) : characters.length === 0 ? (
                <div className="text-center text-neutral-500 py-4 text-sm">
                  No characters yet
                </div>
              ) : (
                characters.map(char => (
                  <CharacterListItem
                    key={char.id}
                    character={char}
                    isSelected={char.id === selectedCharacterId}
                    isOnline={isCharacterOnline(char.id)}
                    onClick={() => selectCharacter(char.id)}
                  />
                ))
              )}
            </div>
          </div>
          
          {/* Character editor */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedCharacter ? (
              <>
                <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-400" />
                    <span className="text-sm font-medium truncate">
                      {selectedCharacter.name || 'Unnamed Character'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSaveCharacter(selectedCharacter)}
                      className="p-1.5 hover:bg-neutral-700 rounded text-green-400"
                      title="Save now"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      onClick={handleDeleteCharacter}
                      className="p-1.5 hover:bg-neutral-700 rounded text-red-400"
                      title="Delete character"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <CharacterEditor
                  character={selectedCharacter}
                  onUpdate={handleSaveCharacter}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-neutral-500">
                <div className="text-center">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a character to edit</p>
                  <p className="text-xs mt-1">or create a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
