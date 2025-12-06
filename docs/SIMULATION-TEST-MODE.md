# Simulation Test Mode

## Overview

The Simulation Test Mode is an automated testing system that simulates both GM and Player interactions with adventure content. It acts as a "virtual playtest" that can run through scenes, make decisions, track outcomes, and generate detailed reports on potential issues.

This system is critical for solo developers who cannot easily playtest their own content. It provides:

- **Automated scene traversal** with decision-making
- **Dead-end detection** for both GM and Player paths
- **Difficulty analysis** through weighted dice simulations
- **Narrative coherence checking** for breadcrumbs and transitions
- **Character interaction validation** for NPC logic and motivations

---

## Core Testing Objectives

### 1. Scene Completability

**Question:** Can the scene actually be completed? Are there dead ends?

**What We Track:**
- Exit conditions: Does every scene have at least one valid path forward?
- Required triggers: Are all mandatory triggers fireable?
- Blocking conditions: Are there states where progress becomes impossible?
- Circular dependencies: Does Trigger A require Trigger B which requires Trigger A?

**Termination Conditions:**

| Actor | Condition | Severity |
|-------|-----------|----------|
| GM | No valid scene transitions available | CRITICAL |
| GM | All triggers are irreversible and fired | WARNING |
| GM | NPC required for progression is defeated/gone | CRITICAL |
| Player | Character death (wounds exceed threshold) | EXPECTED |
| Player | No available actions (all checks failed, no alternatives) | CRITICAL |
| Player | Soft lock (can act but cannot progress) | CRITICAL |
| System | Maximum turn limit reached | INFO |
| System | Infinite loop detected | CRITICAL |

**Detection Methods:**
```
For each scene:
  1. Enumerate all possible exit paths
  2. For each path, determine requirements (triggers, checks, NPC states)
  3. Simulate reaching each requirement
  4. Flag scenes with 0 reachable exits as DEAD_END
  5. Flag scenes with only 1 exit requiring DC 20+ check as HIGH_RISK
```

---

### 2. Narrative Coherence

**Question:** Does the scene make sense? Are there sufficient breadcrumbs?

**What We Track:**
- **Breadcrumb presence:** Does the scene mention or hint at the next scene?
- **Information flow:** Is critical info available before it's needed?
- **Transition logic:** Does moving from Scene A → Scene B make narrative sense?
- **Clue availability:** Are clues for puzzles/mysteries actually findable?

**Coherence Checks:**

| Check | Description | How We Test |
|-------|-------------|-------------|
| Forward Reference | Scene mentions future locations/events | Text analysis for location names |
| Backward Reference | Scene acknowledges past events | Check for references to previous scene IDs |
| NPC Continuity | NPCs appear where they should be | Track NPC locations across scenes |
| Item Continuity | Required items are obtainable before needed | Track item acquisition vs. usage |
| Time Consistency | Events happen in logical order | Validate scene.act/chapter/scene ordering |

**Breadcrumb Scoring:**
```
STRONG:   Explicit direction ("Go to the warehouse")
MEDIUM:   Implicit hint ("The shipment comes from the docks")
WEAK:     Environmental clue (NPC glances toward exit)
NONE:     No forward momentum detected

Scenes with NONE breadcrumbs flagged as NAVIGATION_RISK
```

---

### 3. Character Interaction Logic

**Question:** Do character interactions make sense? Are motivations consistent?

**What We Track:**
- **NPC motivation alignment:** Do NPC actions match their stated goals?
- **Dialogue consistency:** Do NPCs contradict themselves?
- **Relationship dynamics:** Do NPC-to-NPC interactions follow established relationships?
- **Player agency:** Can players meaningfully influence NPC behavior?

**Interaction Validation:**

| Issue Type | Example | Detection |
|------------|---------|-----------|
| Motivation Conflict | Helpful NPC attacks without provocation | Compare NPC.disposition vs. actions |
| Information Leak | NPC reveals info they shouldn't know | Track information propagation |
| Dead NPC Speaking | Defeated NPC appears in later scene | Track NPC.state across scenes |
| Forced Outcome | Player choices don't affect NPC response | Compare branching paths |

**NPC State Machine:**
```
States: active, passive, hidden, defeated, absent
Transitions must be logged and validated:
  - active → defeated (requires combat or trigger)
  - hidden → active (requires discovery check or trigger)
  - defeated → active (requires resurrection/recovery, flag if missing)
```

---

### 4. Difficulty Analysis

