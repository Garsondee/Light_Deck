/**
 * BackgroundSelectionScreen - Character background selection
 * 
 * Displays available backgrounds with:
 * - Clickable list items
 * - Details panel showing skills, gear, debt
 * - Terminal command support
 */

const BackgroundSelectionScreen = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════
    
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
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let form = null;
    
    const state = {
        selectedKey: null,
        hoveredIndex: -1,
        
        // Callbacks
        onComplete: null
    };
    
    // Style
    const style = {
        fontFamily: 'IBM Plex Mono, Courier New, monospace',
        fontSize: 14,
        lineHeight: 1.3,
        textColor: '#ffaa00',
        dimColor: '#885500',
        highlightColor: '#ffcc44',
        selectedColor: '#00ff88',
        backgroundColor: '#0a0a0a'
    };
    
    // Hit boxes for background options
    let hitBoxes = [];
    let acceptHitBox = null;
    
    // ═══════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Create a new background selection screen instance
     */
    function create(options = {}) {
        state.onComplete = options.onComplete || null;
        state.selectedKey = options.selectedKey || null;
        
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
            getSelectedBackground: () => state.selectedKey ? {
                key: state.selectedKey,
                ...BACKGROUNDS[state.selectedKey]
            } : null
        };
    }
    
    /**
     * Called when screen becomes active
     */
    function enter() {
        console.log('[BackgroundSelectionScreen] Entered');
        hitBoxes = [];
        acceptHitBox = null;
    }
    
    /**
     * Called when leaving screen
     */
    function exit() {
        console.log('[BackgroundSelectionScreen] Exited');
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UPDATE & RENDER
    // ═══════════════════════════════════════════════════════════════════
    
    function update(dt) {
        // Nothing to update
    }
    
    function needsRender() {
        return true;
    }
    
    function render(ctx, layout) {
        const padding = layout.padding || 40;
        
        // Clear background
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(0, 0, layout.width, layout.height);
        
        // Reset hit boxes
        hitBoxes = [];
        
        // Render title
        renderTitle(ctx, layout);
        
        // Render background list
        renderBackgroundList(ctx, layout);
        
        // Render details panel if something is selected
        if (state.selectedKey) {
            renderDetailsPanel(ctx, layout);
        }
        
        // Render terminal hint
        renderTerminalHint(ctx, layout);
        
        // Render accept button if selected
        if (state.selectedKey) {
            renderAcceptButton(ctx, layout);
        }
    }
    
    function renderTitle(ctx, layout) {
        const padding = layout.padding || 40;
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.fillStyle = style.textColor;
        
        ctx.fillText('═══════════════════════════════════════════════════════════', padding, padding + 20);
        ctx.fillText('  SELECT YOUR BACKGROUND', padding, padding + 40);
        ctx.fillText('═══════════════════════════════════════════════════════════', padding, padding + 60);
    }
    
    function renderBackgroundList(ctx, layout) {
        const padding = layout.padding || 40;
        const startY = padding + 100;
        const lineHeight = 50;
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        
        const keys = Object.keys(BACKGROUNDS);
        keys.forEach((key, index) => {
            const bg = BACKGROUNDS[key];
            const y = startY + (index * lineHeight);
            const isSelected = state.selectedKey === key;
            const isHovered = state.hoveredIndex === index;
            
            // Calculate hit box
            const boxX = padding;
            const boxY = y - 15;
            const boxWidth = 350;
            const boxHeight = lineHeight - 5;
            
            hitBoxes.push({
                x: boxX,
                y: boxY,
                width: boxWidth,
                height: boxHeight,
                key: key,
                index: index
            });
            
            // Draw selection/hover highlight
            if (isSelected) {
                ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
                ctx.strokeStyle = style.selectedColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
            } else if (isHovered) {
                ctx.fillStyle = 'rgba(255, 170, 0, 0.1)';
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            }
            
            // Draw number and name
            const prefix = isSelected ? '▶' : ' ';
            ctx.fillStyle = isSelected ? style.selectedColor : (isHovered ? style.highlightColor : style.textColor);
            ctx.fillText(`${prefix} [${index + 1}] ${bg.name}`, padding + 10, y);
            
            // Draw skills summary
            const skillText = Object.keys(bg.skills).map(s => `${s} +1`).join(', ');
            ctx.fillStyle = style.dimColor;
            ctx.fillText(`    ${skillText}`, padding + 10, y + 18);
        });
    }
    
    function renderDetailsPanel(ctx, layout) {
        const padding = layout.padding || 40;
        const panelX = padding + 400;
        const panelY = padding + 90;
        const panelWidth = 380;
        
        const bg = BACKGROUNDS[state.selectedKey];
        if (!bg) return;
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        
        // Panel border - intentionally larger than content area so nothing clips
        ctx.strokeStyle = style.textColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelWidth, 360);
        
        // Panel header - widened to match the larger border
        ctx.fillStyle = style.highlightColor;
        ctx.fillText(`╔${'═'.repeat(44)}╗`, panelX + 10, panelY + 25);
        ctx.fillText(`║  ${bg.name.toUpperCase().padEnd(42)}║`, panelX + 10, panelY + 45);
        ctx.fillText(`╠${'═'.repeat(44)}╝`, panelX + 10, panelY + 65);
        
        // Flavor text
        ctx.fillStyle = style.dimColor;
        ctx.font = `italic ${style.fontSize - 2}px ${style.fontFamily}`;
        const flavorLines = wrapText(ctx, `"${bg.flavor}"`, panelWidth - 40);
        flavorLines.forEach((line, i) => {
            ctx.fillText(line, panelX + 20, panelY + 90 + (i * 18));
        });
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        let detailY = panelY + 90 + (flavorLines.length * 18) + 20;
        
        // Skills
        ctx.fillStyle = style.textColor;
        ctx.fillText('SKILLS:', panelX + 20, detailY);
        detailY += 20;
        ctx.fillStyle = style.highlightColor;
        Object.entries(bg.skills).forEach(([skill, bonus]) => {
            ctx.fillText(`  • ${skill} +${bonus}`, panelX + 20, detailY);
            detailY += 18;
        });
        
        // Gear
        detailY += 10;
        ctx.fillStyle = style.textColor;
        ctx.fillText('STARTING GEAR:', panelX + 20, detailY);
        detailY += 20;
        ctx.fillStyle = style.dimColor;
        bg.gear.forEach(item => {
            ctx.fillText(`  • ${item}`, panelX + 20, detailY);
            detailY += 18;
        });
        
        // Debt
        detailY += 10;
        ctx.fillStyle = style.textColor;
        ctx.fillText('STARTING DEBT:', panelX + 20, detailY);
        detailY += 20;
        ctx.fillStyle = '#ff6644';
        ctx.fillText(`  ${bg.debt.toLocaleString()}¢`, panelX + 20, detailY);
        detailY += 18;
        ctx.fillStyle = style.dimColor;
        ctx.fillText(`  Creditor: ${bg.creditor.name}`, panelX + 20, detailY);
    }
    
    function renderTerminalHint(ctx, layout) {
        const padding = layout.padding || 40;
        const y = layout.height - padding - 60;
        
        ctx.font = `${style.fontSize - 2}px ${style.fontFamily}`;
        ctx.fillStyle = style.dimColor;
        ctx.fillText('─'.repeat(70), padding, y);
        ctx.fillText('Terminal: background <name> | <number> | continue | back', padding, y + 20);
    }
    
    function renderAcceptButton(ctx, layout) {
        const padding = layout.padding || 40;
        const buttonX = layout.width / 2 - 60;
        const buttonY = layout.height - padding - 30;
        const buttonWidth = 120;
        const buttonHeight = 30;
        
        acceptHitBox = {
            x: buttonX,
            y: buttonY - 20,
            width: buttonWidth,
            height: buttonHeight
        };
        
        ctx.font = `16px ${style.fontFamily}`;
        ctx.fillStyle = style.highlightColor;
        ctx.fillText('[ CONTINUE ]', buttonX, buttonY);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════
    
    function wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }
    
    function selectBackground(key) {
        if (!BACKGROUNDS[key]) {
            // Send error to chat panel instead of terminal log
            if (typeof ChatManager !== 'undefined') {
                ChatManager.addMessage('system', 'Invalid background selection.');
            }
            return;
        }
        
        state.selectedKey = key;
        const bg = BACKGROUNDS[key];
        
        // Send selection feedback to chat panel instead of terminal log
        if (typeof ChatManager !== 'undefined') {
            ChatManager.addMessage('system', `Selected: ${bg.name}`);
        }
    }
    
    function selectByNumber(num) {
        const keys = Object.keys(BACKGROUNDS);
        if (num >= 1 && num <= keys.length) {
            selectBackground(keys[num - 1]);
        } else {
            if (typeof ChatManager !== 'undefined') {
                ChatManager.addMessage('system', `Invalid number. Choose 1-${keys.length}.`);
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // INPUT HANDLING
    // ═══════════════════════════════════════════════════════════════════
    
    function hitTest(box, x, y) {
        if (!box) return false;
        return x >= box.x && x <= box.x + box.width &&
               y >= box.y && y <= box.y + box.height;
    }
    
    function handleClick(x, y) {
        // Check background options
        for (const box of hitBoxes) {
            if (hitTest(box, x, y)) {
                selectBackground(box.key);
                return true;
            }
        }
        
        // Check accept button
        if (acceptHitBox && hitTest(acceptHitBox, x, y)) {
            if (state.selectedKey) {
                complete();
                return true;
            }
        }
        
        return false;
    }
    
    function handleMouseMove(x, y) {
        let newHovered = -1;
        
        for (const box of hitBoxes) {
            if (hitTest(box, x, y)) {
                newHovered = box.index;
                break;
            }
        }
        
        state.hoveredIndex = newHovered;
        
        // Check if over accept button
        if (acceptHitBox && hitTest(acceptHitBox, x, y)) {
            return 'pointer';
        }
        
        return newHovered >= 0 ? 'pointer' : 'default';
    }
    
    function handleKeyDown(event) {
        const keys = Object.keys(BACKGROUNDS);
        
        switch (event.key) {
            case 'ArrowUp':
                if (state.selectedKey) {
                    const currentIndex = keys.indexOf(state.selectedKey);
                    const newIndex = Math.max(0, currentIndex - 1);
                    selectBackground(keys[newIndex]);
                } else {
                    selectBackground(keys[0]);
                }
                return true;
                
            case 'ArrowDown':
                if (state.selectedKey) {
                    const currentIndex = keys.indexOf(state.selectedKey);
                    const newIndex = Math.min(keys.length - 1, currentIndex + 1);
                    selectBackground(keys[newIndex]);
                } else {
                    selectBackground(keys[0]);
                }
                return true;
                
            case 'Enter':
                if (state.selectedKey) {
                    complete();
                    return true;
                }
                break;
                
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
                selectByNumber(parseInt(event.key));
                return true;
        }
        
        return false;
    }
    
    function handleCommand(cmd, args) {
        switch (cmd) {
            case 'background':
            case 'bg':
                if (args.length > 0) {
                    const input = args.join(' ');
                    const num = parseInt(input);
                    if (!isNaN(num)) {
                        selectByNumber(num);
                    } else {
                        // Try to match by name
                        const key = Object.keys(BACKGROUNDS).find(k => 
                            k === input.toLowerCase() || 
                            BACKGROUNDS[k].name.toLowerCase() === input.toLowerCase()
                        );
                        if (key) {
                            selectBackground(key);
                        } else {
                            if (typeof ChatManager !== 'undefined') {
                                ChatManager.addMessage('system', 'Unknown background.');
                            }
                        }
                    }
                    return true;
                }
                break;
                
            case 'continue':
            case 'next':
                if (state.selectedKey) {
                    complete();
                } else {
                    if (typeof ChatManager !== 'undefined') {
                        ChatManager.addMessage('system', 'Please select a background first.');
                    }
                }
                return true;
                
            case 'back':
                goBack();
                return true;
        }
        
        // Check for raw number input
        const num = parseInt(cmd);
        if (!isNaN(num) && num >= 1 && num <= Object.keys(BACKGROUNDS).length) {
            selectByNumber(num);
            return true;
        }
        
        return false;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════════
    
    function complete() {
        if (!state.selectedKey) return;
        
        const bg = BACKGROUNDS[state.selectedKey];
        console.log('[BackgroundSelectionScreen] Complete:', state.selectedKey);
        
        if (state.onComplete) {
            state.onComplete({
                key: state.selectedKey,
                name: bg.name,
                skills: bg.skills,
                gear: bg.gear,
                debt: bg.debt,
                creditor: bg.creditor
            });
        }
        
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('onboarding:background_complete', {
                key: state.selectedKey,
                ...bg
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
        getSelectedBackground: () => state.selectedKey ? {
            key: state.selectedKey,
            ...BACKGROUNDS[state.selectedKey]
        } : null,
        
        // Constants
        BACKGROUNDS
    };
    
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackgroundSelectionScreen;
}
