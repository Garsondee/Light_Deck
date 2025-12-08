/**
 * IdentityFormScreen - Character identity input form
 * 
 * Collects:
 * - Legal name
 * - Street handle
 * - Pronouns (radio selection)
 * 
 * Features ASCII-styled form with clickable inputs and keyboard navigation.
 */

const IdentityFormScreen = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let form = null;
    
    const state = {
        name: '',
        handle: '',
        pronouns: 'they/them',
        
        // Callbacks
        onComplete: null
    };
    
    // Pronoun options
    const PRONOUN_OPTIONS = [
        { value: 'he/him', label: 'he/him' },
        { value: 'she/her', label: 'she/her' },
        { value: 'they/them', label: 'they/them' },
        { value: 'custom', label: 'other' }
    ];
    
    // Style
    const style = {
        fontFamily: 'IBM Plex Mono, Courier New, monospace',
        fontSize: 16,
        lineHeight: 1.4,
        textColor: '#ffaa00',
        dimColor: '#885500',
        highlightColor: '#ffcc44',
        backgroundColor: '#0a0a0a'
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Create a new identity form screen instance
     */
    function create(options = {}) {
        state.onComplete = options.onComplete || null;
        state.name = options.name || '';
        state.handle = options.handle || '';
        state.pronouns = options.pronouns || 'they/them';
        
        return {
            enter,
            exit,
            update,
            render,
            needsRender,
            handleClick,
            handleMouseMove,
            handleKeyDown,
            handleCommand,
            
            // State access
            getData: () => ({
                name: state.name,
                handle: state.handle,
                pronouns: state.pronouns
            })
        };
    }
    
    /**
     * Called when screen becomes active
     */
    function enter() {
        console.log('[IdentityFormScreen] Entered');
        createForm();
    }
    
    /**
     * Called when leaving screen
     */
    function exit() {
        console.log('[IdentityFormScreen] Exited');
    }
    
    /**
     * Create the form elements
     */
    function createForm() {
        form = ASCIIFormRenderer.createForm({
            style: {
                ...style
            }
        });
        
        // Header box
        ASCIIFormRenderer.addLabel(form, {
            id: 'box_top',
            text: '╔═══════════════════════════════════════════════════════════╗',
            x: 2,
            y: 2
        });
        
        ASCIIFormRenderer.addLabel(form, {
            id: 'box_title',
            text: '║  IDENTITY REGISTRATION                                    ║',
            x: 2,
            y: 3
        });
        
        ASCIIFormRenderer.addLabel(form, {
            id: 'box_subtitle',
            text: '║  Meridian Systems Corp. - Form ID-7734                    ║',
            x: 2,
            y: 4,
            dim: true
        });
        
        ASCIIFormRenderer.addLabel(form, {
            id: 'box_mid',
            text: '╠═══════════════════════════════════════════════════════════╣',
            x: 2,
            y: 5
        });
        
        // Form content area
        ASCIIFormRenderer.addLabel(form, {
            id: 'box_content1',
            text: '║                                                           ║',
            x: 2,
            y: 6
        });
        
        // Legal Name input
        ASCIIFormRenderer.addLabel(form, {
            id: 'name_label',
            text: '║  Legal Name:',
            x: 2,
            y: 7
        });
        
        ASCIIFormRenderer.addTextInput(form, {
            id: 'name',
            x: 17,
            y: 7,
            width: 30,
            value: state.name,
            placeholder: 'Enter your legal name',
            maxLength: 30
        });
        
        ASCIIFormRenderer.addLabel(form, {
            id: 'name_end',
            text: '║',
            x: 62,
            y: 7
        });
        
        // Spacer
        ASCIIFormRenderer.addLabel(form, {
            id: 'box_content2',
            text: '║                                                           ║',
            x: 2,
            y: 8
        });
        
        // Street Handle input
        ASCIIFormRenderer.addLabel(form, {
            id: 'handle_label',
            text: '║  Street Handle:',
            x: 2,
            y: 9
        });
        
        ASCIIFormRenderer.addTextInput(form, {
            id: 'handle',
            x: 20,
            y: 9,
            width: 27,
            value: state.handle,
            placeholder: 'Your street name',
            maxLength: 27
        });
        
        ASCIIFormRenderer.addLabel(form, {
            id: 'handle_end',
            text: '║',
            x: 62,
            y: 9
        });
        
        // Spacer
        ASCIIFormRenderer.addLabel(form, {
            id: 'box_content3',
            text: '║                                                           ║',
            x: 2,
            y: 10
        });
        
        // Pronouns
        ASCIIFormRenderer.addLabel(form, {
            id: 'pronouns_label',
            text: '║  Pronouns:',
            x: 2,
            y: 11
        });
        
        ASCIIFormRenderer.addRadioGroup(form, {
            id: 'pronouns',
            x: 15,
            y: 11,
            options: PRONOUN_OPTIONS,
            value: state.pronouns,
            horizontal: true,
            onChange: (value) => {
                state.pronouns = value;
            }
        });
        
        // More spacers for box
        for (let i = 12; i <= 14; i++) {
            ASCIIFormRenderer.addLabel(form, {
                id: `box_content${i}`,
                text: '║                                                           ║',
                x: 2,
                y: i
            });
        }
        
        // Box bottom
        ASCIIFormRenderer.addLabel(form, {
            id: 'box_bottom',
            text: '╚═══════════════════════════════════════════════════════════╝',
            x: 2,
            y: 15
        });
        
        // Flavor text
        ASCIIFormRenderer.addLabel(form, {
            id: 'flavor1',
            text: '"In the sprawl, your name is your brand."',
            x: 4,
            y: 17,
            dim: true
        });
        
        ASCIIFormRenderer.addLabel(form, {
            id: 'flavor2',
            text: '"Choose wisely. The streets remember."',
            x: 4,
            y: 18,
            dim: true
        });
        
        // Terminal hint
        ASCIIFormRenderer.addDivider(form, {
            id: 'divider',
            x: 2,
            y: 21,
            width: 60
        });
        
        ASCIIFormRenderer.addLabel(form, {
            id: 'terminal_hint',
            text: 'Terminal: name <name> | handle <handle> | pronouns <pronouns>',
            x: 2,
            y: 22,
            dim: true
        });
        
        // Continue button
        ASCIIFormRenderer.addButton(form, {
            id: 'continue',
            text: 'CONTINUE',
            x: 50,
            y: 25,
            onClick: () => {
                if (validateForm()) {
                    complete();
                }
            }
        });
        
        // Back button
        ASCIIFormRenderer.addButton(form, {
            id: 'back',
            text: 'BACK',
            x: 2,
            y: 25,
            onClick: () => {
                goBack();
            }
        });
        
        // Focus first input
        ASCIIFormRenderer.focusNext(form);
    }
    
    /**
     * Validate form before continuing
     */
    function validateForm() {
        // Sync state from form
        syncState();
        
        if (!state.name.trim()) {
            if (typeof OnboardingScreenManager !== 'undefined') {
                OnboardingScreenManager.addLogLine('Please enter your legal name.', 'error');
            }
            return false;
        }
        
        if (!state.handle.trim()) {
            if (typeof OnboardingScreenManager !== 'undefined') {
                OnboardingScreenManager.addLogLine('Please enter a street handle.', 'error');
            }
            return false;
        }
        
        return true;
    }
    
    /**
     * Sync form values to state
     */
    function syncState() {
        if (!form) return;
        
        const nameEl = ASCIIFormRenderer.getElementById(form, 'name');
        const handleEl = ASCIIFormRenderer.getElementById(form, 'handle');
        const pronounsEl = ASCIIFormRenderer.getElementById(form, 'pronouns');
        
        if (nameEl) state.name = nameEl.value;
        if (handleEl) state.handle = handleEl.value;
        if (pronounsEl) state.pronouns = pronounsEl.value;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UPDATE & RENDER
    // ═══════════════════════════════════════════════════════════════════
    
    function update(dt) {
        // Sync state periodically
        syncState();
    }
    
    function needsRender() {
        return true;  // Cursor blinks
    }
    
    function render(ctx, layout) {
        // Clear background
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(0, 0, layout.width, layout.height);
        
        // Render form
        if (form) {
            ASCIIFormRenderer.render(ctx, form, layout.padding || 40, layout.padding || 40);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // INPUT HANDLING
    // ═══════════════════════════════════════════════════════════════════
    
    function handleClick(x, y) {
        if (!form) return false;
        return ASCIIFormRenderer.handleClick(form, x, y);
    }
    
    function handleMouseMove(x, y) {
        if (!form) return 'default';
        return ASCIIFormRenderer.handleMouseMove(form, x, y);
    }
    
    function handleKeyDown(event) {
        if (!form) return false;
        
        // Enter on focused input advances to next field or submits
        if (event.key === 'Enter') {
            const focused = form.focusedIndex >= 0 ? form.elements[form.focusedIndex] : null;
            if (focused && focused.type === 'text_input') {
                ASCIIFormRenderer.focusNext(form);
                return true;
            }
        }
        
        return ASCIIFormRenderer.handleKeyDown(form, event);
    }
    
    function handleCommand(cmd, args) {
        switch (cmd) {
            case 'name':
                if (args.length > 0) {
                    state.name = args.join(' ');
                    ASCIIFormRenderer.setValue(form, 'name', state.name);
                    
                    if (typeof OnboardingScreenManager !== 'undefined') {
                        OnboardingScreenManager.addLogLine(`Name set: ${state.name}`, 'system');
                    }
                    return true;
                }
                break;
                
            case 'handle':
                if (args.length > 0) {
                    state.handle = args.join(' ');
                    ASCIIFormRenderer.setValue(form, 'handle', state.handle);
                    
                    if (typeof OnboardingScreenManager !== 'undefined') {
                        OnboardingScreenManager.addLogLine(`Handle set: ${state.handle}`, 'system');
                    }
                    return true;
                }
                break;
                
            case 'pronouns':
                if (args.length > 0) {
                    const value = args.join(' ').toLowerCase();
                    // Check if valid option
                    const option = PRONOUN_OPTIONS.find(o => 
                        o.value.toLowerCase() === value || 
                        o.label.toLowerCase() === value
                    );
                    
                    if (option) {
                        state.pronouns = option.value;
                        ASCIIFormRenderer.setValue(form, 'pronouns', state.pronouns);
                        
                        if (typeof OnboardingScreenManager !== 'undefined') {
                            OnboardingScreenManager.addLogLine(`Pronouns set: ${state.pronouns}`, 'system');
                        }
                    } else {
                        // Custom pronouns
                        state.pronouns = args.join(' ');
                        if (typeof OnboardingScreenManager !== 'undefined') {
                            OnboardingScreenManager.addLogLine(`Custom pronouns set: ${state.pronouns}`, 'system');
                        }
                    }
                    return true;
                }
                break;
                
            case 'continue':
            case 'next':
                if (validateForm()) {
                    complete();
                }
                return true;
                
            case 'back':
                goBack();
                return true;
        }
        
        return false;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════════
    
    function complete() {
        syncState();
        
        console.log('[IdentityFormScreen] Complete:', state);
        
        if (state.onComplete) {
            state.onComplete({
                name: state.name,
                handle: state.handle,
                pronouns: state.pronouns
            });
        }
        
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('onboarding:identity_complete', {
                name: state.name,
                handle: state.handle,
                pronouns: state.pronouns
            });
        }
    }
    
    function goBack() {
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('onboarding:back');
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        create,
        
        // Direct use
        enter,
        exit,
        update,
        render,
        needsRender,
        handleClick,
        handleMouseMove,
        handleKeyDown,
        handleCommand,
        
        // State
        getData: () => ({
            name: state.name,
            handle: state.handle,
            pronouns: state.pronouns
        })
    };
    
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IdentityFormScreen;
}
