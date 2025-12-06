# GM Overlay v2 - React Component Architecture

**Status:** PLANNING  
**Created:** 2025-12-05  
**Related:** GM_OVERLAY_V2_PLAN.md  

---

## Overview

The GM Overlay is a **DOM-based, non-diegetic control surface** that sits above the Three.js canvas. It uses React for component structure and state management, with a clean modern UI (no CRT effects).

Players never see this overlay—it's hidden via CSS when not in GM mode.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| UI Framework | React 18+ |
| Styling | Tailwind CSS + CSS Modules |
| State | Zustand (lightweight, no Redux boilerplate) |
| Icons | Lucide React |
| Modals/Dialogs | Radix UI primitives |
| Keyboard Shortcuts | react-hotkeys-hook |
| Data Fetching | Native fetch + SWR for caching |

---

## File Structure

```
public/
└── gm-overlay/
    ├── index.html              # Entry point (loaded in iframe or injected)
    └── ...

src/
└── gm-overlay/
    ├── index.tsx               # React root mount
    ├── App.tsx                 # Main app shell
    ├── store/
    │   ├── index.ts            # Zustand store exports
    │   ├── sceneStore.ts       # Current scene, navigation state
    │   ├── viewStore.ts        # Current view, breadcrumbs, view stack
    │   ├── sessionStore.ts     # Session notes, flags, clock
    │   └── chatStore.ts        # GM chat log messages
    │
    ├── hooks/
    │   ├── useScene.ts         # Scene data fetching
    │   ├── useNPC.ts           # NPC data fetching
    │   ├── useKeyboardShortcuts.ts
    │   └── useSyncManager.ts   # Bridge to existing SyncManager
    │
    ├── components/
    │   ├── layout/
    │   │   ├── GMOverlayShell.tsx      # Full-screen container
    │   │   ├── Header.tsx              # Title bar + settings + close
    │   │   ├── Breadcrumbs.tsx         # Navigation trail + Hub button
    │   │   ├── IndexBar.tsx            # Section anchors
    │   │   ├── MainPanel.tsx           # Left 60% - view router
    │   │   ├── Sidebar.tsx             # Right 40% - always visible
    │   │   └── NavBar.tsx              # Bottom nav + karaoke/guide
    │   │
    │   ├── views/
    │   │   ├── NarrativeView.tsx       # Default scene view
    │   │   ├── NPCDetailView.tsx       # NPC statblock + actions
    │   │   ├── ItemDetailView.tsx      # Item details
    │   │   ├── ConversationGuideView.tsx # Disposition-based hints
    │   │   ├── DashboardView.tsx       # Landing/downtime state
    │   │   └── KaraokeView.tsx         # Teleprompter mode
    │   │
    │   ├── sidebar/
    │   │   ├── SceneInfo.tsx           # Static GM notes
    │   │   ├── SessionLog.tsx          # Editable notes
    │   │   ├── QuickActions.tsx        # Buttons + dropdowns
    │   │   ├── SceneElements.tsx       # NPCs, Items, Exits
    │   │   └── FlagsPanel.tsx          # Campaign flags
    │   │
    │   ├── modals/
    │   │   ├── SceneJumperModal.tsx    # Cmd+J
    │   │   ├── GlobalSearchModal.tsx   # Cmd+K (Omnibar)
    │   │   ├── AdHocCheckRadial.tsx    # Skill + DC picker
    │   │   ├── ConfirmTriggerModal.tsx # Irreversible action confirm
    │   │   └── SettingsModal.tsx       # Preferences
    │   │
    │   ├── chat/
    │   │   ├── GMChatLog.tsx           # DOM-based GM chat
    │   │   ├── ChatMessage.tsx         # Single message row
    │   │   ├── ChatFilters.tsx         # Filter toggles
    │   │   └── ChatInput.tsx           # GM note input
    │   │
    │   └── shared/
    │       ├── Button.tsx
    │       ├── Dropdown.tsx
    │       ├── Scrollbar.tsx
    │       ├── Badge.tsx
    │       ├── Tooltip.tsx
    │       ├── UndoToast.tsx           # 5-second undo notification
    │       └── NPCLink.tsx             # Clickable [NPC Name] in text
    │
    ├── utils/
    │   ├── parseNPCLinks.ts            # Extract [Name] from narrative
    │   ├── difficultyScale.ts          # DC labels and colors
    │   └── formatters.ts               # Time, dice, etc.
    │
    └── styles/
        ├── globals.css                 # Tailwind base + custom vars
        ├── theme.ts                    # Color tokens
        └── components/                 # CSS modules per component
```

