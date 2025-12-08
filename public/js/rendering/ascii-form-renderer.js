/**
 * ASCIIFormRenderer - Renders clickable ASCII-styled form elements
 * 
 * Supports:
 * - Text inputs with cursor
 * - Buttons with hover/active states
 * - Sliders with +/- buttons
 * - Radio buttons
 * - Checkboxes
 * - Labels and decorative text
 * 
 * All elements are rendered to canvas and support:
 * - Mouse click detection (hit testing)
 * - Keyboard navigation (Tab)
 * - Focus states
 */

const ASCIIFormRenderer = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════
    
    const ELEMENT_TYPES = {
        LABEL: 'label',
        TEXT_INPUT: 'text_input',
        BUTTON: 'button',
        SLIDER: 'slider',
        RADIO: 'radio',
        CHECKBOX: 'checkbox',
        DIVIDER: 'divider'
    };
    
    // ASCII characters for form elements
    const CHARS = {
        // Box drawing
        BOX_TL: '╔',
        BOX_TR: '╗',
        BOX_BL: '╚',
        BOX_BR: '╝',
        BOX_H: '═',
        BOX_V: '║',
        BOX_T_DOWN: '╦',
        BOX_T_UP: '╩',
        BOX_T_RIGHT: '╠',
        BOX_T_LEFT: '╣',
        BOX_CROSS: '╬',
        
        // Light box (for inputs)
        LIGHT_TL: '┌',
        LIGHT_TR: '┐',
        LIGHT_BL: '└',
        LIGHT_BR: '┘',
        LIGHT_H: '─',
        LIGHT_V: '│',
        
        // Slider
        SLIDER_FILL: '█',
        SLIDER_EMPTY: '░',
        SLIDER_HALF: '▓',
        
        // Radio/Checkbox
        RADIO_EMPTY: '( )',
        RADIO_FILLED: '(•)',
        CHECK_EMPTY: '[ ]',
        CHECK_FILLED: '[X]',
        
        // Visualizer bars
        BAR_1: '▁',
        BAR_2: '▂',
        BAR_3: '▃',
        BAR_4: '▄',
        BAR_5: '▅',
        BAR_6: '▆',
        BAR_7: '▇',
        BAR_8: '█',
        
        // Cursor
        CURSOR: '█',
        CURSOR_BLINK: '▌'
    };
    
    // Default styling
    const DEFAULT_STYLE = {
        fontFamily: 'IBM Plex Mono, Courier New, monospace',
        fontSize: 16,
        lineHeight: 1.4,
        
        // Colors (phosphor amber theme)
        textColor: '#ffaa00',
        dimColor: '#885500',
        highlightColor: '#ffcc44',
        backgroundColor: '#0a0a0a',
        focusBorderColor: '#ffcc44',
        
        // Glow
        glowColor: '#ffaa00',
        glowIntensity: 0.6,
        glowRadius: 3
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // FORM STATE
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Create a new form instance
     * @param {Object} options - Configuration options
     * @returns {Object} Form instance
     */
    function createForm(options = {}) {
        const style = { ...DEFAULT_STYLE, ...options.style };
        
        return {
            elements: [],
            focusedIndex: -1,
            style,
            charWidth: 0,  // Calculated on first render
            charHeight: 0,
            cursorVisible: true,
            cursorBlinkTimer: 0
        };
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // ELEMENT CREATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Add a label (non-interactive text)
     */
    function addLabel(form, options) {
        form.elements.push({
            type: ELEMENT_TYPES.LABEL,
            id: options.id || `label_${form.elements.length}`,
            text: options.text || '',
            x: options.x || 0,
            y: options.y || 0,
            color: options.color || form.style.textColor,
            dim: options.dim || false,
            centered: options.centered || false,
            focusable: false
        });
    }
    
    /**
     * Add a text input field
     */
    function addTextInput(form, options) {
        form.elements.push({
            type: ELEMENT_TYPES.TEXT_INPUT,
            id: options.id || `input_${form.elements.length}`,
            label: options.label || '',
            x: options.x || 0,
            y: options.y || 0,
            width: options.width || 20,
            value: options.value || '',
            placeholder: options.placeholder || '',
            maxLength: options.maxLength || 50,
            cursorPos: 0,
            focusable: true,
            hitBox: null  // Calculated on render
        });
    }
    
    /**
     * Add a button
     */
    function addButton(form, options) {
        form.elements.push({
            type: ELEMENT_TYPES.BUTTON,
            id: options.id || `button_${form.elements.length}`,
            text: options.text || 'BUTTON',
            x: options.x || 0,
            y: options.y || 0,
            onClick: options.onClick || null,
            hovered: false,
            active: false,
            focusable: true,
            hitBox: null
        });
    }
    
    /**
     * Add a slider
     */
    function addSlider(form, options) {
        form.elements.push({
            type: ELEMENT_TYPES.SLIDER,
            id: options.id || `slider_${form.elements.length}`,
            label: options.label || '',
            x: options.x || 0,
            y: options.y || 0,
            width: options.width || 16,
            min: options.min || 0,
            max: options.max || 100,
            value: options.value || 50,
            step: options.step || 5,
            showValue: options.showValue !== false,
            onChange: options.onChange || null,
            focusable: true,
            hitBoxMinus: null,
            hitBoxPlus: null,
            hitBoxTrack: null
        });
    }
    
    /**
     * Add a radio button group
     */
    function addRadioGroup(form, options) {
        form.elements.push({
            type: ELEMENT_TYPES.RADIO,
            id: options.id || `radio_${form.elements.length}`,
            label: options.label || '',
            x: options.x || 0,
            y: options.y || 0,
            options: options.options || [],  // Array of { value, label }
            value: options.value || null,
            horizontal: options.horizontal || false,
            onChange: options.onChange || null,
            focusable: true,
            hitBoxes: []  // One per option
        });
    }
    
    /**
     * Add a checkbox
     */
    function addCheckbox(form, options) {
        form.elements.push({
            type: ELEMENT_TYPES.CHECKBOX,
            id: options.id || `checkbox_${form.elements.length}`,
            label: options.label || '',
            x: options.x || 0,
            y: options.y || 0,
            checked: options.checked || false,
            onChange: options.onChange || null,
            focusable: true,
            hitBox: null
        });
    }
    
    /**
     * Add a horizontal divider
     */
    function addDivider(form, options) {
        form.elements.push({
            type: ELEMENT_TYPES.DIVIDER,
            id: options.id || `divider_${form.elements.length}`,
            x: options.x || 0,
            y: options.y || 0,
            width: options.width || 40,
            char: options.char || CHARS.LIGHT_H,
            focusable: false
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Render the form to a canvas context
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} form
     * @param {number} offsetX - X offset for rendering
     * @param {number} offsetY - Y offset for rendering
     */
    function render(ctx, form, offsetX = 0, offsetY = 0) {
        const style = form.style;
        
        // Calculate character dimensions
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        form.charWidth = ctx.measureText('M').width;
        form.charHeight = style.fontSize * style.lineHeight;
        
        // Update cursor blink
        form.cursorBlinkTimer = (form.cursorBlinkTimer + 1) % 60;
        form.cursorVisible = form.cursorBlinkTimer < 30;
        
        // Render each element
        form.elements.forEach((element, index) => {
            const isFocused = index === form.focusedIndex;
            const x = offsetX + element.x * form.charWidth;
            const y = offsetY + element.y * form.charHeight;
            
            switch (element.type) {
                case ELEMENT_TYPES.LABEL:
                    renderLabel(ctx, form, element, x, y);
                    break;
                case ELEMENT_TYPES.TEXT_INPUT:
                    renderTextInput(ctx, form, element, x, y, isFocused);
                    break;
                case ELEMENT_TYPES.BUTTON:
                    renderButton(ctx, form, element, x, y, isFocused);
                    break;
                case ELEMENT_TYPES.SLIDER:
                    renderSlider(ctx, form, element, x, y, isFocused);
                    break;
                case ELEMENT_TYPES.RADIO:
                    renderRadioGroup(ctx, form, element, x, y, isFocused);
                    break;
                case ELEMENT_TYPES.CHECKBOX:
                    renderCheckbox(ctx, form, element, x, y, isFocused);
                    break;
                case ELEMENT_TYPES.DIVIDER:
                    renderDivider(ctx, form, element, x, y);
                    break;
            }
        });
    }
    
    function renderLabel(ctx, form, element, x, y) {
        const style = form.style;
        const color = element.dim ? style.dimColor : (element.color || style.textColor);
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.fillStyle = color;
        ctx.textBaseline = 'top';
        
        if (element.centered) {
            const textWidth = ctx.measureText(element.text).width;
            ctx.fillText(element.text, x - textWidth / 2, y);
        } else {
            ctx.fillText(element.text, x, y);
        }
    }
    
    function renderTextInput(ctx, form, element, x, y, isFocused) {
        const style = form.style;
        const cw = form.charWidth;
        const ch = form.charHeight;
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.textBaseline = 'top';
        
        // Render label if present
        if (element.label) {
            ctx.fillStyle = style.textColor;
            ctx.fillText(element.label, x, y);
            x += (element.label.length + 1) * cw;
        }
        
        // Input box: [____________]
        const boxWidth = element.width + 2;  // +2 for brackets
        const boxX = x;
        const boxY = y;
        
        // Store hit box
        element.hitBox = {
            x: boxX,
            y: boxY,
            width: boxWidth * cw,
            height: ch
        };
        
        // Draw brackets
        ctx.fillStyle = isFocused ? style.focusBorderColor : style.textColor;
        ctx.fillText('[', boxX, boxY);
        ctx.fillText(']', boxX + (boxWidth - 1) * cw, boxY);
        
        // Draw value or placeholder
        const displayValue = element.value || (isFocused ? '' : element.placeholder);
        const displayColor = element.value ? style.textColor : style.dimColor;
        
        ctx.fillStyle = displayColor;
        const truncated = displayValue.substring(0, element.width);
        ctx.fillText(truncated, boxX + cw, boxY);
        
        // Draw cursor if focused
        if (isFocused && form.cursorVisible) {
            const cursorX = boxX + cw + element.cursorPos * cw;
            ctx.fillStyle = style.highlightColor;
            ctx.fillText(CHARS.CURSOR, cursorX, boxY);
        }
    }
    
    function renderButton(ctx, form, element, x, y, isFocused) {
        const style = form.style;
        const cw = form.charWidth;
        const ch = form.charHeight;
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.textBaseline = 'top';
        
        // Button: [TEXT]
        const buttonText = `[${element.text}]`;
        const buttonWidth = buttonText.length * cw;
        
        // Store hit box
        element.hitBox = {
            x: x,
            y: y,
            width: buttonWidth,
            height: ch
        };
        
        // Determine color based on state
        let color = style.textColor;
        if (element.active) {
            color = style.backgroundColor;
            // Draw filled background
            ctx.fillStyle = style.highlightColor;
            ctx.fillRect(x, y, buttonWidth, ch);
        } else if (element.hovered || isFocused) {
            color = style.highlightColor;
        }
        
        ctx.fillStyle = color;
        ctx.fillText(buttonText, x, y);
    }
    
    function renderSlider(ctx, form, element, x, y, isFocused) {
        const style = form.style;
        const cw = form.charWidth;
        const ch = form.charHeight;
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.textBaseline = 'top';
        
        let currentX = x;
        
        // Render label if present
        if (element.label) {
            ctx.fillStyle = style.textColor;
            ctx.fillText(element.label, currentX, y);
            currentX += (element.label.length + 1) * cw;
        }
        
        // Minus button [-] with larger hit area
        const minusX = currentX;
        ctx.fillStyle = isFocused ? style.highlightColor : style.textColor;
        ctx.fillText('[-]', minusX, y);
        // Make hit box larger (extends beyond text)
        element.hitBoxMinus = { 
            x: minusX - cw, 
            y: y - ch * 0.5, 
            width: 5 * cw, 
            height: ch * 2 
        };
        currentX += 4 * cw;
        
        // Slider track (visual only, not clickable)
        const trackX = currentX;
        const trackWidth = element.width;
        const fillAmount = (element.value - element.min) / (element.max - element.min);
        const filledChars = Math.round(fillAmount * trackWidth);
        
        // Draw filled portion
        ctx.fillStyle = style.highlightColor;
        ctx.fillText(CHARS.SLIDER_FILL.repeat(filledChars), trackX, y);
        
        // Draw empty portion
        ctx.fillStyle = style.dimColor;
        ctx.fillText(CHARS.SLIDER_EMPTY.repeat(trackWidth - filledChars), trackX + filledChars * cw, y);
        
        currentX += (trackWidth + 1) * cw;
        
        // Plus button [+] with larger hit area
        const plusX = currentX;
        ctx.fillStyle = isFocused ? style.highlightColor : style.textColor;
        ctx.fillText('[+]', plusX, y);
        // Make hit box larger (extends beyond text)
        element.hitBoxPlus = { 
            x: plusX - cw, 
            y: y - ch * 0.5, 
            width: 5 * cw, 
            height: ch * 2 
        };
        currentX += 4 * cw;
        
        // Value display
        if (element.showValue) {
            const valueText = `${Math.round(element.value)}%`;
            ctx.fillStyle = style.textColor;
            ctx.fillText(valueText, currentX, y);
        }
    }
    
    function renderRadioGroup(ctx, form, element, x, y, isFocused) {
        const style = form.style;
        const cw = form.charWidth;
        const ch = form.charHeight;
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.textBaseline = 'top';
        
        let currentX = x;
        let currentY = y;
        
        // Render label if present
        if (element.label) {
            ctx.fillStyle = style.textColor;
            ctx.fillText(element.label, currentX, currentY);
            if (element.horizontal) {
                currentX += (element.label.length + 2) * cw;
            } else {
                currentY += ch;
            }
        }
        
        // Clear and rebuild hit boxes
        element.hitBoxes = [];
        
        // Render each option
        element.options.forEach((option, index) => {
            const isSelected = element.value === option.value;
            const radioChar = isSelected ? CHARS.RADIO_FILLED : CHARS.RADIO_EMPTY;
            const optionText = `${radioChar} ${option.label}`;
            
            const optionX = currentX;
            const optionY = currentY;
            
            // Store hit box
            element.hitBoxes.push({
                x: optionX,
                y: optionY,
                width: optionText.length * cw,
                height: ch,
                value: option.value
            });
            
            // Draw
            ctx.fillStyle = isSelected ? style.highlightColor : style.textColor;
            ctx.fillText(optionText, optionX, optionY);
            
            if (element.horizontal) {
                currentX += (optionText.length + 2) * cw;
            } else {
                currentY += ch;
            }
        });
    }
    
    function renderCheckbox(ctx, form, element, x, y, isFocused) {
        const style = form.style;
        const cw = form.charWidth;
        const ch = form.charHeight;
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.textBaseline = 'top';
        
        const checkChar = element.checked ? CHARS.CHECK_FILLED : CHARS.CHECK_EMPTY;
        const fullText = `${checkChar} ${element.label}`;
        
        // Store hit box
        element.hitBox = {
            x: x,
            y: y,
            width: fullText.length * cw,
            height: ch
        };
        
        // Draw
        ctx.fillStyle = (isFocused || element.checked) ? style.highlightColor : style.textColor;
        ctx.fillText(fullText, x, y);
    }
    
    function renderDivider(ctx, form, element, x, y) {
        const style = form.style;
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.textBaseline = 'top';
        ctx.fillStyle = style.dimColor;
        
        const dividerText = element.char.repeat(element.width);
        ctx.fillText(dividerText, x, y);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // HIT TESTING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Check if a point is inside a hit box
     */
    function hitTest(hitBox, x, y) {
        if (!hitBox) return false;
        return x >= hitBox.x && x <= hitBox.x + hitBox.width &&
               y >= hitBox.y && y <= hitBox.y + hitBox.height;
    }
    
    /**
     * Handle a click at the given coordinates
     * @returns {boolean} True if click was handled
     */
    function handleClick(form, x, y) {
        for (let i = 0; i < form.elements.length; i++) {
            const element = form.elements[i];
            
            if (!element.focusable) continue;
            
            switch (element.type) {
                case ELEMENT_TYPES.TEXT_INPUT:
                    if (hitTest(element.hitBox, x, y)) {
                        setFocus(form, i);
                        // Position cursor based on click
                        const relX = x - element.hitBox.x - form.charWidth;
                        element.cursorPos = Math.max(0, Math.min(
                            element.value.length,
                            Math.round(relX / form.charWidth)
                        ));
                        return true;
                    }
                    break;
                    
                case ELEMENT_TYPES.BUTTON:
                    if (hitTest(element.hitBox, x, y)) {
                        setFocus(form, i);
                        if (element.onClick) {
                            element.onClick(element);
                        }
                        return true;
                    }
                    break;
                    
                case ELEMENT_TYPES.SLIDER:
                    // Only +/- buttons are clickable, track is visual only
                    if (hitTest(element.hitBoxMinus, x, y)) {
                        setFocus(form, i);
                        // Use 10% increments
                        adjustSlider(element, -10);
                        return true;
                    }
                    if (hitTest(element.hitBoxPlus, x, y)) {
                        setFocus(form, i);
                        // Use 10% increments
                        adjustSlider(element, 10);
                        return true;
                    }
                    break;
                    
                case ELEMENT_TYPES.RADIO:
                    for (const hitBox of element.hitBoxes) {
                        if (hitTest(hitBox, x, y)) {
                            setFocus(form, i);
                            element.value = hitBox.value;
                            if (element.onChange) {
                                element.onChange(element.value, element);
                            }
                            return true;
                        }
                    }
                    break;
                    
                case ELEMENT_TYPES.CHECKBOX:
                    if (hitTest(element.hitBox, x, y)) {
                        setFocus(form, i);
                        element.checked = !element.checked;
                        if (element.onChange) {
                            element.onChange(element.checked, element);
                        }
                        return true;
                    }
                    break;
            }
        }
        
        return false;
    }
    
    /**
     * Handle mouse move for hover states
     */
    function handleMouseMove(form, x, y) {
        let cursor = 'default';
        
        for (const element of form.elements) {
            if (!element.focusable) continue;
            
            // Reset hover state
            if (element.hovered !== undefined) {
                element.hovered = false;
            }
            
            // Check for hover
            switch (element.type) {
                case ELEMENT_TYPES.BUTTON:
                    if (hitTest(element.hitBox, x, y)) {
                        element.hovered = true;
                        cursor = 'pointer';
                    }
                    break;
                    
                case ELEMENT_TYPES.TEXT_INPUT:
                    if (hitTest(element.hitBox, x, y)) {
                        cursor = 'text';
                    }
                    break;
                    
                case ELEMENT_TYPES.SLIDER:
                    // Only +/- buttons show pointer cursor
                    if (hitTest(element.hitBoxMinus, x, y) ||
                        hitTest(element.hitBoxPlus, x, y)) {
                        cursor = 'pointer';
                    }
                    break;
                    
                case ELEMENT_TYPES.RADIO:
                case ELEMENT_TYPES.CHECKBOX:
                    const boxes = element.hitBoxes || [element.hitBox];
                    for (const box of boxes) {
                        if (hitTest(box, x, y)) {
                            cursor = 'pointer';
                            break;
                        }
                    }
                    break;
            }
        }
        
        return cursor;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // KEYBOARD HANDLING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Handle keyboard input
     * @returns {boolean} True if key was handled
     */
    function handleKeyDown(form, event) {
        const key = event.key;
        const focused = form.focusedIndex >= 0 ? form.elements[form.focusedIndex] : null;
        
        // Tab navigation
        if (key === 'Tab') {
            event.preventDefault();
            if (event.shiftKey) {
                focusPrevious(form);
            } else {
                focusNext(form);
            }
            return true;
        }
        
        // If nothing focused, ignore
        if (!focused) return false;
        
        switch (focused.type) {
            case ELEMENT_TYPES.TEXT_INPUT:
                return handleTextInputKey(form, focused, event);
                
            case ELEMENT_TYPES.BUTTON:
                if (key === 'Enter' || key === ' ') {
                    event.preventDefault();
                    if (focused.onClick) {
                        focused.onClick(focused);
                    }
                    return true;
                }
                break;
                
            case ELEMENT_TYPES.SLIDER:
                if (key === 'ArrowLeft' || key === 'ArrowDown') {
                    event.preventDefault();
                    adjustSlider(focused, -focused.step);
                    return true;
                }
                if (key === 'ArrowRight' || key === 'ArrowUp') {
                    event.preventDefault();
                    adjustSlider(focused, focused.step);
                    return true;
                }
                break;
                
            case ELEMENT_TYPES.RADIO:
                if (key === 'ArrowDown' || key === 'ArrowRight') {
                    event.preventDefault();
                    cycleRadio(focused, 1);
                    return true;
                }
                if (key === 'ArrowUp' || key === 'ArrowLeft') {
                    event.preventDefault();
                    cycleRadio(focused, -1);
                    return true;
                }
                break;
                
            case ELEMENT_TYPES.CHECKBOX:
                if (key === 'Enter' || key === ' ') {
                    event.preventDefault();
                    focused.checked = !focused.checked;
                    if (focused.onChange) {
                        focused.onChange(focused.checked, focused);
                    }
                    return true;
                }
                break;
        }
        
        return false;
    }
    
    function handleTextInputKey(form, element, event) {
        const key = event.key;
        
        // Printable character
        if (key.length === 1 && !event.ctrlKey && !event.metaKey) {
            if (element.value.length < element.maxLength) {
                const before = element.value.substring(0, element.cursorPos);
                const after = element.value.substring(element.cursorPos);
                element.value = before + key + after;
                element.cursorPos++;
            }
            return true;
        }
        
        switch (key) {
            case 'Backspace':
                if (element.cursorPos > 0) {
                    const before = element.value.substring(0, element.cursorPos - 1);
                    const after = element.value.substring(element.cursorPos);
                    element.value = before + after;
                    element.cursorPos--;
                }
                return true;
                
            case 'Delete':
                if (element.cursorPos < element.value.length) {
                    const before = element.value.substring(0, element.cursorPos);
                    const after = element.value.substring(element.cursorPos + 1);
                    element.value = before + after;
                }
                return true;
                
            case 'ArrowLeft':
                if (element.cursorPos > 0) {
                    element.cursorPos--;
                }
                return true;
                
            case 'ArrowRight':
                if (element.cursorPos < element.value.length) {
                    element.cursorPos++;
                }
                return true;
                
            case 'Home':
                element.cursorPos = 0;
                return true;
                
            case 'End':
                element.cursorPos = element.value.length;
                return true;
        }
        
        return false;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // FOCUS MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    function setFocus(form, index) {
        form.focusedIndex = index;
        form.cursorBlinkTimer = 0;  // Reset blink on focus change
    }
    
    function focusNext(form) {
        const focusable = form.elements
            .map((el, i) => ({ el, i }))
            .filter(({ el }) => el.focusable);
        
        if (focusable.length === 0) return;
        
        const currentIdx = focusable.findIndex(({ i }) => i === form.focusedIndex);
        const nextIdx = (currentIdx + 1) % focusable.length;
        setFocus(form, focusable[nextIdx].i);
    }
    
    function focusPrevious(form) {
        const focusable = form.elements
            .map((el, i) => ({ el, i }))
            .filter(({ el }) => el.focusable);
        
        if (focusable.length === 0) return;
        
        const currentIdx = focusable.findIndex(({ i }) => i === form.focusedIndex);
        const prevIdx = currentIdx <= 0 ? focusable.length - 1 : currentIdx - 1;
        setFocus(form, focusable[prevIdx].i);
    }
    
    function clearFocus(form) {
        form.focusedIndex = -1;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // ELEMENT HELPERS
    // ═══════════════════════════════════════════════════════════════════
    
    function adjustSlider(element, delta) {
        element.value = Math.max(element.min, Math.min(element.max, element.value + delta));
        if (element.onChange) {
            element.onChange(element.value, element);
        }
    }
    
    function cycleRadio(element, direction) {
        const currentIdx = element.options.findIndex(opt => opt.value === element.value);
        let newIdx = currentIdx + direction;
        
        if (newIdx < 0) newIdx = element.options.length - 1;
        if (newIdx >= element.options.length) newIdx = 0;
        
        element.value = element.options[newIdx].value;
        if (element.onChange) {
            element.onChange(element.value, element);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // VALUE GETTERS/SETTERS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Get element by ID
     */
    function getElementById(form, id) {
        return form.elements.find(el => el.id === id);
    }
    
    /**
     * Get value of an element by ID
     */
    function getValue(form, id) {
        const element = getElementById(form, id);
        if (!element) return undefined;
        
        switch (element.type) {
            case ELEMENT_TYPES.TEXT_INPUT:
                return element.value;
            case ELEMENT_TYPES.SLIDER:
                return element.value;
            case ELEMENT_TYPES.RADIO:
                return element.value;
            case ELEMENT_TYPES.CHECKBOX:
                return element.checked;
            default:
                return undefined;
        }
    }
    
    /**
     * Set value of an element by ID
     */
    function setValue(form, id, value) {
        const element = getElementById(form, id);
        if (!element) return;
        
        switch (element.type) {
            case ELEMENT_TYPES.TEXT_INPUT:
                element.value = String(value);
                element.cursorPos = element.value.length;
                break;
            case ELEMENT_TYPES.SLIDER:
                element.value = Math.max(element.min, Math.min(element.max, Number(value)));
                break;
            case ELEMENT_TYPES.RADIO:
                element.value = value;
                break;
            case ELEMENT_TYPES.CHECKBOX:
                element.checked = Boolean(value);
                break;
        }
    }
    
    /**
     * Get all form values as an object
     */
    function getValues(form) {
        const values = {};
        
        for (const element of form.elements) {
            if (!element.focusable) continue;
            
            switch (element.type) {
                case ELEMENT_TYPES.TEXT_INPUT:
                    values[element.id] = element.value;
                    break;
                case ELEMENT_TYPES.SLIDER:
                    values[element.id] = element.value;
                    break;
                case ELEMENT_TYPES.RADIO:
                    values[element.id] = element.value;
                    break;
                case ELEMENT_TYPES.CHECKBOX:
                    values[element.id] = element.checked;
                    break;
            }
        }
        
        return values;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        // Constants
        ELEMENT_TYPES,
        CHARS,
        DEFAULT_STYLE,
        
        // Form creation
        createForm,
        
        // Element creation
        addLabel,
        addTextInput,
        addButton,
        addSlider,
        addRadioGroup,
        addCheckbox,
        addDivider,
        
        // Rendering
        render,
        
        // Input handling
        handleClick,
        handleMouseMove,
        handleKeyDown,
        
        // Focus management
        setFocus,
        focusNext,
        focusPrevious,
        clearFocus,
        
        // Value access
        getElementById,
        getValue,
        setValue,
        getValues
    };
    
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ASCIIFormRenderer;
}