**Question:** Is the adventure too hard or too easy?

**What We Track:**
- **Wounds taken:** Total damage across the adventure
- **Healing used:** Resources consumed
- **Check success rate:** Percentage of passed skill checks
- **Critical moments:** Near-death experiences, clutch saves
- **Resource depletion:** When do players run out of options?

**Dice Weighting Modes:**

| Mode | Description | Use Case |
|------|-------------|----------|
| `fair` | Standard d20 (1-20 uniform) | Baseline testing |
| `lucky` | Weighted toward high rolls (avg ~14) | Best-case scenario |
| `unlucky` | Weighted toward low rolls (avg ~7) | Worst-case scenario |
| `cursed` | Always roll minimum viable | Stress test |
| `blessed` | Always roll maximum | Speed run test |
| `streaky` | Clusters of good/bad luck | Realistic variance |

**Difficulty Metrics:**

```typescript
interface DifficultyReport {
  // Survival
  totalWoundsTaken: number;
  maxWoundsAtOnce: number;
  nearDeathCount: number;        // Times at 1 wound remaining
  actualDeaths: number;
  
  // Skill Checks
  totalChecks: number;
  checksPassed: number;
  checksFailed: number;
  averageDC: number;
  hardestCheckDC: number;
  
  // Resources
  healingUsed: number;
  itemsConsumed: number;
  abilitiesExhausted: number;
  
  // Pacing
  combatEncounters: number;
  socialEncounters: number;
  explorationScenes: number;
  restOpportunities: number;
  
  // Verdict
  difficultyRating: 'trivial' | 'easy' | 'moderate' | 'hard' | 'deadly';
  bottleneckScenes: string[];    // Scenes where most failures occur
  recommendedChanges: string[];  // Auto-generated suggestions
}
```

**Difficulty Thresholds:**

| Rating | Wounds/Scene | Check Fail Rate | Deaths (unlucky mode) |
|--------|--------------|-----------------|----------------------|
| Trivial | < 0.5 | < 10% | 0 |
| Easy | 0.5 - 1 | 10-25% | 0 |
| Moderate | 1 - 2 | 25-40% | 0-1 |
| Hard | 2 - 3 | 40-55% | 1-2 |
| Deadly | > 3 | > 55% | > 2 |

---

## Simulation Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     SIMULATION RUNNER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   GM Agent   │◄──►│  Game State  │◄──►│ Player Agent │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  GM Decisions│    │ State Tracker│    │Player Actions│      │
│  │  - Narrate   │    │ - Wounds     │    │  - Move      │      │
│  │  - Trigger   │    │ - NPCs       │    │  - Talk      │      │
│  │  - Check     │    │ - Items      │    │  - Check     │      │
│  │  - Transition│    │ - Flags      │    │  - Combat    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                      ANALYSIS ENGINE                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Dead End     │    │ Coherence    │    │ Difficulty   │      │
│  │ Detector     │    │ Analyzer     │    │ Calculator   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                              │                                   │
│                              ▼                                   │
│                    ┌──────────────────┐                         │
│                    │  Report Generator │                         │
│                    └──────────────────┘                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### GM Agent Behavior

The GM Agent makes decisions based on scene content and simulation goals:

```typescript
interface GMAgent {
  // Scene Management
  selectNextScene(): Scene;           // Choose based on narrative flow
  activateScene(scene: Scene): void;  // Push to players
  
  // In-Scene Actions
  introduceNPC(npc: NPC): void;       // Bring NPC into focus
  fireTrigger(trigger: Trigger): void; // Activate scene trigger
  callForCheck(check: SkillCheck): void; // Request player roll
  narrate(text: string): void;        // Deliver narrative content
  
  // Decision Making
  shouldFireTrigger(trigger: Trigger): boolean;
  shouldCallCheck(check: SkillCheck): boolean;
  selectNPCToIntroduce(npcs: NPC[]): NPC;
  determineSceneComplete(): boolean;
}
```

**GM Decision Modes:**

| Mode | Behavior |
|------|----------|
| `thorough` | Fire all triggers, call all checks, explore everything |
| `efficient` | Minimum actions to complete scene |
| `dramatic` | Prioritize high-stakes triggers and checks |
| `random` | Random decisions (current implementation) |
| `adversarial` | Maximize difficulty for player |
| `supportive` | Minimize difficulty for player |

### Player Agent Behavior

The Player Agent simulates player decisions:

