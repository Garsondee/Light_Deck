/**
 * StartupManager - First-time boot sequence handler
 * 
 * Displays a cinematic boot sequence on first load:
 * - Dark screen fade in
 * - ASCII "LIGHT DECK" logo
 * - System initialization messages
 * - Fade out to scene viewer
 * 
 * Uses localStorage to track if boot has been shown this session.
 */

const StartupManager = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════
    
    const STORAGE_KEY = 'lightdeck_boot_complete';
    const BOOT_DURATION = 10000; // 10 seconds total
    
    // ASCII Art Logo - Large cyberpunk style
    const LOGO_ASCII = `
██╗     ██╗ ██████╗ ██╗  ██╗████████╗
██║     ██║██╔════╝ ██║  ██║╚══██╔══╝
██║     ██║██║  ███╗███████║   ██║   
██║     ██║██║   ██║██╔══██║   ██║   
███████╗██║╚██████╔╝██║  ██║   ██║   
╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   
                                      
██████╗ ███████╗ ██████╗██╗  ██╗
██╔══██╗██╔════╝██╔════╝██║ ██╔╝
██║  ██║█████╗  ██║     █████╔╝ 
██║  ██║██╔══╝  ██║     ██╔═██╗ 
██████╔╝███████╗╚██████╗██║  ██╗
╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝`;

    const BOOT_SEQUENCE = [
        { type: 'delay', duration: 500 },
        { type: 'clear' },
        { type: 'logo', text: LOGO_ASCII, speed: 200 },
        { type: 'delay', duration: 800 },
        { type: 'line', text: '', speed: 0 },
        { type: 'typewrite', text: '         (c) 2077 Ingram Blakelock', speed: 40, style: 'system' },
        { type: 'delay', duration: 400 },
        { type: 'typewrite', text: '         All Rights Reserved', speed: 40, style: 'system' },
        { type: 'delay', duration: 1000 },
        { type: 'line', text: '', speed: 0 },
        { type: 'typewrite', text: '═══════════════════════════════════════════════', speed: 100, style: 'output' },
        { type: 'delay', duration: 300 },
        { type: 'line', text: '', speed: 0 },
        { type: 'typewrite', text: 'SYSTEM INITIALIZATION v3.7.2', speed: 60, style: 'system' },
        { type: 'delay', duration: 400 },
        { type: 'line', text: '', speed: 0 },
        { type: 'typewrite', text: '[BOOT] Loading core modules...', speed: 50, style: 'output' },
        { type: 'delay', duration: 300 },
        { type: 'typewrite', text: '[  OK  ] Neural interface driver', speed: 40, style: 'system' },
        { type: 'delay', duration: 200 },
        { type: 'typewrite', text: '[  OK  ] Quantum encryption layer', speed: 40, style: 'system' },
        { type: 'delay', duration: 200 },
        { type: 'typewrite', text: '[  OK  ] Holographic display matrix', speed: 40, style: 'system' },
        { type: 'delay', duration: 200 },
        { type: 'typewrite', text: '[  OK  ] Tactical overlay system', speed: 40, style: 'system' },
        { type: 'delay', duration: 400 },
        { type: 'line', text: '', speed: 0 },
        { type: 'typewrite', text: '[BOOT] Establishing secure connection...', speed: 50, style: 'output' },
        { type: 'delay', duration: 600 },
        { type: 'typewrite', text: '[  OK  ] Mesh network synchronized', speed: 40, style: 'system' },
        { type: 'typewrite', text: '[  OK  ] Firewall protocols active', speed: 40, style: 'system' },
        { type: 'delay', duration: 500 },
        { type: 'line', text: '', speed: 0 },
        { type: 'typewrite', text: '[BOOT] Initializing scene viewer...', speed: 50, style: 'output' },
        { type: 'delay', duration: 800 },
        { type: 'typewrite', text: '[  OK  ] CRT shader pipeline ready', speed: 40, style: 'system' },
        { type: 'typewrite', text: '[  OK  ] ASCII renderer online', speed: 40, style: 'system' },
        { type: 'delay', duration: 600 },
        { type: 'line', text: '', speed: 0 },
        { type: 'typewrite', text: '═══════════════════════════════════════════════', speed: 100, style: 'output' },
        { type: 'delay', duration: 300 },
        { type: 'line', text: '', speed: 0 },
        { type: 'typewrite', text: 'BOOT SEQUENCE COMPLETE', speed: 30, style: 'system' },
        { type: 'delay', duration: 400 },
        { type: 'typewrite', text: 'Transferring to Scene Viewer...', speed: 40, style: 'output' },
        { type: 'delay', duration: 1000 },
        { type: 'fadeout' }
    ];
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let bootInProgress = false;
    let bootComplete = false;
    let startupSound = null;
    const STARTUP_SOUND_URL = '/sounds/terminal/Terminal_Startup.mp3';
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Check if this is the first load (boot sequence should run)
     */
    function shouldRunBoot() {
        // Check sessionStorage - boot runs once per browser session
        const hasBooted = sessionStorage.getItem(STORAGE_KEY);
        return !hasBooted;
    }
    
    /**
     * Mark boot as complete for this session
     */
    function markBootComplete() {
        sessionStorage.setItem(STORAGE_KEY, 'true');
        bootComplete = true;
    }
    
    /**
     * Clear boot flag (for testing - allows boot to run again)
     */
    function resetBoot() {
        sessionStorage.removeItem(STORAGE_KEY);
        bootComplete = false;
        bootInProgress = false;
    }
    
    /**
     * Run the startup boot sequence
     * @returns {Promise} Resolves when boot is complete
     */
    async function runBootSequence() {
        if (bootInProgress) {
            console.warn('[StartupManager] Boot already in progress');
            return;
        }
        
        if (!shouldRunBoot()) {
            console.log('[StartupManager] Boot already completed this session');
            return;
        }
        
        bootInProgress = true;
        console.log('[StartupManager] Starting boot sequence...');
        
        // Ensure terminal is available
        if (typeof TerminalManager === 'undefined') {
            console.error('[StartupManager] TerminalManager not available');
            bootInProgress = false;
            return;
        }
        
        // Start with screen dark
        const originalBrightness = CRTShader?.config?.brightness ?? 1.0;
        if (CRTShader?.config) {
            CRTShader.config.brightness = 0;
        }
        
        // Show terminal (this hides the scene plane)
        TerminalManager.show();
        TerminalManager.clear();
        
        // Play startup sound
        playStartupSound();
        
        // Fade in from black (cinematic length)
        await fadeIn(2400, originalBrightness);
        
        // Process boot sequence
        for (const step of BOOT_SEQUENCE) {
            await processBootStep(step);
        }
        
        // Mark complete
        markBootComplete();
        bootInProgress = false;
        
        console.log('[StartupManager] Boot sequence complete');
    }
    
    /**
     * Process a single boot sequence step
     */
    async function processBootStep(step) {
        switch (step.type) {
            case 'delay':
                await sleep(step.duration);
                break;
                
            case 'clear':
                TerminalManager.clear();
                break;
                
            case 'line':
                TerminalManager.addLine(step.text, step.style || 'output');
                break;
                
            case 'logo':
                // Display logo lines instantly (no typewriter for ASCII art)
                const logoLines = step.text.split('\n');
                for (const line of logoLines) {
                    TerminalManager.addLine(line, 'output');
                }
                await sleep(step.speed || 100);
                break;
                
            case 'typewrite':
                await TerminalManager.typewrite(step.text, {
                    speed: step.speed || 50,
                    type: step.style || 'output'
                });
                break;
                
            case 'fadeout':
                await fadeOutToSceneViewer();
                break;
        }
    }
    
    /**
     * Fade in from black
     */
    function fadeIn(duration, targetBrightness) {
        return new Promise(resolve => {
            if (!CRTShader?.config) {
                resolve();
                return;
            }
            
            const startTime = performance.now();
            
            const animate = (now) => {
                const elapsed = now - startTime;
                const t = Math.min(1, elapsed / duration);
                
                // Ease-out curve
                const eased = 1 - Math.pow(1 - t, 2);
                CRTShader.config.brightness = targetBrightness * eased;
                
                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    CRTShader.config.brightness = targetBrightness;
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }
    
    /**
     * Fade out terminal and fade in to scene viewer
     * Uses TransitionManager for consistent CRT power-down effect
     */
    function fadeOutToSceneViewer() {
        // Use TransitionManager if available for consistent transitions
        if (typeof TransitionManager !== 'undefined') {
            return TransitionManager.transition({
                powerDownDuration: 3600,   // Slower power-down for boot sequence
                blackPauseDuration: 2400,  // Longer pause at black
                powerUpDuration: 3000,     // Gradual power-up to scene
                onMidpoint: () => {
                    // Hide terminal at the black point
                    TerminalManager.hide();
                }
            });
        }
        
        // Fallback if TransitionManager not available
        return new Promise(resolve => {
            if (!CRTShader?.config) {
                TerminalManager.hide();
                resolve();
                return;
            }
            
            const originalBrightness = CRTShader.config.brightness;
            const fadeOutDuration = 1200;
            const fadeInDuration = 1000;
            const startTime = performance.now();
            
            const fadeOut = (now) => {
                const elapsed = now - startTime;
                const t = Math.min(1, elapsed / fadeOutDuration);
                const eased = Math.pow(t, 2);
                CRTShader.config.brightness = originalBrightness * (1 - eased);
                
                if (t < 1) {
                    requestAnimationFrame(fadeOut);
                } else {
                    CRTShader.config.brightness = 0;
                    TerminalManager.hide();
                    
                    setTimeout(() => {
                        const fadeInStart = performance.now();
                        
                        const fadeIn = (now) => {
                            const elapsed = now - fadeInStart;
                            const t = Math.min(1, elapsed / fadeInDuration);
                            const eased = 1 - Math.pow(1 - t, 2);
                            CRTShader.config.brightness = originalBrightness * eased;
                            
                            if (t < 1) {
                                requestAnimationFrame(fadeIn);
                            } else {
                                CRTShader.config.brightness = originalBrightness;
                                resolve();
                            }
                        };
                        
                        requestAnimationFrame(fadeIn);
                    }, 800);
                }
            };
            
            requestAnimationFrame(fadeOut);
        });
    }
    
    /**
     * Play startup sound
     */
    function playStartupSound() {
        if (!window.Audio || typeof window.Audio !== 'function') return;
        
        if (!startupSound) {
            startupSound = new window.Audio(STARTUP_SOUND_URL);
        }
        
        if (!startupSound.paused && !startupSound.ended) {
            return;
        }
        
        startupSound.currentTime = 0;
        startupSound.play().catch(err => {
            console.warn('[StartupManager] Could not play startup sound:', err);
        });
    }
    
    /**
     * Helper sleep function
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // EXPORTS
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        shouldRunBoot,
        runBootSequence,
        resetBoot,
        isBootInProgress: () => bootInProgress,
        isBootComplete: () => bootComplete
    };
    
})();
