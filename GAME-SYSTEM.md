# NEON PROTOCOL — Game System Reference

> *"In the sprawl, your chrome is your resume and your wetware is your edge."*

---

## 1. Overview

**Neon Protocol** is a streamlined tabletop RPG system designed for cyberpunk narratives. It emphasizes fast resolution, player agency, and the tension between humanity and technology.

### 1.1 Core Philosophy

- **Fiction First** — Describe what you do, then roll if there's risk
- **Fail Forward** — Failed rolls create complications, not dead ends
- **Chrome Has Cost** — Every augmentation trades humanity for capability
- **The Edge Matters** — Preparation and positioning beat raw stats

### 1.2 Dice System

All checks use **d20 + Attribute + Skill** vs a **Difficulty Class (DC)**.

| DC | Difficulty | Example |
|----|------------|---------|
| 8 | Routine | Hacking an unprotected terminal |
| 12 | Standard | Picking a commercial lock |
| 15 | Challenging | Convincing a suspicious guard |
| 18 | Hard | Cracking military-grade ICE |
| 22 | Extreme | Infiltrating a megacorp black site |
| 25+ | Legendary | Rewriting your own neural firmware |

**Critical Success (Natural 20):** Exceptional outcome + bonus effect  
**Critical Failure (Natural 1):** Complication even if total beats DC

---

## 2. Attributes

Six core attributes define a character's baseline capabilities. Range: **-2 to +5** (human average is +0).

| Attribute | Abbr | Governs |
|-----------|------|---------|
| **REFLEX** | REF | Speed, agility, reaction time, ranged combat |
| **BODY** | BOD | Strength, endurance, melee combat, resilience |
| **TECH** | TEC | Engineering, repair, crafting, cyberware |
| **NEURAL** | NEU | Hacking, AI interaction, mental fortitude |
| **EDGE** | EDG | Perception, intuition, luck, street smarts |
| **PRESENCE** | PRE | Charisma, intimidation, negotiation, performance |

---

## 3. Skills

Skills represent trained competencies. Range: **0 to +5**.

### 3.1 Combat Skills
| Skill | Attribute | Description |
|-------|-----------|-------------|
| **Firearms** | REF | Pistols, rifles, SMGs |
| **Heavy Weapons** | REF | Rockets, mounted guns, explosives |
| **Melee** | BOD | Blades, clubs, martial arts |
| **Evasion** | REF | Dodging, taking cover |

### 3.2 Technical Skills
| Skill | Attribute | Description |
|-------|-----------|-------------|
| **Netrunning** | NEU | Hacking, ICE breaking, data extraction |
| **Hardware** | TEC | Cyberware installation, electronics repair |
| **Rigging** | TEC | Drones, vehicles, remote systems |
| **Medicine** | TEC | Trauma care, surgery, pharmaceuticals |

### 3.3 Social Skills
| Skill | Attribute | Description |
|-------|-----------|-------------|
| **Persuasion** | PRE | Negotiation, seduction, diplomacy |
| **Intimidation** | PRE | Threats, interrogation, presence |
| **Deception** | PRE | Lying, disguise, misdirection |
| **Streetwise** | EDG | Contacts, black market, underworld knowledge |

### 3.4 Awareness Skills
| Skill | Attribute | Description |
|-------|-----------|-------------|
| **Perception** | EDG | Spotting threats, reading situations |
| **Investigation** | NEU | Research, forensics, data analysis |
| **Stealth** | REF | Infiltration, shadowing, hiding |
| **Survival** | BOD | Endurance, navigation, scavenging |

---

## 4. Derived Stats

### 4.1 Hit Points (HP)
```
HP = 10 + (BOD × 3)
```
- **Wounded:** Below 50% HP — disadvantage on physical checks
- **Critical:** Below 25% HP — disadvantage on all checks
- **Down:** 0 HP — unconscious, bleeding out

### 4.2 Armor
Reduces incoming damage. Armor has **Stopping Power (SP)** that degrades when hit.

| Armor Type | SP | Notes |
|------------|-----|-------|
| Clothing | 0 | No protection |
| Light Jacket | 4 | Concealable |
| Armored Vest | 8 | Standard security |
| Combat Armor | 12 | Military grade |
| Powered Exo | 16+ | Requires training |