---

## Component Hierarchy

```
<GMOverlayShell>                        # Full-screen DOM overlay
│
├── <Header />                          # Act/Ch/Scene title, settings, close
│
├── <Breadcrumbs />                     # Scene 1 > Jax > Bio-Dyne [Hub]
│
├── <IndexBar />                        # [📍] [📖] [👥] [🎯] [⚡] [💬]
│
├── <div className="main-content">      # Flex row
│   │
│   ├── <MainPanel>                     # Left 60%
│   │   │
│   │   └── {currentView === 'narrative' && <NarrativeView />}
│   │       {currentView === 'npc' && <NPCDetailView />}
│   │       {currentView === 'item' && <ItemDetailView />}
│   │       {currentView === 'conversation' && <ConversationGuideView />}
│   │       {currentView === 'dashboard' && <DashboardView />}
│   │       {currentView === 'karaoke' && <KaraokeView />}
│   │
│   └── <Sidebar>                       # Right 40%
│       ├── <SceneInfo />               # Static GM notes
│       ├── <SessionLog />              # Editable notes
│       ├── <QuickActions />            # Ad-hoc check, triggers, etc.
│       ├── <SceneElements />           # NPCs, Items, Exits
│       └── <FlagsPanel />              # Campaign flags
│
├── <NavBar />                          # [◀ PREV] [JUMP] [NEXT ▶] [KARAOKE] [GUIDE]
│
├── <GMChatLog />                       # Dockable/pop-out chat panel
│
└── {/* Modals (portaled) */}
    <SceneJumperModal />
    <GlobalSearchModal />
    <AdHocCheckRadial />
    <ConfirmTriggerModal />
    <SettingsModal />
    <UndoToast />
</GMOverlayShell>
```

---

## Key Components

### `<GMOverlayShell>`
```tsx
// Full-screen container that sits above Three.js canvas
// Hidden when GM mode is off

interface GMOverlayShellProps {
  isVisible: boolean;
  children: React.ReactNode;
}

export function GMOverlayShell({ isVisible, children }: GMOverlayShellProps) {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-neutral-900 text-neutral-100 flex flex-col">
      {children}
    </div>
  );
}
```

### `<Header>`
```tsx
// Title bar with scene label, settings gear, close button

interface HeaderProps {
  sceneLabel: string;       // "Act 1 / Ch 1 / Scene 1: The Briefing"
  position: string;         // "1 / 7"
  onSettings: () => void;
  onClose: () => void;
}

export function Header({ sceneLabel, position, onSettings, onClose }: HeaderProps) {
  return (
    <header className="h-12 px-4 flex items-center justify-between bg-neutral-800 border-b border-neutral-700">
      <h1 className="text-lg font-semibold">{sceneLabel}</h1>
      <div className="flex items-center gap-4">
        <span className="text-neutral-400">{position}</span>
        <button onClick={onSettings}><Settings size={20} /></button>
        <button onClick={onClose}><X size={20} /></button>
      </div>
    </header>
  );
}
```

