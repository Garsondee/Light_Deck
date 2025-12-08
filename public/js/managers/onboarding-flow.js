/**
 * OnboardingFlow - New screen-based onboarding coordinator
 * 
 * This module coordinates the new visual onboarding screens while
 * maintaining compatibility with the existing OnboardingManager state.
 * 
 * Flow:
 * 1. Boot Screen (logo, loading)
 * 2. Audio Calibration (sliders, visualizer)
 * 3. Visual Calibration (brightness, contrast)
 * 4. Identity Form (name, handle, pronouns)
 * 5. Portrait Picker (visual selection)
 * 6. Background Selection
 * 7. Debt Packages
 * 8. Document Generation
 * 9. Complete
 */

const OnboardingFlow = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════
    
    const SCREENS = {
        BOOT: 'boot',
        AUDIO: 'audio',
        VISUAL: 'visual',
        IDENTITY: 'identity',
        PORTRAIT: 'portrait',
        BACKGROUND: 'background',
        DEBT: 'debt',
        DOCUMENTS: 'documents',
        COMPLETE: 'complete'
    };
    
    const SCREEN_ORDER = [
        SCREENS.BOOT,
        SCREENS.AUDIO,
        SCREENS.VISUAL,
        SCREENS.IDENTITY,
        SCREENS.PORTRAIT,
        SCREENS.BACKGROUND,
        SCREENS.DEBT,
        SCREENS.DOCUMENTS,
        SCREENS.COMPLETE
    ];
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let initialized = false;
    let active = false;
    let currentScreenIndex = 0;
    let completionStarted = false; // Prevent multiple completion runs
    
    // Collected data from screens
    const data = {
        audio: {
            musicVolume: 50,
            sfxVolume: 70
        },
        visual: {
            brightness: 100,
            contrast: 100
        },
        identity: {
            name: '',
            handle: '',
            pronouns: 'they/them'
        },
        portrait: null,
        background: null,
        debt: {
            packages: [],
            total: 0
        }
    };
    
    // Screen instances
    const screenInstances = {};
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Initialize the onboarding flow
     * @param {THREE.Scene} scene - Three.js scene
     */
    function init(scene) {
        if (initialized) {
            console.warn('[OnboardingFlow] Already initialized');
            return;
        }
        
        // Initialize OnboardingScreenManager
        if (typeof OnboardingScreenManager !== 'undefined') {
            OnboardingScreenManager.init(scene);
        } else {
            console.error('[OnboardingFlow] OnboardingScreenManager not available');
            return;
        }
        
        // Create and register screens
        createScreens();
        
        // Listen for screen completion events
        setupEventListeners();
        
        initialized = true;
        console.log('[OnboardingFlow] Initialized');
    }
    
    /**
     * Create screen instances and register with manager
     */
    function createScreens() {
        // Boot Screen
        if (typeof BootScreen !== 'undefined') {
            screenInstances.boot = BootScreen.create({
                onComplete: () => advanceToNext()
            });
            OnboardingScreenManager.registerScreen(SCREENS.BOOT, screenInstances.boot);
        }
        
        // Audio Calibration Screen
        if (typeof AudioCalibrationScreen !== 'undefined') {
            screenInstances.audio = AudioCalibrationScreen.create({
                musicVolume: data.audio.musicVolume,
                sfxVolume: data.audio.sfxVolume,
                onComplete: (audioData) => {
                    data.audio = audioData;
                    advanceToNext();
                }
            });
            OnboardingScreenManager.registerScreen(SCREENS.AUDIO, screenInstances.audio);
        }
        
        // Identity Form Screen
        if (typeof IdentityFormScreen !== 'undefined') {
            screenInstances.identity = IdentityFormScreen.create({
                onComplete: (identityData) => {
                    data.identity = identityData;
                    advanceToNext();
                }
            });
            OnboardingScreenManager.registerScreen(SCREENS.IDENTITY, screenInstances.identity);
        }
        
        // Portrait Picker Screen
        if (typeof PortraitPickerScreen !== 'undefined') {
            screenInstances.portrait = PortraitPickerScreen.create({
                onComplete: (portrait) => {
                    data.portrait = portrait;
                    advanceToNext();
                }
            });
            OnboardingScreenManager.registerScreen(SCREENS.PORTRAIT, screenInstances.portrait);
        }
        
        // Background Selection Screen
        if (typeof BackgroundSelectionScreen !== 'undefined') {
            screenInstances.background = BackgroundSelectionScreen.create({
                onComplete: (backgroundData) => {
                    data.background = backgroundData;
                    // Pass base debt to debt screen
                    if (screenInstances.debt && screenInstances.debt.setBaseDebt) {
                        screenInstances.debt.setBaseDebt(backgroundData.debt || 0);
                    }
                    advanceToNext();
                }
            });
            OnboardingScreenManager.registerScreen(SCREENS.BACKGROUND, screenInstances.background);
        }
        
        // Debt Packages Screen
        if (typeof DebtPackagesScreen !== 'undefined') {
            screenInstances.debt = DebtPackagesScreen.create({
                baseDebt: 0,  // Will be set when background is selected
                onComplete: (debtData) => {
                    data.debt = debtData;
                    // Pass all collected data to documents screen
                    if (screenInstances.documents && screenInstances.documents.setCharacterData) {
                        screenInstances.documents.setCharacterData(buildCharacterData());
                    }
                    advanceToNext();
                }
            });
            OnboardingScreenManager.registerScreen(SCREENS.DEBT, screenInstances.debt);
        }
        
        // Documents Screen
        if (typeof DocumentsScreen !== 'undefined') {
            screenInstances.documents = DocumentsScreen.create({
                onComplete: (result) => {
                    // Pass character data to complete screen
                    if (screenInstances.complete && screenInstances.complete.setCharacterData) {
                        screenInstances.complete.setCharacterData(buildCharacterData());
                    }
                    advanceToNext();
                }
            });
            OnboardingScreenManager.registerScreen(SCREENS.DOCUMENTS, screenInstances.documents);
        }
        
        // Complete Screen
        if (typeof CompleteScreen !== 'undefined') {
            screenInstances.complete = CompleteScreen.create({
                onComplete: (characterData) => {
                    // Final completion - hide overlay and emit event
                    complete();
                }
            });
            OnboardingScreenManager.registerScreen(SCREENS.COMPLETE, screenInstances.complete);
        }
        
        console.log('[OnboardingFlow] Screens created:', Object.keys(screenInstances));
    }
    
    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        if (typeof EventBus === 'undefined') return;
        
        // Listen for back navigation
        EventBus.on('onboarding:back', () => {
            goBack();
        });
        
        // Listen for screen-specific events
        EventBus.on('onboarding:boot_complete', () => {
            console.log('[OnboardingFlow] Boot complete');
        });
        
        EventBus.on('onboarding:audio_complete', (audioData) => {
            console.log('[OnboardingFlow] Audio complete:', audioData);
        });
        
        EventBus.on('onboarding:identity_complete', (identityData) => {
            console.log('[OnboardingFlow] Identity complete:', identityData);
        });
        
        EventBus.on('onboarding:portrait_complete', (portrait) => {
            console.log('[OnboardingFlow] Portrait complete:', portrait);
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // FLOW CONTROL
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Start the onboarding flow
     */
    function start() {
        if (!initialized) {
            console.error('[OnboardingFlow] Not initialized');
            return;
        }
        
        if (active) {
            console.warn('[OnboardingFlow] Already active');
            return;
        }
        
        active = true;
        completionStarted = false;
        currentScreenIndex = 0;
        
        console.log('[OnboardingFlow] Starting onboarding');
        
        // Show first screen
        const firstScreen = SCREEN_ORDER[0];
        OnboardingScreenManager.show(firstScreen, {
            duration: 800
        });
        
        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('onboarding:started');
        }
    }
    
    /**
     * Advance to the next screen
     */
    function advanceToNext() {
        currentScreenIndex++;
        
        if (currentScreenIndex >= SCREEN_ORDER.length) {
            complete();
            return;
        }
        
        const nextScreen = SCREEN_ORDER[currentScreenIndex];
        
        // Skip screens that don't have instances
        if (!screenInstances[nextScreen]) {
            console.log(`[OnboardingFlow] Skipping unimplemented screen: ${nextScreen}`);
            advanceToNext();
            return;
        }
        
        console.log(`[OnboardingFlow] Advancing to: ${nextScreen}`);
        
        OnboardingScreenManager.transitionTo(nextScreen, {
            duration: 300
        });
    }
    
    /**
     * Go back to previous screen
     */
    function goBack() {
        if (currentScreenIndex <= 0) {
            // Can't go back from first screen
            return;
        }
        
        currentScreenIndex--;
        const prevScreen = SCREEN_ORDER[currentScreenIndex];
        
        // Skip screens that don't have instances
        if (!screenInstances[prevScreen]) {
            goBack();
            return;
        }
        
        console.log(`[OnboardingFlow] Going back to: ${prevScreen}`);
        
        OnboardingScreenManager.transitionTo(prevScreen, {
            duration: 300
        });
    }
    
    /**
     * Cancel onboarding
     */
    function cancel() {
        if (!active) return;
        
        console.log('[OnboardingFlow] Cancelled');
        
        active = false;
        completionStarted = false;
        
        OnboardingScreenManager.hide({
            duration: 500,
            onComplete: () => {
                if (typeof EventBus !== 'undefined') {
                    EventBus.emit('onboarding:cancelled');
                }
            }
        });
    }
    
    /**
     * Complete onboarding
     */
    function complete() {
        if (completionStarted) {
            console.log('[OnboardingFlow] complete() already in progress, ignoring');
            return;
        }
        completionStarted = true;
        
        console.log('[OnboardingFlow] Complete');
        console.log('[OnboardingFlow] Collected data:', data);
        
        // Build character data
        const characterData = buildCharacterData();
        
        // Helper to emit completion event once visuals are finished
        const emitCompletion = () => {
            // Mark onboarding as fully inactive now that visuals are done
            active = false;
            
            // Emit completion event with character data
            if (typeof EventBus !== 'undefined') {
                EventBus.emit('onboarding:complete', characterData);
            }
            
            // Sync with legacy OnboardingManager if available
            if (typeof OnboardingManager !== 'undefined') {
                // The legacy manager can handle saving, etc.
            }
        };
        
        const hasTransitionManager = typeof TransitionManager !== 'undefined';
        const canSceneTransition = hasTransitionManager && typeof TransitionManager.toSceneViewer === 'function';
        const isTransitioning = hasTransitionManager && typeof TransitionManager.isTransitioning === 'function'
            ? TransitionManager.isTransitioning()
            : false;

        // If a CRT transition is already running (for example, the
        // player clicked multiple times or another system is mid-transition),
        // don't try to start a new one. Just hide the overlay and finish.
        if (!canSceneTransition || isTransitioning) {
            OnboardingScreenManager.hide({
                duration: 0,
                onComplete: () => {
                    emitCompletion();
                }
            });
            return;
        }

        // Normal path: use a full CRT transition from the final
        // "Welcome to the sprawl" screen back into the scene viewer.
        // The onboarding overlay is hidden at the transition midpoint
        // so that when the screen powers back up, the player is in
        // the scene viewer with onboarding ended.
        TransitionManager.toSceneViewer({
            onMidpoint: () => {
                // Hide overlay instantly at blackout
                OnboardingScreenManager.hide({ duration: 0 });
            },
            onComplete: () => {
                emitCompletion();
            }
        });
    }
    
    /**
     * Build character data from collected screen data
     */
    function buildCharacterData() {
        return {
            id: 'char_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
            name: data.identity.name,
            handle: data.identity.handle,
            pronouns: data.identity.pronouns,
            portrait: data.portrait,
            background: data.background,
            
            settings: {
                audio: data.audio,
                visual: data.visual
            },
            
            debt: data.debt,
            
            meta: {
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                version: '2.0',  // New screen-based onboarding
                onboardingComplete: true
            }
        };
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // TERMINAL COMMAND PASSTHROUGH
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Handle terminal command during onboarding
     * Routes to current screen's command handler
     */
    function handleCommand(cmd, args) {
        if (!active) return false;
        
        // Global commands
        if (cmd === 'cancel' || cmd === 'quit' || cmd === 'exit') {
            cancel();
            return true;
        }
        
        if (cmd === 'back') {
            goBack();
            return true;
        }
        
        // Pass to screen manager
        return OnboardingScreenManager.handleCommand(cmd, args);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UPDATE LOOP
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Update the onboarding flow (called from animation loop)
     */
    function update(dt) {
        if (!active || !initialized) return;
        
        OnboardingScreenManager.update(dt);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // AUTO-START LOGIC
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Check if onboarding should auto-start
     * Returns true if:
     * - User is not GM
     * - No active character in localStorage
     */
    function shouldAutoStart() {
        // Check if GM
        if (typeof SyncManager !== 'undefined' && SyncManager.isGM()) {
            console.log('[OnboardingFlow] User is GM, skipping auto-start');
            return false;
        }
        
        // Check for active character
        try {
            const activeCharId = localStorage.getItem('lightdeck_active_character');
            if (activeCharId) {
                const characters = JSON.parse(localStorage.getItem('lightdeck_characters') || '[]');
                const activeChar = characters.find(c => c.id === activeCharId);
                
                if (activeChar && activeChar.meta?.onboardingComplete) {
                    console.log('[OnboardingFlow] Active character found, skipping auto-start');
                    return false;
                }
            }
        } catch (err) {
            console.warn('[OnboardingFlow] Error checking character:', err);
        }
        
        return true;
    }
    
    /**
     * Auto-start onboarding after a delay (for new players)
     */
    function autoStartIfNeeded(delay = 3000) {
        if (!shouldAutoStart()) return;
        
        console.log(`[OnboardingFlow] Will auto-start in ${delay}ms`);
        
        setTimeout(() => {
            if (!active && shouldAutoStart()) {
                start();
            }
        }, delay);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Go to a specific screen by name (for testing/debugging)
     */
    function goToScreen(screenName) {
        if (!initialized) {
            console.warn('[OnboardingFlow] Not initialized');
            return;
        }
        
        const index = SCREEN_ORDER.indexOf(screenName);
        if (index === -1) {
            console.warn('[OnboardingFlow] Unknown screen:', screenName);
            return;
        }
        
        // Start if not active
        if (!active) {
            active = true;
        }
        
        currentScreenIndex = index;
        const screen = SCREEN_ORDER[currentScreenIndex];
        
        console.log('[OnboardingFlow] Jumping to screen:', screen);
        OnboardingScreenManager.transitionTo(screen);
    }
    
    return {
        init,
        start,
        cancel,
        update,
        handleCommand,
        
        // Navigation
        advanceToNext,
        goBack,
        goToScreen,
        
        // Auto-start
        shouldAutoStart,
        autoStartIfNeeded,
        
        // State
        isActive: () => active,
        isInitialized: () => initialized,
        getCurrentScreen: () => SCREEN_ORDER[currentScreenIndex],
        getData: () => ({ ...data }),
        
        // Constants
        SCREENS
    };
    
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OnboardingFlow;
}
