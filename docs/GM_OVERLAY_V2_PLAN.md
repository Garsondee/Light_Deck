# GM Overlay v2 - Planning Document

**Status:** PLANNING  
**Created:** 2025-12-05  
**Author:** Cascade + Ingram  

---

## Executive Summary

The GM Overlay v2 is a complete redesign focused on **function over aesthetics**. The goal is to create a consistent, mouse-driven interface that gives the GM rapid access to scene information through a predictable pattern. Every scene will present information in the same structure, reducing cognitive load during live play.

Key additions:
- **Scene Index Header** - Always-visible navigation to scene sections
- **Inline NPC Links** - `[NPC Name]` in narrative text becomes clickable, opening NPC detail view
- **Disposition-Based Dialogue** - GM hints organized by emotional impact, not scripted trees
- **Ad-Hoc Skill Check Radial** - Quick skill/difficulty picker for improvised checks
- **Karaoke Mode** - Teleprompter-style scrolling for read-aloud text
- **Left Panel Detail View** - NPC/item details display in main area, not chat
- **Scene Jumper Modal** - Non-linear navigation with search (Cmd+J)
- **Global Search / Omnibar** - Spotlight-style search across all content (Cmd+K)
- **Session Scratchpad** - Editable notes that persist across scenes
- **Audio/Visual Actuators** - Play sounds and apply lighting directly from scene data
- **Breadcrumb Trail** - Visual navigation history for deep-linking

---

## VTT Philosophy

> **We're not building a computer game. We're building a VTT.**

This means:
- **Support systems, don't enforce them** - The GM has final say on everything
- **Player freedom is paramount** - Players will do unexpected things; the UI must adapt
- **Conversations flow naturally** - Dialogue hints guide, they don't script
- **Improvisation is expected** - Ad-hoc checks, off-script moments, creative solutions
- **Information retrieval over automation** - Help the GM find info fast, don't play the game for them
- **GM view is non-diegetic** - The players get the CRT/ASCII experience; the GM gets a clean control surface.

---

## Design Principles

1. **Predictable Structure** - Every scene follows the same layout pattern
2. **Mouse-First** - All actions accessible via click; keyboard shortcuts are secondary
3. **Information Hierarchy** - Most critical info visible without scrolling
4. **Context Preservation** - Viewing details doesn't lose your place in the scene
5. **Scrollbars Everywhere** - No hidden content; always show scroll position
6. **Guide, Don't Script** - Provide hints and beats, not dialogue trees
7. **Improvisation Support** - Ad-hoc tools for when players go off-script
8. **Non-Linear Navigation** - Players skip, retreat, and revisit; the UI must support this
9. **Reversible Actions** - Undo toasts for accidental triggers; confirmation for irreversible reveals
10. **Multi-Window Ready** - Pop-out panels for dual-monitor setups
11. **Function Over Form (GM View)** - GM interface prioritises legibility, speed, and use of screen real estate over diegetic styling.

---

## Layout Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HEADER: Act 1 / Ch 1 / Scene 1: The Briefing              [⚙] [✕]  1/7 │
├─────────────────────────────────────────────────────────────────────────┤
│ BREADCRUMBS: Scene 1 > Jax > Bio-Dyne                        [🏠 Hub]  │
├─────────────────────────────────────────────────────────────────────────┤
│ INDEX BAR: [📍 Location] [📖 Narrative] [👥 NPCs] [🎯 Checks] [⚡ Triggers] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ MAIN PANEL (Left 60%) ──────────────┐  ┌─ SIDEBAR (Right 40%) ────┐ │
│  │                                      │  │                          │ │
│  │  [NARRATIVE VIEW - Default]          │  │  SCENE INFO (Static)     │ │
│  │  or                                  │  │  ────────────────────    │ │
│  │  [NPC DETAIL VIEW - On click]        │  │  GM Notes from author    │ │
│  │  or                                  │  │                          │ │
│  │  [ITEM DETAIL VIEW - On click]       │  │  ──────────────────────  │ │
│  │  or                                  │  │  SESSION LOG (Editable)  │ │
│  │  [CONVERSATION GUIDE - On click]     │  │  ────────────────────    │ │
│  │                                      │  │  [+ Add Note]            │ │
│  │  ▼ Scrollbar                         │  │                          │ │
│  │                                      │  │  ──────────────────────  │ │
│  └──────────────────────────────────────┘  │  QUICK ACTIONS           │ │
│                                            │  ────────────────────    │ │
│                                            │  [🎯 AD-HOC CHECK]       │ │
│                                            │  [🎲 Roll Check ▼]       │ │
│                                            │  [⚡ Fire Trigger ▼]     │ │
│                                            │  [🔍 Search (Cmd+K)]     │ │
│                                            │  [📝 Scratchpad]         │ │
│                                            │  [📤 Export Scene]       │ │
│                                            │                          │ │
│                                            │  ──────────────────────  │ │
│                                            │  SCENE ELEMENTS          │ │
│                                            │  ────────────────────    │ │
│                                            │  NPCs: [Jax] [Cook]      │ │
│                                            │  Items: [Credstick]      │ │
│                                            │  Exits: [→ Scene 2]      │ │
│                                            │                          │ │
│                                            │  ▼ Scrollbar             │ │
│                                            └──────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ NAV: [◀ PREV] [�️ JUMP (Cmd+J)] [NEXT ▶]   [🎤 KARAOKE] [📖 GUIDE]     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Section Breakdown

### 1. Header Bar
- **Scene Label:** `Act X / Ch Y / Scene Z: Title`
- **Settings Gear:** Opens overlay preferences (font size, colors)
- **Close Button:** Hides overlay (keyboard: `G`)
- **Position Indicator:** `1 / 7` (current scene / total scenes)

### 2. Breadcrumb Trail (NEW)
Visual navigation history for deep-linking. Shows the path taken to reach current view.

```
Scene 1: The Briefing > Jax > Bio-Dyne Faction                    [🏠 Hub]
```

- Each segment is clickable to jump back
- **Hub Button** - Quick return to campaign hub/home base (if defined)
- Collapses to `... > Parent > Current` if too long
- Persists across view changes within the overlay

### 3. Index Bar
A horizontal strip of clickable section anchors. Clicking scrolls the main panel to that section.

| Icon | Label | Action |
|------|-------|--------|
| 📍 | Location | Jump to location/environment description |
| 📖 | Narrative | Jump to read-aloud text |
| 👥 | NPCs | Jump to NPC list |
| 🎯 | Checks | Jump to skill checks |
| ⚡ | Triggers | Jump to triggers |
| 💬 | Dialogue | Jump to conversation hints (if present) |

**Visual Indicator:** Active section is highlighted. Sections with no content are dimmed.

### 3. Main Panel (Left)

The main panel displays one of several views:

#### 3a. Narrative View (Default)
```
┌─────────────────────────────────────────────────────────────────┐
│ 📍 LOCATION: Street Noodle Stand                                │
│ ─────────────────────────────────────────────────────────────── │
│ Tone: Noir, Desperate, Grimy                                    │
│ ☀️ Lighting: Flickering pink neon...              [☀ Apply]      │  ← Actuator
│ 🔊 Audio: Heavy rain, hiss of steam...            [▶ Play]       │  ← Actuator
│ Smell: Ozone, synthetic pork, wet concrete, cheap tobacco.      │
│                                                                 │
│ 📖 NARRATIVE (Read-Aloud)                          [🎤 Karaoke] │
│ ─────────────────────────────────────────────────────────────── │
│ The rain in the Sprawl doesn't wash things clean; it just       │
│ makes the grime slicker. It's 02:00 AM in Sector 4...           │
│                                                                 │
│ Inside, huddled in the back booth away from the street view,    │
│ is your contact.                                                │
│                                                                 │
│ [Jaxson 'Jax' V.] usually carries himself with the swagger...   │  ← Clickable NPC link
│                                                                 │
│ 👥 NPCs IN SCENE                                                │
│ ─────────────────────────────────────────────────────────────── │
│ ● [Jaxson 'Jax' V.] - The Companion (active)                    │  ← Click opens NPC view
│ ○ [Noodle Stall Cook] - Background NPC (passive)                │
│                                                                 │
│ 🎯 SKILL CHECKS                                                 │
│ ─────────────────────────────────────────────────────────────── │
│ 🔍 Empathy DC 12 - Read Jax's body language [PASSIVE]           │  ← Passive = auto-roll
│ 🔍 Medicine DC 15 - Spot his symptoms [PASSIVE]                 │
│ 🗣️ Persuasion DC 13 - Negotiate the fee [ACTIVE]                │  ← Active = player choice
│                                                                 │
│ ⚡ TRIGGERS                                                      │
│ ─────────────────────────────────────────────────────────────── │
│ [▶ The Cough] - Jax coughs black fluid (passive reveal)         │
│                                                                 │
│ 💬 CONVERSATION GUIDE                                           │
│ ─────────────────────────────────────────────────────────────── │
│ ⚠️ MUST: Establish Jax is hiring for a job in Oakhaven          │  ← Critical (red)
│ ⛔ MUST NOT: Reveal Jax's true condition yet                     │  ← Critical (red)
│                                                                 │
│ Topics by Disposition:                                          │
│ 😐 Neutral: [The Job] [Jax's History] [Current Rumours]         │
│ 😢 Sad:     [Jax's Childhood]                                   │
│ 😠 Angry:   [Unusual Job] [Is Jax Lying?]                       │
└─────────────────────────────────────────────────────────────────┘
```

#### 3b. NPC Detail View
When clicking an NPC link, the main panel switches to show full NPC details.

**Header includes quick-glance identifiers and action buttons:**

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Back to Scene]                                    [↗ Pop-out] │
│                                                                 │
│ ═══════════════════════════════════════════════════════════════ │
│ JAXSON 'JAX' V.  (He/Him)  [Human]  [Faction: Bio-Dyne]         │
│ The Companion | Edgerunner                                      │
│ ─────────────────────────────────────────────────────────────── │
│ [👁️ SHOW IMAGE]  [📍 PING TOKEN]  [💤 HIDE]  [💀 KILL]           │
│ ═══════════════════════════════════════════════════════════════ │
│                                                                 │
│ DESCRIPTION                                                     │
│ ─────────────────────────────────────────────────────────────── │
│ Edgerunner. 30 years old. Dying of the genetic timebomb.        │
│ Type-H blood. Charismatic but desperate. Born as 'Subject 89'   │
│ in the Bio-Dyne breeding program.                               │
│                                                                 │
│ 🔗 LINKED ENTITIES                                              │
│ ─────────────────────────────────────────────────────────────── │
│ Faction: [Bio-Dyne Corp]  Location: [Oakhaven]                  │
│                                                                 │
│ STATS                                                           │
│ ─────────────────────────────────────────────────────────────── │
│ Stress: ○○○○ (0/4)    Wounds: ●●● (3)    Armor: 1               │
│ Attack: +5            Defense: 13                               │
│                                                                 │
│ ATTRIBUTES                                                      │
│ ─────────────────────────────────────────────────────────────── │
│ REF +2 | BOD +0 | TECH +2 | NEURAL +1 | EDGE +2 | PRES +3       │
│                                                                 │
│ SKILLS                                                          │
│ ─────────────────────────────────────────────────────────────── │
│ Primary: Netrunning +3                                          │
│ Secondary: Persuasion +2                                        │
│                                                                 │
│ ABILITIES                                                       │
│ ─────────────────────────────────────────────────────────────── │
│ ⚠️ Genetic Timebomb                                              │
│    The Bio-Dyne killswitch is active. Cannot sprint or take     │
│    strenuous actions without taking 1 Stress...                 │
│                                                                 │
│ ✨ Street Charm                                                  │
│    +2 to Persuasion checks against street-level contacts.       │
│                                                                 │
│ 🔧 Legacy Access                                                 │
│    Knows Bio-Dyne systems. +3 to Tech checks in Oakhaven.       │
│                                                                 │
│ SECRETS (GM Only)                                               │
│ ─────────────────────────────────────────────────────────────── │
│ 🔒 Identity: Subject 89 from Project Heirloom                   │
│ 🔒 Guilt: At age 15, he traded the ventilation codes...         │
│ 🔒 Condition: Genetic Timebomb - the Bio-Dyne killswitch...     │
│                                                                 │
│ BEHAVIOR                                                        │
│ ─────────────────────────────────────────────────────────────── │
│ Tactics: Avoids direct combat. Prefers hacking and talking...   │
│ Morale: Will not flee. This is his last mission.                │
│ Motivation: Survival. He needs Elena's heart AND her Type-H...  │
│                                                                 │
│ GM NOTES                                                        │
│ ─────────────────────────────────────────────────────────────── │
│ Jax is the tragic heart of this adventure. He's not evil...     │
└─────────────────────────────────────────────────────────────────┘
```

#### 3c. Conversation Guide View (Replaces Dialogue Tree)

The conversation guide is **GM-facing only**. It provides hints organized by the emotional impact on the NPC, not scripted player/NPC exchanges.

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Back to Scene]                                               │
│                                                                 │
│ 💬 CONVERSATION: Jaxson 'Jax' V.                                │
│ ═══════════════════════════════════════════════════════════════ │
│                                                                 │
│ ⚠️ SCENE IMPERATIVES                                            │
│ ─────────────────────────────────────────────────────────────── │
│ ✓ MUST: Player accepts the job and agrees to go to Oakhaven    │  ← Green bg, bold
│ ✓ MUST: Establish Jax is desperate and unwell                  │
│ ✗ MUST NOT: Reveal Jax is "Subject 89" or his true goal        │  ← Red bg, bold
│ ✗ MUST NOT: Let player leave without the credstick advance     │
│                                                                 │
│ 😐 NEUTRAL TOPICS                                               │
│ ─────────────────────────────────────────────────────────────── │
│ [The Job]                                                       │
│   → "Oakhaven. Old residential block. I left a drive behind."  │
│   → Convey: It's personal data, nothing corp-interesting       │
│   → Hide: It's not actually a drive he's after                 │
│   🎯 If pressed: Empathy DC 14 to sense the lie                │
│                                                                 │
│ [Jax's History]                                                 │
│   → "I used to live there, before the collapse."               │
│   → Convey: Nostalgia, loss, a life left behind                │
│   → This is true - lean into it                                │
│                                                                 │
│ [Current Rumours]                                               │
│   → "Squatters, maybe. Radiation is corp propaganda."          │
│   → Convey: Jax knows more than he's saying                    │
│   → He's downplaying the Hazers                                │
│                                                                 │
│ 😢 SAD TOPICS (Makes Jax melancholy, more honest)               │
│ ─────────────────────────────────────────────────────────────── │
│ [Jax's Childhood]                                               │
│   → "I was just a kid when it all went wrong."                 │
│   → Convey: Guilt, regret, a burden he carries                 │
│   → He won't elaborate - changes subject quickly               │
│   → If player pushes: He shuts down, -1 to Persuasion checks   │
│                                                                 │
│ 😠 ANGRY TOPICS (Makes Jax defensive, evasive)                  │
│ ─────────────────────────────────────────────────────────────── │
│ [Unusual Job]                                                   │
│   → "4k for a grab-and-go? That's hazard pay."                 │
│   → Jax gets defensive: "It's personal. Take it or leave it."  │
│   🎯 Negotiation DC 13 to push to 5k - he caves immediately    │
│                                                                 │
│ [Is Jax Lying?]                                                 │
│   → Direct accusation makes Jax angry                          │
│   → "I'm not lying. I just... can't tell you everything."      │
│   → He's technically telling the truth here                    │
│   🎯 Empathy DC 16 to sense he's hiding something big          │
└─────────────────────────────────────────────────────────────────┘
```