### 4.3 Initiative
```
Initiative = REF + EDG + 1d10
```
Higher goes first. Ties resolved by REF, then player choice.

### 4.4 Humanity
```
Starting Humanity = 10 + (PRE × 2)
```
Cyberware costs Humanity. At 0 Humanity, character becomes an NPC (cyberpsychosis).

---

## 5. Cyberware

Augmentations grant power at the cost of Humanity.

### 5.1 Cyberware Categories

| Category | Slot | Description |
|----------|------|-------------|
| **Neuralware** | Head | Brain implants, interfaces, co-processors |
| **Optics** | Eyes | Vision enhancements, targeting, recording |
| **Bodyware** | Torso | Internal organs, subdermal armor, biomonitors |
| **Cyberarm** | Arm | Replacement limbs, built-in weapons |
| **Cyberleg** | Leg | Replacement limbs, jump boosters |
| **Chipware** | Slot | Skillsofts, memory chips, reflex boosters |

### 5.2 Humanity Cost

| Tier | Humanity Cost | Examples |
|------|---------------|----------|
| Minor | 1-2 | Interface plugs, basic optics |
| Standard | 3-4 | Cyberarm, reflex booster |
| Major | 5-6 | Full limb replacement, combat chassis |
| Extreme | 7+ | Full-body conversion, experimental tech |

### 5.3 Example Cyberware

```json
{
    "id": "neural_link_mk2",
    "name": "Neural Link Mk.II",
    "category": "neuralware",
    "slot": "head",
    "humanityCost": 2,
    "description": "Direct neural interface for device control and netrunning.",
    "effects": [
        { "type": "skill_bonus", "skill": "Netrunning", "value": 1 },
        { "type": "ability", "name": "Jack In", "description": "Connect directly to compatible systems" }
    ],
    "cost": 5000,
    "availability": "common"
}
```

---

## 6. Combat

### 6.1 Action Economy

Each turn, a character gets:
- **1 Action** — Attack, hack, use item, complex task
- **1 Move** — Up to 10m (or 20m if sprinting, no action)
- **1 Reaction** — Dodge, opportunity attack, interrupt

### 6.2 Attack Resolution

```
Attack Roll: d20 + REF + Firearms (or relevant skill)
vs
Defense: 10 + Target's REF + Evasion (or cover bonus)
```

**Hit:** Roll weapon damage, subtract target's armor SP  
**Miss:** No effect (or graze for style)

### 6.3 Damage Types

| Type | Effect |
|------|--------|
| **Kinetic** | Standard bullets, blades — reduced by armor |
| **Energy** | Lasers, plasma — ignores half armor |
| **EMP** | Disables cyberware, no HP damage |
| **Bio** | Toxins, viruses — ignores armor, resisted by BOD |

### 6.4 Cover

| Cover | Defense Bonus |
|-------|---------------|
| Light (furniture) | +2 |
| Heavy (walls, vehicles) | +4 |
| Full (only exposed to attack) | +6 |

---

## 7. Netrunning

Hackers ("Netrunners") jack into systems to manipulate data, disable security, and fight ICE (Intrusion Countermeasures Electronics).

### 7.1 Net Actions

| Action | DC | Effect |
|--------|-----|--------|
| **Scan** | 12 | Reveal system architecture |
| **Crack** | 15 | Bypass password/lock |
| **Control** | 15 | Operate connected device |
| **Extract** | 18 | Copy protected data |
| **Crash** | 18 | Disable system/ICE |
| **Mask** | 15 | Hide your presence |

### 7.2 ICE Types

| ICE | Rating | Effect if Triggered |
|-----|--------|---------------------|
| **Watchdog** | 12 | Alerts security |
| **Barrier** | 15 | Blocks access, requires Crack |
| **Tracer** | 15 | Reveals runner's location |
| **Black ICE** | 18+ | Deals neural damage (2d6) |

---

## 8. Character Creation

### 8.1 Steps

1. **Concept** — Who are you? What's your angle?
2. **Attributes** — Distribute 8 points (+0 baseline, max +3 at creation)
3. **Skills** — Distribute 20 points (max +3 at creation)
4. **Background** — Choose origin, gain 2 free skill points
5. **Cyberware** — Start with 5,000 credits worth (optional)
6. **Gear** — Starting equipment based on role
7. **Connections** — 3 contacts (ally, neutral, rival)