### `<Breadcrumbs>`
```tsx
// Navigation trail with clickable segments

interface BreadcrumbsProps {
  trail: { label: string; onClick: () => void }[];
  hubLabel?: string;
  onHub?: () => void;
}

export function Breadcrumbs({ trail, hubLabel, onHub }: BreadcrumbsProps) {
  return (
    <nav className="h-8 px-4 flex items-center gap-2 bg-neutral-850 text-sm">
      {trail.map((crumb, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight size={14} className="text-neutral-500" />}
          <button onClick={crumb.onClick} className="hover:text-cyan-400">
            {crumb.label}
          </button>
        </Fragment>
      ))}
      <div className="flex-1" />
      {hubLabel && (
        <button onClick={onHub} className="flex items-center gap-1 text-amber-400">
          <Home size={14} /> {hubLabel}
        </button>
      )}
    </nav>
  );
}
```

### `<IndexBar>`
```tsx
// Horizontal section anchors

const sections = [
  { id: 'location', icon: MapPin, label: 'Location' },
  { id: 'narrative', icon: BookOpen, label: 'Narrative' },
  { id: 'npcs', icon: Users, label: 'NPCs' },
  { id: 'checks', icon: Target, label: 'Checks' },
  { id: 'triggers', icon: Zap, label: 'Triggers' },
  { id: 'dialogue', icon: MessageCircle, label: 'Dialogue' },
];

interface IndexBarProps {
  activeSection: string;
  availableSections: string[];  // Sections with content
  onSelect: (id: string) => void;
}

export function IndexBar({ activeSection, availableSections, onSelect }: IndexBarProps) {
  return (
    <nav className="h-10 px-4 flex items-center gap-1 bg-neutral-800 border-b border-neutral-700">
      {sections.map(({ id, icon: Icon, label }) => {
        const available = availableSections.includes(id);
        const active = activeSection === id;
        return (
          <button
            key={id}
            onClick={() => available && onSelect(id)}
            disabled={!available}
            className={cn(
              "px-3 py-1 rounded flex items-center gap-1.5 text-sm",
              active && "bg-cyan-600 text-white",
              !active && available && "hover:bg-neutral-700",
              !available && "opacity-40 cursor-not-allowed"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
```

### `<MainPanel>` (View Router)
```tsx
// Left panel that switches between views

type ViewType = 'narrative' | 'npc' | 'item' | 'conversation' | 'dashboard' | 'karaoke';

interface MainPanelProps {
  currentView: ViewType;
  scene: Scene | null;
  selectedNPC: NPC | null;
  selectedItem: Item | null;
}

export function MainPanel({ currentView, scene, selectedNPC, selectedItem }: MainPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {currentView === 'narrative' && <NarrativeView scene={scene} />}
      {currentView === 'npc' && <NPCDetailView npc={selectedNPC} />}
      {currentView === 'item' && <ItemDetailView item={selectedItem} />}
      {currentView === 'conversation' && <ConversationGuideView scene={scene} />}
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'karaoke' && <KaraokeView scene={scene} />}
    </div>
  );
}
```

### `<NarrativeView>`
```tsx
// Default scene view with all sections

interface NarrativeViewProps {
  scene: Scene;
}

export function NarrativeView({ scene }: NarrativeViewProps) {
  return (
    <div className="space-y-6">
      {/* Location */}
      <Section id="location" title="Location" icon={MapPin}>
        <p className="text-lg font-medium">{scene.location}</p>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-neutral-400">Tone</dt>
          <dd>{scene.tone}</dd>
          <dt className="text-neutral-400 flex items-center gap-2">
            <Sun size={14} /> Lighting
            <ActuatorButton onClick={() => applyLighting(scene.lighting)} />
          </dt>
          <dd>{scene.lighting.description}</dd>
          <dt className="text-neutral-400 flex items-center gap-2">
            <Volume2 size={14} /> Audio
            <ActuatorButton icon={Play} onClick={() => playAudio(scene.audio)} />
          </dt>
          <dd>{scene.audio.description}</dd>
        </dl>
      </Section>

      {/* Narrative */}
      <Section id="narrative" title="Narrative" icon={BookOpen} action={<KaraokeButton />}>
        <NarrativeText text={scene.narrative} />
      </Section>

      {/* NPCs */}
      <Section id="npcs" title="NPCs in Scene" icon={Users}>
        <ul className="space-y-1">
          {scene.npcs.map(npc => (
            <NPCListItem key={npc.id} npc={npc} />
          ))}
        </ul>
      </Section>

      {/* Skill Checks */}
      <Section id="checks" title="Skill Checks" icon={Target}>
        <ul className="space-y-2">
          {scene.challenges.map(check => (
            <SkillCheckItem key={check.id} check={check} />
          ))}
        </ul>
      </Section>

      {/* Triggers */}
      <Section id="triggers" title="Triggers" icon={Zap}>
        <ul className="space-y-2">
          {scene.triggers.map(trigger => (
            <TriggerItem key={trigger.id} trigger={trigger} />
          ))}
        </ul>
      </Section>

      {/* Conversation Guide (inline summary) */}
      {scene.conversation && (
        <Section id="dialogue" title="Conversation Guide" icon={MessageCircle}>
          <ConversationSummary conversation={scene.conversation} />
        </Section>
      )}
    </div>
  );
}
```