```typescript
interface PlayerAgent {
  // Core Actions
  move(destination: string): void;
  interact(target: NPC | Item): void;
  attemptCheck(check: SkillCheck): RollResult;
  combat(target: NPC): CombatResult;
  
  // Decision Making
  chooseAction(options: Action[]): Action;
  prioritizeNPC(npcs: NPC[]): NPC;
  assessRisk(action: Action): RiskLevel;
  
  // State
  wounds: number;
  maxWounds: number;
  inventory: Item[];
  abilities: Ability[];
}
```

**Player Decision Modes:**

| Mode | Behavior |
|------|----------|
| `cautious` | Avoid risks, prioritize survival |
| `aggressive` | Take risks, prioritize progress |
| `thorough` | Explore everything, talk to everyone |
| `speedrun` | Minimum actions to complete |
| `random` | Random valid actions |
| `optimal` | Best statistical choices |

---

## Test Configurations

### Quick Smoke Test
```typescript
{
  mode: 'quick',
  maxScenes: 3,
  diceMode: 'fair',
  gmBehavior: 'efficient',
  playerBehavior: 'optimal',
  timeout: 30000
}
```

### Full Adventure Playthrough
```typescript
{
  mode: 'full',
  maxScenes: -1,  // All scenes
  diceMode: 'fair',
  gmBehavior: 'thorough',
  playerBehavior: 'thorough',
  timeout: 300000
}
```

### Stress Test (Unlucky Player)
```typescript
{
  mode: 'stress',
  maxScenes: -1,
  diceMode: 'unlucky',
  gmBehavior: 'adversarial',
  playerBehavior: 'cautious',
  timeout: 300000,
  trackDeaths: true
}
```

### Dead End Detection
```typescript
{
  mode: 'deadend',
  maxScenes: -1,
  diceMode: 'cursed',  // Always fail checks
  gmBehavior: 'thorough',
  playerBehavior: 'random',
  timeout: 600000,
  haltOnDeadEnd: true
}
```

### Speedrun Validation
```typescript
{
  mode: 'speedrun',
  maxScenes: -1,
  diceMode: 'blessed',
  gmBehavior: 'efficient',
  playerBehavior: 'speedrun',
  timeout: 60000,
  trackMinimumPath: true
}
```

---

## Report Format

### Summary Report (Human Readable)

```
═══════════════════════════════════════════════════════════════
           ADVENTURE SIMULATION REPORT
           "A Change of Heart" - Full Playthrough
═══════════════════════════════════════════════════════════════

VERDICT: ⚠️  MODERATE ISSUES DETECTED

Run Configuration:
  Mode:           full
  Dice:           fair
  GM Behavior:    thorough
  Player Behavior: thorough
  Duration:       4m 32s

───────────────────────────────────────────────────────────────
                        SUMMARY
───────────────────────────────────────────────────────────────

  Scenes Completed:    7 / 7  ✓
  Dead Ends Found:     0      ✓
  Soft Locks Found:    1      ⚠️
  
  Total Skill Checks:  12
  Checks Passed:       8 (67%)
  Checks Failed:       4 (33%)
  
  Wounds Taken:        6
  Deaths:              0
  Near-Death:          2
  
  Difficulty Rating:   MODERATE

───────────────────────────────────────────────────────────────
                        ISSUES
───────────────────────────────────────────────────────────────

⚠️  SOFT LOCK DETECTED
    Scene: "The Clinic" (Act 2, Ch 1, Scene 3)
    Condition: If player fails Empathy check AND angers Dr. Vance,
               no path to obtain surgery codes exists.
    Recommendation: Add alternative path via terminal hack or
                    bribery option.

⚠️  HIGH DIFFICULTY SPIKE
    Scene: "The Extraction" (Act 3, Ch 1, Scene 6)
    Issue: Three consecutive DC 15+ checks with no rest between.
    Fail Rate: 58% (unlucky mode: 89%)
    Recommendation: Reduce middle check to DC 12 or add rest point.

ℹ️  WEAK BREADCRUMB
    Scene: "The Gate" (Act 1, Ch 1, Scene 2)
    Issue: No explicit direction to next scene.
    Current: Player must infer clinic location from NPC dialogue.
    Recommendation: Add environmental clue or NPC hint.

───────────────────────────────────────────────────────────────
                    SCENE BREAKDOWN
───────────────────────────────────────────────────────────────

1. The Briefing          ✓ Complete   Wounds: 0   Checks: 1/1
2. The Gate              ✓ Complete   Wounds: 1   Checks: 2/3
3. The Clinic            ⚠️ Soft Lock  Wounds: 2   Checks: 1/2
4. The Surgery           ✓ Complete   Wounds: 0   Checks: 2/2
5. The Escape            ✓ Complete   Wounds: 2   Checks: 1/2
6. The Extraction        ⚠️ High Diff  Wounds: 1   Checks: 1/3
7. The Exit              ✓ Complete   Wounds: 0   Checks: 0/0

───────────────────────────────────────────────────────────────
                    RECOMMENDATIONS
───────────────────────────────────────────────────────────────

1. Add alternative path in "The Clinic" for failed social checks
2. Reduce difficulty spike in "The Extraction"
3. Strengthen breadcrumb in "The Gate"
4. Consider adding rest opportunity before Act 3

═══════════════════════════════════════════════════════════════
                    END OF REPORT
═══════════════════════════════════════════════════════════════
```

