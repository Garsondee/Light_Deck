/**
 * Light Deck - Main Application
 */

const App = (function() {
    // Application state
    const state = {
        mode: 'player',
        connected: false,
        diceQueue: [],
        chatLog: [],
        phosphorTerminal: null
    };
    
    let socket;
    
    function init() {
        console.log('[APP] Initializing Light Deck...');
        
        // Initialize Three.js
        ThreeSetup.init();
        
        // Initialize Debug UI (Tweakpane)
        DebugUI.init();
        
        // Initialize Phosphor Terminal overlay
        initPhosphorTerminal();
        
        // Initialize Socket.io
        initSocket();
        
        // Set up UI event listeners
        initDicePanel();
        initGMButton();
        
        addChatMessage('system', 'Systems online. Awaiting input.');
        addChatMessage('system', 'Press ` to toggle shader controls.');
        addChatMessage('system', 'Press TAB to toggle phosphor terminal.');
    }
    
    function initSocket() {
        socket = io();
        
        socket.on('connect', () => {
            state.connected = true;
            console.log('[SOCKET] Connected');
            addChatMessage('system', 'Network link established.');
        });
        
        socket.on('disconnect', () => {
            state.connected = false;
            console.log('[SOCKET] Disconnected');
            addChatMessage('system', 'WARNING: Network link lost.');
        });
    }
    
    function initDicePanel() {
        // Dice buttons
        document.querySelectorAll('.dice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const die = parseInt(btn.dataset.die);
                addDieToQueue(die);
            });
        });
        
        // Roll button
        document.getElementById('roll-btn').addEventListener('click', rollDice);
        
        // Clear button
        document.getElementById('clear-dice-btn').addEventListener('click', clearDiceQueue);
    }
    
    function addDieToQueue(die) {
        state.diceQueue.push(die);
        updateDiceQueueDisplay();
    }
    
    function clearDiceQueue() {
        state.diceQueue = [];
        updateDiceQueueDisplay();
    }
    
    function updateDiceQueueDisplay() {
        const display = document.getElementById('dice-queue');
        if (state.diceQueue.length === 0) {
            display.textContent = '';
            return;
        }
        
        // Group dice by type
        const counts = {};
        state.diceQueue.forEach(d => {
            counts[d] = (counts[d] || 0) + 1;
        });
        
        const parts = Object.entries(counts).map(([die, count]) => 
            count > 1 ? `${count}d${die}` : `d${die}`
        );
        display.textContent = parts.join(' + ');
    }
    
    function rollDice() {
        if (state.diceQueue.length === 0) {
            addChatMessage('system', 'No dice selected.');
            return;
        }
        
        const modifier = parseInt(document.getElementById('modifier-input').value) || 0;
        const results = state.diceQueue.map(die => ({
            die,
            result: Math.floor(Math.random() * die) + 1
        }));
        
        const total = results.reduce((sum, r) => sum + r.result, 0) + modifier;
        
        // Format output
        const diceStr = results.map(r => `[${r.result}]`).join(' ');
        const modStr = modifier !== 0 ? ` ${modifier >= 0 ? '+' : ''}${modifier}` : '';
        const queueDisplay = document.getElementById('dice-queue').textContent;
        
        addChatMessage('roll', `ROLL: ${queueDisplay}${modStr} → ${diceStr}${modStr} = ${total}`);
        
        // Clear queue after roll
        clearDiceQueue();
    }
    
    function addChatMessage(type, text) {
        const container = document.getElementById('chat-messages');
        const entry = document.createElement('div');
        entry.className = `chat-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        entry.textContent = `[${timestamp}] ${text}`;
        container.appendChild(entry);
        
        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
        
        // Store in state
        state.chatLog.push({ type, text, timestamp: Date.now() });
    }
    
    function initGMButton() {
        document.getElementById('gm-access-btn').addEventListener('click', () => {
            const password = prompt('Enter GM password:');
            if (password) {
                // TODO: Validate with server
                addChatMessage('system', 'GM authentication not yet implemented.');
            }
        });
    }
    
    /**
     * Initialize the phosphor terminal overlay
     */
    function initPhosphorTerminal() {
        // Create terminal container
        const terminalContainer = document.createElement('div');
        terminalContainer.id = 'phosphor-terminal-overlay';
        terminalContainer.className = 'phosphor-terminal-overlay';
        terminalContainer.innerHTML = `
            <div class="phosphor-terminal-frame">
                <div class="phosphor-terminal-header">
                    <span class="phosphor-terminal-title">LIGHT DECK TERMINAL v0.1</span>
                    <span class="phosphor-terminal-status">●</span>
                </div>
                <div id="phosphor-terminal-content" class="phosphor-terminal-content"></div>
                <div class="phosphor-terminal-input-line">
                    <span class="phosphor-prompt">&gt;</span>
                    <input type="text" id="phosphor-input" class="phosphor-input" autocomplete="off" spellcheck="false">
                </div>
            </div>
        `;
        document.body.appendChild(terminalContainer);
        
        // Initialize phosphor text on the content area
        const contentEl = document.getElementById('phosphor-terminal-content');
        PhosphorText.init(contentEl, {
            phosphor: 'p3', // Amber
            fontSize: 19,
            lineHeight: 1.35,
            showCaret: false,
            burnInEnabled: true,
            flickerEnabled: true
        });
        
        state.phosphorTerminal = {
            container: terminalContainer,
            content: contentEl,
            input: document.getElementById('phosphor-input'),
            visible: false,
            history: [],
            historyIndex: -1,
            bootStarted: false,   // Has the boot sequence been kicked off at least once?
            bootInProgress: false // Is the boot sequence currently running?
        };
        
        // Input handling
        const input = state.phosphorTerminal.input;
        input.addEventListener('keydown', handleTerminalInput);
        
        // Keyboard shortcuts (global)
        document.addEventListener('keydown', (e) => {
            const term = state.phosphorTerminal;
            if (!term) return;
            
            // Toggle terminal with TAB
            if (e.key === 'Tab') {
                e.preventDefault();
                togglePhosphorTerminal();
                return;
            }
            
            // Only handle paging keys when terminal is visible
            if (!term.visible) return;
            
            const contentEl = term.content;
            if (!contentEl) return;
            
            const pageAmount = contentEl.clientHeight * 0.9;
            
            if (e.key === 'PageDown') {
                e.preventDefault();
                contentEl.scrollTop = Math.min(
                    contentEl.scrollTop + pageAmount,
                    contentEl.scrollHeight
                );
            } else if (e.key === 'PageUp') {
                e.preventDefault();
                contentEl.scrollTop = Math.max(
                    contentEl.scrollTop - pageAmount,
                    0
                );
            }
        });
        
        // Boot sequence when first shown
        terminalContainer.style.display = 'none';
        
        console.log('[APP] Phosphor terminal initialized');
    }
    
    /**
     * Toggle phosphor terminal visibility
     */
    function togglePhosphorTerminal() {
        const term = state.phosphorTerminal;
        if (!term) return;
        
        term.visible = !term.visible;
        term.container.style.display = term.visible ? 'flex' : 'none';

        // Pause boot visuals when hidden, resume when shown
        if (!term.visible) {
            if (term.bootInProgress) {
                term.bootPaused = true;
            }
            return;
        }

        // Now visible
        term.input.focus();
        if (term.bootInProgress && term.bootPaused) {
            term.bootPaused = false;
            return;
        }

        // Run boot sequence only once, on first show
        if (!term.bootStarted) {
            term.bootStarted = true;
            term.bootInProgress = true;
            runBootSequence().finally(() => {
                const t = state.phosphorTerminal;
                if (t) t.bootInProgress = false;
            });
        }
    }
    
    /**
     * Run the terminal boot sequence - authentic cyberpunk POST
     */
    async function runBootSequence() {
        const term = state.phosphorTerminal;
        const content = term.content;
        const BOOT_TIME_SCALE = 0.05; // 0.05 = twenty times as fast overall
        const t = (text, opts = {}) => PhosphorText.typeText(content, text, { speed: 12, ...opts });
        const fast = (text) => t(text, { speed: 4 });
        const slow = (text) => t(text, { speed: 25, variance: 15 });
        const pause = async (base, jitter = 0) => {
            const extra = jitter > 0 ? Math.random() * jitter : 0;
            const duration = (base + extra) * BOOT_TIME_SCALE;

            // If terminal is hidden while boot is running, pause progression
            let elapsed = 0;
            const step = 25;
            while (elapsed < duration) {
                const t = state.phosphorTerminal;
                if (!t) break;

                if (t.bootPaused) {
                    await sleep(step);
                    continue;
                }

                await sleep(step);
                elapsed += step;
            }
        };
        
        // Set boot time for uptime tracking
        window.bootTime = Date.now();
        
        // === BIOS POST ===
        await t('AMIBIOS (C) 2077 American Megatrends Inc.\n');
        await t('LIGHTDECK-9000 BIOS Rev. 4.51PG\n\n');
        await pause(220, 260); // Sometimes quick, sometimes lingering on BIOS ID
        
        await t('CPU: Arasaka NeuroCORE-7 @ 4.7 THz\n', { speed: 8 });
        await t('      Quantum Pipeline: ENABLED\n', { speed: 6 });
        await t('      Neural Bridge:    STANDBY\n', { speed: 6 });
        await pause(120, 180);
        
        // Memory test with progress
        await t('\nMemory Test: ');
        const memBlocks = 32;
        for (let i = 0; i < memBlocks; i++) {
            await t('█', { speed: 2 });
            if (i === Math.floor(memBlocks * 0.7)) {
                PhosphorText.triggerInterference(content, 0.2, 80);
            }
        }
        await t(' 65536 TB OK\n');
        await pause(160, 260); // Give a readable beat after memory completes
        
        // Hardware detection
        await t('\nDetecting Hardware...\n', { speed: 15 });
        await pause(60, 180);
        
        const hardware = [
            ['Pri Master', 'SEAGATE ST-506 Holographic Array', '2.1 PB'],
            ['Pri Slave ', 'NONE'],
            ['Sec Master', 'SONY CDU-920 Optical Interface', 'READY'],
            ['Sec Slave ', 'MILITECH Secure Enclave v3', 'LOCKED'],
        ];
        
        for (const [slot, device, status] of hardware) {
            await fast(`  ${slot}: `);
            await t(device);
            if (status) await t(` [${status}]`);
            await t('\n');
            await pause(20, 120); // Some lines snap by, others dwell slightly
        }
        
        await pause(140, 260);
        PhosphorText.triggerInterference(content, 0.15, 100);
        
        // PCI Devices (appear as a single burst block)
        const pciDevices = [
            '\nPCI Device Enumeration:\n',
            '  Bus 00 Dev 00: Arasaka Northbridge i9900-QX\n',
            '  Bus 00 Dev 1F: ICH-77 Southbridge Controller\n',
            '  Bus 01 Dev 00: NVIDIA RTX-9090 Ti ULTRA [32GB GDDR9]\n',
            '  Bus 02 Dev 00: Militech NIC-7 Neural Interface Card\n',
            '  Bus 02 Dev 01: Kiroshi Optics MK.IV Driver\n',
            '  Bus 03 Dev 00: Zetatech Audio Processor DSP-4400\n',
            '  Bus 03 Dev 01: Braindance BD-X Capture Module\n',
            '  Bus 04 Dev 00: Unknown Device [VENDOR: 0x2077]\n',
        ];

        await t(pciDevices.join(''), { speed: 0, variance: 0 }); // instant block
        
        await pause(220, 320);
        
        // === BOOT LOADER ===
        await t('\n');
        await t('═'.repeat(58) + '\n', { speed: 2 });
        await pause(120, 260);
        
        await slow('\nGRUB 4.20-cyberdeck loading...\n');
        await pause(80, 260);
        await t('  Decompressing kernel... ');
        await pause(260, 420);
        await t('OK\n');
        await t('  Loading initial ramdisk... ');
        await pause(180, 320);
        await t('OK\n');
        await t('  Parsing ACPI tables... ');
        await pause(140, 260);
        await t('OK\n');
        
        PhosphorText.triggerInterference(content, 0.3, 150);
        await pause(260, 520); // Brief "black box" moment before kernel spew
        
        // === KERNEL BOOT ===
        await t('\n[    0.000000] Linux version 7.77.7-LIGHTDECK ');
        await t('(root@netrunner) (gcc 14.2.0)\n', { speed: 6 });
        await t('[    0.000000] Command line: BOOT_IMAGE=/vmlinuz root=/dev/sda1 quiet splash\n', { speed: 4 });
        await pause(40, 140);
        
        const kernelMessages = [
            '[    0.000012] BIOS-provided physical RAM map:\n',
            '[    0.000015]  BIOS-e820: [mem 0x0000000000000000-0x000000000009ffff] usable\n',
            '[    0.000018]  BIOS-e820: [mem 0x0000000000100000-0x00000fffffffffff] usable\n',
            '[    0.000089] NX (Execute Disable) protection: active\n',
            '[    0.000102] SMBIOS 4.0 present.\n',
            '[    0.000156] DMI: Arasaka Corp LIGHTDECK-9000/MAINBOARD, BIOS 4.51PG 01/01/2077\n',
            '[    0.004521] CPU0: Arasaka NeuroCORE-7 stepping 04\n',
            '[    0.004523] Performance Events: PEBS fmt4+-baseline, 64-deep LBR, Arasaka different\n',
            '[    0.008842] Freeing SMP alternatives memory: 42K\n',
            '[    0.012445] smpboot: CPU0: Arasaka NeuroCORE-7 (family: 0x77, model: 0x42, stepping: 0x4)\n',
            '[    0.015667] smp: Bringing up secondary CPUs ...\n',
            '[    0.018923] smp: Brought up 1 node, 128 CPUs\n',
            '[    0.024891] NET: Registered protocol family 2\n',
            '[    0.028445] TCP established hash table entries: 524288\n',
            '[    0.032156] NET: Registered protocol family 17\n',
            '[    0.038920] systemd[1]: Detected architecture x86-64-quantum.\n',
        ];

        await t(kernelMessages.join(''), { speed: 0, variance: 0 }); // instant kernel spew block
        
        await pause(160, 260);
        
        // === SYSTEMD BOOT ===
        await t('\n');
        const services = [
            ['cryptsetup', 'Decrypting /dev/sda2...', 'OK'],
            ['systemd-modules', 'Loading kernel modules...', 'OK'],
            ['systemd-udevd', 'Starting device manager...', 'OK'],
            ['neural-bridge', 'Initializing neural interface...', 'OK'],
            ['ice-daemon', 'Starting ICE protection layer...', 'OK'],
            ['netrunner-core', 'Loading cyberdeck firmware...', 'OK'],
            ['phosphor-display', 'Calibrating P3 amber phosphors...', 'OK'],
            ['auth-daemon', 'Starting biometric scanner...', 'STANDBY'],
        ];

        let servicesBlock = '';
        for (const [name, desc, status] of services) {
            const statusLabel = status === 'OK' ? ' OK ' : 'WAIT';
            servicesBlock += `[ ${statusLabel} ] ${desc}\n`;
        }

        await t(servicesBlock, { speed: 0, variance: 0 }); // instant systemd block
        
        await pause(260, 420);
        PhosphorText.triggerInterference(content, 0.25, 120);
        
        // === LIGHTDECK INIT ===
        await t('\n');
        const bannerLines = [
            '╔══════════════════════════════════════════════════════════╗\n',
            '║                                                          ║\n',
            '║   ██╗     ██╗ ██████╗ ██╗  ██╗████████╗                  ║\n',
            '║   ██║     ██║██╔════╝ ██║  ██║╚══██╔══╝                  ║\n',
            '║   ██║     ██║██║  ███╗███████║   ██║                     ║\n',
            '║   ██║     ██║██║   ██║██╔══██║   ██║                     ║\n',
            '║   ███████╗██║╚██████╔╝██║  ██║   ██║                     ║\n',
            '║   ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝                     ║\n',
            '║                     ██████╗ ███████╗ ██████╗██╗  ██╗     ║\n',
            '║                     ██╔══██╗██╔════╝██╔════╝██║ ██╔╝     ║\n',
            '║                     ██║  ██║█████╗  ██║     █████╔╝      ║\n',
            '║                     ██║  ██║██╔══╝  ██║     ██╔═██╗      ║\n',
            '║                     ██████╔╝███████╗╚██████╗██║  ██╗     ║\n',
            '║                     ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝     ║\n',
            '║                                                          ║\n',
            '║          TACTICAL TABLETOP INTERFACE v0.1.77             ║\n',
            '║          (C) 2077 NetWatch Division                      ║\n',
            '║                                                          ║\n',
            '╚══════════════════════════════════════════════════════════╝\n',
        ];

        await t(bannerLines.join(''), { speed: 0, variance: 0 }); // instant banner block
        
        await pause(320, 520); // Let them read the banner
        
        // Final init
        await t('\n');
        await slow('Establishing secure connection...\n');
        await pause(180, 360);
        await t('  Handshake:  ');
        for (let i = 0; i < 8; i++) {
            await t('■', { speed: 40 });
        }
        await t(' COMPLETE\n');
        
        await t('  Encryption: AES-4096-QUANTUM\n', { speed: 10 });
        await t('  Latency:    <1ms (local)\n', { speed: 10 });
        await t('  ICE Status: GREEN\n', { speed: 10 });
        
        await pause(200, 320);
        await t('\nWelcome, Netrunner.\n', { speed: 40, variance: 20 });
        await t('Type "help" for available commands.\n', { speed: 15 });
        await t('Type "man <cmd>" for detailed documentation.\n\n', { speed: 15 });
    }
    
    /**
     * Handle terminal input
     */
    async function handleTerminalInput(e) {
        const term = state.phosphorTerminal;
        const input = term.input;
        
        if (e.key === 'Enter') {
            const command = input.value.trim();
            input.value = '';
            
            if (command) {
                term.history.push(command);
                term.historyIndex = term.history.length;
                
                // Echo command
                await PhosphorText.typeText(term.content, `> ${command}\n`, { speed: 15 });
                
                // Process command
                await processTerminalCommand(command);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (term.historyIndex > 0) {
                term.historyIndex--;
                input.value = term.history[term.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (term.historyIndex < term.history.length - 1) {
                term.historyIndex++;
                input.value = term.history[term.historyIndex];
            } else {
                term.historyIndex = term.history.length;
                input.value = '';
            }
        }
    }
    
    /**
     * Process terminal commands - authentic Unix-style CLI
     */
    async function processTerminalCommand(cmd) {
        const term = state.phosphorTerminal;
        const content = term.content;
        const t = (text, opts = {}) => PhosphorText.typeText(content, text, { speed: 8, ...opts });
        const fast = (text) => t(text, { speed: 3 });
        
        // Parse command with flags
        const tokens = cmd.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        const command = (tokens[0] || '').toLowerCase();
        const args = tokens.slice(1);
        const flags = args.filter(a => a.startsWith('-'));
        const params = args.filter(a => !a.startsWith('-'));
        
        switch (command) {
            case 'help':
            case '?':
                await t(`
LIGHTDECK SHELL v0.1.77 - COMMAND REFERENCE
═══════════════════════════════════════════

SYSTEM COMMANDS
  help, ?           Display this help message
  man <command>     Display manual page for command
  clear, cls        Clear terminal with phosphor decay
  exit, quit        Close terminal overlay
  reboot            Restart terminal (re-run POST)
  
DISPLAY COMMANDS  
  phosphor <type>   Set phosphor type (p1/p3/p31/p4/p7)
  crt <effect>      Trigger CRT effect (glitch/hsync/noise)
  echo <text>       Display text with typewriter effect
  cat <file>        Display file contents
  
GAME COMMANDS
  roll <expr>       Roll dice (e.g., roll 2d6+3, roll 4d6kh3)
  init [+mod]       Roll initiative
  check <stat>      Roll ability check
  save <type>       Roll saving throw
  
NETWORK COMMANDS
  status            Display system status
  ping <host>       Test network connectivity
  netstat           Display network connections
  whoami            Display current user
  
UTILITIES
  date              Display current date/time
  uptime            Display system uptime
  fortune           Display random fortune
  cowsay <text>     Display text with ASCII cow

Type "man <command>" for detailed usage.
`, { speed: 2 });
                break;
                
            case 'man':
                await displayManPage(content, params[0], t);
                break;
                
            case 'clear':
            case 'cls':
                await PhosphorText.clearWithDecay(content);
                break;
                
            case 'exit':
            case 'quit':
                await t('Closing terminal...\n');
                await sleep(300);
                togglePhosphorTerminal();
                break;
                
            case 'reboot':
                await t('Initiating reboot sequence...\n');
                await sleep(200);
                PhosphorText.triggerInterference(content, 0.8, 300);
                await sleep(400);
                await PhosphorText.clearWithDecay(content);
                await sleep(800);
                term.history = []; // Reset to trigger boot
                await runBootSequence();
                break;
                
            case 'phosphor':
                const phosphorType = params[0] || 'p3';
                if (['p1', 'p3', 'p31', 'p4', 'p7'].includes(phosphorType)) {
                    PhosphorText.setPhosphor(content, phosphorType);
                    const names = { p1: 'GREEN', p3: 'AMBER', p31: 'BLUE-WHITE', p4: 'WHITE', p7: 'BLUE/YELLOW' };
                    await t(`phosphor: switching to ${phosphorType.toUpperCase()} (${names[phosphorType]})\n`);
                } else {
                    await t(`phosphor: invalid type '${phosphorType}'\n`);
                    await t('Available: p1 (green), p3 (amber), p31 (blue-white), p4 (white), p7 (blue/yellow)\n');
                }
                break;
                
            case 'crt':
                const effect = params[0] || 'glitch';
                switch (effect) {
                    case 'glitch':
                        ASCIIShader.triggerGlitch(0.6, 400);
                        PhosphorText.triggerInterference(content, 0.5, 300);
                        await t('crt: glitch pulse sent\n');
                        break;
                    case 'hsync':
                        PhosphorText.triggerHSync(content, 500);
                        await sleep(600);
                        await t('crt: horizontal sync recovered\n');
                        break;
                    case 'noise':
                    case 'interference':
                        PhosphorText.triggerInterference(content, 0.7, 400);
                        await sleep(500);
                        await t('crt: interference pattern cleared\n');
                        break;
                    default:
                        await t(`crt: unknown effect '${effect}'\n`);
                        await t('Available: glitch, hsync, noise\n');
                }
                break;
                
            case 'roll':
                const diceExpr = params.join('');
                const rollResult = parseDiceRoll(diceExpr);
                if (rollResult) {
                    await t(`\n  Rolling ${rollResult.expression}...\n`);
                    await sleep(200);
                    await t(`  Dice: [ ${rollResult.rolls.join(' ] [ ')} ]\n`, { speed: 15 });
                    if (rollResult.modifier !== 0) {
                        await t(`  Modifier: ${rollResult.modifier >= 0 ? '+' : ''}${rollResult.modifier}\n`);
                    }
                    if (rollResult.kept) {
                        await t(`  Kept: [ ${rollResult.kept.join(' ] [ ')} ]\n`);
                    }
                    await t(`  ─────────────────\n`);
                    await t(`  TOTAL: ${rollResult.total}\n\n`, { speed: 20 });
                } else {
                    await t(`roll: invalid expression '${diceExpr}'\n`);
                    await t('Usage: roll <N>d<S>[+/-<M>] or roll <N>d<S>kh<K>/kl<K>\n');
                    await t('Examples: roll 2d6+3, roll 4d6kh3, roll d20-1\n');
                }
                break;
                
            case 'init':
                const initMod = parseInt(params[0]) || 0;
                const initRoll = Math.floor(Math.random() * 20) + 1;
                const initTotal = initRoll + initMod;
                await t(`\n  Rolling Initiative...\n`);
                await sleep(150);
                await t(`  d20: [ ${initRoll} ]`);
                if (initMod !== 0) await t(` ${initMod >= 0 ? '+' : ''}${initMod}`);
                await t(` = ${initTotal}\n\n`);
                break;
                
            case 'status':
                const uptime = Math.floor((Date.now() - (window.bootTime || Date.now())) / 1000);
                const uptimeStr = `${Math.floor(uptime/3600)}h ${Math.floor((uptime%3600)/60)}m ${uptime%60}s`;
                await fast(`
┌──────────────────────────────────────────────────┐
│ LIGHTDECK SYSTEM STATUS                          │
├──────────────────────────────────────────────────┤
│ Network:     ${(state.connected ? 'CONNECTED' : 'DISCONNECTED').padEnd(35)}│
│ Mode:        ${state.mode.toUpperCase().padEnd(35)}│
│ Uptime:      ${uptimeStr.padEnd(35)}│
│ Dice Queue:  ${(state.diceQueue.length + ' dice').padEnd(35)}│
│ Chat Log:    ${(state.chatLog.length + ' entries').padEnd(35)}│
│ ICE Status:  ${'GREEN'.padEnd(35)}│
│ Neural Link: ${'STANDBY'.padEnd(35)}│
└──────────────────────────────────────────────────┘
`);
                break;
                
            case 'echo':
                const echoText = params.join(' ').replace(/^["']|["']$/g, '');
                await t(echoText + '\n', { speed: 15, variance: 10 });
                break;
                
            case 'whoami':
                await t('netrunner\n');
                break;
                
            case 'date':
                const now = new Date();
                await t(now.toLocaleString('en-US', { 
                    weekday: 'short', year: 'numeric', month: 'short', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
                }) + ' NCT\n');
                break;
                
            case 'uptime':
                window.bootTime = window.bootTime || Date.now();
                const up = Math.floor((Date.now() - window.bootTime) / 1000);
                await t(` ${new Date().toLocaleTimeString('en-US', { hour12: false })} up ${Math.floor(up/60)} min, 1 user, load average: 0.42, 0.77, 0.69\n`);
                break;
                
            case 'ping':
                const host = params[0] || 'localhost';
                await t(`PING ${host} (127.0.0.1) 56(84) bytes of data.\n`);
                for (let i = 0; i < 4; i++) {
                    await sleep(200 + Math.random() * 100);
                    const latency = (Math.random() * 2 + 0.1).toFixed(3);
                    await t(`64 bytes from ${host}: icmp_seq=${i+1} ttl=64 time=${latency} ms\n`);
                }
                await t(`\n--- ${host} ping statistics ---\n`);
                await t(`4 packets transmitted, 4 received, 0% packet loss\n`);
                break;
                
            case 'netstat':
                await fast(`Active Internet connections (servers and established)
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 0.0.0.0:3000            0.0.0.0:*               LISTEN
tcp        0      0 127.0.0.1:3000          127.0.0.1:52431         ESTABLISHED
tcp6       0      0 :::22                   :::*                    LISTEN
udp        0      0 0.0.0.0:68              0.0.0.0:*               
`);
                break;
                
            case 'fortune':
                const fortunes = [
                    "The street finds its own uses for things. - William Gibson",
                    "The future is already here — it's just not evenly distributed.",
                    "We are all connected; To each other, biologically. To the earth, chemically. To the rest of the universe atomically.",
                    "In the beginning the Universe was created. This has made a lot of people very angry and been widely regarded as a bad move.",
                    "Never trust a computer you can't throw out a window.",
                    "The only way to do great work is to love what you do.",
                    "Any sufficiently advanced technology is indistinguishable from magic.",
                    "Paranoia is just reality on a finer scale.",
                    "The Net is vast and infinite.",
                    "I've seen things you people wouldn't believe...",
                ];
                await t('\n' + fortunes[Math.floor(Math.random() * fortunes.length)] + '\n\n', { speed: 20, variance: 10 });
                break;
                
            case 'cowsay':
                const cowText = params.join(' ') || 'Moo!';
                const border = '─'.repeat(Math.min(cowText.length + 2, 40));
                await fast(`
 ┌${border}┐
 │ ${cowText.padEnd(border.length - 2)} │
 └${border}┘
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||
`);
                break;
                
            case 'cat':
                const filename = params[0];
                if (!filename) {
                    await t('cat: missing operand\n');
                } else if (filename === '/etc/motd' || filename === 'motd') {
                    await t(`
═══════════════════════════════════════════════════════
     Welcome to LIGHTDECK - Tactical Tabletop Interface
     
     "The street finds its own uses for things."
                                    - William Gibson
═══════════════════════════════════════════════════════
`);
                } else if (filename === '/etc/passwd' || filename === 'passwd') {
                    await t(`root:x:0:0:root:/root:/bin/bash
netrunner:x:1000:1000:Netrunner:/home/netrunner:/bin/zsh
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
`);
                } else {
                    await t(`cat: ${filename}: No such file or directory\n`);
                }
                break;
                
            case 'matrix':
                await t('\n', { speed: 50 });
                await t('Wake up, Neo...\n', { speed: 80, variance: 50 });
                await sleep(1500);
                await t('The Matrix has you...\n', { speed: 60, variance: 40 });
                await sleep(1200);
                await t('Follow the white rabbit.\n', { speed: 50, variance: 30 });
                await sleep(800);
                PhosphorText.triggerInterference(content, 0.8, 200);
                await sleep(500);
                await t('\nKnock, knock, Neo.\n\n', { speed: 100, variance: 80 });
                break;
                
            case 'sl':
                await t('bash: sl: command not found. Did you mean: ls\n');
                await t('...just kidding. No train for you.\n');
                break;
                
            case 'sudo':
                await t(`[sudo] password for netrunner: `);
                await sleep(1500);
                await t('\nnetrunner is not in the sudoers file. This incident will be reported.\n');
                break;
                
            case 'rm':
                if (params.includes('-rf') && (params.includes('/') || params.includes('/*'))) {
                    await t('Nice try, choom.\n');
                } else {
                    await t(`rm: cannot remove '${params[0] || ''}': Operation not permitted\n`);
                }
                break;
                
            case 'ls':
                await fast(`drwxr-xr-x  2 netrunner netrunner 4096 Jan  1 00:00 .
drwxr-xr-x  3 root      root      4096 Jan  1 00:00 ..
-rw-r--r--  1 netrunner netrunner  220 Jan  1 00:00 .bash_logout
-rw-r--r--  1 netrunner netrunner 3771 Jan  1 00:00 .bashrc
drwx------  2 netrunner netrunner 4096 Jan  1 00:00 .cache
-rw-r--r--  1 netrunner netrunner  807 Jan  1 00:00 .profile
drwxr-xr-x  2 netrunner netrunner 4096 Jan  1 00:00 decks
drwxr-xr-x  2 netrunner netrunner 4096 Jan  1 00:00 paydata
`);
                break;
                
            case 'pwd':
                await t('/home/netrunner\n');
                break;
                
            case 'cd':
                await t(`bash: cd: ${params[0] || '~'}: Permission denied (nice try)\n`);
                break;
                
            case '':
                // Empty command, do nothing
                break;
                
            default:
                await t(`bash: ${command}: command not found\n`);
                await t(`Type 'help' for available commands.\n`);
        }
    }
    
    /**
     * Display man page for a command
     */
    async function displayManPage(content, cmd, t) {
        const manPages = {
            roll: `
ROLL(1)                    LIGHTDECK MANUAL                    ROLL(1)

NAME
       roll - roll polyhedral dice with modifiers

SYNOPSIS
       roll <count>d<sides>[+/-<modifier>]
       roll <count>d<sides>kh<keep>
       roll <count>d<sides>kl<keep>

DESCRIPTION
       Roll one or more dice and calculate the total. Supports 
       standard dice notation with modifiers and keep highest/lowest.

EXAMPLES
       roll d20        Roll a single d20
       roll 2d6+3      Roll 2d6 and add 3
       roll 4d6kh3     Roll 4d6, keep highest 3 (ability scores)
       roll 2d20kl1    Roll 2d20, keep lowest (disadvantage)

SEE ALSO
       init(1), check(1), save(1)
`,
            phosphor: `
PHOSPHOR(1)                LIGHTDECK MANUAL                PHOSPHOR(1)

NAME
       phosphor - configure CRT phosphor display type

SYNOPSIS
       phosphor <type>

DESCRIPTION
       Switch the terminal phosphor coating simulation. Different 
       phosphor types have different colors and persistence 
       characteristics.

TYPES
       p1     Classic green phosphor (long persistence)
       p3     Amber phosphor (medium persistence) [DEFAULT]
       p31    Blue-white phosphor (short persistence)
       p4     White phosphor (medium persistence)
       p7     Blue primary with yellow afterglow (very long)

HISTORY
       P1 and P3 phosphors were common in early terminals. P3 (amber)
       was preferred for extended use due to reduced eye strain.
`,
            crt: `
CRT(1)                     LIGHTDECK MANUAL                     CRT(1)

NAME
       crt - trigger CRT display effects

SYNOPSIS
       crt <effect>

DESCRIPTION
       Simulate various CRT display artifacts and malfunctions.

EFFECTS
       glitch        Trigger digital glitch with color aberration
       hsync         Simulate horizontal sync loss
       noise         Add electromagnetic interference pattern

NOTES
       These effects are cosmetic and do not affect terminal function.
`,
            status: `
STATUS(1)                  LIGHTDECK MANUAL                  STATUS(1)

NAME
       status - display system status information

SYNOPSIS
       status

DESCRIPTION
       Display current system status including network connectivity,
       operation mode, uptime, and various subsystem states.

OUTPUT
       Network      Connection status to game server
       Mode         Current operation mode (player/gm)
       Uptime       Time since terminal boot
       Dice Queue   Number of dice queued for rolling
       Chat Log     Number of entries in chat log
       ICE Status   Intrusion Countermeasure Electronics status
       Neural Link  Neural interface connection status
`,
        };
        
        if (!cmd) {
            await t('What manual page do you want?\nUsage: man <command>\n');
            return;
        }
        
        const page = manPages[cmd.toLowerCase()];
        if (page) {
            await t(page, { speed: 2 });
        } else {
            await t(`No manual entry for ${cmd}\n`);
        }
    }
    
    /**
     * Parse dice roll expression with keep highest/lowest support
     */
    function parseDiceRoll(expr) {
        // Try keep highest/lowest format: 4d6kh3 or 2d20kl1
        const keepMatch = expr.match(/^(\d*)d(\d+)(kh|kl)(\d+)$/i);
        if (keepMatch) {
            const count = parseInt(keepMatch[1]) || 1;
            const sides = parseInt(keepMatch[2]);
            const keepType = keepMatch[3].toLowerCase();
            const keepCount = parseInt(keepMatch[4]);
            
            if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;
            if (keepCount < 1 || keepCount > count) return null;
            
            const rolls = [];
            for (let i = 0; i < count; i++) {
                rolls.push(Math.floor(Math.random() * sides) + 1);
            }
            
            const sorted = [...rolls].sort((a, b) => b - a);
            const kept = keepType === 'kh' 
                ? sorted.slice(0, keepCount)
                : sorted.slice(-keepCount);
            
            const total = kept.reduce((a, b) => a + b, 0);
            
            return {
                expression: `${count}d${sides}${keepType}${keepCount}`,
                rolls,
                kept,
                modifier: 0,
                total
            };
        }
        
        // Standard format: 2d6+3
        const match = expr.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
        if (!match) return null;
        
        const count = parseInt(match[1]) || 1;
        const sides = parseInt(match[2]);
        const modifier = parseInt(match[3]) || 0;
        
        if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;
        
        const rolls = [];
        for (let i = 0; i < count; i++) {
            rolls.push(Math.floor(Math.random() * sides) + 1);
        }
        
        const total = rolls.reduce((a, b) => a + b, 0) + modifier;
        
        return {
            expression: `${count}d${sides}${modifier >= 0 && modifier !== 0 ? '+' : ''}${modifier !== 0 ? modifier : ''}`,
            rolls,
            modifier,
            total
        };
    }
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Public API
    return {
        init,
        addChatMessage,
        togglePhosphorTerminal,
        getState: () => ({ ...state })
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