### 8.2 Backgrounds

| Background | Bonus Skills | Starting Gear |
|------------|--------------|---------------|
| **Street Kid** | Streetwise +1, Melee +1 | Knife, street clothes, burner phone |
| **Corporate** | Persuasion +1, Investigation +1 | Business suit, encrypted comm, 2000 extra credits |
| **Techie** | Hardware +1, Rigging +1 | Tool kit, drone (basic), workshop access |
| **Nomad** | Survival +1, Firearms +1 | Vehicle (motorcycle), road leathers, rifle |
| **Medic** | Medicine +1, Perception +1 | Med kit, trauma drugs, clinic access |
| **Enforcer** | Intimidation +1, Melee +1 | Armored vest, heavy pistol, reputation |

---

## 9. NPC Templates

### 9.1 Threat Levels

| Level | HP | Attack | Skills | Description |
|-------|-----|--------|--------|-------------|
| **Mook** | 5 | +3 | +1 | Disposable goons, one-hit wonders |
| **Soldier** | 15 | +5 | +2 | Trained combatants, security |
| **Elite** | 25 | +7 | +3 | Veterans, specialists |
| **Boss** | 40+ | +9 | +4 | Major antagonists, legendary threats |

### 9.2 NPC Archetypes

- **Ganger** — Street muscle, cheap chrome, territorial
- **Corporate Security** — Professional, well-equipped, follows protocol
- **Fixer** — Information broker, connected, always has an angle
- **Netrunner** — Hacker, fragile meatside, deadly in the Net
- **Cyberpsycho** — Lost to chrome, unpredictable, extremely dangerous
- **Exec** — Power player, bodyguards, leverage over everyone

---

## 10. JSON Schemas

### 10.1 Player Character Schema

```json
{
    "id": "string (unique identifier)",
    "name": "string",
    "handle": "string (street name)",
    "background": "street_kid | corporate | techie | nomad | medic | enforcer",
    
    "attributes": {
        "reflex": "number (-2 to +5)",
        "body": "number (-2 to +5)",
        "tech": "number (-2 to +5)",
        "neural": "number (-2 to +5)",
        "edge": "number (-2 to +5)",
        "presence": "number (-2 to +5)"
    },
    
    "skills": {
        "firearms": "number (0-5)",
        "heavy_weapons": "number (0-5)",
        "melee": "number (0-5)",
        "evasion": "number (0-5)",
        "netrunning": "number (0-5)",
        "hardware": "number (0-5)",
        "rigging": "number (0-5)",
        "medicine": "number (0-5)",
        "persuasion": "number (0-5)",
        "intimidation": "number (0-5)",
        "deception": "number (0-5)",
        "streetwise": "number (0-5)",
        "perception": "number (0-5)",
        "investigation": "number (0-5)",
        "stealth": "number (0-5)",
        "survival": "number (0-5)"
    },
    
    "derived": {
        "hp": "number",
        "hpMax": "number",
        "humanity": "number",
        "humanityMax": "number",
        "armor": "number"
    },
    
    "cyberware": [
        {
            "id": "string",
            "name": "string",
            "slot": "string",
            "active": "boolean"
        }
    ],
    
    "gear": [
        {
            "id": "string",
            "name": "string",
            "quantity": "number"
        }
    ],
    
    "weapons": [
        {
            "id": "string",
            "name": "string",
            "damage": "string (e.g., '2d6+2')",
            "type": "kinetic | energy | emp | bio",
            "range": "melee | short | medium | long",
            "ammo": "number | null",
            "ammoMax": "number | null"
        }
    ],
    
    "contacts": [
        {
            "name": "string",
            "relationship": "ally | neutral | rival",
            "description": "string"
        }
    ],
    
    "notes": "string",
    "credits": "number",
    "experience": "number"
}
```

### 10.2 NPC Statblock Schema