### `<NPCDetailView>`
```tsx
// Full NPC statblock with action buttons

interface NPCDetailViewProps {
  npc: NPC;
  onBack: () => void;
  onPopout: () => void;
}

export function NPCDetailView({ npc, onBack, onPopout }: NPCDetailViewProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-cyan-400">
          <ArrowLeft size={16} /> Back to Scene
        </button>
        <button onClick={onPopout}><ExternalLink size={16} /></button>
      </div>

      {/* Identity */}
      <header className="border-b border-neutral-700 pb-4">
        <h2 className="text-2xl font-bold">{npc.name}</h2>
        <p className="text-neutral-400">
          ({npc.pronouns}) [{npc.species}] [Faction: {npc.faction}]
        </p>
        <p className="text-lg">{npc.role} | {npc.archetype}</p>
        
        {/* Action buttons */}
        <div className="mt-3 flex gap-2">
          <ActionButton icon={Eye} label="Show Image" onClick={() => showImage(npc)} />
          <ActionButton icon={MapPin} label="Ping Token" onClick={() => pingToken(npc)} />
          <ActionButton icon={EyeOff} label="Hide" onClick={() => hideNPC(npc)} />
          <ActionButton icon={Skull} label="Kill" variant="danger" onClick={() => killNPC(npc)} />
        </div>
      </header>

      {/* Description */}
      <Section title="Description">
        <p>{npc.description}</p>
      </Section>

      {/* Linked Entities */}
      {npc.linked_entities?.length > 0 && (
        <Section title="Linked Entities">
          <div className="flex flex-wrap gap-2">
            {npc.linked_entities.map(entity => (
              <EntityBadge key={entity.id} entity={entity} />
            ))}
          </div>
        </Section>
      )}

      {/* Stats */}
      <Section title="Stats">
        <StatsGrid stats={npc.stats} />
      </Section>

      {/* Attributes */}
      <Section title="Attributes">
        <AttributeBar attributes={npc.attributes} />
      </Section>

      {/* Skills */}
      <Section title="Skills">
        <SkillsList skills={npc.skills} />
      </Section>

      {/* Abilities */}
      <Section title="Abilities">
        <AbilitiesList abilities={npc.abilities} />
      </Section>

      {/* Secrets (GM Only) */}
      <Section title="Secrets" icon={Lock} variant="secret">
        <SecretsList secrets={npc.secrets} />
      </Section>

      {/* Behavior */}
      <Section title="Behavior">
        <BehaviorPanel behavior={npc.behavior} />
      </Section>

      {/* GM Notes */}
      {npc.notes && (
        <Section title="GM Notes">
          <p className="text-neutral-300">{npc.notes}</p>
        </Section>
      )}
    </div>
  );
}
```