### JSON Report (Machine Readable)

```typescript
interface SimulationReport {
  meta: {
    adventureId: string;
    adventureTitle: string;
    runId: string;
    timestamp: string;
    duration: number;
    config: SimulationConfig;
  };
  
  verdict: {
    status: 'pass' | 'warning' | 'fail';
    summary: string;
    issueCount: { critical: number; warning: number; info: number };
  };
  
  scenes: SceneReport[];
  
  issues: Issue[];
  
  metrics: {
    completion: CompletionMetrics;
    difficulty: DifficultyMetrics;
    coherence: CoherenceMetrics;
    characters: CharacterMetrics;
  };
  
  recommendations: Recommendation[];
  
  eventLog: SimulationEvent[];
}
```

---

## Implementation Phases

### Phase 1: Core Simulation (Current)
- [x] Basic GM/Player agents
- [x] Scene traversal
- [x] Random decision making
- [x] Basic reporting

### Phase 2: State Tracking ✅
- [x] Wound tracking
- [x] NPC state tracking
- [x] Item/inventory tracking
- [x] Flag/condition tracking

### Phase 3: Dice Modes ✅
- [x] Implement weighted dice
- [x] Lucky/unlucky modes
- [x] Cursed/blessed modes
- [x] Statistical analysis

### Phase 4: Dead End Detection ✅
- [x] Exit path enumeration
- [x] Requirement analysis
- [x] Soft lock detection
- [x] Circular dependency detection

### Phase 5: Coherence Analysis ✅
- [x] Breadcrumb detection
- [x] NPC continuity checking
- [x] Information flow tracking
- [x] Transition validation

### Phase 6: Advanced Reporting ✅
- [x] Issue categorization
- [x] Recommendation generation
- [ ] Visual report (HTML) - future
- [ ] Trend tracking across runs - future

### Phase 7: UI Integration ✅
- [x] GM information lookup simulation
- [x] Player question simulation
- [x] Screenshot capture on errors
- [x] Failed lookup detection
- [ ] Real Socket.io sync verification - future

---

## Usage

### Run Quick Test
```bash
npm run test:simulation
```

### Run Full Playthrough
```bash
npm run test:simulation:full
```

### Run Stress Test
```bash
npm run test:simulation:stress
```

### Run with UI (Debug)
```bash
npm run test:simulation:headed
```

### View Last Report
```bash
npm run test:report
```

---

## Phase 8: Player Archetypes (Next Priority)

### The Core Insight

Real players don't try to break games—they try to **have fun**. But in pursuing enjoyment, they naturally probe the edges of what's possible. They ask unexpected questions. They try creative solutions. They get confused by unclear directions. They miss obvious clues. They fixate on irrelevant details.

The goal isn't to have AI "play" the game. The goal is to **simulate the aggregate behavior of many different player types** to reveal:

1. **What questions will players ask that the GM isn't prepared for?**
2. **Where will players get stuck or confused?**
3. **What creative solutions will players attempt that the adventure doesn't account for?**
4. **Which scenes feel rushed, which drag, which are forgettable?**
5. **Where does the emotional arc land flat?**

### Player Archetype System

Each archetype represents a **personality type** that approaches TTRPGs differently. Running the same adventure with different archetypes reveals different weaknesses.

#### The Archetypes