```json
{
    "id": "string (unique identifier)",
    "name": "string",
    "type": "mook | soldier | elite | boss",
    "archetype": "ganger | security | fixer | netrunner | cyberpsycho | exec | custom",
    "description": "string",
    
    "stats": {
        "hp": "number",
        "hpMax": "number",
        "armor": "number",
        "attack": "number (flat attack bonus)",
        "defense": "number (flat defense value)",
        "initiative": "number"
    },
    
    "attributes": {
        "reflex": "number",
        "body": "number",
        "tech": "number",
        "neural": "number",
        "edge": "number",
        "presence": "number"
    },
    
    "skills": {
        "primary": "string (main skill)",
        "primaryBonus": "number",
        "secondary": "string (secondary skill)",
        "secondaryBonus": "number"
    },
    
    "weapons": [
        {
            "name": "string",
            "damage": "string",
            "type": "string",
            "notes": "string"
        }
    ],
    
    "abilities": [
        {
            "name": "string",
            "description": "string",
            "cooldown": "string | null"
        }
    ],
    
    "cyberware": ["string (names only for display)"],
    
    "behavior": {
        "tactics": "string (how they fight)",
        "morale": "string (when they flee/surrender)",
        "motivation": "string (what they want)"
    },
    
    "loot": [
        {
            "item": "string",
            "chance": "number (0-100)"
        }
    ],
    
    "notes": "string"
}
```

---

## 11. File Structure

```
assets/
├── adventures/
│   └── [AdventureName]_Guide.json
├── characters/
│   ├── players/
│   │   └── [character_id].json
│   └── npcs/
│       └── [npc_id].json
├── cyberware/
│   └── [cyberware_id].json
├── weapons/
│   └── [weapon_id].json
└── scene_backgrounds/
    └── [scene_id].json + .png
```

---

## 12. Integration with Light Deck

### 12.1 Adventure Guide Schema

Adventure guides provide indexed reference material for the GM:

```json
{
    "id": "AdventureName_Guide",
    "adventure": "Adventure Name",
    "version": "1.0",
    
    "overview": {
        "title": "Adventure Overview",
        "synopsis": "Brief description",
        "themes": ["theme1", "theme2"],
        "estimatedSessions": "3-5 sessions"
    },
    
    "index": [
        {
            "id": "section_id",
            "title": "Section Title",
            "sections": [
                { "id": "subsection_id", "title": "Subsection Title" }
            ]
        }
    ],
    
    "content": {
        "subsection_id": {
            "title": "Subsection Title",
            "text": "Content text...",
            "gmNotes": "Private notes"
        }
    },
    
    "quickReference": {
        "dcTable": [...],
        "commonChecks": [...]
    }
}
```

### 12.2 Scene NPC Registration

NPCs are attached to scenes and displayed in the GM Overlay:

```json
{
    "id": "scene_id",
    "npcs": [
        {
            "id": "npc_id",
            "name": "Display Name",
            "role": "Role in scene",
            "statblock": "npc_statblock_id | null",
            "state": "active | hidden | defeated",
            "notes": "Scene-specific notes"
        }
    ]
}
```

**NPC States:**
- `active` — Visible and interactable (● green indicator)
- `hidden` — Present but not yet revealed (◐ blue indicator)
- `defeated` — Incapacitated or dead (✗ red indicator)

### 12.3 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/guides` | GET | List all adventure guides |
| `/api/guides/:id` | GET | Get full guide by ID |
| `/api/guides/:id/section/:sectionId` | GET | Get specific section |
| `/api/npcs` | GET | List all NPC statblocks |
| `/api/npcs/:id` | GET | Get NPC statblock by ID |

### 12.4 GM Overlay Features

- **GUIDE button** — Opens adventure guide index in chat
- **NPC list** — Shows NPCs in current scene with state indicators
- **NPC click** — Displays quick stats in chat (HP, armor, weapons, tactics)

### 12.5 Combat Tracker Integration

Future: Track initiative, HP, conditions for all combatants.

### 12.6 Character Sheet Sync

Future: Players can view their character sheets; GM can view all.

---

## 13. Revision History

| Date | Version | Notes |
|------|---------|-------|
| 2024-12-04 | 0.1 | Initial system stub — attributes, skills, combat basics |
| 2024-12-04 | 0.2 | Added adventure guide schema, scene NPC registration, API endpoints |

---

*"The future is already here — it's just not evenly distributed."*  
*— William Gibson*
