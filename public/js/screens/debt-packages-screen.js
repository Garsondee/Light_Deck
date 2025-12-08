/**
 * DebtPackagesScreen - Optional debt package selection
 * 
 * Features:
 * - Checkbox list of available packages
 * - Running total display
 * - Max 3 packages limit
 * - Terminal command support
 */

const DebtPackagesScreen = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════
    
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
    
    const MAX_PACKAGES = 3;
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    const state = {
        selectedPackages: [],  // Array of package IDs
        baseDebt: 0,
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
        debtColor: '#ff6644',
        backgroundColor: '#0a0a0a'
    };
    
    // Hit boxes
    let hitBoxes = [];
    let acceptHitBox = null;
    
    // ═══════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Create a new debt packages screen instance
     */
    function create(options = {}) {
        state.onComplete = options.onComplete || null;
        state.baseDebt = options.baseDebt || 0;
        state.selectedPackages = options.selectedPackages || [];
        
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
                packages: state.selectedPackages.slice(),
                packageDebt: calculatePackageDebt(),
                totalDebt: state.baseDebt + calculatePackageDebt()
            }),
            
            // Allow setting base debt from background selection
            setBaseDebt: (debt) => { state.baseDebt = debt; }
        };
    }
    
    /**
     * Called when screen becomes active
     */
    function enter() {
        console.log('[DebtPackagesScreen] Entered, base debt:', state.baseDebt);
        hitBoxes = [];
        acceptHitBox = null;
    }
    
    /**
     * Called when leaving screen
     */
    function exit() {
        console.log('[DebtPackagesScreen] Exited');
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
        
        // Render debt summary
        renderDebtSummary(ctx, layout);
        
        // Render package list
        renderPackageList(ctx, layout);
        
        // Render terminal hint
        renderTerminalHint(ctx, layout);
        
        // Render accept button
        renderAcceptButton(ctx, layout);
    }
    
    function renderTitle(ctx, layout) {
        const padding = layout.padding || 40;
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.fillStyle = style.textColor;
        
        ctx.fillText('═══════════════════════════════════════════════════════════', padding, padding + 20);
        ctx.fillText('  OPTIONAL DEBT PACKAGES', padding, padding + 40);
        ctx.fillText('═══════════════════════════════════════════════════════════', padding, padding + 60);
        
        ctx.fillStyle = style.dimColor;
        ctx.fillText('  Take on extra debt for additional starting gear (max 3)', padding, padding + 80);
    }
    
    function renderDebtSummary(ctx, layout) {
        const padding = layout.padding || 40;
        const panelX = layout.width - padding - 250;
        const panelY = padding + 100;
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        
        // Panel border
        ctx.strokeStyle = style.textColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, 230, 140);
        
        // Header
        ctx.fillStyle = style.textColor;
        ctx.fillText('╔══════════════════════════╗', panelX + 10, panelY + 25);
        ctx.fillText('║  DEBT SUMMARY            ║', panelX + 10, panelY + 45);
        ctx.fillText('╠══════════════════════════╣', panelX + 10, panelY + 65);
        
        // Base debt
        ctx.fillStyle = style.dimColor;
        ctx.fillText(`║  Base Debt:`, panelX + 10, panelY + 85);
        ctx.fillStyle = style.debtColor;
        ctx.fillText(`${state.baseDebt.toLocaleString()}¢`, panelX + 150, panelY + 85);
        
        // Package debt
        const packageDebt = calculatePackageDebt();
        ctx.fillStyle = style.dimColor;
        ctx.fillText(`║  Packages:`, panelX + 10, panelY + 105);
        ctx.fillStyle = packageDebt > 0 ? style.debtColor : style.dimColor;
        ctx.fillText(`+${packageDebt.toLocaleString()}¢`, panelX + 150, panelY + 105);
        
        // Total
        ctx.fillStyle = style.textColor;
        ctx.fillText('╠══════════════════════════╣', panelX + 10, panelY + 120);
        ctx.fillText(`║  TOTAL:`, panelX + 10, panelY + 140);
        ctx.fillStyle = style.debtColor;
        ctx.font = `bold ${style.fontSize + 2}px ${style.fontFamily}`;
        ctx.fillText(`${(state.baseDebt + packageDebt).toLocaleString()}¢`, panelX + 140, panelY + 140);
    }
    
    function renderPackageList(ctx, layout) {
        const padding = layout.padding || 40;
        const startY = padding + 110;
        const lineHeight = 65;
        const maxWidth = layout.width - padding - 300;
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        
        DEBT_PACKAGES.forEach((pkg, index) => {
            const y = startY + (index * lineHeight);
            const isSelected = state.selectedPackages.includes(pkg.id);
            const isHovered = state.hoveredIndex === index;
            const canSelect = state.selectedPackages.length < MAX_PACKAGES || isSelected;
            
            // Calculate hit box
            const boxX = padding;
            const boxY = y - 10;
            const boxWidth = maxWidth;
            const boxHeight = lineHeight - 5;
            
            hitBoxes.push({
                x: boxX,
                y: boxY,
                width: boxWidth,
                height: boxHeight,
                id: pkg.id,
                index: index
            });
            
            // Draw selection/hover highlight
            if (isSelected) {
                ctx.fillStyle = 'rgba(0, 255, 136, 0.1)';
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            } else if (isHovered && canSelect) {
                ctx.fillStyle = 'rgba(255, 170, 0, 0.08)';
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            }
            
            // Checkbox
            const checkbox = isSelected ? '[X]' : '[ ]';
            ctx.fillStyle = isSelected ? style.selectedColor : (canSelect ? style.textColor : style.dimColor);
            ctx.fillText(checkbox, padding + 5, y + 5);
            
            // Package name and cost
            ctx.fillStyle = isSelected ? style.selectedColor : (canSelect ? style.textColor : style.dimColor);
            ctx.fillText(`[${index + 1}] ${pkg.name}`, padding + 45, y + 5);
            
            ctx.fillStyle = style.debtColor;
            ctx.fillText(`+${pkg.cost.toLocaleString()}¢`, padding + 280, y + 5);
            
            // Contents
            ctx.fillStyle = style.dimColor;
            const contentsText = pkg.contents.join(', ');
            ctx.fillText(`    ${contentsText}`, padding + 45, y + 25);
            
            // Flavor text
            ctx.font = `italic ${style.fontSize - 2}px ${style.fontFamily}`;
            ctx.fillStyle = isSelected ? style.dimColor : '#554400';
            ctx.fillText(`    "${pkg.flavor}"`, padding + 45, y + 43);
            ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        });
        
        // Show remaining slots
        const remaining = MAX_PACKAGES - state.selectedPackages.length;
        ctx.fillStyle = style.dimColor;
        ctx.fillText(`Packages selected: ${state.selectedPackages.length}/${MAX_PACKAGES}`, padding, startY + (DEBT_PACKAGES.length * lineHeight) + 10);
    }
    
    function renderTerminalHint(ctx, layout) {
        const padding = layout.padding || 40;
        const y = layout.height - padding - 60;
        
        ctx.font = `${style.fontSize - 2}px ${style.fontFamily}`;
        ctx.fillStyle = style.dimColor;
        ctx.fillText('─'.repeat(70), padding, y);
        ctx.fillText('Terminal: add <n> | remove <n> | continue | back', padding, y + 20);
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
    
    function calculatePackageDebt() {
        return state.selectedPackages.reduce((total, id) => {
            const pkg = DEBT_PACKAGES.find(p => p.id === id);
            return total + (pkg ? pkg.cost : 0);
        }, 0);
    }
    
    function togglePackage(id) {
        const index = state.selectedPackages.indexOf(id);
        
        if (index >= 0) {
            // Remove
            state.selectedPackages.splice(index, 1);
            const pkg = DEBT_PACKAGES.find(p => p.id === id);
            if (typeof ChatManager !== 'undefined' && pkg) {
                ChatManager.addMessage('system', `Removed: ${pkg.name} (-${pkg.cost}¢)`);
            }
        } else {
            // Add (if under limit)
            if (state.selectedPackages.length >= MAX_PACKAGES) {
                if (typeof ChatManager !== 'undefined') {
                    ChatManager.addMessage('system', `Maximum ${MAX_PACKAGES} packages allowed.`);
                }
                return;
            }
            
            state.selectedPackages.push(id);
            const pkg = DEBT_PACKAGES.find(p => p.id === id);
            if (typeof ChatManager !== 'undefined' && pkg) {
                ChatManager.addMessage('system', `Added: ${pkg.name} (+${pkg.cost}¢)`);
            }
        }
    }
    
    function addPackageByNumber(num) {
        if (num < 1 || num > DEBT_PACKAGES.length) {
            if (typeof ChatManager !== 'undefined') {
                ChatManager.addMessage('system', `Invalid package number. Choose 1-${DEBT_PACKAGES.length}.`);
            }
            return;
        }
        
        const pkg = DEBT_PACKAGES[num - 1];
        if (state.selectedPackages.includes(pkg.id)) {
            if (typeof ChatManager !== 'undefined') {
                ChatManager.addMessage('system', 'Package already selected.');
            }
            return;
        }
        
        if (state.selectedPackages.length >= MAX_PACKAGES) {
            if (typeof ChatManager !== 'undefined') {
                ChatManager.addMessage('system', `Maximum ${MAX_PACKAGES} packages allowed.`);
            }
            return;
        }
        
        state.selectedPackages.push(pkg.id);
        if (typeof ChatManager !== 'undefined') {
            ChatManager.addMessage('system', `Added: ${pkg.name} (+${pkg.cost}¢)`);
        }
    }
    
    function removePackageByNumber(num) {
        if (num < 1 || num > DEBT_PACKAGES.length) {
            if (typeof ChatManager !== 'undefined') {
                ChatManager.addMessage('system', `Invalid package number. Choose 1-${DEBT_PACKAGES.length}.`);
            }
            return;
        }
        
        const pkg = DEBT_PACKAGES[num - 1];
        const index = state.selectedPackages.indexOf(pkg.id);
        
        if (index < 0) {
            if (typeof ChatManager !== 'undefined') {
                ChatManager.addMessage('system', 'Package not selected.');
            }
            return;
        }
        
        state.selectedPackages.splice(index, 1);
        if (typeof ChatManager !== 'undefined') {
            ChatManager.addMessage('system', `Removed: ${pkg.name} (-${pkg.cost}¢)`);
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
        // Check package options
        for (const box of hitBoxes) {
            if (hitTest(box, x, y)) {
                togglePackage(box.id);
                return true;
            }
        }
        
        // Check accept button
        if (acceptHitBox && hitTest(acceptHitBox, x, y)) {
            complete();
            return true;
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
        // Number keys to toggle packages
        const num = parseInt(event.key);
        if (!isNaN(num) && num >= 1 && num <= DEBT_PACKAGES.length) {
            const pkg = DEBT_PACKAGES[num - 1];
            togglePackage(pkg.id);
            return true;
        }
        
        if (event.key === 'Enter') {
            complete();
            return true;
        }
        
        return false;
    }
    
    function handleCommand(cmd, args) {
        switch (cmd) {
            case 'add':
                if (args.length > 0) {
                    const num = parseInt(args[0]);
                    if (!isNaN(num)) {
                        addPackageByNumber(num);
                        return true;
                    }
                }
                break;
                
            case 'remove':
                if (args.length > 0) {
                    const num = parseInt(args[0]);
                    if (!isNaN(num)) {
                        removePackageByNumber(num);
                        return true;
                    }
                }
                break;
                
            case 'continue':
            case 'next':
                complete();
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
        const packageDebt = calculatePackageDebt();
        const totalDebt = state.baseDebt + packageDebt;
        
        console.log('[DebtPackagesScreen] Complete:', {
            packages: state.selectedPackages,
            packageDebt,
            totalDebt
        });
        
        if (state.onComplete) {
            state.onComplete({
                packages: state.selectedPackages.slice(),
                packageDebt,
                totalDebt
            });
        }
        
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('onboarding:debt_complete', {
                packages: state.selectedPackages.slice(),
                packageDebt,
                totalDebt
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
            packages: state.selectedPackages.slice(),
            packageDebt: calculatePackageDebt(),
            totalDebt: state.baseDebt + calculatePackageDebt()
        }),
        
        // Constants
        DEBT_PACKAGES,
        MAX_PACKAGES
    };
    
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DebtPackagesScreen;
}