| Archetype | Motivation | Behavior Pattern | What They Reveal |
|-----------|------------|------------------|------------------|
| **The Detective** | Solve the mystery | Examines everything, asks probing questions, connects clues | Missing clues, red herrings that lead nowhere, logical gaps |
| **The Roleplayer** | Become the character | Deep NPC conversations, emotional investment, stays in character | Shallow NPCs, missing motivations, dialogue that breaks immersion |
| **The Tactician** | Optimize outcomes | Plans ahead, assesses risks, looks for advantages | Exploitable mechanics, missing consequences, balance issues |
| **The Explorer** | See everything | Goes off the beaten path, checks every door, reads every sign | Dead ends, missing content, areas that feel empty |
| **The Speedrunner** | Finish efficiently | Skips dialogue, takes shortcuts, ignores side content | Critical path clarity, required vs optional content |
| **The Chaos Agent** | See what happens | Makes unexpected choices, tests boundaries, does the "wrong" thing | Missing failure states, assumptions that break, edge cases |
| **The Empath** | Connect emotionally | Focuses on relationships, tries to help everyone, avoids violence | Emotional resonance, NPC depth, moral complexity |
| **The Skeptic** | Question everything | Doubts NPC motives, looks for traps, assumes deception | Trust mechanics, information reliability, paranoia triggers |

#### Archetype Behavior Examples

**The Detective** in Scene 1 (The Briefing):
```
- Notices Jax's symptoms immediately (high Perception focus)
- Asks: "Why are you really doing this, Jax?"
- Asks: "Who else knows about this job?"
- Asks: "What aren't you telling me about Oakhaven?"
- Examines the credstick for hidden data
- Tries to identify the black fluid from the cough
- REVEALS: Is there enough information for a clever player to deduce Jax's secret early?
```

**The Chaos Agent** in Scene 4 (Courtyard Ambush):
```
- Tries to surrender to the Hazers
- Attempts to convince Hazers that Jax is the real enemy
- Tries to steal a Hazer's mask
- Asks: "What if I just... leave Jax here?"
- REVEALS: Are there consequences for betraying Jax? Can the adventure continue?
```

**The Empath** in Scene 6 (The Cryo Lab):
```
- Asks: "Is there any way to save both of them?"
- Tries to wake Elena to ask her consent
- Looks for medical alternatives
- Asks: "What would Elena want?"
- REVEALS: Does the adventure acknowledge the player's desire for a "good" ending?
```

### Question Generation by Archetype

Each archetype generates **different types of questions** that test different aspects of the adventure:

```typescript
interface ArchetypeQuestionGenerator {
  archetype: PlayerArchetype;
  
  // Questions this archetype would ask
  generateQuestions(scene: Scene): PlayerQuestion[];
  
  // Actions this archetype would attempt
  generateActions(scene: Scene): PlayerAction[];
  
  // What this archetype notices
  observationPriority: string[];  // e.g., ["clues", "exits", "npcs"]
  
  // How this archetype reacts to NPCs
  npcApproach: 'friendly' | 'suspicious' | 'transactional' | 'curious';
  
  // Risk tolerance
  riskTolerance: number;  // 0-100
}
```

#### Sample Question Sets by Archetype

**The Detective:**
- "What's the connection between X and Y?"
- "Who benefits from this situation?"
- "What happened here before we arrived?"
- "Is this NPC telling the truth?"
- "What's the timeline of events?"

**The Roleplayer:**
- "How does my character feel about this?"
- "What would [NPC] say if I asked about their past?"
- "Is there a way to resolve this without violence?"
- "What's the emotional weight of this choice?"

**The Tactician:**
- "What are the odds of success?"
- "What's the worst case scenario?"
- "Can I prepare for this in advance?"
- "What resources do I have available?"

**The Explorer:**
- "What's behind that door?"
- "Is there another way around?"
- "What's in the other room?"
- "What happens if I go back?"

**The Chaos Agent:**
- "What if I do the opposite of what's expected?"
- "Can I ally with the 'enemy'?"
- "What breaks if I refuse to cooperate?"
- "What's the most unexpected thing I could do here?"

### GM Validation Layer

**Core Principle:** Players critique from their limited perspective. The GM, who knows the whole story, assesses whether critiques are valid issues or intentional design.

This is a fundamental pillar of the simulation approach:
1. **Player archetypes generate raw critiques** - unfiltered feedback from different player perspectives
2. **GM perspective validates critiques** - assesses which are legitimate issues vs. intentional design

#### Why This Matters

When a Detective archetype asks "Why is Jax really here?" in Scene 1 and can't find an answer, that's **not a bug**—it's the **point**. The player isn't supposed to know yet. The mystery is revealed in Scene 5.

The GM Validator uses the Adventure Guide to classify each critique:

| Status | Meaning | Example |
|--------|---------|---------|
| `valid_issue` | Real problem that should be addressed | "No way to proceed after failing the hack" |
| `intentional_mystery` | Player isn't supposed to know yet | "Why is Jax really here?" (revealed later) |
| `delayed_reveal` | Will be explained later in the adventure | "Who is Elena?" (revealed in Scene 6) |
| `red_herring` | Intentionally misleading | "What's in the locked room?" (nothing important) |
| `gm_discretion` | GM can handle this at the table | "What if I betray my companion?" |
| `player_choice` | Depends on player decisions | "Can I save both of them?" |
| `false_positive` | Critique is based on misunderstanding | Archetype misread the scene |

#### Implementation

```typescript
class GMValidator {
  private knowledge: AdventureKnowledge;  // Loaded from Guide.json
  
  validateCritique(feedback: ArchetypeFeedback): GMValidation {
    // Check if this relates to a known mystery
    for (const mystery of this.knowledge.mysteries) {
      if (this.critiqueRelatesTo(feedback, mystery)) {
        if (mystery.revealScene > currentScene) {
          return {
            status: 'delayed_reveal',
            reasoning: `Answered in "${mystery.revealScene}"`,
            gmNotes: 'Build anticipation. Don\'t answer yet.'
          };
        }
      }
    }
    
    // Check NPC secrets
    // Check thematic justifications
    // Default: valid_issue
  }
}
```

#### Example Output

```
═══════════════════════════════════════════════════════════════
              GM VALIDATED REPORT - The Chaos Agent
═══════════════════════════════════════════════════════════════

TOTAL CRITIQUES: 35

✅ VALID ISSUES (3):
  - Scene 3: No failure state for shrine puzzle
  - Scene 5: Terminal has no timeout
  - Scene 7: Rattle's dialogue is too short

🎭 INTENTIONAL DESIGN (8):
  - "Why is Jax here?" → Revealed in Scene 5 (delayed_reveal)
  - "Who is Elena?" → Revealed in Scene 6 (delayed_reveal)
  - "Can I trust Jax?" → He's Subject 89 (intentional_mystery)

🎲 GM DISCRETION (24):
  - "What if I betray Jax?" → GM adjudicates at table
  - "Can I ally with enemies?" → Valid player choice
  - "What if I do the opposite?" → Player agency

FALSE POSITIVES: 0
```

This transforms a wall of 35 critiques into **3 actionable items** plus context for the GM.

### Aggregate Analysis

Running multiple archetypes produces an **aggregate report** that identifies patterns:

```
═══════════════════════════════════════════════════════════════
              AGGREGATE ARCHETYPE ANALYSIS
              "A Change of Heart" - 8 Archetype Runs
═══════════════════════════════════════════════════════════════

UNIVERSAL ISSUES (Found by 6+ archetypes):
  🔴 Scene 3: No clear direction to next location
  🔴 Scene 5: Terminal puzzle has no failure state
  🟡 Scene 1: Jax's illness is too obvious OR too subtle (polarized)

ARCHETYPE-SPECIFIC FINDINGS:

  Detective:
    ✓ Mystery is solvable with available clues
    ⚠️ Red herring in Scene 2 leads nowhere
    ⚠️ Missing: What happened to the other subjects?

  Roleplayer:
    ✓ Emotional arc is strong
    ⚠️ Elena has no personality (she's unconscious)
    ⚠️ Jax's redemption arc feels incomplete

  Tactician:
    ✓ Combat encounters are balanced
    ⚠️ No way to prepare for Hazer ambush
    ⚠️ Surgery check has no alternative on failure

  Explorer:
    ⚠️ 3 doors mentioned but not explorable
    ⚠️ Shrine has more content than player can find
    ✓ No true dead ends

  Chaos Agent:
    🔴 Betraying Jax has no consequences
    🔴 Surrendering to Hazers not handled
    ⚠️ Can't ally with Rattle

  Empath:
    ⚠️ No way to save both Jax and Elena
    ⚠️ Elena's consent never addressed
    ✓ Mercy ending feels earned

QUESTIONS GM COULDN'T ANSWER (Across all runs):
  - "What happened to the other Heirloom subjects?" (Detective, Explorer)
  - "Can I wake Elena?" (Empath, Roleplayer)
  - "What if I just leave?" (Chaos Agent, Tactician)
  - "Is there a cure somewhere else?" (Detective, Empath)

RECOMMENDED ADDITIONS:
  1. Add failure state for terminal puzzle (Tactician)
  2. Add consequence for betraying Jax (Chaos Agent)
  3. Add Elena's dreams/personality via terminal (Roleplayer, Empath)
  4. Add explicit "no cure exists" confirmation (Detective)
  5. Add "leave without completing" ending (Chaos Agent)
```

