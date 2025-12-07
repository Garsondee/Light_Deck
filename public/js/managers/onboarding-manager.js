/**
 * OnboardingManager - Player onboarding and character creation flow
 * 
 * Guides new players through:
 * 1. Audio calibration (music/SFX volume)
 * 2. Visual calibration (brightness/contrast)
 * 3. Character creation
 * 4. Debt & equipment selection
 * 5. Document presentation
 */

const OnboardingManager = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════
    
    const PHASES = {
        IDLE: 'idle',
        AUDIO: 'audio',
        VISUAL: 'visual',
        CHARACTER: 'character',
        DEBT: 'debt',
        DOCUMENTS: 'documents',
        COMPLETE: 'complete'
    };
    
    const CHARACTER_PHASES = {
        IDENTITY: 'identity',
        BACKGROUND: 'background',
        ATTRIBUTES: 'attributes',
        SKILLS: 'skills',
        STUNTS: 'stunts',
        FLAWS: 'flaws',
        CYBERWARE: 'cyberware',
        CONTACTS: 'contacts',
        DETAILS: 'details',
        CONFIRM: 'confirm'
    };
    
    // Background definitions with debt
    const BACKGROUNDS = {
        street_kid: {
            name: 'Street Kid',
            skills: { streetwise: 1, melee: 1 },
            gear: ['Knife', 'Street clothes', 'Burner phone'],
            debt: 8000,
            creditor: { name: 'Viktor "Vic" Malone', type: 'loan_shark' },
            flavor: 'Grew up in the gutter. The streets taught you everything.'
        },
        corporate: {
            name: 'Corporate',
            skills: { persuasion: 1, investigation: 1 },
            gear: ['Business suit', 'Encrypted comm', '+2000¢'],
            debt: 15000,
            creditor: { name: 'Meridian Systems Corp.', type: 'corporation' },
            flavor: 'Escaped the machine. They want their investment back.'
        },
        techie: {
            name: 'Techie',
            skills: { hardware: 1, rigging: 1 },
            gear: ['Tool kit', 'Basic drone', 'Workshop access'],
            debt: 10000,
            creditor: { name: 'Tanaka Tools Ltd.', type: 'vendor' },
            flavor: 'Grease under the nails. You build things that work.'
        },
        nomad: {
            name: 'Nomad',
            skills: { survival: 1, firearms: 1 },
            gear: ['Motorcycle', 'Road leathers', 'Rifle'],
            debt: 6000,
            creditor: { name: 'The Dustrunners', type: 'clan' },
            flavor: 'The road is home. Family is everything.'
        },
        medic: {
            name: 'Medic',
            skills: { medicine: 1, perception: 1 },
            gear: ['Med kit', 'Trauma drugs', 'Clinic access'],
            debt: 12000,
            creditor: { name: 'Nightcity Medical Academy', type: 'academy' },
            flavor: 'Seen too much meat. You know how fragile we are.'
        },
        enforcer: {
            name: 'Enforcer',
            skills: { intimidation: 1, melee: 1 },
            gear: ['Armored vest', 'Heavy pistol', 'Reputation'],
            debt: 9000,
            creditor: { name: 'Iron Mike', type: 'dealer' },
            flavor: 'Violence is a language. You speak it fluently.'
        }
    };
    
    // Debt packages
    const DEBT_PACKAGES = [
        {
            id: 'survival_kit',
            name: 'Survival Kit',
            contents: ['Med kit', '3 stim packs', 'Trauma patch'],
            cost: 2000,
            flavor: 'Basic supplies for staying alive.'
        },
        {
            id: 'street_arsenal',
            name: 'Street Arsenal',
            contents: ['Heavy pistol', '50 rounds', 'Combat knife'],
            cost: 3000,
            flavor: 'When words fail, lead speaks.'
        },
        {
            id: 'tech_toolkit',
            name: 'Tech Toolkit',
            contents: ['Advanced toolkit', 'Diagnostic scanner', 'Spare parts'],
            cost: 2500,
            flavor: 'The right tool for every job.'
        },
        {
            id: 'chrome_upgrade',
            name: 'Chrome Upgrade',
            contents: ['One cyberware piece (up to 3,000¢ value)'],
            cost: 4000,
            flavor: 'Meat is weak. Chrome is forever.'
        },
        {
            id: 'fixers_favor',
            name: "Fixer's Favor",
            contents: ['Upgrade one contact: Neutral → Ally'],
            cost: 1500,
            flavor: 'Friends in low places.'
        },
        {
            id: 'clean_sin',
            name: 'Clean SIN',
            contents: ['Legitimate identity', 'No criminal flags'],
            cost: 5000,
            flavor: 'A fresh start. On paper, at least.'
        },
        {
            id: 'safe_house',
            name: 'Safe House',
            contents: ['Secure location in the city'],
            cost: 3500,
            flavor: 'Everyone needs a place to hide.'
        },
        {
            id: 'wheels',
            name: 'Wheels',
            contents: ['Basic motorcycle or beat-up car'],
            cost: 4500,
            flavor: 'Freedom on four wheels. Or two.'
        }
    ];
    
    // Test SFX options
    const TEST_SFX = ['beep', 'keystroke', 'errorBuzz', 'glitchCrackle'];
    
    // Test music track
    const TEST_MUSIC_TRACK = 'cinematic-synthwave-mystery-231508.mp3';
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    const state = {
        active: false,
        phase: PHASES.IDLE,
        characterPhase: null,
        
        // Audio settings
        audio: {
            musicVolume: 0.5,
            sfxVolume: 0.7,
            testTrackPlaying: false
        },
        
        // Visual settings
        visual: {
            brightness: 1.0,
            contrast: 1.0
        },
        
        // Character data
        character: {
            name: '',
            handle: '',
            pronouns: 'they/them',
            background: null,
            
            attributes: {
                reflex: 0,
                body: 0,
                tech: 0,
                neural: 0,
                edge: 0,
                presence: 0
            },
            attributePoints: 8,
            
            skills: {},
            skillPoints: 20,
            
            stunts: [],
            maxStunts: 2,
            
            flaws: [],
            maxFlaws: 2,
            
            cyberware: [],
            cyberwareBudget: 5000,
            
            contacts: {
                ally: { name: '', description: '' },
                neutral: { name: '', description: '' },
                rival: { name: '', description: '' }
            },
            
            appearance: '',
            personality: '',
            goal: '',
            notes: ''
        },
        
        // Debt selection
        debt: {
            baseDebt: 0,
            selectedPackages: [],
            totalDebt: 0
        },
        
        // Generated documents
        documents: {
            corporateId: null,
            sin: null,
            debtStatement: null,
            equipmentManifest: null,
            contactDossiers: null
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // TEST MODE DETECTION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Detect if running in Playwright test mode via URL query param.
     * When testMode=1, animations and delays are skipped/shortened.
     */
    function isTestMode() {
        try {
            if (typeof window === 'undefined' || !window.location || !window.location.search) return false;
            const params = new URLSearchParams(window.location.search);
            return params.get('testMode') === '1';
        } catch (err) {
            return false;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    function init() {
        console.log('[OnboardingManager] Initialized');
        
        // Register onboarding commands with TerminalManager
        registerTerminalCommands();
    }
    
    /**
     * Register onboarding-related commands with TerminalManager
     */
    function registerTerminalCommands() {
        if (typeof TerminalManager === 'undefined' || !TerminalManager.registerCommand) {
            console.warn('[OnboardingManager] TerminalManager not available for command registration');
            return;
        }
        
        // Continue command
        TerminalManager.registerCommand('continue', () => {
            if (state.active) {
                // Use the main handler so character sub-phases (identity/background, etc.) are respected
                handleCommand('continue', []);
            } else {
                TerminalManager.addLine('No onboarding in progress.', 'error');
            }
        }, { description: 'Continue to next onboarding phase' });
        
        // Cancel command and aliases
        const cancelHandler = () => {
            if (state.active) {
                cancel();
            } else {
                TerminalManager.addLine('No onboarding in progress.', 'error');
            }
        };
        TerminalManager.registerCommand('cancel', cancelHandler, { description: 'Cancel onboarding' });
        TerminalManager.registerCommand('quit', cancelHandler, { description: 'Cancel onboarding (alias)' });
        TerminalManager.registerCommand('exit', cancelHandler, { description: 'Cancel onboarding (alias)' });
        
        // Audio commands
        TerminalManager.registerCommand('music', (args) => {
            if (state.active && state.phase === PHASES.AUDIO) {
                const vol = args[0] !== undefined ? parseInt(args[0]) : 50;
                setMusicVolume(isNaN(vol) ? 50 : vol);
            } else {
                TerminalManager.addLine('Command only available during audio calibration.', 'error');
            }
        }, { description: 'Set music volume (0-100)' });
        
        TerminalManager.registerCommand('sfx', (args) => {
            if (state.active && state.phase === PHASES.AUDIO) {
                const vol = args[0] !== undefined ? parseInt(args[0]) : 70;
                setSfxVolume(isNaN(vol) ? 70 : vol);
            } else {
                TerminalManager.addLine('Command only available during audio calibration.', 'error');
            }
        }, { description: 'Set SFX volume (0-100)' });
        
        TerminalManager.registerCommand('test', () => {
            if (state.active && state.phase === PHASES.AUDIO) {
                playTestSfx();
            } else {
                TerminalManager.addLine('Command only available during audio calibration.', 'error');
            }
        }, { description: 'Play test sound effect' });
        
        // Visual commands
        TerminalManager.registerCommand('brightness', (args) => {
            if (state.active && state.phase === PHASES.VISUAL) {
                setBrightness(parseInt(args[0]) || 100);
            } else {
                TerminalManager.addLine('Command only available during visual calibration.', 'error');
            }
        }, { description: 'Set brightness (50-150)' });
        
        TerminalManager.registerCommand('contrast', (args) => {
            if (state.active && state.phase === PHASES.VISUAL) {
                setContrast(parseInt(args[0]) || 100);
            } else {
                TerminalManager.addLine('Command only available during visual calibration.', 'error');
            }
        }, { description: 'Set contrast (50-150)' });
        
        // Character commands
        TerminalManager.registerCommand('name', (args) => {
            if (state.active && state.phase === PHASES.CHARACTER && state.characterPhase === CHARACTER_PHASES.IDENTITY) {
                state.character.name = args.join(' ');
                TerminalManager.addLine(`Name set: ${state.character.name}`, 'system');
            } else {
                TerminalManager.addLine('Command only available during identity phase.', 'error');
            }
        }, { description: 'Set character name' });
        
        TerminalManager.registerCommand('handle', (args) => {
            if (state.active && state.phase === PHASES.CHARACTER && state.characterPhase === CHARACTER_PHASES.IDENTITY) {
                state.character.handle = args.join(' ');
                TerminalManager.addLine(`Handle set: ${state.character.handle}`, 'system');
            } else {
                TerminalManager.addLine('Command only available during identity phase.', 'error');
            }
        }, { description: 'Set street handle' });
        
        TerminalManager.registerCommand('pronouns', (args) => {
            if (state.active && state.phase === PHASES.CHARACTER && state.characterPhase === CHARACTER_PHASES.IDENTITY) {
                state.character.pronouns = args.join(' ');
                TerminalManager.addLine(`Pronouns set: ${state.character.pronouns}`, 'system');
            } else {
                TerminalManager.addLine('Command only available during identity phase.', 'error');
            }
        }, { description: 'Set pronouns' });
        
        TerminalManager.registerCommand('background', (args) => {
            if (state.active && state.phase === PHASES.CHARACTER && state.characterPhase === CHARACTER_PHASES.BACKGROUND) {
                setBackground(args.join(' '));
            } else {
                TerminalManager.addLine('Command only available during background phase.', 'error');
            }
        }, { description: 'Set character background' });
        
        // Debt commands
        TerminalManager.registerCommand('add', (args) => {
            if (state.active && state.phase === PHASES.DEBT) {
                addDebtPackage(args[0]);
            } else {
                TerminalManager.addLine('Command only available during debt selection.', 'error');
            }
        }, { description: 'Add debt package' });
        
        TerminalManager.registerCommand('remove', (args) => {
            if (state.active && state.phase === PHASES.DEBT) {
                removeDebtPackage(args[0]);
            } else {
                TerminalManager.addLine('Command only available during debt selection.', 'error');
            }
        }, { description: 'Remove debt package' });
        
        // Onboarding start command (for when already in terminal mode)
        TerminalManager.registerCommand('onboard', () => {
            if (state.active) {
                TerminalManager.addLine('Onboarding already in progress.', 'error');
            } else {
                // Already in terminal mode, just start the sequence
                state.active = true;
                state.phase = PHASES.AUDIO;
                TerminalManager.clear();
                showWelcomeSequence();
            }
        }, { description: 'Start character onboarding' });
        
        TerminalManager.registerCommand('create', () => {
            if (state.active) {
                TerminalManager.addLine('Onboarding already in progress.', 'error');
            } else {
                state.active = true;
                state.phase = PHASES.AUDIO;
                TerminalManager.clear();
                showWelcomeSequence();
            }
        }, { description: 'Create new character' });
        
        console.log('[OnboardingManager] Terminal commands registered');
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PHASE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Reset state to defaults for a fresh onboarding session
     */
    function resetState() {
        state.characterPhase = null;
        state.audio.musicVolume = 0.5;
        state.audio.sfxVolume = 0.7;
        state.audio.testTrackPlaying = false;
        state.visual.brightness = 1.0;
        state.visual.contrast = 1.0;
        state.character.name = '';
        state.character.handle = '';
        state.character.pronouns = 'they/them';
        state.character.background = null;
        state.character.attributes = { reflex: 0, body: 0, tech: 0, neural: 0, edge: 0, presence: 0 };
        state.character.attributePoints = 8;
        state.character.skills = {};
        state.character.skillPoints = 20;
        state.character.stunts = [];
        state.character.flaws = [];
        state.character.cyberware = [];
        state.character.cyberwareBudget = 5000;
        state.character.contacts = {
            ally: { name: '', description: '' },
            neutral: { name: '', description: '' },
            rival: { name: '', description: '' }
        };
        state.character.appearance = '';
        state.character.personality = '';
        state.character.goal = '';
        state.character.notes = '';
        state.debt.baseDebt = 0;
        state.debt.totalDebt = 0;
        state.debt.selectedPackages = [];
        state.documents = {
            corporateId: null,
            sin: null,
            debtStatement: null,
            equipmentManifest: null
        };
    }
    
    /**
     * Start the onboarding process
     */
    function start() {
        if (state.active) {
            console.warn('[OnboardingManager] Already active');
            return;
        }
        
        // Reset state for fresh session
        resetState();
        
        state.active = true;
        state.phase = PHASES.AUDIO;
        
        console.log('[OnboardingManager] Starting onboarding');
        
        // Switch to terminal mode for onboarding
        enterTerminalMode(() => {
            // Clear terminal and show welcome
            if (typeof TerminalManager !== 'undefined') {
                TerminalManager.clear();
                
                // Display welcome message with typewriter effect
                showWelcomeSequence();
            }
        });
    }
    
    /**
     * Enter terminal mode with transition
     */
    function enterTerminalMode(callback) {
        // Check if already in terminal mode
        if (typeof TerminalManager !== 'undefined' && TerminalManager.isVisible()) {
            if (callback) callback();
            return;
        }
        
        // Use App's toggleTerminalMode or direct TerminalManager
        if (typeof App !== 'undefined' && typeof App.toggleTerminalMode === 'function') {
            // Trigger terminal mode via App (handles transitions)
            if (typeof EventBus !== 'undefined') {
                EventBus.emit('ui:terminal-toggle');
            }
            // In test mode, don't wait for the full animated transition
            const delay = isTestMode() ? 50 : 3500;
            setTimeout(() => {
                if (callback) callback();
            }, delay); // Match transition duration in normal mode
        } else if (typeof TerminalManager !== 'undefined') {
            // Direct show without transition
            TerminalManager.show();
            if (callback) callback();
        }
    }
    
    /**
     * Exit terminal mode
     */
    function exitTerminalMode() {
        if (typeof TerminalManager !== 'undefined' && TerminalManager.isVisible()) {
            if (typeof EventBus !== 'undefined') {
                EventBus.emit('ui:terminal-toggle');
            }
        }
    }
    
    /**
     * Show welcome sequence with typewriter effects
     */
    async function showWelcomeSequence() {
        const term = TerminalManager;
        if (!term) return;

        if (isTestMode()) {
            // In Playwright test mode, skip the long typewriter animation so
            // onboarding phases become available immediately.
            term.clear();
            term.addLine('LIGHT DECK INITIALIZATION SEQUENCE (test mode)', 'system');
            term.addLine('Onboarding welcome skipped for tests.', 'system');
        } else {
            await term.typewrite('═══════════════════════════════════════════════════════════', { speed: 5, type: 'system' });
            await term.typewrite('  LIGHT DECK INITIALIZATION SEQUENCE', { speed: 30, type: 'system' });
            await term.typewrite('  (c) 2157 Meridian Systems Corp.', { speed: 30, type: 'system' });
            await term.typewrite('═══════════════════════════════════════════════════════════', { speed: 5, type: 'system' });
            await sleep(500);
            term.addLine('', 'output');
            await term.typewrite('Welcome to the sprawl, choom.', { speed: 40, type: 'system' });
            await term.typewrite("Let's get you set up.", { speed: 40, type: 'system' });
            term.addLine('', 'output');
            await sleep(300);
        }
        
        // Start audio phase
        startAudioPhase();
    }
    
    /**
     * Sleep helper for async sequences
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Cancel onboarding and return to normal mode
     */
    function cancel() {
        if (!state.active) return;
        
        // Stop test music if playing
        if (state.audio.testTrackPlaying && typeof Audio !== 'undefined') {
            Audio.stop();
            state.audio.testTrackPlaying = false;
        }
        
        state.active = false;
        state.phase = PHASES.IDLE;
        
        if (typeof TerminalManager !== 'undefined') {
            TerminalManager.addLine('', 'output');
            TerminalManager.addLine('Onboarding cancelled.', 'system');
        }
        
        // Exit terminal mode after a brief delay
        setTimeout(() => {
            exitTerminalMode();
        }, 1000);
        
        console.log('[OnboardingManager] Cancelled');
    }
    
    /**
     * Move to next phase
     */
    function nextPhase() {
        switch (state.phase) {
            case PHASES.AUDIO:
                state.phase = PHASES.VISUAL;
                startVisualPhase();
                break;
            case PHASES.VISUAL:
                state.phase = PHASES.CHARACTER;
                state.characterPhase = CHARACTER_PHASES.IDENTITY;
                startCharacterPhase();
                break;
            case PHASES.CHARACTER:
                state.phase = PHASES.DEBT;
                startDebtPhase();
                break;
            case PHASES.DEBT:
                state.phase = PHASES.DOCUMENTS;
                startDocumentsPhase();
                break;
            case PHASES.DOCUMENTS:
                state.phase = PHASES.COMPLETE;
                completeOnboarding();
                break;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // AUDIO PHASE
    // ═══════════════════════════════════════════════════════════════════
    
    async function startAudioPhase() {
        const term = TerminalManager;
        if (!term) return;
        
        await term.typewrite('═══ PHASE 1: AUDIO CALIBRATION ═══', { speed: 20, type: 'system' });
        term.addLine('', 'output');
        await term.typewrite('Adjust your audio levels.', { speed: 30, type: 'output' });
        term.addLine('', 'output');
        term.addLine(`Music Volume: ${Math.round(state.audio.musicVolume * 100)}%`, 'output');
        term.addLine(`SFX Volume: ${Math.round(state.audio.sfxVolume * 100)}%`, 'output');
        term.addLine('', 'output');
        term.addLine('Commands:', 'system');
        term.addLine('  music <0-100>  - Set music volume', 'output');
        term.addLine('  sfx <0-100>    - Set SFX volume', 'output');
        term.addLine('  test           - Play test sound', 'output');
        term.addLine('  continue       - Next phase', 'output');
        term.addLine('  cancel         - Exit onboarding', 'output');
        
        // Start playing test music
        playTestMusic();
    }
    
    function playTestMusic() {
        if (typeof Audio !== 'undefined') {
            Audio.loadTrackList().then(() => {
                const tracks = Audio.getTracks();
                if (tracks.length > 0) {
                    // Prefer the dedicated onboarding track if available
                    const testTrack =
                        tracks.find(t => t.name === TEST_MUSIC_TRACK || (t.url && t.url.includes(TEST_MUSIC_TRACK))) ||
                        tracks.find(t => t.name && t.name.includes('New game')) ||
                        tracks[0];
                    
                    Audio.play(testTrack.id, true);
                    Audio.setMusicVolume(state.audio.musicVolume);
                    state.audio.testTrackPlaying = true;
                    console.log('[OnboardingManager] Playing test music:', testTrack.name);
                }
            });
        }
    }
    
    function setMusicVolume(volume) {
        const vol = Math.max(0, Math.min(1, volume / 100));
        state.audio.musicVolume = vol;
        
        if (typeof Audio !== 'undefined') {
            Audio.setMusicVolume(vol);
        }
        
        if (typeof TerminalManager !== 'undefined') {
            TerminalManager.addLine(`Music volume: ${Math.round(vol * 100)}%`, 'system');
        }
    }
    
    function setSfxVolume(volume) {
        const vol = Math.max(0, Math.min(1, volume / 100));
        state.audio.sfxVolume = vol;
        
        // Update Audio state if available
        if (typeof Audio !== 'undefined' && Audio.setSfxVolume) {
            Audio.setSfxVolume(vol);
        }
        
        if (typeof TerminalManager !== 'undefined') {
            TerminalManager.addLine(`SFX volume: ${Math.round(vol * 100)}%`, 'system');
        }
    }
    
    function playTestSfx() {
        if (typeof Audio !== 'undefined' && Audio.SFX) {
            // Pick a random SFX
            const sfxName = TEST_SFX[Math.floor(Math.random() * TEST_SFX.length)];
            
            if (typeof Audio.SFX[sfxName] === 'function') {
                Audio.SFX[sfxName]();
                
                if (typeof TerminalManager !== 'undefined') {
                    TerminalManager.addLine(`Playing: ${sfxName}`, 'system');
                }
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // VISUAL PHASE
    // ═══════════════════════════════════════════════════════════════════
    
    async function startVisualPhase() {
        // Stop test music
        if (state.audio.testTrackPlaying && typeof Audio !== 'undefined') {
            Audio.stop();
            state.audio.testTrackPlaying = false;
        }
        
        const term = TerminalManager;
        if (!term) return;
        
        term.addLine('', 'output');
        await term.typewrite('═══ PHASE 2: VISUAL CALIBRATION ═══', { speed: 20, type: 'system' });
        term.addLine('', 'output');
        await term.typewrite('Adjust your display settings.', { speed: 30, type: 'output' });
        term.addLine('', 'output');
        
        // Display ASCII test pattern
        term.addLine('Test Pattern:', 'system');
        term.addLine('░░▒▒▓▓████████████████████████████████████████', 'output');
        term.addLine(' 1  2  3  4  5  6  7  8  9  10', 'output');
        term.addLine('', 'output');
        term.addLine('Fine detail: ════════════════════════════════', 'output');
        term.addLine('Small text: The quick brown fox jumps over the lazy dog', 'output');
        term.addLine('', 'output');
        
        term.addLine(`Brightness: ${Math.round(state.visual.brightness * 100)}%`, 'output');
        term.addLine(`Contrast: ${Math.round(state.visual.contrast * 100)}%`, 'output');
        term.addLine('', 'output');
        term.addLine('Commands:', 'system');
        term.addLine('  brightness <50-150>  - Set brightness', 'output');
        term.addLine('  contrast <50-150>    - Set contrast', 'output');
        term.addLine('  continue             - Next phase', 'output');
    }
    
    function loadTestImage() {
        // TODO: Load actual test image into scene viewer
        // For now, just log
        console.log('[OnboardingManager] Would load test image here');
        
        // Could use SceneManager to load a calibration image
        // SceneManager.loadImage('/assets/onboarding/test-image.png');
    }
    
    function setBrightness(value) {
        const brightness = Math.max(0.5, Math.min(1.5, value / 100));
        state.visual.brightness = brightness;
        
        // Apply to CRT shader if available
        if (typeof CRTShader !== 'undefined' && CRTShader.config) {
            CRTShader.config.brightness = brightness;
        }
        
        if (typeof TerminalManager !== 'undefined') {
            TerminalManager.addLine(`Brightness: ${Math.round(brightness * 100)}%`, 'system');
        }
    }
    
    function setContrast(value) {
        const contrast = Math.max(0.5, Math.min(1.5, value / 100));
        state.visual.contrast = contrast;
        
        // Apply to CRT shader if available
        if (typeof CRTShader !== 'undefined' && CRTShader.config) {
            CRTShader.config.contrast = contrast;
        }
        
        if (typeof TerminalManager !== 'undefined') {
            TerminalManager.addLine(`Contrast: ${Math.round(contrast * 100)}%`, 'system');
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // CHARACTER CREATION PHASE
    // ═══════════════════════════════════════════════════════════════════
    
    async function startCharacterPhase() {
        const term = TerminalManager;
        if (!term) return;
        
        term.addLine('', 'output');
        await term.typewrite('═══════════════════════════════════════════════════════════', { speed: 5, type: 'system' });
        await term.typewrite('  IDENTITY FORGE v3.2.1', { speed: 30, type: 'system' });
        await term.typewrite('  (c) 2157 Meridian Systems Corp.', { speed: 30, type: 'system' });
        await term.typewrite('═══════════════════════════════════════════════════════════', { speed: 5, type: 'system' });
        term.addLine('', 'output');
        await term.typewrite('Initializing biometric scan...', { speed: 40, type: 'output' });
        await sleep(300);
        term.addLine('[OK] Neural signature captured', 'system');
        await sleep(200);
        term.addLine('[OK] SIN database bypassed', 'system');
        await sleep(200);
        term.addLine('[OK] Ghost protocol active', 'system');
        term.addLine('', 'output');
        await sleep(300);
        await term.typewrite("Let's build your legend, choom.", { speed: 40, type: 'system' });
        term.addLine('', 'output');
        
        // Start with identity phase
        showIdentityPhase();
    }
    
    function showIdentityPhase() {
        state.characterPhase = CHARACTER_PHASES.IDENTITY;
        
        const term = TerminalManager;
        if (!term) return;
        
        term.addLine('═══ IDENTITY ═══', 'system');
        term.addLine('', 'output');
        term.addLine("What's your name, choom?", 'output');
        term.addLine('', 'output');
        term.addLine('Commands:', 'system');
        term.addLine('  name <your name>     - Set legal name', 'output');
        term.addLine('  handle <street name> - Set handle', 'output');
        term.addLine('  pronouns <pronouns>  - Set pronouns', 'output');
        term.addLine('  continue             - Next phase', 'output');
    }
    
    function showBackgroundPhase() {
        state.characterPhase = CHARACTER_PHASES.BACKGROUND;
        
        const term = TerminalManager;
        if (!term) return;
        
        term.addLine('', 'output');
        term.addLine('═══ BACKGROUND ═══', 'system');
        term.addLine('', 'output');
        term.addLine("Where'd you come from?", 'output');
        term.addLine('', 'output');
        
        let i = 1;
        for (const [key, bg] of Object.entries(BACKGROUNDS)) {
            const skillNames = Object.keys(bg.skills).join(' +1, ') + ' +1';
            term.addLine(`  [${i}] ${bg.name} — ${skillNames}`, 'output');
            term.addLine(`      ${bg.flavor}`, 'output');
            i++;
        }
        
        term.addLine('', 'output');
        term.addLine('Type a number (1-6) or: background <name>', 'output');
    }
    
    function setBackground(input) {
        let bgKey = null;
        
        // Check if input is a number
        const num = parseInt(input);
        if (num >= 1 && num <= 6) {
            bgKey = Object.keys(BACKGROUNDS)[num - 1];
        } else {
            // Try to match by name
            bgKey = Object.keys(BACKGROUNDS).find(k => 
                k === input.toLowerCase() || 
                BACKGROUNDS[k].name.toLowerCase() === input.toLowerCase()
            );
        }
        
        const term = TerminalManager;
        
        if (!bgKey) {
            if (term) {
                term.addLine('Invalid background. Choose 1-6 or a background name.', 'error');
            }
            return;
        }
        
        const bg = BACKGROUNDS[bgKey];
        state.character.background = bgKey;
        state.debt.baseDebt = bg.debt;
        state.debt.totalDebt = bg.debt;
        
        // Apply skill bonuses
        for (const [skill, bonus] of Object.entries(bg.skills)) {
            state.character.skills[skill] = (state.character.skills[skill] || 0) + bonus;
        }
        
        if (term) {
            term.addLine('', 'output');
            term.addLine(`${bg.name.toUpperCase()} selected.`, 'system');
            term.addLine(`Starting gear: ${bg.gear.join(', ')}`, 'output');
            term.addLine(`Skills: ${Object.keys(bg.skills).map(s => `${s} +1`).join(', ')}`, 'output');
            term.addLine(`Starting debt: ${bg.debt}¢ (${bg.creditor.name})`, 'output');
            term.addLine('', 'output');
            term.addLine('Type "continue" to proceed.', 'system');
        }
    }
    
    // Additional character phases would be implemented similarly...
    // For brevity, showing the structure for debt phase
    
    // ═══════════════════════════════════════════════════════════════════
    // DEBT PHASE
    // ═══════════════════════════════════════════════════════════════════
    
    async function startDebtPhase() {
        const term = TerminalManager;
        if (!term) return;
        
        term.addLine('', 'output');
        await term.typewrite('═══════════════════════════════════════════════════════════', { speed: 5, type: 'system' });
        await term.typewrite('  YOUR FINANCIAL SITUATION', { speed: 30, type: 'system' });
        await term.typewrite('═══════════════════════════════════════════════════════════', { speed: 5, type: 'system' });
        term.addLine('', 'output');
        
        const bg = BACKGROUNDS[state.character.background];
        term.addLine(`Base Debt (${bg.name}): ${state.debt.baseDebt}¢`, 'output');
        term.addLine(`Creditor: ${bg.creditor.name}`, 'output');
        await term.typewrite('"They want their money. They always do."', { speed: 30, type: 'output' });
        term.addLine('', 'output');
        term.addLine('OPTIONAL DEBT PACKAGES:', 'system');
        term.addLine('(Take up to 3 for extra starting gear)', 'output');
        term.addLine('', 'output');
        
        DEBT_PACKAGES.forEach((pkg, i) => {
            term.addLine(`  [${i + 1}] ${pkg.name} (+${pkg.cost}¢)`, 'output');
            term.addLine(`      ${pkg.contents.join(', ')}`, 'output');
        });
        
        term.addLine('', 'output');
        term.addLine(`Current Total Debt: ${state.debt.totalDebt}¢`, 'system');
        term.addLine('', 'output');
        term.addLine('Commands:', 'system');
        term.addLine('  add <number>    - Add a package', 'output');
        term.addLine('  remove <number> - Remove a package', 'output');
        term.addLine('  continue        - Finalize debt', 'output');
    }
    
    function addDebtPackage(index) {
        const pkgIndex = parseInt(index) - 1;
        const term = TerminalManager;
        
        if (pkgIndex < 0 || pkgIndex >= DEBT_PACKAGES.length) {
            if (term) term.addLine('Invalid package number.', 'error');
            return;
        }
        
        if (state.debt.selectedPackages.length >= 3) {
            if (term) term.addLine('Maximum 3 packages allowed.', 'error');
            return;
        }
        
        const pkg = DEBT_PACKAGES[pkgIndex];
        
        if (state.debt.selectedPackages.includes(pkg.id)) {
            if (term) term.addLine('Package already selected.', 'error');
            return;
        }
        
        state.debt.selectedPackages.push(pkg.id);
        state.debt.totalDebt += pkg.cost;
        
        if (term) {
            term.addLine(`Added: ${pkg.name} (+${pkg.cost}¢)`, 'system');
            term.addLine(`Total Debt: ${state.debt.totalDebt}¢`, 'system');
        }
    }
    
    function removeDebtPackage(index) {
        const pkgIndex = parseInt(index) - 1;
        const term = TerminalManager;
        
        if (pkgIndex < 0 || pkgIndex >= DEBT_PACKAGES.length) {
            if (term) term.addLine('Invalid package number.', 'error');
            return;
        }
        
        const pkg = DEBT_PACKAGES[pkgIndex];
        const idx = state.debt.selectedPackages.indexOf(pkg.id);
        
        if (idx === -1) {
            if (term) term.addLine('Package not selected.', 'error');
            return;
        }
        
        state.debt.selectedPackages.splice(idx, 1);
        state.debt.totalDebt -= pkg.cost;
        
        if (term) {
            term.addLine(`Removed: ${pkg.name} (-${pkg.cost}¢)`, 'system');
            term.addLine(`Total Debt: ${state.debt.totalDebt}¢`, 'system');
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // DOCUMENTS PHASE
    // ═══════════════════════════════════════════════════════════════════
    
    async function startDocumentsPhase() {
        generateDocuments();
        
        const term = TerminalManager;
        if (!term) return;
        
        term.addLine('', 'output');
        await term.typewrite('═══════════════════════════════════════════════════════════', { speed: 5, type: 'system' });
        await term.typewrite('  GENERATING IDENTITY DOCUMENTS...', { speed: 30, type: 'system' });
        await term.typewrite('═══════════════════════════════════════════════════════════', { speed: 5, type: 'system' });
        term.addLine('', 'output');
        
        // Show documents one by one with delays
        await sleep(500);
        await showCorporateId();
        await sleep(1000);
        await showSinCard();
        await sleep(1000);
        await showDebtStatement();
        await sleep(1000);
        await showEquipmentManifest();
        await sleep(1000);
        showFinalPrompt();
    }
    
    function generateDocuments() {
        const now = new Date();
        const oneYearLater = new Date(now);
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        
        // Generate SIN number
        const sinNumber = generateSIN();
        
        // Corporate ID
        state.documents.corporateId = {
            name: state.character.name || 'UNKNOWN',
            handle: state.character.handle || 'N/A',
            sin: sinNumber,
            clearance: 'LEVEL 1 (CONTRACTOR)',
            issued: formatDate(now),
            expires: formatDate(oneYearLater)
        };
        
        // SIN Card
        state.documents.sin = {
            number: sinNumber,
            type: state.debt.selectedPackages.includes('clean_sin') ? 'VERIFIED' : 'UNVERIFIED',
            flags: state.debt.selectedPackages.includes('clean_sin') ? [] : ['FLAGGED: VERIFY IN PERSON']
        };
        
        // Debt Statement
        const bg = BACKGROUNDS[state.character.background];
        const packageDebt = state.debt.totalDebt - state.debt.baseDebt;
        const interest = Math.round(state.debt.totalDebt * 0.01); // 1% for display
        
        state.documents.debtStatement = {
            accountHolder: state.character.name || 'UNKNOWN',
            accountNumber: generateAccountNumber(),
            creditor: bg.creditor.name,
            baseDebt: state.debt.baseDebt,
            packageDebt: packageDebt,
            interest: interest,
            totalDebt: state.debt.totalDebt + interest,
            minimumPayment: Math.round((state.debt.totalDebt + interest) * 0.1),
            dueDate: formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
        };
        
        // Equipment Manifest
        const gear = [...(BACKGROUNDS[state.character.background]?.gear || [])];
        state.debt.selectedPackages.forEach(pkgId => {
            const pkg = DEBT_PACKAGES.find(p => p.id === pkgId);
            if (pkg) {
                gear.push(...pkg.contents);
            }
        });
        
        state.documents.equipmentManifest = {
            items: gear
        };
    }
    
    async function showCorporateId() {
        const doc = state.documents.corporateId;
        const term = TerminalManager;
        if (!term) return;
        
        await term.typewrite('╔══════════════════════════════════════════════════════╗', { speed: 5, type: 'system' });
        term.addLine('║  MERIDIAN SYSTEMS CORP.                              ║', 'system');
        term.addLine('║  EMPLOYEE IDENTIFICATION                             ║', 'system');
        term.addLine('╠══════════════════════════════════════════════════════╣', 'system');
        term.addLine(`║  NAME: ${doc.name.substring(0, 44).padEnd(44)}║`, 'output');
        term.addLine(`║  HANDLE: ${doc.handle.substring(0, 42).padEnd(42)}║`, 'output');
        term.addLine(`║  SIN: ${doc.sin.padEnd(46)}║`, 'output');
        term.addLine(`║  CLEARANCE: ${doc.clearance.padEnd(40)}║`, 'output');
        term.addLine(`║  ISSUED: ${doc.issued.padEnd(42)}║`, 'output');
        term.addLine(`║  EXPIRES: ${doc.expires.padEnd(41)}║`, 'output');
        term.addLine('╚══════════════════════════════════════════════════════╝', 'system');
    }
    
    async function showSinCard() {
        const doc = state.documents.sin;
        const term = TerminalManager;
        if (!term) return;
        
        term.addLine('', 'output');
        await term.typewrite('╔══════════════════════════════════════════════════════╗', { speed: 5, type: 'system' });
        term.addLine('║  SYSTEM IDENTIFICATION NUMBER                        ║', 'system');
        term.addLine('╠══════════════════════════════════════════════════════╣', 'system');
        term.addLine(`║  SIN: ${doc.number.padEnd(46)}║`, 'output');
        term.addLine(`║  STATUS: ${doc.type.padEnd(42)}║`, 'output');
        if (doc.flags.length > 0) {
            doc.flags.forEach(flag => {
                term.addLine(`║  ⚠ ${flag.substring(0, 48).padEnd(48)}║`, 'error');
            });
        }
        term.addLine('╚══════════════════════════════════════════════════════╝', 'system');
    }
    
    async function showDebtStatement() {
        const doc = state.documents.debtStatement;
        const term = TerminalManager;
        if (!term) return;
        
        term.addLine('', 'output');
        await term.typewrite('╔══════════════════════════════════════════════════════╗', { speed: 5, type: 'system' });
        term.addLine('║  NIGHTCITY CREDIT UNION                              ║', 'system');
        term.addLine('║  ACCOUNT STATEMENT                                   ║', 'system');
        term.addLine('╠══════════════════════════════════════════════════════╣', 'system');
        term.addLine(`║  ACCOUNT: ${doc.accountNumber.padEnd(41)}║`, 'output');
        term.addLine(`║  CREDITOR: ${doc.creditor.substring(0, 40).padEnd(40)}║`, 'output');
        term.addLine('║                                                      ║', 'output');
        term.addLine(`║  Base obligation:      ${String(doc.baseDebt).padStart(10)}¢               ║`, 'output');
        term.addLine(`║  Equipment financing:  ${String(doc.packageDebt).padStart(10)}¢               ║`, 'output');
        term.addLine(`║  Interest (12% APR):   ${String(doc.interest).padStart(10)}¢               ║`, 'output');
        term.addLine('║  ──────────────────────────────────────────────────  ║', 'output');
        term.addLine(`║  TOTAL DUE:            ${String(doc.totalDebt).padStart(10)}¢               ║`, 'system');
        term.addLine('║                                                      ║', 'output');
        term.addLine(`║  MINIMUM PAYMENT:      ${String(doc.minimumPayment).padStart(10)}¢               ║`, 'output');
        term.addLine(`║  DUE DATE: ${doc.dueDate.padEnd(41)}║`, 'output');
        term.addLine('║                                                      ║', 'output');
        term.addLine('║  ⚠ FAILURE TO PAY MAY RESULT IN ASSET SEIZURE       ║', 'error');
        term.addLine('╚══════════════════════════════════════════════════════╝', 'system');
    }
    
    async function showEquipmentManifest() {
        const doc = state.documents.equipmentManifest;
        const term = TerminalManager;
        if (!term) return;
        
        term.addLine('', 'output');
        await term.typewrite('╔══════════════════════════════════════════════════════╗', { speed: 5, type: 'system' });
        term.addLine('║  EQUIPMENT MANIFEST                                  ║', 'system');
        term.addLine('╠══════════════════════════════════════════════════════╣', 'system');
        doc.items.forEach(item => {
            term.addLine(`║  • ${item.substring(0, 48).padEnd(48)}║`, 'output');
        });
        term.addLine('╚══════════════════════════════════════════════════════╝', 'system');
    }
    
    async function showFinalPrompt() {
        const term = TerminalManager;
        if (!term) return;
        
        term.addLine('', 'output');
        await term.typewrite('═══════════════════════════════════════════════════════════', { speed: 5, type: 'system' });
        await term.typewrite('  IDENTITY ESTABLISHED', { speed: 30, type: 'system' });
        await term.typewrite('═══════════════════════════════════════════════════════════', { speed: 5, type: 'system' });
        term.addLine('', 'output');
        await term.typewrite('Your documents have been generated.', { speed: 30, type: 'output' });
        await term.typewrite('Welcome to the sprawl.', { speed: 40, type: 'system' });
        term.addLine('', 'output');
        term.addLine('Type "continue" to enter the world.', 'system');
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // COMPLETION
    // ═══════════════════════════════════════════════════════════════════
    
    async function completeOnboarding() {
        state.active = false;
        state.phase = PHASES.COMPLETE;
        
        // Save character data
        const characterData = buildCharacterData();
        
        // Emit completion event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('onboarding:complete', characterData);
        }
        
        const term = TerminalManager;
        if (term) {
            term.addLine('', 'output');
            await term.typewrite('═══════════════════════════════════════════════════════════', { speed: 5, type: 'system' });
            const name = state.character.handle || state.character.name || 'choom';
            await term.typewrite(`  Welcome to the sprawl, ${name}.`, { speed: 30, type: 'system' });
            await term.typewrite('═══════════════════════════════════════════════════════════', { speed: 5, type: 'system' });
            term.addLine('', 'output');
            await term.typewrite('Onboarding complete. Good luck out there.', { speed: 30, type: 'system' });
            term.addLine('', 'output');
            term.addLine('Exiting terminal mode...', 'output');
        }
        
        console.log('[OnboardingManager] Onboarding complete', characterData);
        
        // Exit terminal mode after a delay
        setTimeout(() => {
            exitTerminalMode();
        }, 2000);
        
        return characterData;
    }
    
    function buildCharacterData() {
        const bg = BACKGROUNDS[state.character.background] || {};
        
        return {
            id: generateCharacterId(),
            name: state.character.name,
            handle: state.character.handle,
            pronouns: state.character.pronouns,
            background: state.character.background,
            
            attributes: state.character.attributes,
            skills: state.character.skills,
            stunts: state.character.stunts,
            flaws: state.character.flaws,
            
            cyberware: state.character.cyberware,
            gear: [...(bg.gear || []), ...getPackageGear()],
            contacts: state.character.contacts,
            
            appearance: state.character.appearance,
            personality: state.character.personality,
            goal: state.character.goal,
            notes: state.character.notes,
            
            credits: 0,
            experience: 0,
            
            debt: {
                total: state.debt.totalDebt,
                baseDebt: state.debt.baseDebt,
                packageDebt: state.debt.totalDebt - state.debt.baseDebt,
                creditor: bg.creditor,
                packages: state.debt.selectedPackages,
                interestRate: 0.12,
                minimumPayment: Math.round(state.debt.totalDebt * 0.1),
                status: 'current'
            },
            
            documents: state.documents,
            
            meta: {
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                version: '1.0',
                onboardingComplete: true
            }
        };
    }
    
    function getPackageGear() {
        const gear = [];
        state.debt.selectedPackages.forEach(pkgId => {
            const pkg = DEBT_PACKAGES.find(p => p.id === pkgId);
            if (pkg) {
                gear.push(...pkg.contents);
            }
        });
        return gear;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // COMMAND HANDLER
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Handle onboarding-specific commands
     * Returns true if command was handled, false otherwise
     */
    function handleCommand(cmd, args) {
        if (!state.active) return false;
        
        switch (cmd) {
            case 'continue':
            case 'next':
                // Advance within character sub-phases before moving to the next main phase
                if (state.phase === PHASES.CHARACTER) {
                    if (state.characterPhase === CHARACTER_PHASES.IDENTITY) {
                        // Move from identity -> background selection
                        showBackgroundPhase();
                        return true;
                    }
                    
                    if (state.characterPhase === CHARACTER_PHASES.BACKGROUND) {
                        // From background, proceed to the next major phase (debt)
                        nextPhase();
                        return true;
                    }
                }
                
                // Default: advance main onboarding phase
                nextPhase();
                return true;
                
            case 'cancel':
            case 'quit':
            case 'exit':
                cancel();
                return true;
                
            // Audio phase commands
            case 'music':
                if (state.phase === PHASES.AUDIO) {
                    const vol = args[0] !== undefined ? parseInt(args[0]) : 50;
                    setMusicVolume(isNaN(vol) ? 50 : vol);
                    return true;
                }
                break;
                
            case 'sfx':
                if (state.phase === PHASES.AUDIO) {
                    const vol = args[0] !== undefined ? parseInt(args[0]) : 70;
                    setSfxVolume(isNaN(vol) ? 70 : vol);
                    return true;
                }
                break;
                
            case 'test':
                if (state.phase === PHASES.AUDIO) {
                    playTestSfx();
                    return true;
                }
                break;
                
            // Visual phase commands
            case 'brightness':
                if (state.phase === PHASES.VISUAL) {
                    setBrightness(parseInt(args[0]) || 100);
                    return true;
                }
                break;
                
            case 'contrast':
                if (state.phase === PHASES.VISUAL) {
                    setContrast(parseInt(args[0]) || 100);
                    return true;
                }
                break;
                
            // Character phase commands
            case 'name':
                if (state.phase === PHASES.CHARACTER && state.characterPhase === CHARACTER_PHASES.IDENTITY) {
                    state.character.name = args.join(' ');
                    if (typeof TerminalManager !== 'undefined') {
                        TerminalManager.addLine(`Name set: ${state.character.name}`, 'system');
                    }
                    return true;
                }
                break;
                
            case 'handle':
                if (state.phase === PHASES.CHARACTER && state.characterPhase === CHARACTER_PHASES.IDENTITY) {
                    state.character.handle = args.join(' ');
                    if (typeof TerminalManager !== 'undefined') {
                        TerminalManager.addLine(`Handle set: ${state.character.handle}`, 'system');
                    }
                    return true;
                }
                break;
                
            case 'pronouns':
                if (state.phase === PHASES.CHARACTER && state.characterPhase === CHARACTER_PHASES.IDENTITY) {
                    state.character.pronouns = args.join(' ');
                    if (typeof TerminalManager !== 'undefined') {
                        TerminalManager.addLine(`Pronouns set: ${state.character.pronouns}`, 'system');
                    }
                    return true;
                }
                break;
                
            case 'background':
                if (state.phase === PHASES.CHARACTER && state.characterPhase === CHARACTER_PHASES.BACKGROUND) {
                    setBackground(args.join(' '));
                    return true;
                }
                break;
                
            // Debt phase commands
            case 'add':
                if (state.phase === PHASES.DEBT) {
                    addDebtPackage(args[0]);
                    return true;
                }
                break;
                
            case 'remove':
                if (state.phase === PHASES.DEBT) {
                    removeDebtPackage(args[0]);
                    return true;
                }
                break;
        }
        
        return false;
    }
    
    /**
     * Handle raw input (for number selections, etc.)
     */
    function handleInput(input) {
        if (!state.active) return false;
        
        // Check for number input during background selection
        if (state.phase === PHASES.CHARACTER && state.characterPhase === CHARACTER_PHASES.BACKGROUND) {
            const num = parseInt(input);
            if (num >= 1 && num <= 6) {
                setBackground(input);
                return true;
            }
        }
        
        return false;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    function generateSIN() {
        const parts = [];
        for (let i = 0; i < 4; i++) {
            parts.push(Math.floor(Math.random() * 10000).toString().padStart(4, '0'));
        }
        return parts.join('-');
    }
    
    function generateAccountNumber() {
        return 'NCU-' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    }
    
    function generateCharacterId() {
        return 'char_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    
    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        init,
        start,
        cancel,
        handleCommand,
        handleInput,
        
        // State getters
        isActive: () => state.active,
        getPhase: () => state.phase,
        getCharacterPhase: () => state.characterPhase,
        getState: () => ({ ...state }),
        
        // Constants
        PHASES,
        CHARACTER_PHASES,
        BACKGROUNDS,
        DEBT_PACKAGES
    };
    
})();

// Auto-initialize when script loads
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        OnboardingManager.init();
    });
}