**Key Differences from Dialogue Trees:**
- No scripted player lines - players say whatever they want
- Topics grouped by emotional impact, not conversation flow
- GM hints on what to convey vs what to hide
- Skill checks are optional, triggered by player actions
- Imperatives at top ensure critical beats aren't missed

### 4. Sidebar (Right)

The sidebar remains visible regardless of main panel view.

```
┌──────────────────────────────────────┐
│ GM NOTES                             │
│ ──────────────────────────────────── │
│ Jax is lying about the client (Vane  │
│ doesn't exist) and the objective...  │
│ [Expand ▼]                           │
│                                      │
│ ══════════════════════════════════   │
│ QUICK ACTIONS                        │
│ ──────────────────────────────────── │
│ [� AD-HOC CHECK]                    │  ← Opens radial skill picker
│ [� Roll Check ▼]                    │  ← Dropdown: scene checks
│ [⚡ Fire Trigger ▼]                  │  ← Dropdown: select trigger
│ [📤 Export to LLM]                   │
│                                      │
│ ══════════════════════════════════   │
│ SCENE ELEMENTS                       │
│ ──────────────────────────────────── │
│ NPCs:                                │
│  ● [Jax] - active                    │
│  ○ [Cook] - passive                  │
│                                      │
│ Items:                               │
│  💰 [Credstick] - 2000 credits       │
│                                      │
│ Exits:                               │
│  → [Scene 2: The Gate]               │
│                                      │
│ ══════════════════════════════════   │
│ FLAGS                                │
│ ──────────────────────────────────── │
│ ☐ suspects_jax_lying                 │
│ ☐ witnessed_jax_cough                │
│ ☐ entered_undetected                 │
└──────────────────────────────────────┘
```

### 5. Navigation Bar

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [◀ PREV]  [📋 SELECT]  [NEXT ▶]          [🎤 KARAOKE]  [📖 GUIDE]       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Karaoke Mode

### Purpose
Allow the GM to read the opening narrative aloud without looking away from the screen. Text scrolls at a controlled pace like a teleprompter.

### Activation
- Click `[🎤 KARAOKE]` button in nav bar
- Keyboard shortcut: `K`