### `<ConversationGuideView>`
```tsx
// Disposition-based conversation hints

interface ConversationGuideViewProps {
  conversation: Conversation;
  onBack: () => void;
}

export function ConversationGuideView({ conversation, onBack }: ConversationGuideViewProps) {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-cyan-400">
        <ArrowLeft size={16} /> Back to Scene
      </button>

      <h2 className="text-xl font-bold">Conversation: {conversation.npc_name}</h2>

      {/* Imperatives */}
      <div className="space-y-2">
        <h3 className="font-semibold text-amber-400">Scene Imperatives</h3>
        {conversation.imperatives.must.map((item, i) => (
          <div key={i} className="bg-green-900/30 border border-green-700 rounded px-3 py-2">
            <Check size={14} className="inline mr-2" />
            <strong>MUST:</strong> {item}
          </div>
        ))}
        {conversation.imperatives.must_not.map((item, i) => (
          <div key={i} className="bg-red-900/30 border border-red-700 rounded px-3 py-2">
            <X size={14} className="inline mr-2" />
            <strong>MUST NOT:</strong> {item}
          </div>
        ))}
      </div>

      {/* Topics by Disposition */}
      {['neutral', 'sad', 'angry', 'happy', 'fearful'].map(disposition => {
        const topics = conversation.topics.filter(t => t.disposition === disposition);
        if (topics.length === 0) return null;
        
        return (
          <div key={disposition}>
            <h3 className="font-semibold flex items-center gap-2">
              <DispositionIcon disposition={disposition} />
              {disposition.toUpperCase()} TOPICS
            </h3>
            <ul className="mt-2 space-y-2">
              {topics.map(topic => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  expanded={expandedTopic === topic.id}
                  onToggle={() => setExpandedTopic(
                    expandedTopic === topic.id ? null : topic.id
                  )}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
```

### `<GMChatLog>`
```tsx
// DOM-based GM chat panel

interface GMChatLogProps {
  docked?: boolean;  // true = sidebar, false = floating/popout
}

export function GMChatLog({ docked = true }: GMChatLogProps) {
  const messages = useChatStore(s => s.messages);
  const [filter, setFilter] = useState<'all' | 'system' | 'rolls' | 'player'>('all');
  const [input, setInput] = useState('');

  const filteredMessages = messages.filter(msg => {
    if (filter === 'all') return true;
    return msg.type === filter;
  });

  const handleSendNote = () => {
    if (!input.trim()) return;
    addGMNote(input);
    setInput('');
  };

  return (
    <div className={cn(
      "flex flex-col bg-neutral-850 border-l border-neutral-700",
      docked ? "w-80" : "w-96 rounded-lg shadow-xl"
    )}>
      {/* Header */}
      <header className="px-3 py-2 border-b border-neutral-700 flex items-center gap-2">
        <Radio size={16} className="text-green-400" />
        <span className="font-medium">GM Chat Log</span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-sm">
        {filteredMessages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
      </div>

      {/* Filters */}
      <div className="px-2 py-1 border-t border-neutral-700 flex gap-1">
        {['all', 'system', 'rolls', 'player'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={cn(
              "px-2 py-0.5 rounded text-xs",
              filter === f ? "bg-cyan-600" : "bg-neutral-700"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-neutral-700">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendNote()}
            placeholder="GM note..."
            className="flex-1 bg-neutral-800 rounded px-2 py-1 text-sm"
          />
          <button onClick={handleSendNote} className="px-2 py-1 bg-cyan-600 rounded text-sm">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

### `<AdHocCheckRadial>`
```tsx
// Radial skill picker + difficulty bar

interface AdHocCheckRadialProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onComplete: (skill: string, dc: number) => void;
}

