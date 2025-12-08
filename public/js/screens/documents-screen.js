/**
 * DocumentsScreen - Display generated identity documents
 * 
 * Shows animated document generation:
 * - Corporate ID
 * - SIN Card
 * - Debt Statement
 * - Equipment Manifest
 */

const DocumentsScreen = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    const state = {
        // Character data passed in
        characterData: null,
        
        // Animation state
        phase: 'generating',  // 'generating', 'corporate_id', 'sin', 'debt', 'equipment', 'complete'
        animationProgress: 0,
        currentDocIndex: 0,
        
        // Generated documents
        documents: {
            corporateId: null,
            sin: null,
            debtStatement: null,
            equipmentManifest: null
        },
        
        // Callbacks
        onComplete: null
    };
    
    // Animation timing
    const timing = {
        generatingDuration: 2000,
        documentDelay: 1500,
        typewriterSpeed: 30
    };
    
    // Style
    const style = {
        fontFamily: 'IBM Plex Mono, Courier New, monospace',
        fontSize: 13,
        lineHeight: 1.3,
        textColor: '#ffaa00',
        dimColor: '#885500',
        highlightColor: '#ffcc44',
        debtColor: '#ff6644',
        successColor: '#00ff88',
        backgroundColor: '#0a0a0a'
    };
    
    // Animation state
    let animationStart = 0;
    let typewriterLines = [];
    let displayedLines = 0;
    let acceptHitBox = null;
    
    // ═══════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Create a new documents screen instance
     */
    function create(options = {}) {
        state.onComplete = options.onComplete || null;
        state.characterData = options.characterData || null;
        
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
            
            // Allow setting character data
            setCharacterData: (data) => { 
                state.characterData = data;
                generateDocuments();
            }
        };
    }
    
    /**
     * Called when screen becomes active
     */
    function enter() {
        console.log('[DocumentsScreen] Entered with data:', state.characterData);
        
        state.phase = 'generating';
        state.animationProgress = 0;
        state.currentDocIndex = 0;
        displayedLines = 0;
        typewriterLines = [];
        animationStart = Date.now();
        acceptHitBox = null;
        
        // Generate documents from character data
        generateDocuments();
        
        // Start the animation sequence
        setTimeout(() => {
            state.phase = 'corporate_id';
            buildDocumentLines();
        }, timing.generatingDuration);
    }
    
    /**
     * Called when leaving screen
     */
    function exit() {
        console.log('[DocumentsScreen] Exited');
    }
    
    /**
     * Generate documents from character data
     */
    function generateDocuments() {
        if (!state.characterData) {
            console.warn('[DocumentsScreen] No character data provided');
            return;
        }
        
        const data = state.characterData;
        const now = new Date();
        const oneYearLater = new Date(now);
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        
        // Generate SIN number
        const sinNumber = generateSIN();
        
        // Corporate ID
        state.documents.corporateId = {
            name: data.identity?.name || 'UNKNOWN',
            handle: data.identity?.handle || 'N/A',
            sin: sinNumber,
            clearance: 'LEVEL 1 (CONTRACTOR)',
            issued: formatDate(now),
            expires: formatDate(oneYearLater)
        };
        
        // SIN Card
        const hasCleanSin = data.debt?.packages?.includes('clean_sin');
        state.documents.sin = {
            number: sinNumber,
            type: hasCleanSin ? 'VERIFIED' : 'UNVERIFIED',
            flags: hasCleanSin ? [] : ['FLAGGED: VERIFY IN PERSON']
        };
        
        // Debt Statement
        const baseDebt = data.background?.debt || 0;
        const packageDebt = data.debt?.packageDebt || 0;
        const totalDebt = baseDebt + packageDebt;
        const interest = Math.round(totalDebt * 0.01);
        
        state.documents.debtStatement = {
            accountHolder: data.identity?.name || 'UNKNOWN',
            accountNumber: generateAccountNumber(),
            creditor: data.background?.creditor?.name || 'Unknown Creditor',
            baseDebt: baseDebt,
            packageDebt: packageDebt,
            interest: interest,
            totalDebt: totalDebt + interest,
            minimumPayment: Math.round((totalDebt + interest) * 0.1),
            dueDate: formatDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
        };
        
        // Equipment Manifest
        const gear = [...(data.background?.gear || [])];
        
        // Add gear from debt packages
        if (data.debt?.packages) {
            const DEBT_PACKAGES = DebtPackagesScreen?.DEBT_PACKAGES || [];
            data.debt.packages.forEach(pkgId => {
                const pkg = DEBT_PACKAGES.find(p => p.id === pkgId);
                if (pkg) {
                    gear.push(...pkg.contents);
                }
            });
        }
        
        state.documents.equipmentManifest = {
            items: gear
        };
        
        console.log('[DocumentsScreen] Generated documents:', state.documents);
    }
    
    function generateSIN() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let sin = '';
        for (let i = 0; i < 12; i++) {
            if (i === 4 || i === 8) sin += '-';
            sin += chars[Math.floor(Math.random() * chars.length)];
        }
        return sin;
    }
    
    function generateAccountNumber() {
        let num = '';
        for (let i = 0; i < 16; i++) {
            if (i > 0 && i % 4 === 0) num += '-';
            num += Math.floor(Math.random() * 10);
        }
        return num;
    }
    
    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    /**
     * Build all document lines for typewriter effect
     */
    function buildDocumentLines() {
        typewriterLines = [];
        
        // Corporate ID
        const corpId = state.documents.corporateId;
        typewriterLines.push({ text: '', type: 'spacer' });
        typewriterLines.push({ text: '╔══════════════════════════════════════════════════════╗', type: 'border' });
        typewriterLines.push({ text: '║  MERIDIAN SYSTEMS CORP.                              ║', type: 'header' });
        typewriterLines.push({ text: '║  EMPLOYEE IDENTIFICATION                             ║', type: 'header' });
        typewriterLines.push({ text: '╠══════════════════════════════════════════════════════╣', type: 'border' });
        typewriterLines.push({ text: `║  NAME: ${(corpId.name || '').substring(0, 44).padEnd(44)}║`, type: 'content' });
        typewriterLines.push({ text: `║  HANDLE: ${(corpId.handle || '').substring(0, 42).padEnd(42)}║`, type: 'content' });
        typewriterLines.push({ text: `║  SIN: ${(corpId.sin || '').padEnd(46)}║`, type: 'content' });
        typewriterLines.push({ text: `║  CLEARANCE: ${(corpId.clearance || '').padEnd(40)}║`, type: 'content' });
        typewriterLines.push({ text: `║  ISSUED: ${(corpId.issued || '').padEnd(42)}║`, type: 'content' });
        typewriterLines.push({ text: `║  EXPIRES: ${(corpId.expires || '').padEnd(41)}║`, type: 'content' });
        typewriterLines.push({ text: '╚══════════════════════════════════════════════════════╝', type: 'border' });
        
        // SIN Card
        const sin = state.documents.sin;
        typewriterLines.push({ text: '', type: 'spacer' });
        typewriterLines.push({ text: '╔══════════════════════════════════════════════════════╗', type: 'border' });
        typewriterLines.push({ text: '║  SYSTEM IDENTIFICATION NUMBER                        ║', type: 'header' });
        typewriterLines.push({ text: '╠══════════════════════════════════════════════════════╣', type: 'border' });
        typewriterLines.push({ text: `║  SIN: ${(sin.number || '').padEnd(46)}║`, type: 'content' });
        typewriterLines.push({ text: `║  STATUS: ${(sin.type || '').padEnd(42)}║`, type: sin.type === 'VERIFIED' ? 'success' : 'content' });
        if (sin.flags && sin.flags.length > 0) {
            sin.flags.forEach(flag => {
                typewriterLines.push({ text: `║  ⚠ ${flag.substring(0, 48).padEnd(48)}║`, type: 'warning' });
            });
        }
        typewriterLines.push({ text: '╚══════════════════════════════════════════════════════╝', type: 'border' });
        
        // Debt Statement
        const debt = state.documents.debtStatement;
        typewriterLines.push({ text: '', type: 'spacer' });
        typewriterLines.push({ text: '╔══════════════════════════════════════════════════════╗', type: 'border' });
        typewriterLines.push({ text: '║  NIGHTCITY CREDIT UNION                              ║', type: 'header' });
        typewriterLines.push({ text: '║  ACCOUNT STATEMENT                                   ║', type: 'header' });
        typewriterLines.push({ text: '╠══════════════════════════════════════════════════════╣', type: 'border' });
        typewriterLines.push({ text: `║  ACCOUNT: ${(debt.accountNumber || '').padEnd(41)}║`, type: 'content' });
        typewriterLines.push({ text: `║  CREDITOR: ${(debt.creditor || '').substring(0, 40).padEnd(40)}║`, type: 'content' });
        typewriterLines.push({ text: '║                                                      ║', type: 'content' });
        typewriterLines.push({ text: `║  Base obligation:      ${String(debt.baseDebt || 0).padStart(10)}¢               ║`, type: 'content' });
        typewriterLines.push({ text: `║  Equipment financing:  ${String(debt.packageDebt || 0).padStart(10)}¢               ║`, type: 'content' });
        typewriterLines.push({ text: `║  Interest (12% APR):   ${String(debt.interest || 0).padStart(10)}¢               ║`, type: 'content' });
        typewriterLines.push({ text: '║  ──────────────────────────────────────────────────  ║', type: 'content' });
        typewriterLines.push({ text: `║  TOTAL DUE:            ${String(debt.totalDebt || 0).padStart(10)}¢               ║`, type: 'debt' });
        typewriterLines.push({ text: '║                                                      ║', type: 'content' });
        typewriterLines.push({ text: `║  MINIMUM PAYMENT:      ${String(debt.minimumPayment || 0).padStart(10)}¢               ║`, type: 'content' });
        typewriterLines.push({ text: `║  DUE DATE: ${(debt.dueDate || '').padEnd(41)}║`, type: 'content' });
        typewriterLines.push({ text: '║                                                      ║', type: 'content' });
        typewriterLines.push({ text: '║  ⚠ FAILURE TO PAY MAY RESULT IN ASSET SEIZURE       ║', type: 'warning' });
        typewriterLines.push({ text: '╚══════════════════════════════════════════════════════╝', type: 'border' });
        
        // Equipment Manifest
        const equip = state.documents.equipmentManifest;
        typewriterLines.push({ text: '', type: 'spacer' });
        typewriterLines.push({ text: '╔══════════════════════════════════════════════════════╗', type: 'border' });
        typewriterLines.push({ text: '║  EQUIPMENT MANIFEST                                  ║', type: 'header' });
        typewriterLines.push({ text: '╠══════════════════════════════════════════════════════╣', type: 'border' });
        if (equip.items && equip.items.length > 0) {
            equip.items.forEach(item => {
                typewriterLines.push({ text: `║  • ${item.substring(0, 48).padEnd(48)}║`, type: 'content' });
            });
        }
        typewriterLines.push({ text: '╚══════════════════════════════════════════════════════╝', type: 'border' });
        
        // Final message
        typewriterLines.push({ text: '', type: 'spacer' });
        typewriterLines.push({ text: '═══════════════════════════════════════════════════════════', type: 'border' });
        typewriterLines.push({ text: '  IDENTITY ESTABLISHED', type: 'success' });
        typewriterLines.push({ text: '═══════════════════════════════════════════════════════════', type: 'border' });
        typewriterLines.push({ text: '', type: 'spacer' });
        typewriterLines.push({ text: 'Your documents have been generated.', type: 'content' });
        typewriterLines.push({ text: 'Welcome to the sprawl.', type: 'success' });
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UPDATE & RENDER
    // ═══════════════════════════════════════════════════════════════════
    
    function update(dt) {
        // Update typewriter effect
        if (state.phase !== 'generating' && displayedLines < typewriterLines.length) {
            const elapsed = Date.now() - animationStart - timing.generatingDuration;
            const linesPerSecond = 1000 / timing.typewriterSpeed;
            displayedLines = Math.min(
                Math.floor(elapsed / timing.typewriterSpeed),
                typewriterLines.length
            );
            
            if (displayedLines >= typewriterLines.length) {
                state.phase = 'complete';
            }
        }
    }
    
    function needsRender() {
        return true;
    }
    
    function render(ctx, layout) {
        const padding = layout.padding || 40;
        
        // Clear background
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(0, 0, layout.width, layout.height);
        
        if (state.phase === 'generating') {
            renderGenerating(ctx, layout);
        } else {
            renderDocuments(ctx, layout);
        }
        
        // Render accept button when complete
        if (state.phase === 'complete') {
            renderAcceptButton(ctx, layout);
        }
    }
    
    function renderGenerating(ctx, layout) {
        const padding = layout.padding || 40;
        const centerX = layout.width / 2;
        const centerY = layout.height / 2;
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.textAlign = 'center';
        
        // Title
        ctx.fillStyle = style.textColor;
        ctx.fillText('═══════════════════════════════════════════════════════════', centerX, centerY - 60);
        ctx.fillText('  GENERATING IDENTITY DOCUMENTS...', centerX, centerY - 40);
        ctx.fillText('═══════════════════════════════════════════════════════════', centerX, centerY - 20);
        
        // Loading animation
        const elapsed = Date.now() - animationStart;
        const dots = '.'.repeat((Math.floor(elapsed / 300) % 4));
        ctx.fillStyle = style.highlightColor;
        ctx.fillText(`Processing${dots}`, centerX, centerY + 20);
        
        // Progress bar
        const progress = Math.min(elapsed / timing.generatingDuration, 1);
        const barWidth = 300;
        const barHeight = 20;
        const barX = centerX - barWidth / 2;
        const barY = centerY + 50;
        
        ctx.strokeStyle = style.textColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        ctx.fillStyle = style.highlightColor;
        ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * progress, barHeight - 4);
        
        ctx.textAlign = 'left';
    }
    
    function renderDocuments(ctx, layout) {
        const padding = layout.padding || 40;
        let y = padding + 10;
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        
        // Render displayed lines
        for (let i = 0; i < displayedLines && i < typewriterLines.length; i++) {
            const line = typewriterLines[i];
            
            // Set color based on type
            switch (line.type) {
                case 'header':
                    ctx.fillStyle = style.highlightColor;
                    break;
                case 'border':
                    ctx.fillStyle = style.textColor;
                    break;
                case 'content':
                    ctx.fillStyle = style.dimColor;
                    break;
                case 'debt':
                    ctx.fillStyle = style.debtColor;
                    break;
                case 'warning':
                    ctx.fillStyle = style.debtColor;
                    break;
                case 'success':
                    ctx.fillStyle = style.successColor;
                    break;
                case 'spacer':
                    // Just add space
                    break;
                default:
                    ctx.fillStyle = style.textColor;
            }
            
            if (line.text) {
                ctx.fillText(line.text, padding, y);
            }
            
            y += style.fontSize * style.lineHeight;
            
            // Stop if we're going off screen
            if (y > layout.height - 80) {
                break;
            }
        }
    }
    
    function renderAcceptButton(ctx, layout) {
        const padding = layout.padding || 40;
        const buttonX = layout.width / 2 - 80;
        const buttonY = layout.height - padding - 30;
        const buttonWidth = 160;
        const buttonHeight = 30;
        
        acceptHitBox = {
            x: buttonX,
            y: buttonY - 20,
            width: buttonWidth,
            height: buttonHeight
        };
        
        ctx.font = `16px ${style.fontFamily}`;
        ctx.fillStyle = style.successColor;
        ctx.fillText('[ ENTER THE SPRAWL ]', buttonX, buttonY);
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
        if (state.phase === 'complete' && acceptHitBox && hitTest(acceptHitBox, x, y)) {
            complete();
            return true;
        }
        
        // Click anywhere to speed up animation
        if (state.phase !== 'complete' && state.phase !== 'generating') {
            displayedLines = typewriterLines.length;
            state.phase = 'complete';
            return true;
        }
        
        return false;
    }
    
    function handleMouseMove(x, y) {
        if (acceptHitBox && hitTest(acceptHitBox, x, y)) {
            return 'pointer';
        }
        return 'default';
    }
    
    function handleKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            if (state.phase === 'complete') {
                complete();
                return true;
            } else if (state.phase !== 'generating') {
                // Skip to end
                displayedLines = typewriterLines.length;
                state.phase = 'complete';
                return true;
            }
        }
        
        return false;
    }
    
    function handleCommand(cmd, args) {
        switch (cmd) {
            case 'continue':
            case 'next':
            case 'enter':
                if (state.phase === 'complete') {
                    complete();
                } else if (state.phase !== 'generating') {
                    displayedLines = typewriterLines.length;
                    state.phase = 'complete';
                }
                return true;
                
            case 'skip':
                displayedLines = typewriterLines.length;
                state.phase = 'complete';
                return true;
        }
        
        return false;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════════
    
    function complete() {
        console.log('[DocumentsScreen] Complete');
        
        if (state.onComplete) {
            state.onComplete({
                documents: state.documents,
                characterData: state.characterData
            });
        }
        
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('onboarding:documents_complete', {
                documents: state.documents
            });
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
        getDocuments: () => state.documents,
        setCharacterData: (data) => { 
            state.characterData = data;
            generateDocuments();
        }
    };
    
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocumentsScreen;
}