### Layout
```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                                                                         │
│                                                                         │
│         The rain in the Sprawl doesn't wash things clean;               │
│                                                                         │
│              it just makes the grime slicker.                           │
│                                                                         │
│         It's 02:00 AM in Sector 4, and the sky is                       │
│                                                                         │
│              the color of a bruised plum.                               │
│                                                                         │
│                                                                         │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  ◀◀  ◀  [▶ PLAY]  ▶  ▶▶     Speed: [━━━●━━━━━] 1.0x     [EXIT KARAOKE] │
│                                                                         │
│  ════════════════════════════●══════════════════════════════════════    │
│  0:00                       1:23                                  3:45  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Controls
| Control | Action |
|---------|--------|
| `◀◀` | Jump to start |
| `◀` | Rewind 5 seconds |
| `▶ PLAY` / `⏸ PAUSE` | Toggle playback |
| `▶` | Forward 5 seconds |
| `▶▶` | Jump to end |
| Speed slider | 0.5x - 2.0x |
| Progress bar | Click to seek |
| `EXIT KARAOKE` | Return to normal overlay |

### Visual Style
- Large, centered text (24-32px)
- Current line highlighted
- Upcoming lines dimmed
- Past lines fade out
- Subtle phosphor glow effect
- Dark background with vignette

### Text Sources
Karaoke mode can display:
1. **Narrative** - Main scene description
2. **Read-Aloud** - `interaction_flow.start.read_aloud`
3. **Closing** - `interaction_flow.closing.read_aloud`

Selection via dropdown before starting.

---

## Scene Jumper Modal (Cmd+J)

### Purpose
Non-linear navigation for when players skip, retreat, or revisit locations. Replaces the simple `[SELECT]` button.

### Activation
- Click `[🗺️ JUMP]` in nav bar
- Keyboard shortcut: `Cmd+J` / `Ctrl+J`

### Layout
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🗺️ SCENE JUMPER                                              [✕ Close] │
├─────────────────────────────────────────────────────────────────────────┤
│ Search: [________________________]                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ⭐ FAVORITES / HUB LOCATIONS                                            │
│ ─────────────────────────────────────────────────────────────────────── │
│ [🏠 Voltage's Apartment]  [🍜 Dragon's Breath]  [🏢 Omni-Global HQ]     │
│                                                                         │
│ 📖 ACT 1: THE LIE                                                       │
│ ─────────────────────────────────────────────────────────────────────── │
│ ● Scene 1: The Briefing (Current)                                       │
│ ○ Scene 2: The Gate                                                     │
│                                                                         │
│ 📖 ACT 2: THE RUINS                                                     │
│ ─────────────────────────────────────────────────────────────────────── │
│ ○ Scene 3: The Shrine                                                   │
│ ○ Scene 4: The Courtyard Ambush                                         │
│                                                                         │
│ 📖 ACT 3: THE CHOICE                                                    │
│ ─────────────────────────────────────────────────────────────────────── │
│ ○ Scene 5: The Admin Wing                                               │
│ ○ Scene 6: The Cryo Lab                                                 │
│ ○ Scene 7: The Exit                                                     │
│                                                                         │
│ 🔄 RECENTLY VISITED                                                     │
│ ─────────────────────────────────────────────────────────────────────── │
│ Scene 1 → Scene 2 → Scene 1 (backtracked)                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Features
- **Search** - Filter scenes by title, location, or NPC name
- **Favorites** - Pin frequently-visited hub locations
- **Act/Chapter grouping** - Collapsible sections
- **Current indicator** - Shows where you are
- **Recently visited** - Quick backtrack trail
- **Scene variants** - If a location has been modified (e.g., "destroyed"), show variant selector

---

## Global Search / Omnibar (Cmd+K)

### Purpose
Spotlight-style search across all campaign content. Find NPCs, rules, items, or scenes instantly.

### Activation
- Click `[🔍 Search]` in sidebar
- Keyboard shortcut: `Cmd+K` / `Ctrl+K`

### Layout
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🔍 [Search anything... NPCs, scenes, rules, items]                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ RECENT SEARCHES                                                         │
│ ─────────────────────────────────────────────────────────────────────── │
│ 🕐 "Jax"  🕐 "Type-H blood"  🕐 "grappling rules"                       │
│                                                                         │
│ RESULTS                                                                 │
│ ─────────────────────────────────────────────────────────────────────── │
│ 👤 Jaxson 'Jax' V. - NPC (Scene 1, 2, 5, 7)                             │
│ 📍 Oakhaven - Location (Scenes 2-7)                                     │
│ 📜 Type-H Blood - Lore Entry (Guide)                                    │
│ 🎯 Empathy DC 14 - Skill Check (Scene 1)                                │
│ 📦 Maintenance Chip - Item (Jax's inventory)                            │
│                                                                         │
│ ─────────────────────────────────────────────────────────────────────── │
│ [↑↓ Navigate]  [Enter Select]  [Esc Close]                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Search Targets
- **NPCs** - Name, role, faction
- **Scenes** - Title, location, narrative text
- **Items** - Name, description
- **Lore** - Guide entries, timeline events
- **Rules** - If a rules.json is provided
- **Flags** - Campaign state flags

### Result Actions
- **Enter** - Open the result in main panel
- **Shift+Enter** - Open in pop-out window
- **Cmd+Enter** - Jump to scene containing the result

---

## Dashboard / Landing State

### Purpose
What the overlay shows when no scene is active, or during travel/downtime.

### Layout
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🎲 A CHANGE OF HEART                                        [⚙] [✕]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ⏰ CAMPAIGN CLOCK                                                       │
│ ─────────────────────────────────────────────────────────────────────── │
│ Day 1, 02:47 AM                                    [+ Advance Time]     │
│                                                                         │
│ 👥 PARTY STATUS                                                         │
│ ─────────────────────────────────────────────────────────────────────── │
│ Kira "Voltage" Chen    HP: ████████░░ 8/10    Stress: ●●○○              │
│ Jaxson 'Jax' V.        HP: ██████░░░░ 6/10    Stress: ●●●○  ⚠️ CRITICAL │
│                                                                         │
│ 📍 CURRENT LOCATION                                                     │
│ ─────────────────────────────────────────────────────────────────────── │
│ Dragon's Breath Noodle Stand, Sector 4                                  │
│ [→ Enter Scene 1: The Briefing]                                         │
│                                                                         │
│ 🗺️ QUICK JUMP                                                           │
│ ─────────────────────────────────────────────────────────────────────── │
│ [🏠 Voltage's Apartment]  [🍜 Dragon's Breath]  [🏢 Omni-Global HQ]     │
│                                                                         │
│ 📋 SESSION NOTES                                                        │
│ ─────────────────────────────────────────────────────────────────────── │
│ • Player suspects Jax is lying                                          │
│ • Negotiated 5k total payment                                           │
│ [+ Add Note]                                                            │
│                                                                         │
│ 🚩 ACTIVE FLAGS                                                         │
│ ─────────────────────────────────────────────────────────────────────── │
│ ☑ suspects_jax_lying    ☐ witnessed_jax_cough    ☐ entered_undetected  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Use Cases
- **Session start** - Review party status before diving in
- **Travel montage** - "You travel for 3 hours..." without a specific scene
- **Downtime** - Players are shopping, resting, etc.
- **Session end** - Review flags and notes before closing

---

## GM Chat Log (DOM-Based, GM-Only)

### Purpose
Give the GM their own high-clarity chat log separate from the diegetic player chat. The GM can monitor everything (rolls, system messages, SyncManager events) without squinting at the CRT-style log.

### Layout
```
┌───────────────────────────────────────────────┐
│ 🛰️ GM CHAT LOG                               │
├───────────────────────────────────────────────┤
│ [System] Player "Voltage" connected from Web │
│ [Roll ] Kira rolls 2d6+3 = 11 (Damage)       │
│ [Sync ] Scene changed → Act 1 / Scene 1      │
│ [GM  ] Note added: Cook now hostile to V.    │
│ [Warn] Trigger "The Cough" fired for players │
│                                               │
│ ...                                           │
├───────────────────────────────────────────────┤
│ Filter: [All ▼]  [System] [Rolls] [Player]    │
│                                               │
│ [📝 GM Input................................] │
│                          [Send as GM Note]    │
└───────────────────────────────────────────────┘
```

### Behaviour
- **DOM-based panel** with selectable, copyable text.
- Mirrors all messages from player chat (via SyncManager) but can:
  - Highlight system/roll events more strongly.
  - Show extra metadata (socket IDs, latency, debug info) if enabled.
- GM can add private notes inline (tagged as `[GM]`) which never reach players.
- Filters allow focusing on rolls, system, or player chatter.

### Integration
- Lives as a **separate DOM pane** that can:
  - Dock to the right of the GM Overlay.
  - Pop out into a second monitor window.
- Uses the same data feed as `ChatManager`, but renders in a non-diegetic style:
  - Clean background, readable fonts, subtle highlighting.
  - No CRT distortion or phosphor effects.

### Key Goals
- GM can always see **what players see**, plus additional context.
- No need to read tiny CRT-styled text during live play.
- Keeps the GM's control surface consistent with the function-first philosophy.

---

## Undo / Confirmation System

### Purpose
Prevent accidental reveals and allow recovery from misclicks.

### Trigger Confirmation
For triggers marked as `irreversible: true`:
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠️ CONFIRM TRIGGER                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ You are about to fire: "The Cough"                                      │
│                                                                         │
│ This will reveal: Jax coughs black fluid (necrotic oil).                │
│                                                                         │
│ This action cannot be undone.                                           │
│                                                                         │
│                              [Cancel]  [🔥 Fire Trigger]                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Undo Toast
For reversible actions, show a 5-second toast:
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ✓ Trigger fired: "The Cough"                              [↩ Undo] (5s) │
└─────────────────────────────────────────────────────────────────────────┘
```