export function AdHocCheckRadial({ isOpen, position, onClose, onComplete }: AdHocCheckRadialProps) {
  const [step, setStep] = useState<'skill' | 'difficulty'>('skill');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSkillSelect = (skill: string) => {
    setSelectedSkill(skill);
    setStep('difficulty');
  };

  const handleDifficultySelect = (dc: number) => {
    if (selectedSkill) {
      onComplete(selectedSkill, dc);
      onClose();
    }
  };

  return (
    <div
      className="fixed z-50"
      style={{ left: position.x, top: position.y, transform: 'translate(-50%, -50%)' }}
    >
      {step === 'skill' && (
        <SkillRadialWheel
          onSelect={handleSkillSelect}
          onCancel={onClose}
        />
      )}
      {step === 'difficulty' && (
        <DifficultyBar
          skill={selectedSkill!}
          onSelect={handleDifficultySelect}
          onBack={() => setStep('skill')}
          onCancel={onClose}
        />
      )}
    </div>
  );
}
```

---

## State Management (Zustand)

### `sceneStore.ts`
```ts
interface SceneState {
  scenes: Scene[];
  currentIndex: number;
  currentScene: Scene | null;
  
  // Actions
  loadScenes: (adventureId: string) => Promise<void>;
  goToScene: (index: number) => void;
  nextScene: () => void;
  prevScene: () => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scenes: [],
  currentIndex: 0,
  currentScene: null,

  loadScenes: async (adventureId) => {
    const scenes = await fetchScenes(adventureId);
    set({ scenes, currentIndex: 0, currentScene: scenes[0] });
  },

  goToScene: (index) => {
    const { scenes } = get();
    if (index >= 0 && index < scenes.length) {
      set({ currentIndex: index, currentScene: scenes[index] });
    }
  },

  nextScene: () => {
    const { currentIndex, scenes } = get();
    if (currentIndex < scenes.length - 1) {
      get().goToScene(currentIndex + 1);
    }
  },

  prevScene: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      get().goToScene(currentIndex - 1);
    }
  },
}));
```

### `viewStore.ts`
```ts
type ViewType = 'narrative' | 'npc' | 'item' | 'conversation' | 'dashboard' | 'karaoke';

interface ViewState {
  currentView: ViewType;
  viewStack: { view: ViewType; data?: any }[];
  selectedNPC: NPC | null;
  selectedItem: Item | null;
  
  // Breadcrumbs
  breadcrumbs: { label: string; view: ViewType; data?: any }[];
  
  // Actions
  pushView: (view: ViewType, data?: any) => void;
  popView: () => void;
  resetToNarrative: () => void;
}

export const useViewStore = create<ViewState>((set, get) => ({
  currentView: 'narrative',
  viewStack: [],
  selectedNPC: null,
  selectedItem: null,
  breadcrumbs: [],

  pushView: (view, data) => {
    const { currentView, viewStack, breadcrumbs } = get();
    set({
      viewStack: [...viewStack, { view: currentView, data }],
      currentView: view,
      selectedNPC: view === 'npc' ? data : null,
      selectedItem: view === 'item' ? data : null,
      breadcrumbs: [...breadcrumbs, { label: data?.name || view, view, data }],
    });
  },

  popView: () => {
    const { viewStack, breadcrumbs } = get();
    if (viewStack.length === 0) return;
    
    const prev = viewStack[viewStack.length - 1];
    set({
      viewStack: viewStack.slice(0, -1),
      currentView: prev.view,
      selectedNPC: prev.view === 'npc' ? prev.data : null,
      selectedItem: prev.view === 'item' ? prev.data : null,
      breadcrumbs: breadcrumbs.slice(0, -1),
    });
  },

  resetToNarrative: () => {
    set({
      currentView: 'narrative',
      viewStack: [],
      selectedNPC: null,
      selectedItem: null,
      breadcrumbs: [],
    });
  },
}));
```

### `sessionStore.ts`
```ts
interface SessionState {
  notes: string[];
  flags: Record<string, boolean | string>;
  campaignClock: { day: number; time: string };
  
  // Actions
  addNote: (note: string) => void;
  removeNote: (index: number) => void;
  setFlag: (key: string, value: boolean | string) => void;
  advanceTime: (minutes: number) => void;
  
  // Persistence
  save: () => void;
  load: () => void;
}
```

---

## Integration with Existing Codebase

### Bridge to SyncManager
```ts
// hooks/useSyncManager.ts

