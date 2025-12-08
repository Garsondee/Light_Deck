/**
 * InputManager - THE SINGLE SOURCE OF TRUTH FOR ALL KEYBOARD INPUT
 * 
 * Architecture:
 * - ONE global keydown handler routes ALL keys
 * - Managers expose action methods, not event handlers
 * - Clear ownership: InputManager owns keyboard, other managers own their domains
 * - EventBus only for state changes, not every keystroke
 * 
 * Modes:
 * - SCENE_VIEWER: Chat input for dice commands, messages
 * - TERMINAL: Phosphor terminal for CLI interaction
 */

const InputManager = (function() {
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    const Mode = {
        SCENE_VIEWER: 'scene_viewer',
        TERMINAL: 'terminal'
    };
    
    let currentMode = Mode.SCENE_VIEWER;
    let initialized = false;
    
    // DOM references
    let chatInput = null;
    let terminalInput = null;
    let chatMessages = null;
    let terminalContent = null;
    
    // Focus management
    let focusLockInterval = null;

    // Onboarding interaction
    // When true, we are explicitly focusing the chat panel while onboarding
    // visuals are active. In this state, chat input should receive keys and
    // onboarding should NOT.
    let chatOverrideDuringOnboarding = false;
    
    // Action handlers - registered by other managers
    const actionHandlers = {
        onTerminalToggle: null,      // Called when Tab pressed
        onSettingsUIToggle: null,    // Called when F1 pressed
        onCaretReset: null,          // Called on typing to reset caret phase
        onEscape: null               // Called on Escape
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Initialize the input manager
     */
    function init(options = {}) {
        if (initialized) {
            console.warn('[InputManager] Already initialized');
            return;
        }
        
        // Store DOM references
        chatInput = options.chatInput || document.getElementById('chat-input');
        terminalInput = options.terminalInput || document.getElementById('phosphor-input');
        chatMessages = document.getElementById('chat-messages');
        terminalContent = document.getElementById('phosphor-terminal-content');
        
        console.log('[InputManager] DOM refs - chatInput:', !!chatInput, 'terminalInput:', !!terminalInput, 
                    'chatMessages:', !!chatMessages, 'terminalContent:', !!terminalContent);
        
        // SINGLE global keydown handler - this is THE source of truth
        document.addEventListener('keydown', handleKeydown, true);
        
        // Click handler for focus management
        document.addEventListener('click', handleClick);
        
        initialized = true;
        console.log('[InputManager] Initialized - single keydown handler active');
        
        // Initial focus
        focusCurrentInput();
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // THE SINGLE KEYDOWN HANDLER
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * THE master keydown handler - routes ALL keyboard input
     */
    function handleKeydown(e) {
        const key = e.key;

        // Debug: log all key presses
        console.log('[InputManager] keydown:', key, 'mode:', currentMode);

        // Skip if in Tweakpane or other external UI
        if (isInExternalUI()) {
            console.log('[InputManager] Skipping - in external UI');
            return;
        }

        // Detect onboarding visual flow state on each key
        const onboardingActive = isOnboardingActive();

        // Auto-clear chat override if onboarding is no longer active
        if (!onboardingActive && chatOverrideDuringOnboarding) {
            chatOverrideDuringOnboarding = false;
        }
        
        // ─────────────────────────────────────────────────────────────────
        // GLOBAL HOTKEYS (work in any mode)
        // ─────────────────────────────────────────────────────────────────
        
        // Tab - Focus management
        //  - During onboarding: when onboarding owns focus, let Tab fall
        //    through so screens (ASCIIFormRenderer) can handle navigation.
        //    If we have explicitly handed focus to chat, keep existing
        //    toggle behaviour.
        //  - In Scene Viewer (no onboarding): reserved for ChatManager
        //    header/input focus.
        //  - In Terminal mode (no onboarding): move focus from terminal to
        //    chat log input.
        if (key === 'Tab') {
            // When onboarding visuals are active and we have NOT handed focus
            // to chat, do not treat Tab as a global hotkey. Let the
            // OnboardingScreenManager / ASCIIFormRenderer handle it instead.
            if (onboardingActive && !chatOverrideDuringOnboarding) {
                return;
            }

            e.preventDefault();

            if (onboardingActive && chatOverrideDuringOnboarding) {
                // Toggling back from chat override to onboarding: stop
                // forcing chat input active; subsequent Tabs will be handled
                // by onboarding again.
                chatOverrideDuringOnboarding = false;
                if (typeof ChatManager !== 'undefined' && typeof ChatManager.setInputActive === 'function') {
                    ChatManager.setInputActive(false);
                }
                return;
            }

            if (currentMode === Mode.TERMINAL) {
                // Hand keyboard focus to chat input while terminal view is up
                if (typeof ChatManager !== 'undefined' && typeof ChatManager.setInputActive === 'function') {
                    ChatManager.setInputActive(true);
                }
                // Route subsequent keys through Scene Viewer path (ChatManager)
                setMode(Mode.SCENE_VIEWER);
            } else if (currentMode === Mode.SCENE_VIEWER && typeof ChatManager !== 'undefined') {
                const modifiers = { ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey };
                ChatManager.handleKey('Tab', modifiers);
            }
            return;
        }
        
        // F1 - Toggle unified settings panel
        if (key === 'F1') {
            e.preventDefault();
            if (actionHandlers.onSettingsUIToggle) {
                actionHandlers.onSettingsUIToggle();
            }
            return;
        }
        
        // Escape - Close overlays or exit terminal
        if (key === 'Escape') {
            e.preventDefault();
            if (actionHandlers.onEscape) {
                actionHandlers.onEscape();
            }
            return;
        }
        
        // ─────────────────────────────────────────────────────────────────
        // MODE-SPECIFIC INPUT ROUTING
        // ─────────────────────────────────────────────────────────────────
        
        if (currentMode === Mode.TERMINAL) {
            // Route ALL input to TerminalManager (canvas-based)
            if (typeof TerminalManager !== 'undefined' && TerminalManager.isVisible()) {
                const modifiers = { ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey };
                
                // Try special keys first
                if (TerminalManager.handleKey(key, modifiers)) {
                    e.preventDefault();
                    return;
                }
                
                // Handle printable characters
                if (key.length === 1 && !e.ctrlKey && !e.altKey) {
                    e.preventDefault();
                    TerminalManager.handleChar(key);
                    return;
                }
            }
            
            // Fallback to legacy DOM terminal if TerminalManager not active
            if (terminalInput && document.activeElement !== terminalInput) {
                terminalInput.focus();
            }
            
            // Reset caret on typing
            if (isPrintableKey(key) && actionHandlers.onCaretReset) {
                actionHandlers.onCaretReset();
            }
        } else {
            // Scene Viewer mode
            
            // When onboarding visuals are active and we haven't explicitly
            // handed focus to chat, onboarding owns the keyboard. Do not
            // page or route keys into chat.
            if (onboardingActive && !chatOverrideDuringOnboarding) {
                return;
            }

            // Handle paging keys for chat
            if (['PageUp', 'PageDown', 'Home', 'End'].includes(key)) {
                e.preventDefault();
                handleChatPaging(key);
                // If chat has explicit focus during onboarding, prevent the
                // event from reaching onboarding handlers.
                if (chatOverrideDuringOnboarding) {
                    e.stopPropagation();
                }
                return;
            }
            
            // Route to ChatManager (canvas-based) if available
            if (typeof ChatManager !== 'undefined') {
                const modifiers = { ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey };
                const chatActive = ChatManager.isInputActive() || ChatManager.isControlBarFocused();
                
                // Activate chat input on any printable key (only if not in control bar)
                if (isPrintableKey(key) && !e.ctrlKey && !e.altKey && !ChatManager.isControlBarFocused()) {
                    ChatManager.setInputActive(true);
                }
                
                // Try special keys first (works for both input and control bar)
                if (chatActive && ChatManager.handleKey(key, modifiers)) {
                    e.preventDefault();
                    if (chatOverrideDuringOnboarding) {
                        e.stopPropagation();
                    }
                    return;
                }
                
                // Handle printable characters (only for input, not control bar)
                if (ChatManager.isInputActive() && key.length === 1 && !e.ctrlKey && !e.altKey) {
                    e.preventDefault();
                    ChatManager.handleChar(key);
                    if (chatOverrideDuringOnboarding) {
                        e.stopPropagation();
                    }
                    return;
                }
            }
            
            // Legacy fallback: Route to DOM chat input
            if (chatInput && document.activeElement !== chatInput && isPrintableKey(key)) {
                chatInput.focus();
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PAGING (for Scene Viewer mode - chat scrolling)
    // Terminal paging is handled by TerminalManager directly
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Handle paging keys for chat in Scene Viewer mode
     */
    function handleChatPaging(key) {
        // Route to ChatManager (canvas-based) if available
        if (typeof ChatManager !== 'undefined') {
            switch (key) {
                case 'PageUp':
                    ChatManager.scrollUp(10);
                    break;
                case 'PageDown':
                    ChatManager.scrollDown(10);
                    break;
                case 'Home':
                    ChatManager.scrollUp(1000);  // Scroll to top
                    break;
                case 'End':
                    ChatManager.scrollDown(1000);  // Scroll to bottom
                    break;
            }
            return;
        }
        
        // Legacy DOM fallback
        const chatContainer = chatMessages || document.getElementById('chat-messages');
        
        if (!chatContainer) {
            console.warn('[InputManager] No chat container for paging');
            return;
        }
        
        const pageAmount = chatContainer.clientHeight * 0.9;
        
        switch (key) {
            case 'PageUp':
                chatContainer.scrollTop = Math.max(0, chatContainer.scrollTop - pageAmount);
                break;
            case 'PageDown':
                chatContainer.scrollTop = Math.min(chatContainer.scrollHeight, chatContainer.scrollTop + pageAmount);
                break;
            case 'Home':
                chatContainer.scrollTop = 0;
                break;
            case 'End':
                chatContainer.scrollTop = chatContainer.scrollHeight;
                break;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════
    
    function isPrintableKey(key) {
        return key.length === 1 || ['Backspace', 'Delete', 'Enter'].includes(key);
    }
    
    function isInExternalUI() {
        const el = document.activeElement;
        if (!el) return false;
        
        // Tweakpane inputs
        if (el.closest('.tp-dfwv') || (el.tagName === 'INPUT' && el.closest('.tp-rotv'))) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if the visual onboarding flow is currently active
     */
    function isOnboardingActive() {
        // Check OnboardingFlow (new screen-based system)
        if (typeof OnboardingFlow !== 'undefined' && OnboardingFlow.isActive()) {
            return true;
        }
        // Check OnboardingScreenManager visibility
        if (typeof OnboardingScreenManager !== 'undefined' && OnboardingScreenManager.isVisible()) {
            return true;
        }
        return false;
    }
    
    function handleClick(e) {
        // Focus appropriate input when clicking on viewport
        const viewport = document.getElementById('viewport');
        if (viewport && viewport.contains(e.target)) {
            focusCurrentInput();
        }
    }
    
    function focusCurrentInput() {
        setTimeout(() => {
            if (currentMode === Mode.TERMINAL) {
                if (terminalInput) terminalInput.focus();
            } else {
                if (chatInput) chatInput.focus();
            }
        }, 0);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // MODE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    function setMode(mode) {
        if (mode !== Mode.SCENE_VIEWER && mode !== Mode.TERMINAL) {
            console.warn('[InputManager] Invalid mode:', mode);
            return;
        }
        
        const previousMode = currentMode;
        currentMode = mode;
        
        console.log('[InputManager] Mode:', previousMode, '->', currentMode);
        
        // Emit via EventBus
        if (typeof EventBus !== 'undefined') {
            EventBus.emit(EventBus.Events.INPUT_MODE_CHANGED, { mode, previousMode });
        }
        
        focusCurrentInput();
    }
    
    function getMode() { return currentMode; }
    function isTerminalMode() { return currentMode === Mode.TERMINAL; }
    function isSceneViewerMode() { return currentMode === Mode.SCENE_VIEWER; }
    
    // ═══════════════════════════════════════════════════════════════════
    // ACTION HANDLER REGISTRATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Register action handlers from other managers
     * This is how managers hook into keyboard events without adding their own listeners
     */
    function registerHandlers(handlers) {
        Object.assign(actionHandlers, handlers);
        console.log('[InputManager] Registered handlers:', Object.keys(handlers).join(', '));
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        Mode,
        init,
        setMode,
        getMode,
        isTerminalMode,
        isSceneViewerMode,
        focusCurrentInput,
        registerHandlers
    };
})();