### Undo Actions
- **Skill check** - Remove from chat, re-roll available
- **Trigger (reversible)** - Remove chat message, reset flag
- **NPC state change** - Revert HIDE/KILL

---

## Ad-Hoc Skill Check Radial

### Purpose
When players do something unexpected, the GM needs to quickly create a skill check on the fly. The radial interface allows fast skill + difficulty selection with minimal clicks.

### Activation
- Click `[🎯 AD-HOC CHECK]` in sidebar Quick Actions
- Keyboard shortcut: `R` (for Radial)

### Interface Flow

**Step 1: Skill Selection (Radial)**
```
                    [Empathy]
                        │
         [Persuasion]   │   [Perception]
                  ╲     │     ╱
                   ╲    │    ╱
      [Streetwise]──────●──────[Tech]
                   ╱    │    ╲
                  ╱     │     ╲
           [Stealth]    │   [Athletics]
                        │
                    [Medicine]
```
- Mouse moves toward skill, click to select
- Skills arranged by category (Social, Physical, Mental, Technical)
- Recently used skills highlighted
- Custom skill option at center

**Step 2: Difficulty Selection (Linear)**
```
┌─────────────────────────────────────────────────────────────────┐
│ EMPATHY CHECK - Select Difficulty                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Trivial]  [Easy]  [Medium]  [Hard]  [Very Hard]  [Extreme]   │
│    DC 5      DC 8    DC 12    DC 15     DC 18       DC 22      │
│                                                                 │
│  Custom DC: [____]                              [Cancel]        │
└─────────────────────────────────────────────────────────────────┘
```

**Step 3: Check Created → Sent to Chat**
```
┌─ CHAT LOG ──────────────────────────────────────────────────────┐
│                                                                 │
│ [GM] Empathy check (DC 12) requested                           │
│ [🎲 Roll Empathy DC 12]  ← Player clicks to roll               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Difficulty Scale

| Label | DC | Description |
|-------|-----|-------------|
| Trivial | 5 | Anyone could do this |
| Easy | 8 | Slight challenge |
| Medium | 12 | Requires competence |
| Hard | 15 | Requires expertise |
| Very Hard | 18 | Exceptional difficulty |
| Extreme | 22 | Near impossible |

### Skill Categories

**Social**
- Empathy, Persuasion, Intimidation, Deception, Performance

**Physical**
- Athletics, Stealth, Acrobatics, Endurance

**Mental**
- Perception, Investigation, Insight, Willpower

**Technical**
- Tech, Medicine, Netrunning, Crafting, Driving

### Workflow
1. GM clicks `[🎯 AD-HOC CHECK]`
2. Radial appears centered on cursor
3. GM drags toward skill → click
4. Difficulty bar appears
5. GM clicks difficulty (or types custom DC)
6. Check is broadcast to chat as a clickable roll button
7. Player clicks to roll, result shown to all

### Visual Style
- Radial uses same phosphor green aesthetic
- Selected skill glows brighter
- Difficulty buttons use color coding:
  - Trivial/Easy: Green
  - Medium: Yellow
  - Hard/Very Hard: Orange
  - Extreme: Red

---

## Inline NPC Links

### Syntax in Scene JSON
NPCs mentioned in narrative text should be wrapped in brackets:

```json
{
  "narrative": "Inside, huddled in the back booth, is [Jaxson 'Jax' V.]. He's wearing a heavy trench coat..."
}
```

### Rendering
- `[NPC Name]` renders in **cyan** (#00ffff) with underline
- Hover shows tooltip: "Click to view NPC details"
- Click switches main panel to NPC Detail View

### Matching Logic
1. Exact match against `npc.name`
2. Partial match against `npc.id`
3. Fuzzy match (Levenshtein distance < 3)

---

## Skill Check Types

### Active Checks
- Player explicitly chooses to attempt
- Example: "I want to negotiate a better price"
- Displayed with 🗣️ icon
- Click to roll

### Passive Checks
- GM rolls secretly based on player's passive score
- Example: "Did they notice Jax is lying?"
- Displayed with 🔍 icon
- Click to roll (result shown only to GM)

### Hidden Checks
- Player doesn't know the check exists
- Example: "Did they spot the alligator?"
- Not displayed in main list
- Accessed via "Hidden Checks" dropdown in Quick Actions

### Visual Indicators
```
🔍 Empathy DC 12 - Read Jax's body language [PASSIVE]     ← Gray background
🗣️ Persuasion DC 13 - Negotiate the fee [ACTIVE]          ← Green background
🔒 Perception DC 15 - Spot the hidden door [HIDDEN]       ← Red background (GM only)
```

---

## Scene JSON Schema Updates

### New Fields
```json
{
  "environment": {
    "location": "Street Noodle Stand",
    "tone": "Noir, Desperate, Grimy",
    "lighting": {
      "description": "Flickering pink neon from the 'OPEN' sign",
      "preset": "neon_noir",       // Links to lighting preset
      "actuator": true             // Show [☀ Apply] button
    },
    "audio": {
      "description": "Heavy rain on corrugated tin, the hiss of steam",
      "tracks": ["rain_heavy", "steam_hiss", "distant_sirens"],
      "actuator": true             // Show [▶ Play] button
    },
    "smell": "Ozone, synthetic pork, wet concrete, cheap tobacco."
  },
  
  "variant_id": null,              // NEW: "destroyed", "abandoned", etc.
  "base_scene_id": null,           // NEW: Links to original if this is a variant
  
  "challenges": [
    {
      "id": "assess_jax",
      "skill": "Empathy",
      "difficulty": 12,
      "type": "passive",           // "active", "passive", "hidden"
      "description": "Read Jax's body language",
      "success_effect": { ... },
      "failure_effect": { ... }
    }
  ],
  
  "items": [
    {
      "id": "credstick",
      "name": "Credstick",
      "value": "2000 credits",
      "notes": "Encrypted transaction",
      "visible": true              // false = hidden until discovered
    }
  ],
  
  "loot_table": [                  // NEW: Random pocket clutter
    { "item": "Empty Bio-Dyne Pure Bottle", "weight": 100 },
    { "item": "Scrap Components", "weight": 60 },
    { "item": "Filtered Water", "weight": 40 },
    { "item": "Old Family Photo", "weight": 20 }
  ],
  
  "triggers": [
    {
      "id": "clue_sludge",
      "label": "The Cough",
      "action": "passive",
      "text": "Jax coughs black fluid...",
      "irreversible": true,        // NEW: Requires confirmation
      "sets_flag": "witnessed_jax_cough"
    }
  ]
}
```

### NPC Reference in Narrative
```json
{
  "narrative": "Inside is [Jaxson 'Jax' V.], your contact. The [Noodle Stall Cook] ignores you."
}
```

### NPC Schema Updates
```json
{
  "id": "jax",
  "name": "Jaxson 'Jax' V.",
  "pronouns": "he/him",            // NEW: Critical for GM reference
  "species": "Human",              // NEW: For fantasy/sci-fi settings
  "faction": "Bio-Dyne",           // NEW: Clickable link to faction
  "type": "companion",
  "archetype": "edgerunner",
  "image": "jax_portrait.png",     // NEW: For [👁️ SHOW IMAGE] button
  "token": "jax_token.png",        // NEW: For [📍 PING TOKEN] button
  
  "description": "Edgerunner. 30 years old...",
  
  "linked_entities": [             // NEW: Cross-references
    { "type": "faction", "id": "biodyne", "label": "Bio-Dyne Corp" },
    { "type": "location", "id": "oakhaven", "label": "Oakhaven" },
    { "type": "npc", "id": "elena", "label": "Elena (Subject 01)" }
  ],
  
  "stats": { ... },
  "attributes": { ... },
  "skills": { ... },
  "abilities": [ ... ],
  "secrets": { ... },
  "behavior": { ... },
  "notes": "..."
}
```

### Conversation Guide Schema (Replaces dialogue_tree)
```json
{
  "conversation": {
    "npc_id": "jax",
    
    "imperatives": {
      "must": [
        "Player accepts the job and agrees to go to Oakhaven",
        "Establish Jax is desperate and unwell"
      ],
      "must_not": [
        "Reveal Jax is 'Subject 89' or his true goal",
        "Let player leave without the credstick advance"
      ]
    },
    
    "topics": [
      {
        "id": "the_job",
        "label": "The Job",
        "disposition": "neutral",
        "hints": [
          "Oakhaven. Old residential block. I left a drive behind.",
          "Convey: It's personal data, nothing corp-interesting",
          "Hide: It's not actually a drive he's after"
        ],
        "check": {
          "trigger": "If pressed",
          "skill": "Empathy",
          "dc": 14,
          "success": "Player senses the lie",
          "failure": "Seems sentimental"
        }
      },
      {
        "id": "jax_childhood",
        "label": "Jax's Childhood",
        "disposition": "sad",
        "hints": [
          "I was just a kid when it all went wrong.",
          "Convey: Guilt, regret, a burden he carries",
          "He won't elaborate - changes subject quickly",
          "If player pushes: He shuts down, -1 to Persuasion checks"
        ]
      },
      {
        "id": "is_jax_lying",
        "label": "Is Jax Lying?",
        "disposition": "angry",
        "hints": [
          "Direct accusation makes Jax angry",
          "I'm not lying. I just... can't tell you everything.",
          "He's technically telling the truth here"
        ],
        "check": {
          "trigger": "If player insists",
          "skill": "Empathy",
          "dc": 16,
          "success": "Player senses he's hiding something big"
        }
      }
    ]
  }
}
```

**Disposition Values:**
- `neutral` - Safe topics, no emotional shift
- `sad` - Makes NPC melancholy, may reveal more
- `angry` - Makes NPC defensive, may shut down
- `happy` - Builds rapport, unlocks trust
- `fearful` - NPC becomes evasive, may flee

---

## Scene Activation System (PRIORITY)

### Purpose
Distinguish between the GM **browsing** scenes (reading ahead, reviewing past content) and **activating** a scene for players. Only activated scenes are pushed to players via SyncManager.

### Key Concepts

| Term | Definition |
|------|------------|
| **Current Scene** | The scene the GM is currently viewing in the overlay |
| **Active Scene** | The scene players are currently experiencing |
| **Browsing** | GM navigating scenes without affecting players |
| **Activation** | Explicitly pushing a scene to all players |

### Visual Indicators

**Header shows both states:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📖 VIEWING: Act 1 / Ch 1 / Scene 2: The Gate                    [⚙] [✕] │
│ 🎬 ACTIVE:  Act 1 / Ch 1 / Scene 1: The Briefing                        │
└─────────────────────────────────────────────────────────────────────────┘
```