export function useSyncManager() {
  const addMessage = useChatStore(s => s.addMessage);

  useEffect(() => {
    // Listen to existing EventBus events
    EventBus.on('sync:chat', (data) => {
      addMessage({
        type: 'player',
        sender: data.sender,
        text: data.text,
        timestamp: Date.now(),
      });
    });

    EventBus.on('sync:roll', (data) => {
      addMessage({
        type: 'rolls',
        sender: data.sender,
        text: `${data.sender} rolls ${data.formula} = ${data.result}`,
        timestamp: Date.now(),
      });
    });

    EventBus.on('sync:scene_change', (data) => {
      addMessage({
        type: 'system',
        text: `Scene changed → ${data.sceneId}`,
        timestamp: Date.now(),
      });
    });

    // ... more event listeners
  }, []);
}
```

### Mounting the React App
```ts
// gm-overlay/index.tsx

import { createRoot } from 'react-dom/client';
import { App } from './App';

// Mount when GM mode is activated
export function mountGMOverlay() {
  const container = document.getElementById('gm-overlay-root');
  if (!container) {
    const div = document.createElement('div');
    div.id = 'gm-overlay-root';
    document.body.appendChild(div);
  }
  
  const root = createRoot(document.getElementById('gm-overlay-root')!);
  root.render(<App />);
}

// Expose to existing codebase
window.GMOverlayReact = { mount: mountGMOverlay };
```

---

## CSS Theme Tokens

```css
/* styles/globals.css */

:root {
  /* Backgrounds */
  --gm-bg-primary: #171717;      /* neutral-900 */
  --gm-bg-secondary: #262626;    /* neutral-800 */
  --gm-bg-tertiary: #1f1f1f;     /* neutral-850 */
  
  /* Text */
  --gm-text-primary: #fafafa;    /* neutral-50 */
  --gm-text-secondary: #a3a3a3;  /* neutral-400 */
  --gm-text-muted: #737373;      /* neutral-500 */
  
  /* Accents */
  --gm-accent-cyan: #06b6d4;     /* cyan-500 */
  --gm-accent-amber: #f59e0b;    /* amber-500 */
  --gm-accent-green: #22c55e;    /* green-500 */
  --gm-accent-red: #ef4444;      /* red-500 */
  
  /* Borders */
  --gm-border: #404040;          /* neutral-700 */
  --gm-border-dim: #525252;      /* neutral-600 */
}
```

---

## Next Steps

1. ~~**Scaffold React app** in `src/gm-overlay/`~~ ✅
2. ~~**Create Zustand stores** for scene, view, session, chat~~ ✅
3. ~~**Build core layout components** (Shell, Header, Sidebar, MainPanel)~~ ✅
4. ~~**Implement NarrativeView** as first view~~ ✅
5. ~~**Bridge to SyncManager** for chat integration~~ ✅
6. ~~**Add keyboard shortcuts** via react-hotkeys-hook~~ ✅
7. ~~**Build modals** (Scene Jumper, Global Search, Ad-Hoc Check)~~ ✅
8. ~~**Style with Tailwind** using theme tokens~~ ✅
9. **Test integration** with existing Three.js app

## Recent Additions (2025-12-05)

### Scene Activation System
The GM can now distinguish between **browsing** scenes (reading ahead) and **activating** scenes (pushing to players).

**New Components:**
- `SceneTransitionPanel` - End-of-scene navigation with next/branch scene buttons
- Updated `Header` - Shows both viewing and active scene states
- Updated `NavBar` - ACTIVATE SCENE button in center
- Updated `SceneJumperModal` - View/Activate buttons per scene

**New Store State:**
- `activeSceneId` - The scene players are currently seeing
- `activeSceneIndex` - Index of active scene
- `activeScene` - Full active scene object
- `activateScene(sceneId)` - Push scene to players
- `activateCurrentScene()` - Activate the currently viewed scene
- `isActiveScene(sceneId)` - Check if a scene is active
- `isViewingActiveScene()` - Check if GM is viewing the active scene

**Keyboard Shortcuts:**
- `Shift+Enter` - Activate current scene for players
- `←` / `→` - Browse scenes (no activation)

**Visual Indicators:**
- Green header when viewing active scene
- Amber "VIEWING" + Green "ACTIVE" when browsing different scene
- Green ring around active scene in Scene Jumper

### Player View Preview & Chat Log (2025-12-05)

**PlayerViewPreview** (`components/sidebar/PlayerViewPreview.tsx`)
- Shows thumbnail of the **active scene's background image** (what players see)
- Green border + "LIVE" indicator when GM is viewing the same scene as players
- Amber border + warning when GM is browsing a different scene
- Displays scene title and location overlay
- Loads images from `/assets/scene_backgrounds/{scene.image}`

**ChatLogPanel** (`components/sidebar/ChatLogPanel.tsx`)
- Real-time chat log showing messages from players, system, and dice rolls
- Filter tabs: All, Players, System, Rolls, GM
- GM can send messages directly to players
- Auto-scrolls to newest messages
- Integrates with SyncManager for multiplayer sync
- Color-coded message types:
  - **Cyan** - Player messages
  - **Amber** - Dice rolls
  - **Green** - GM messages
  - **Gray italic** - System messages

**Sidebar Layout:**
1. Player View Preview (top)
2. Chat Log Panel
3. Scene Info
4. Session Notes
5. Quick Actions
6. Scene Elements
7. Flags Panel

### Socket.io Integration (2025-12-05)

**useSyncManager Hook** (`hooks/useSyncManager.ts`)
- Connects directly to server via Socket.io (CDN client)
- Joins as GM role automatically
- Receives: chat messages, dice rolls, presence updates, user join/leave
- Sends: GM chat messages, scene activations
- Exposes `window.GMOverlay` API for components

**Connection Flow:**
1. Socket.io client loads from CDN
2. Hook waits for `io` to be available (polling)
3. Connects to `http://localhost:3000` in dev mode
4. Joins session as "Game Master" with GM role
5. Listens for all sync events and updates chatStore