### Implementation Approach

#### Phase 8A: Archetype Definitions
```typescript
interface PlayerArchetype {
  id: string;
  name: string;
  description: string;
  
  // Core traits
  motivation: string;
  riskTolerance: number;        // 0-100
  curiosity: number;            // 0-100 (how much they explore)
  empathy: number;              // 0-100 (how much they care about NPCs)
  suspicion: number;            // 0-100 (how much they distrust)
  creativity: number;           // 0-100 (how often they try unexpected things)
  
  // Behavioral weights
  questionTypes: Record<PlayerQuestionType, number>;  // Likelihood of each question type
  actionPreferences: string[];  // Ordered list of preferred actions
  
  // What they notice
  observationFocus: string[];   // e.g., ["clues", "emotions", "exits"]
  
  // How they approach challenges
  checkApproach: 'avoid' | 'calculate' | 'embrace' | 'creative';
  combatApproach: 'avoid' | 'tactical' | 'aggressive' | 'negotiate';
  npcApproach: 'friendly' | 'suspicious' | 'transactional' | 'deep';
}
```

#### Phase 8B: Question Generation Engine
```typescript
class ArchetypeQuestionGenerator {
  constructor(private archetype: PlayerArchetype) {}
  
  generateQuestions(scene: Scene, context: GameState): PlayerQuestion[] {
    const questions: PlayerQuestion[] = [];
    
    // Base questions from scene content
    questions.push(...this.generateNPCQuestions(scene));
    questions.push(...this.generateEnvironmentQuestions(scene));
    questions.push(...this.generatePlotQuestions(scene, context));
    
    // Archetype-specific questions
    questions.push(...this.generateArchetypeQuestions(scene, context));
    
    // Weight and filter by archetype preferences
    return this.prioritizeByArchetype(questions);
  }
  
  private generateArchetypeQuestions(scene: Scene, context: GameState): PlayerQuestion[] {
    switch (this.archetype.id) {
      case 'detective':
        return this.detectiveQuestions(scene, context);
      case 'chaos_agent':
        return this.chaosQuestions(scene, context);
      // ... etc
    }
  }
}
```

#### Phase 8C: Action Simulation
```typescript
class ArchetypeActionSimulator {
  constructor(private archetype: PlayerArchetype) {}
  
  // What would this archetype TRY to do?
  generateAttemptedActions(scene: Scene): PlayerAction[] {
    const actions: PlayerAction[] = [];
    
    // Standard actions available
    actions.push(...this.getStandardActions(scene));
    
    // Creative actions this archetype might attempt
    if (this.archetype.creativity > 50) {
      actions.push(...this.getCreativeActions(scene));
    }
    
    // Boundary-testing actions
    if (this.archetype.id === 'chaos_agent') {
      actions.push(...this.getBoundaryTestingActions(scene));
    }
    
    return actions;
  }
  
  // Actions that SHOULD work but might not be implemented
  getCreativeActions(scene: Scene): PlayerAction[] {
    return [
      { type: 'combine_items', items: scene.availableItems },
      { type: 'use_environment', target: scene.interactableObjects },
      { type: 'negotiate', target: scene.hostileNPCs },
      { type: 'deceive', target: scene.npcs },
      { type: 'retreat', destination: 'previous_scene' },
    ];
  }
}
```

#### Phase 8D: Feedback Aggregation
```typescript
interface ArchetypeReport {
  archetype: PlayerArchetype;
  
  // What worked
  successfulPaths: string[];
  satisfyingMoments: string[];
  
  // What didn't work
  unansweredQuestions: PlayerQuestion[];
  failedActions: PlayerAction[];
  confusionPoints: string[];
  
  // Emotional assessment
  emotionalArc: {
    tension: number[];      // Per scene
    satisfaction: number[]; // Per scene
    engagement: number[];   // Per scene
  };
  
  // Specific feedback
  feedback: ArchetypeFeedback[];
}

interface ArchetypeFeedback {
  scene: string;
  type: 'missing_content' | 'unclear_direction' | 'unhandled_action' | 
        'shallow_npc' | 'pacing_issue' | 'emotional_gap';
  description: string;
  suggestion: string;
}
```