- When viewing the active scene, header shows only one line (green indicator)
- When browsing a different scene, header shows both lines (amber "VIEWING" + green "ACTIVE")
- Subtle pulsing border or glow when viewing a non-active scene

### Scene Transition Panel (End of Scene)

At the bottom of every scene's NarrativeView, after all content:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ═══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│ 🎬 SCENE TRANSITIONS                                                    │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│ Continue to:                                                            │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ → Scene 2: The Gate                                    [ACTIVATE]  │ │
│ │   "The players travel to the Oakhaven perimeter..."                │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ Or branch to:                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ↗ Scene 2B: The Sewers (if players refuse front entrance)          │ │
│ │   "An alternative route through the old drainage system..."        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ─────────────────────────────────────────────────────────────────────── │
│ [🔍 Jump to Any Scene...]                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### NavBar Updates

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [◀ PREV]  [🗺️ JUMP]  [NEXT ▶]     [🎬 ACTIVATE SCENE]  [🎤 KARAOKE]     │
└─────────────────────────────────────────────────────────────────────────┘
```

- **ACTIVATE SCENE** button is:
  - **Disabled** (grayed out) when viewing the already-active scene
  - **Enabled** (amber/highlighted) when viewing a different scene
  - Shows confirmation tooltip: "Push this scene to all players"

### Scene Jumper Modal Updates

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🗺️ SCENE JUMPER                                              [✕ Close] │
├─────────────────────────────────────────────────────────────────────────┤
│ Search: [________________________]                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ 📖 ACT 1: THE LIE                                                       │
│ ─────────────────────────────────────────────────────────────────────── │
│ 🎬 Scene 1: The Briefing (ACTIVE)                      [View] [Activate]│
│ ○ Scene 2: The Gate                                    [View] [Activate]│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

- **View** - Opens scene in GM overlay without affecting players
- **Activate** - Opens scene AND pushes to players (with confirmation)
- Active scene marked with 🎬 icon

### Activation Flow

1. GM clicks **ACTIVATE SCENE** or **Activate** in Scene Jumper
2. Confirmation toast appears: "Activate Scene 2: The Gate for all players?"
3. On confirm:
   - `sceneStore.activeSceneId` is updated
   - `SyncManager.broadcastSceneChange()` is called
   - Players receive scene transition
   - Chat log shows: "[System] Scene changed → The Gate"
4. GM overlay updates to show scene as active

### State Management

```typescript
// sceneStore.ts additions
interface SceneState {
  // Existing
  scenes: Scene[];
  currentIndex: number;      // What GM is viewing
  currentScene: Scene | null;
  
  // New
  activeSceneId: string | null;  // What players are seeing
  activeSceneIndex: number;
  
