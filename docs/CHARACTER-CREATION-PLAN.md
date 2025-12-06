# Character Creation System — Planning Document

> *"Who are you in the sprawl? Let's find out."*

---

## 1. Overview

Character creation should feel like booting up a new identity — a moment of self-definition before the chaos begins. The player accesses it via the **chat log** which triggers the terminal display in **Character Creation Mode**.

### 1.1 Design Goals

- **Immersive** — Feels like interfacing with a cyberpunk system, not filling out a form
- **Guided** — Step-by-step flow prevents overwhelm
- **Meaningful Choices** — Every selection has narrative weight
- **Quick** — 10-15 minutes for a complete character
- **Replayable** — Different builds feel genuinely different

### 1.2 Entry Point

Player types `/newchar` or `/create` in chat → Terminal switches to Character Creation Mode with a boot sequence:

```
IDENTITY FORGE v3.2.1
(c) 2157 Meridian Systems Corp.

Initializing biometric scan...
[OK] Neural signature captured
[OK] SIN database bypassed
[OK] Ghost protocol active

Let's build your legend, choom.
```

---

## 2. Creation Flow

### Phase 1: Identity
- **Name** — Legal name (or what's left of it)
- **Handle** — Street name (what people call you)
- **Pronouns** — he/him, she/her, they/them, custom

### Phase 2: Background
Choose one of six origins (each grants +1 to two skills + starting gear):

| Background | Bonus Skills | Starting Gear | Flavor |
|------------|--------------|---------------|--------|
| **Street Kid** | Streetwise +1, Melee +1 | Knife, street clothes, burner phone | Grew up in the gutter |
| **Corporate** | Persuasion +1, Investigation +1 | Business suit, encrypted comm, +2000¢ | Escaped the machine |
| **Techie** | Hardware +1, Rigging +1 | Tool kit, basic drone, workshop access | Grease under the nails |
| **Nomad** | Survival +1, Firearms +1 | Motorcycle, road leathers, rifle | The road is home |
| **Medic** | Medicine +1, Perception +1 | Med kit, trauma drugs, clinic access | Seen too much meat |
| **Enforcer** | Intimidation +1, Melee +1 | Armored vest, heavy pistol, reputation | Violence is a language |

### Phase 3: Attributes
Distribute **8 points** across 6 attributes (baseline +0, max +3 at creation):

| Attribute | Abbr | Governs |
|-----------|------|---------|
| REFLEX | REF | Speed, agility, ranged combat |
| BODY | BOD | Strength, endurance, melee |
| TECH | TEC | Engineering, repair, cyberware |
| NEURAL | NEU | Hacking, AI, mental fortitude |
| EDGE | EDG | Perception, intuition, luck |
| PRESENCE | PRE | Charisma, intimidation, negotiation |

**UI:** Six sliders or +/- buttons, pool counter shows remaining points.

### Phase 4: Skills
Distribute **20 points** across 16 skills (max +3 at creation, background bonuses already applied):

**Combat:** Firearms, Heavy Weapons, Melee, Evasion  
**Technical:** Netrunning, Hardware, Rigging, Medicine  
**Social:** Persuasion, Intimidation, Deception, Streetwise  
**Awareness:** Perception, Investigation, Stealth, Survival

**UI:** Skill list with +/- buttons, grouped by category. Pool counter shows remaining.

### Phase 5: Stunts (NEW)
Choose **2 Stunts** — signature moves that define your style:

See Section 3 for full stunt list.

### Phase 6: Flaws (OPTIONAL)
Take **0-2 Flaws** — each grants **+1 additional Stunt**:

See Section 4 for full flaw list.

### Phase 7: Cyberware
Spend up to **5,000¢** on starting chrome (optional):

Each major piece adds a **Glitch** — a narrative complication.

### Phase 8: Contacts
Define **3 Contacts**:
- 1 **Ally** — Someone who owes you or genuinely likes you
- 1 **Neutral** — A professional relationship, transactional
- 1 **Rival** — Someone who wants what you have or hates what you are

For each: Name, Relationship, One-line description.

### Phase 9: Final Details
- **Appearance** — Brief physical description
- **Personality** — 2-3 adjectives or a short phrase
- **Goal** — What are you working toward?
- **Notes** — Anything else

### Phase 10: Confirmation
Review screen showing full character. Confirm or go back to edit.

---

## 3. Stunts (NEW SYSTEM)

Stunts are signature abilities that let you break the normal rules in specific ways. They're inspired by Fate Core aspects but tuned for cyberpunk action.

### 3.1 Design Principles

- Each stunt is **narrow but powerful**
- Stunts create **character differentiation**
- Stunts are **always beneficial** (flaws are separate)
- Stunts encourage **specific playstyles**

### 3.2 Stunt Categories

#### Combat Stunts

| Stunt | Effect |
|-------|--------|
| **Quick Draw** | +2 to initiative when using a pistol |
| **Bullet Time** | Once per scene, reroll a missed ranged attack |
| **Iron Skin** | +1 Armor when unarmored (subdermal plating, tough hide) |
| **Finishing Blow** | +2 damage against targets with 1 Stress remaining |
| **Suppressive Fire** | Spend 1 ammo to give an ally +2 Defense until your next turn |
| **Close Quarters** | No penalty for using firearms in melee range |
| **Berserker** | When you take a Wound, your next attack deals +2 damage |
| **Ghost** | +2 to Stealth when moving slowly |

#### Technical Stunts

| Stunt | Effect |
|-------|--------|
| **ICE Breaker** | +2 to crack Barrier ICE |
| **Daemon Master** | Your hacks persist 1 round longer before detection |
| **Field Surgeon** | Heal 1 additional Stress when treating wounds |
| **Jury Rig** | Once per scene, repair a broken device without tools |
| **Overclock** | Push cyberware beyond limits: +2 to one roll, then it glitches |
| **Drone Swarm** | Control 2 drones simultaneously without penalty |
| **Scavenger** | +2 to find useful parts in wreckage |
| **Signature Hack** | Name a specific system type; +2 to hack it |

#### Social Stunts

| Stunt | Effect |
|-------|--------|
| **Silver Tongue** | +2 to Persuasion when offering a deal |
| **Dead Eyes** | +2 to Intimidation when you've already hurt someone |
| **Poker Face** | +2 to resist Insight/Empathy checks against you |
| **Street Cred** | +2 to Streetwise in your home turf |
| **Corporate Mask** | +2 to Deception when impersonating authority |
| **Fixer Network** | Once per session, know a guy who can get something |
| **Smooth Operator** | +2 to first impression social checks |
| **Interrogator** | +2 to extract information from unwilling subjects |

#### Awareness Stunts

| Stunt | Effect |
|-------|--------|
| **Danger Sense** | +2 to Perception to detect ambushes |
| **Forensic Mind** | +2 to Investigation at crime scenes |
| **Urban Shadow** | +2 to Stealth in city environments |
| **Survivor** | +2 to Survival in the Exclusion Zone |
| **Read the Room** | Once per scene, ask GM one true thing about NPC intentions |
| **Paranoid** | You always act in surprise rounds |
| **Tracker** | +2 to follow someone through a crowd |
| **Sixth Sense** | +2 to notice hidden cyberware on others |

#### Cyberware Stunts (Require Specific Chrome)

| Stunt | Requires | Effect |
|-------|----------|--------|
| **Targeting Suite** | Optics | Ignore cover penalties up to +2 |
| **Reflex Trigger** | Reflex Booster | +1 to all initiative rolls |
| **Subvocal Command** | Neural Link | Silently command linked devices |
| **Mantis Strike** | Cyberarm | First melee attack each combat deals +2 |
| **Gecko Grip** | Cyberarm/Leg | Climb any surface without a roll |
| **Thermal Vision** | Optics | See through smoke, darkness (not walls) |

---

## 4. Flaws (OPTIONAL SYSTEM)

Flaws are narrative complications that make your life harder but more interesting. Each flaw taken grants **+1 additional Stunt** (max 2 flaws).

### 4.1 Design Principles

- Flaws are **compellable** by the GM (creates drama)
- Flaws are **invokable** by the player (for style points)
- Flaws should come up **regularly** but not constantly
- Flaws are **not crippling** — they're story hooks

### 4.2 Flaw Categories

#### Physical Flaws

| Flaw | Effect |
|------|--------|
| **Chronic Pain** | -1 to all checks when you haven't taken meds in 24 hours |
| **Cyberpsychosis (Early)** | GM can compel you to act aggressively once per session |
| **Addiction** | -2 to all checks when in withdrawal (GM decides when) |
| **Distinctive Appearance** | -2 to blend into crowds; people remember you |
| **Old Wound** | One specific body part is vulnerable; crits there deal +1 Wound |
| **Slow Healer** | Medical treatment takes twice as long on you |

#### Mental Flaws

| Flaw | Effect |
|------|--------|
| **Paranoid** | -2 to trust NPCs; GM can compel you to suspect allies |
| **Flashbacks** | Specific triggers cause -2 to all checks for 1 round |
| **Obsession** | -2 to resist pursuing your obsession when opportunity arises |
| **Phobia** | -2 to all checks when confronted with your fear |
| **Guilt Complex** | -2 to Presence checks when reminded of past sins |
| **Impulsive** | -2 to resist acting on first instinct |

#### Social Flaws

| Flaw | Effect |
|------|--------|
| **Wanted** | A faction actively hunts you; -2 to lay low in their territory |
| **Bad Reputation** | -2 to first impressions with certain groups |
| **Debt** | You owe someone big; they can call in favors at bad times |
| **Rival** | Someone specific wants you dead; they show up at GM's discretion |
| **Burned** | Former faction considers you a traitor; -2 to deal with them |
| **Loner** | -2 to teamwork checks; you don't play well with others |

#### Technical Flaws

| Flaw | Effect |
|------|--------|
| **Glitchy Chrome** | One piece of cyberware malfunctions on natural 1-3 |
| **EMP Sensitive** | EMP effects last twice as long on you |
| **Analog** | -2 to all Netrunning; you're not wired for the Net |
| **Technophobe** | -2 to operate unfamiliar technology |
| **Blacklisted** | -2 to purchase from legitimate vendors; black market only |

---

## 5. Terminal UI Flow

### 5.1 Mode Switching

When character creation starts:
1. Terminal enters `CHARACTER_CREATION` mode
2. Normal commands disabled except `back`, `help`, `cancel`
3. Each phase has its own prompt and validation

### 5.2 Example Session

```
> /create

IDENTITY FORGE v3.2.1
Initializing...

═══ PHASE 1: IDENTITY ═══

What's your name, choom?
> Marcus Webb

And your handle? (What the street calls you)
> Voltage

Pronouns? [he/him | she/her | they/them | custom]
> he/him

═══ PHASE 2: BACKGROUND ═══

Where'd you come from?

  [1] Street Kid    — Streetwise +1, Melee +1
  [2] Corporate     — Persuasion +1, Investigation +1
  [3] Techie        — Hardware +1, Rigging +1
  [4] Nomad         — Survival +1, Firearms +1
  [5] Medic         — Medicine +1, Perception +1
  [6] Enforcer      — Intimidation +1, Melee +1

> 3

TECHIE selected.
You get: Tool kit, basic drone, workshop access
Skills: Hardware +1, Rigging +1

═══ PHASE 3: ATTRIBUTES ═══

Distribute 8 points. Baseline is +0, max +3.

  REFLEX   [+0] [-][+]
  BODY     [+0] [-][+]
  TECH     [+0] [-][+]
  NEURAL   [+0] [-][+]
  EDGE     [+0] [-][+]
  PRESENCE [+0] [-][+]

  Points remaining: 8

> tech +3
> neural +2
> edge +2
> reflex +1

Attributes set. Points remaining: 0

═══ PHASE 4: SKILLS ═══

Distribute 20 points. Max +3 per skill.
Background bonuses already applied.

[COMBAT]
  Firearms     [+0]    Heavy Weapons [+0]
  Melee        [+0]    Evasion       [+0]

[TECHNICAL]
  Netrunning   [+0]    Hardware      [+1] ★
  Rigging      [+1] ★  Medicine      [+0]

[SOCIAL]
  Persuasion   [+0]    Intimidation  [+0]
  Deception    [+0]    Streetwise    [+0]

[AWARENESS]
  Perception   [+0]    Investigation [+0]
  Stealth      [+0]    Survival      [+0]

Points remaining: 20

> netrunning +3
> hardware +2
> rigging +2
> perception +2
> stealth +2
> ...

═══ PHASE 5: STUNTS ═══

Choose 2 stunts. These are your signature moves.

[COMBAT]
  Quick Draw, Bullet Time, Iron Skin...

[TECHNICAL]
  ICE Breaker, Daemon Master, Field Surgeon...

[SOCIAL]
  Silver Tongue, Dead Eyes, Poker Face...

[AWARENESS]
  Danger Sense, Forensic Mind, Urban Shadow...

> ice breaker
> jury rig

Stunts selected:
  • ICE Breaker — +2 to crack Barrier ICE
  • Jury Rig — Once per scene, repair without tools

═══ PHASE 6: FLAWS (OPTIONAL) ═══

Take a flaw? Each grants +1 additional stunt. (max 2)

[PHYSICAL]
  Chronic Pain, Cyberpsychosis, Addiction...

[MENTAL]
  Paranoid, Flashbacks, Obsession...

[SOCIAL]
  Wanted, Bad Reputation, Debt...

[TECHNICAL]
  Glitchy Chrome, EMP Sensitive, Analog...

> glitchy chrome

GLITCHY CHROME selected.
One piece of cyberware malfunctions on natural 1-3.
You gain +1 stunt. Choose now:

> overclock

Bonus stunt selected:
  • Overclock — Push cyberware: +2 to one roll, then it glitches

Take another flaw? [yes/no]
> no

═══ PHASE 7: CYBERWARE ═══

You have 5,000¢ to spend on chrome.
Each major piece adds a Glitch.

  [1] Neural Link Mk.II (2,000¢) — +1 Netrunning, jack in
  [2] Kiroshi Optics (1,500¢) — Low-light, recording
  [3] Reflex Booster (3,000¢) — +1 Initiative
  [4] Cyberarm (2,500¢) — +1 Melee damage
  ...

> 1

NEURAL LINK MK.II installed.
Glitch: "Sometimes I hear the Net whisper"
Remaining: 3,000¢

> 2

KIROSHI OPTICS installed.
Glitch: "I see heat signatures, not faces"
Remaining: 1,500¢

> done

═══ PHASE 8: CONTACTS ═══

Define 3 contacts.

ALLY — Someone who has your back.
  Name: > Kira "Sparks" Tanaka
  Description: > Fixer who owes me for saving her brother

NEUTRAL — Professional relationship.
  Name: > Dr. Yuen
  Description: > Ripperdoc, no questions asked, cash only

RIVAL — Someone who wants you gone.
  Name: > Marcus Cole
  Description: > Former partner, thinks I sold him out

═══ PHASE 9: FINAL DETAILS ═══

Appearance (brief):
> Wiry build, datajack scars, always wearing AR glasses

Personality (2-3 words):
> Curious, paranoid, loyal

Goal:
> Find out who burned my old crew

Notes (optional):
> [skip]

═══ PHASE 10: CONFIRMATION ═══

╔══════════════════════════════════════════════════╗
║  VOLTAGE (Marcus Webb)                    he/him ║
╠══════════════════════════════════════════════════╣
║  Background: Techie                              ║
║  Appearance: Wiry build, datajack scars, AR     ║
║  Personality: Curious, paranoid, loyal          ║
║  Goal: Find out who burned my old crew          ║
╠══════════════════════════════════════════════════╣
║  ATTRIBUTES                                      ║
║  REF +1  BOD +0  TEC +3  NEU +2  EDG +2  PRE +0 ║
╠══════════════════════════════════════════════════╣
║  SKILLS (showing +1 or higher)                   ║
║  Netrunning +3, Hardware +3, Rigging +3         ║
║  Perception +2, Stealth +2, Evasion +1          ║
╠══════════════════════════════════════════════════╣
║  STUNTS                                          ║
║  • ICE Breaker — +2 to crack Barrier ICE        ║
║  • Jury Rig — Repair without tools (1/scene)    ║
║  • Overclock — +2 to one roll, then glitch      ║
╠══════════════════════════════════════════════════╣
║  FLAWS                                           ║
║  • Glitchy Chrome — Malfunction on nat 1-3      ║
╠══════════════════════════════════════════════════╣
║  CYBERWARE                                       ║
║  • Neural Link Mk.II — "I hear the Net whisper" ║
║  • Kiroshi Optics — "Heat signatures, not faces"║
╠══════════════════════════════════════════════════╣
║  GEAR: Tool kit, basic drone, workshop access   ║
║  CREDITS: 1,500¢                                ║
╚══════════════════════════════════════════════════╝

[confirm] Save character  [back] Edit  [cancel] Abort

> confirm

Character saved. Welcome to the sprawl, Voltage.
```

---

## 6. Data Model Updates

### 6.1 Extended Player Character Schema

```json
{
    "id": "string",
    "name": "string",
    "handle": "string",
    "pronouns": "string",
    "background": "street_kid | corporate | techie | nomad | medic | enforcer",
    
    "appearance": "string",
    "personality": "string",
    "goal": "string",
    
    "attributes": {
        "reflex": "number (-1 to +3)",
        "body": "number (-1 to +3)",
        "tech": "number (-1 to +3)",
        "neural": "number (-1 to +3)",
        "edge": "number (-1 to +3)",
        "presence": "number (-1 to +3)"
    },
    
    "skills": { /* 16 skills, 0-5 */ },
    
    "stunts": [
        {
            "id": "string",
            "name": "string",
            "description": "string",
            "category": "combat | technical | social | awareness | cyberware"
        }
    ],
    
    "flaws": [
        {
            "id": "string",
            "name": "string",
            "description": "string",
            "category": "physical | mental | social | technical"
        }
    ],
    
    "derived": {
        "stress": "number",
        "stressMax": 5,
        "wounds": [ /* 3 slots */ ],
        "armor": "number"
    },
    
    "cyberware": [ /* with glitches */ ],
    "gear": [ /* items */ ],
    "weapons": [ /* weapons */ ],
    "contacts": [ /* 3 contacts */ ],
    
    "credits": "number",
    "experience": "number",
    "notes": "string",
    
    "meta": {
        "created": "ISO timestamp",
        "lastModified": "ISO timestamp",
        "version": "1.0"
    }
}
```

### 6.2 New Asset Files Needed

```
assets/
├── stunts/
│   └── stunts.json          # All stunt definitions
├── flaws/
│   └── flaws.json           # All flaw definitions
├── backgrounds/
│   └── backgrounds.json     # Background definitions with gear
└── cyberware/
    └── starter_chrome.json  # Cyberware available at creation
```

---

## 7. Implementation Phases

### Phase 1: Core Flow (MVP)
- [ ] Terminal mode switching (`CHARACTER_CREATION`)
- [ ] Basic text prompts for each phase
- [ ] Character JSON generation and save
- [ ] `/create` command in chat

### Phase 2: Stunts & Flaws
- [ ] Stunt data file and selection UI
- [ ] Flaw data file and selection UI
- [ ] Flaw → bonus stunt logic

### Phase 3: Polish
- [ ] Animated boot sequence
- [ ] Attribute/skill sliders or visual +/- buttons
- [ ] Character review screen with ASCII art
- [ ] Edit/back navigation

### Phase 4: Integration
- [ ] Character sheet display in player terminal
- [ ] GM can view player characters
- [ ] Sync character state during play

---

## 8. Open Questions

1. **Pregens?** — Should we offer pre-generated characters for quick start?
2. **Randomize?** — "Roll the dice" option for attributes/skills?
3. **Portraits?** — ASCII art portraits or image upload?
4. **Level Up?** — How does character advancement work? (Future doc)
5. **Multi-character?** — Can a player have multiple characters?

---

## 9. References

- **Fallout 1/2** — Traits system (flaw = bonus perk)
- **Fate Core** — Stunts and aspects
- **Cyberpunk RED** — Lifepath and role abilities
- **Blades in the Dark** — Playbook special abilities

---

*"You're not born in the sprawl. You're made."*