---

## Phase 9: GM Preparedness Testing

### The Problem

The simulation currently tests whether the **adventure content** is complete. But it doesn't test whether the **GM** can actually run it smoothly. Real GMs need to:

1. **Find information quickly** when players ask unexpected questions
2. **Improvise** when players go off-script
3. **Remember** what happened in previous scenes
4. **Anticipate** what players might do next

### GM Stress Testing

Simulate a GM who is:
- **Underprepared**: Hasn't read ahead, relies on the overlay
- **Overwhelmed**: Players asking rapid-fire questions
- **Surprised**: Players doing something unexpected

```typescript
interface GMStressTest {
  // Rapid-fire questions
  questionBurst: PlayerQuestion[];  // 5 questions in 30 seconds
  
  // Information retrieval time
  maxAcceptableLookupTime: number;  // ms
  
  // Unexpected situations
  unexpectedActions: PlayerAction[];
  
  // Metrics
  averageLookupTime: number;
  failedLookups: number;
  improvisationRequired: number;  // Times GM had to make something up
}
```

### What This Reveals

- **UI/UX issues**: Information that's hard to find
- **Missing content**: Questions with no answers
- **Cognitive load**: Too much to track at once
- **Improvisation gaps**: Situations with no guidance

---

## Phase 10: Emotional Arc Analysis

### Beyond Mechanics

The current simulation tracks **mechanical** outcomes (wounds, checks, deaths). But a great adventure needs **emotional** outcomes:

- Does tension build appropriately?
- Are there moments of relief?
- Does the climax feel earned?
- Does the ending resonate?

### Emotional Tracking

```typescript
interface EmotionalBeat {
  scene: string;
  moment: string;
  emotion: 'tension' | 'relief' | 'horror' | 'sadness' | 'triumph' | 'dread' | 'hope';
  intensity: number;  // 1-10
  trigger: string;    // What caused this emotion
}

interface EmotionalArc {
  beats: EmotionalBeat[];
  
  // Analysis
  tensionCurve: number[];      // Should rise toward climax
  pacingScore: number;         // Variety of emotions
  climaxPlacement: number;     // 0-1, where in the adventure
  resolutionSatisfaction: number;
  
  // Issues
  flatSpots: string[];         // Scenes with no emotional content
  jarringTransitions: string[]; // Sudden emotional shifts
  missedOpportunities: string[]; // Moments that could be more impactful
}
```

### Emotional Archetype Responses

Different archetypes respond to the same content differently:

| Moment | Detective | Empath | Chaos Agent |
|--------|-----------|--------|-------------|
| Jax's cough | Curiosity (clue!) | Concern (is he okay?) | Suspicion (is this a trick?) |
| Hazer attack | Analysis (threat assessment) | Sadness (they're dying too) | Excitement (combat!) |
| Elena reveal | Satisfaction (mystery solved) | Horror (she's a victim) | Opportunity (leverage?) |
| Final choice | Logic (optimal outcome) | Anguish (impossible choice) | Curiosity (what happens if...) |

---

## Future Considerations

### LLM-Enhanced Simulation

The archetype system provides **structure**. An LLM could provide **nuance**:

- Generate natural-language questions a player might ask
- Evaluate whether NPC dialogue feels authentic
- Suggest creative actions a player might attempt
- Assess emotional resonance of narrative moments

**Important**: The LLM doesn't "play" the game. It **enhances** the archetype simulation by:
1. Generating more realistic questions
2. Evaluating content quality
3. Suggesting improvements

### Regression Testing

Save "golden runs" for each archetype. When content changes:
- Did any archetype's experience get worse?
- Did we break any previously-working paths?
- Did difficulty change unexpectedly?

### Content Generation Validation

When generating new content:
- Run all archetypes against it
- Ensure no archetype is completely blocked
- Verify emotional arc is present
- Check that all archetypes find *something* satisfying

---

## Summary: The Vision

The simulation isn't about AI playing the game. It's about **understanding how humans will experience the adventure** before any human plays it.

By running multiple archetypes, we get:
1. **Coverage**: Different play styles test different content
2. **Feedback**: Specific, actionable suggestions for improvement
3. **Confidence**: Knowing the adventure works for various player types
4. **Efficiency**: Finding problems before real players encounter them

The aggregate of all archetype runs reveals the **true shape** of the adventure—its strengths, weaknesses, and blind spots. This is the power of simulation: not to replace playtesting, but to make every playtest count by fixing the obvious problems first.