  // Actions
  activateScene: (sceneId: string) => void;
  activateCurrentScene: () => void;
  isActiveScene: (sceneId: string) => boolean;
}
```

### Scene JSON Schema Updates

```json
{
  "id": "scene_01_01_01",
  "title": "The Briefing",
  
  "transitions": {
    "next": [
      {
        "targetSceneId": "scene_01_01_02",
        "label": "Scene 2: The Gate",
        "description": "The players travel to the Oakhaven perimeter...",
        "condition": null
      }
    ],
    "branches": [
      {
        "targetSceneId": "scene_01_01_02b",
        "label": "Scene 2B: The Sewers",
        "description": "An alternative route through the old drainage system...",
        "condition": "Players refuse front entrance"
      }
    ]
  }
}
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Shift+Enter` | Activate current scene (with confirmation) |
| `←` / `→` | Browse prev/next scene (no activation) |

### Safety Features

1. **Confirmation required** for all activations (prevents accidental scene spoilers)
2. **Visual distinction** between browsing and active states
3. **Chat notification** when scene is activated
4. **Undo window** (5 seconds) to revert accidental activation

---

## Implementation Phases

### Phase 0: Scene Activation System (PRIORITY)
- [x] Add activeSceneId/activeSceneIndex to sceneStore
- [x] Create activateScene and activateCurrentScene actions
- [x] Add SceneTransitionPanel component at end of NarrativeView
- [x] Update Header to show viewing vs active scene
- [x] Add ACTIVATE SCENE button to NavBar
- [x] Update SceneJumperModal with View/Activate buttons
- [x] Integrate with SyncManager.broadcastSceneChange()
- [x] Add confirmation modal for scene activation
- [ ] Add transitions field to Scene type

### Phase 1: Layout Restructure
- [x] Implement new 60/40 split layout
- [x] Add Index Bar with section anchors
- [ ] Add scrollbars to all scrollable regions
- [ ] Implement section jumping

### Phase 2: NPC Detail View
- [ ] Create NPC detail view renderer
- [ ] Load NPC data from `assets/characters/npcs/*.json`
- [ ] Implement `[NPC Name]` link parsing in narrative
- [ ] Add "Back to Scene" navigation

### Phase 3: Conversation Guide
- [ ] Create conversation guide view renderer
- [ ] Implement imperatives display (MUST/MUST NOT)
- [ ] Implement disposition-grouped topics
- [ ] Add inline topic expansion
- [ ] Parse conversation schema from scene JSON

### Phase 4: Karaoke Mode
- [ ] Create karaoke overlay renderer
- [ ] Implement text scrolling animation
- [ ] Add playback controls
- [ ] Add speed control
- [ ] Add progress bar with seeking

### Phase 5: Ad-Hoc Skill Check Radial
- [ ] Create radial menu component
- [ ] Implement skill selection wheel
- [ ] Implement difficulty selection bar
- [ ] Broadcast check to chat as clickable button
- [ ] Add keyboard shortcut (R)

### Phase 6: Scene Jumper & Search
- [ ] Create Scene Jumper modal
- [ ] Implement scene search/filter
- [ ] Add favorites/hub locations
- [ ] Create Global Search omnibar
- [ ] Index all searchable content

### Phase 7: Sidebar Enhancements
- [ ] Split GM Notes into Static/Editable
- [ ] Implement Session Log with localStorage persistence
- [ ] Add Quick Actions dropdowns
- [ ] Add Flags section with toggle controls

### Phase 8: Undo/Confirmation System
- [ ] Add confirmation modal for irreversible triggers
- [ ] Implement undo toast with timer
- [ ] Track reversible action history

### Phase 9: Dashboard State
- [ ] Create landing/dashboard view
- [ ] Implement campaign clock
- [ ] Add party status summary
- [ ] Quick jump to hub locations

### Phase 10: Polish
- [ ] Add keyboard shortcuts
- [ ] Add settings panel (font size, colors)
- [ ] Add tooltips
- [ ] Performance optimization
- [ ] Pop-out window support

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `G` | Toggle GM Overlay |
| `Cmd+J` | Open Scene Jumper |
| `Cmd+K` | Open Global Search |
| `K` | Toggle Karaoke Mode |
| `R` | Open Ad-Hoc Check Radial |
| `H` | Return to Hub (if defined) |
| `←` / `→` | Prev / Next Scene |
| `1-6` | Jump to Index section |
| `Esc` | Back / Close modal / Cancel radial |
| `Space` | Play/Pause (Karaoke) |
| `+` / `-` | Speed up / slow down (Karaoke) |
| `Cmd+Z` | Undo last action (if reversible) |

---

## Technical Considerations

### GM UI Rendering: DOM-first, Non-Diegetic
**Decision Point:** Canvas text is not selectable/searchable by browser, but the GM needs a fast, readable control surface.

- The **player view** remains fully diegetic (CRT/ASCII via Three.js).
- The **GM view** is deliberately **non-diegetic**, prioritising clarity and speed over aesthetic.

**GM Interface Principles:**
- Use **DOM-based UI** for GM panels (overlay, scene jumper, omnibar, GM chat, dashboards).
- Use **large, modern typography** and high contrast for legibility.
- Occupy **~90% of screen real estate** when the GM overlay is open.
- Keep layout clean and minimal; avoid heavy CRT effects and distortions.
- Reserve Three.js planes for player-facing visuals only.

**Implications:**
- Main GM panels (narrative, NPC detail, conversation guide, GM chat) are standard HTML/CSS.
- These panels sit above the Three.js canvas, hidden from players.
- We can rely on native browser features: text selection, copy/paste, Ctrl+F search, accessibility tools.

**Recommendation:** The GM's Interface should always preference function over form. The whole of the rest of the interface is diegetic but the GM will appreciate quick access, easy readable text and the use of 90% of the screen real estate. This is all happening invisibly to the players who get the diegetic experience.

### NPC Data Loading
```javascript
// Load NPC from external file
async function loadNPCData(npcId) {
    const response = await fetch(`/assets/characters/npcs/${npcId}.json`);
    return response.json();
}
```

### View State Management
```javascript
const viewState = {
    currentView: 'narrative',  // 'narrative', 'npc', 'dialogue', 'item'
    viewStack: [],             // For back navigation
    scrollPositions: {},       // Preserve scroll per section
    selectedNPC: null,
    selectedDialogue: null
};
```

### Click Region Types
```javascript
const regionTypes = {
    'index-section': handleIndexClick,
    'npc-link': handleNPCLinkClick,
    'npc-button': handleNPCButtonClick,
    'check-button': handleCheckClick,
    'trigger-button': handleTriggerClick,
    'nav-button': handleNavClick,
    'karaoke-control': handleKaraokeControl,
    'back-button': handleBackClick
};
```

---

## Open Questions

1. **Flag Persistence** - Should flag states persist across sessions? (LocalStorage? Server?)
2. **Multi-NPC Scenes** - How to handle scenes with 5+ NPCs? Pagination? Collapsible list?
3. **Combat Mode** - Should there be a dedicated combat view with initiative tracker?
4. **Player Handouts** - Should GM be able to "push" specific text to player view?
5. **Voice Integration** - Future: TTS for Karaoke mode?
6. **Session Notes Sync** - Should session notes sync to server for multi-device GM?
7. **Scene Variants** - How to handle "destroyed" versions of locations? Separate JSON or inline variants?
8. **Loot Generation** - Should loot_table rolls happen automatically or on-demand?

---

## Mockup Reference

See attached screenshot for current v1 implementation.

**Key differences in v2:**
- Breadcrumb trail for navigation history
- Index bar with section anchors
- Audio/Visual actuators ([▶ Play], [☀ Apply])
- NPC header with pronouns, species, faction, action buttons
- Linked entities for cross-referencing
- Conversation guide (disposition-based, not dialogue trees)
- Scene Jumper modal (Cmd+J) for non-linear navigation
- Global Search omnibar (Cmd+K)
- Session Log (editable) separate from GM Notes (static)
- Ad-hoc skill check radial
- Undo toasts and confirmation dialogs
- Dashboard/landing state for downtime
- Pop-out support for dual monitors

---

## Success Criteria

1. GM can access any scene element in ≤2 clicks
2. NPC details visible without leaving scene context
3. Karaoke mode allows hands-free reading
4. All scrollable content has visible scrollbars
5. Layout is consistent across all scenes
6. No information requires keyboard-only access
7. Non-linear navigation supported (skip, retreat, hub return)
8. Accidental reveals are reversible or require confirmation
9. Session notes persist across scenes and sessions
10. Text is selectable and searchable (if using DOM hybrid)

---

## Future Enhancements (v3+)

### Combat Tracker Integration
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚔️ COMBAT MODE                                    [End Combat]  │
├─────────────────────────────────────────────────────────────────┤
│ INITIATIVE                                                      │
│ ─────────────────────────────────────────────────────────────── │
│ ▶ 18 - Kira Voltage (Player)           HP: ████████░░ 8/10     │
│   15 - [Jaxson 'Jax' V.] (Ally)        HP: ██████░░░░ 6/10     │
│   12 - Hazer Sentinel #1 (Enemy)       HP: ████░░░░░░ 4/10     │
│   12 - Hazer Sentinel #2 (Enemy)       HP: ██████████ 10/10    │
│    8 - Rattle (Enemy)                  HP: ████████░░ 16/20    │
│                                                                 │
│ [Next Turn] [Add Combatant] [Roll Initiative]                   │
└─────────────────────────────────────────────────────────────────┘
```

### Player Handout System
Push specific content to player's view:
- Read-aloud text
- Item descriptions
- Clue reveals
- Map reveals

```javascript
// GM clicks "Push to Players" on a text block
SyncManager.broadcastHandout({
    type: 'text',
    title: 'What You See',
    content: 'The neon sign flickers...',
    style: 'narrative'  // or 'item', 'clue', 'warning'
});
```

### Quick Reference Panel
Collapsible panel for frequently-needed rules:
- Skill check DCs by difficulty
- Combat actions reference
- Condition effects
- Damage types

### Session Notes
Persistent notes that survive scene changes:
```
┌──────────────────────────────────────┐
│ 📝 SESSION NOTES                     │
│ ──────────────────────────────────── │
│ • Player suspects Jax is lying       │
│ • Negotiated 5k total payment        │
│ • Didn't notice the cough            │
│                                      │
│ [+ Add Note]                         │
└──────────────────────────────────────┘
```

### Timeline View
Visual timeline of the adventure showing:
- Current position
- Key events
- Branch points
- Player choices made

### Search Function
`Ctrl+F` to search across:
- Current scene
- All scenes
- NPCs
- Items
- Guide content

### Dice Tray
Integrated dice roller with history:
```
┌──────────────────────────────────────┐
│ 🎲 DICE TRAY                         │
│ ──────────────────────────────────── │
│ [d4] [d6] [d8] [d10] [d12] [d20]     │
│                                      │
│ Custom: [2d6+3] [Roll]               │
│                                      │
│ History:                             │
│  d20 = 17 (Empathy check)            │
│  2d6+3 = 11 (Damage)                 │
│  d20 = 4 (Perception - FAIL)         │
└──────────────────────────────────────┘
```

### Ambient Control
Quick access to scene atmosphere:
```
┌──────────────────────────────────────┐
│ 🎵 AMBIENCE                          │
│ ──────────────────────────────────── │
│ [▶ Rain + Thunder]     Vol: ━━━●━━   │
│ [▶ Neon Hum]           Vol: ━●━━━━   │
│ [▶ Distant Sirens]     Vol: ━━●━━━   │
│                                      │
│ Presets: [Noir Night] [Combat] [Calm]│
└──────────────────────────────────────┘
```

---

## Appendix: Color Palette

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Background | `#050505` | Main background |
| Panel BG | `#141414` | Section backgrounds |
| Border | `#33ff66` | Active borders |
| Border Dim | `#225533` | Inactive borders |

### Text Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary | `#33ff66` | Main text |
| Bright | `#66ff99` | Headers, highlights |
| Dim | `#228844` | Secondary text |
| Accent | `#ffaa00` | Section labels |
| Link | `#00ffff` | NPC links |
| Warning | `#ff6633` | Alerts, hidden checks |

### State Colors
| Name | Hex | Usage |
|------|-----|-------|
| Active | `#33ff66` | Active NPC indicator |
| Passive | `#6666cc` | Hidden NPC indicator |
| Defeated | `#996666` | Defeated NPC indicator |
| Success | `#33ff66` | Check success |
| Failure | `#ff3333` | Check failure |

---

## Appendix: File Structure

```
public/js/managers/
├── gm-overlay-manager.js      # Main overlay controller
├── gm-overlay-views/
│   ├── narrative-view.js      # Default scene view
│   ├── npc-detail-view.js     # NPC statblock view
│   ├── dialogue-view.js       # Dialogue tree view
│   ├── item-view.js           # Item detail view
│   └── karaoke-view.js        # Teleprompter view
├── gm-overlay-components/
│   ├── index-bar.js           # Section navigation
│   ├── sidebar.js             # Right panel
│   ├── scrollbar.js           # Custom scrollbar
│   └── quick-actions.js       # Dropdown menus
└── gm-overlay-utils/
    ├── npc-linker.js          # Parse [NPC] links
    ├── text-wrapper.js        # Text wrapping
    └── view-stack.js          # Navigation history
```

---

## Appendix: Event Flow

```
User clicks [Jax] link in narrative
    │
    ▼
handleNPCLinkClick('jax')
    │
    ├─► Push current view to viewStack
    │
    ├─► Load NPC data from assets/characters/npcs/jax.json
    │
    ├─► Set viewState.currentView = 'npc'
    │
    ├─► Set viewState.selectedNPC = npcData
    │
    └─► dirty = true (triggers re-render)
    
    
User clicks [← Back to Scene]
    │
    ▼
handleBackClick()
    │
    ├─► Pop previous view from viewStack
    │
    ├─► Restore scroll position from scrollPositions
    │
    ├─► Set viewState.currentView = previousView
    │
    └─► dirty = true (triggers re-render)
```
