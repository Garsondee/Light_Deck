// Scene types
export interface Scene {
  id: string;
  adventure: string;
  act: number;
  chapter: number;
  scene: number;
  title: string;
  location: string;
  tone?: string;
  narrative: string;
  gmNotes?: string;
  image?: string;
  imageUrl?: string;
  
  environment?: {
    location: string;
    tone: string;
    lighting?: {
      description: string;
      preset?: string;
      actuator?: boolean;
    };
    audio?: {
      description: string;
      tracks?: string[];
      actuator?: boolean;
    };
    smell?: string;
  };
  
  npcs: NPCReference[];
  challenges: SkillCheck[];
  triggers: Trigger[];
  items?: ItemReference[];
  exits?: Exit[];
  
  // Scene transitions for end-of-scene navigation
  transitions?: SceneTransitions;
  
  conversation?: Conversation;
  flags?: string[];
}

export interface NPCReference {
  id: string;
  name: string;
  role: string;
  state: 'active' | 'passive' | 'hidden' | 'defeated';
  notes?: string;
  statblock?: string;
}

export interface SkillCheck {
  id: string;
  name: string;
  skill: string;
  dc: number;
  type: 'active' | 'passive' | 'hidden';
  description?: string;
  success?: string;
  fail?: string;
}

export interface Trigger {
  id: string;
  label: string;
  action: 'chat' | 'sound' | 'scene' | 'flag';
  text?: string;
  sound?: string;
  targetScene?: string;
  setsFlag?: string;
  irreversible?: boolean;
}

export interface ItemReference {
  id: string;
  name: string;
  value?: string;
  notes?: string;
  visible: boolean;
}

export interface Exit {
  id: string;
  label: string;
  targetSceneId: string;
}

// Scene transition definitions
export interface SceneTransition {
  targetSceneId: string;
  label: string;
  description?: string;
  condition?: string | null;
}

export interface SceneTransitions {
  next: SceneTransition[];
  branches?: SceneTransition[];
}

// NPC types
export interface NPC {
  id: string;
  name: string;
  pronouns?: string;
  species?: string;
  faction?: string;
  type: string;
  archetype?: string;
  role?: string;
  image?: string;
  token?: string;
  description: string;
  
  // Public fields (visible to players)
  appearance?: string;
  demeanor?: string;
  known_facts?: string[];
  
  linked_entities?: LinkedEntity[];
  
  // Private fields (GM only)
  stats?: {
    stress: number;
    stressMax: number;
    wounds: number;
    armor: number;
    attack: number;
    defense?: number;
  };
  
  attributes?: Record<string, number>;
  skills?: {
    primary?: string | null;
    primaryBonus?: number;
    secondary?: string | null;
    secondaryBonus?: number;
    [key: string]: string | number | null | undefined;
  };
  
  abilities?: Ability[];
  secrets?: Record<string, string>;
  behavior?: {
    tactics?: string | null;
    morale?: string | null;
    motivation?: string | null;
  };
  
  weapons?: Weapon[];
  cyberware?: string[];
  loot?: { item: string; chance: number }[];
  notes?: string;
  
  // Access level indicator
  _fullAccess?: boolean;
}

export interface LinkedEntity {
  type: 'faction' | 'location' | 'npc' | 'item';
  id: string;
  label: string;
}

export interface Ability {
  name: string;
  icon?: string;
  description: string;
}

export interface Weapon {
  name: string;
  damage: string;
  range?: string;
  notes?: string;
}

// Conversation types
export interface Conversation {
  npc_id: string;
  npc_name?: string;
  imperatives: {
    must: string[];
    must_not: string[];
  };
  topics: ConversationTopic[];
}

export interface ConversationTopic {
  id: string;
  label: string;
  disposition: 'neutral' | 'sad' | 'angry' | 'happy' | 'fearful';
  hints: string[];
  check?: {
    trigger: string;
    skill: string;
    dc: number;
    success?: string;
    failure?: string;
  };
}

// Item types
export interface Item {
  id: string;
  name: string;
  type: string;
  description: string;
  value?: string;
  properties?: Record<string, string>;
  notes?: string;
}

// View types
export type ViewType = 'narrative' | 'npc' | 'item' | 'conversation' | 'dashboard' | 'karaoke';

export type ModalType = 'sceneJumper' | 'globalSearch' | 'adHocCheck' | 'settings' | 'confirmTrigger' | 'exportAll' | null;

export interface Breadcrumb {
  label: string;
  view: ViewType;
  data?: unknown;
}

// Chat types
export interface ChatMessage {
  id: string;
  type: 'system' | 'player' | 'rolls' | 'gm';
  sender?: string;
  text: string;
  timestamp: number;
}

// Session types
export interface SessionState {
  notes: string[];
  flags: Record<string, boolean | string>;
  campaignClock: {
    day: number;
    time: string;
  };
}