---

## What's Next

### ✅ NPC Detail View (Completed 2025-12-05)

**NPC JSON Schema Updated:**
- NPCs now have `public` and `private` sections
- `public`: description, appearance, demeanor, known_facts (visible to players)
- `private`: stats, attributes, skills, weapons, abilities, secrets, gm_notes (GM only)

**Server API:**
- `/api/npcs/:id` - Returns public info only (player view)
- `/api/npcs/:id?role=gm` - Returns full NPC data (GM view)

**GM Overlay:**
- Click NPC badge → opens full statblock in MainPanel
- Shows all public AND private info
- Sections: Description, Appearance, Demeanor, Known Facts, Stats, Attributes, Skills, Abilities, Weapons, Cyberware, Loot, Secrets, Behavior, GM Notes

**Player Side (Scene Viewer/Terminal):**
- `/npcs` - List NPCs in current scene
- `/look <name>` - Examine NPC (shows public info only)
- `/examine <name>` - Alias for /look
- `/inspect <name>` - Alias for /look

### Priority 2: Karaoke Mode
- Teleprompter-style scrolling for read-aloud text
- Large font, auto-scroll, pause/resume controls
- Activated via NavBar button or keyboard shortcut

### Priority 3: Global Search (Cmd+K)
- Spotlight-style omnibar
- Search across scenes, NPCs, items, guide content
- Quick navigation to any content

### Priority 4: Ad-Hoc Skill Check
- Radial menu for quick skill + DC selection
- Rolls d20, broadcasts result to players
- For improvised checks not in scene data

### Priority 5: Dice Tray
- Integrated dice roller in sidebar
- Quick buttons for common dice
- Roll history with labels
- Broadcasts all rolls to players

### Future Enhancements
- [ ] Timeline view showing adventure progress
- [ ] Ambient audio controls
- [ ] Push-to-players for text blocks
- [ ] Multi-window/pop-out support
- [ ] Session persistence (reconnect to same state)
