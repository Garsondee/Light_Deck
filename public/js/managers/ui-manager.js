/**
 * UIManager - Handles clickable UI elements via Three.js raycasting
 * 
 * Manages:
 * - Mouse/touch input to Three.js raycasting
 * - Clickable text elements like [d6], [TERM], [ROLL]
 * - Hover states for UI feedback
 * - Routing clicks to appropriate managers
 */

const UIManager = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let initialized = false;
    
    // Three.js objects
    let camera = null;
    let scene = null;
    let renderer = null;
    let raycaster = null;
    let mouse = new THREE.Vector2();
    
    // UI panels that can receive clicks
    const clickablePanels = new Map();  // name -> { plane, manager, toCanvasCoords }
    
    // Clickable 3D objects (buttons, etc.)
    const clickableObjects = new Map();  // mesh -> callback
    
    // Draggable 3D objects (dials, etc.)
    const draggableObjects = new Map();  // mesh -> callback
    let isDragging = false;
    let dragTarget = null;
    let dragStartY = 0;
    
    // Hover state
    let hoveredElement = null;
    let hoveredPanel = null;
    let hoveredObject = null;
    
    // Action handlers
    const actionHandlers = {
        onTerminalToggle: null,
        onDiceRoll: null,
        onDiceAdd: null,
        onClear: null
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Initialize the UI manager
     * @param {Object} options - { camera, scene, renderer }
     */
    function init(options = {}) {
        if (initialized) {
            console.warn('[UIManager] Already initialized');
            return;
        }
        
        camera = options.camera;
        scene = options.scene;
        renderer = options.renderer;
        
        if (!camera || !renderer) {
            console.error('[UIManager] Requires camera and renderer');
            return;
        }
        
        raycaster = new THREE.Raycaster();
        
        // Set up event listeners
        const canvas = renderer.domElement;
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        
        initialized = true;
        console.log('[UIManager] Initialized');
    }
    
    /**
     * Register a clickable panel
     * @param {string} name - Panel name
     * @param {THREE.Mesh} plane - The Three.js plane mesh
     * @param {Object} manager - Manager with handleClick(x, y) method
     * @param {Object} layout - { width, height } of the canvas
     */
    function registerPanel(name, plane, manager, layout) {
        clickablePanels.set(name, {
            plane,
            manager,
            layout
        });
        console.log(`[UIManager] Registered panel: ${name}`);
    }
    
    /**
     * Unregister a panel
     */
    function unregisterPanel(name) {
        clickablePanels.delete(name);
    }
    
    /**
     * Register action handlers
     */
    function registerHandlers(handlers) {
        Object.assign(actionHandlers, handlers);
    }
    
    /**
     * Register a clickable 3D object (button, etc.)
     * @param {THREE.Object3D} object - The clickable object or group
     * @param {Function} callback - Called when clicked
     */
    function registerClickable(object, callback) {
        clickableObjects.set(object, callback);
    }
    
    /**
     * Unregister a clickable object
     */
    function unregisterClickable(object) {
        clickableObjects.delete(object);
    }
    
    /**
     * Register a draggable 3D object (dial, slider, etc.)
     * @param {THREE.Object3D} object - The draggable object
     * @param {Function} callback - Called with delta { x, y } during drag
     */
    function registerDraggable(object, callback) {
        draggableObjects.set(object, callback);
    }
    
    /**
     * Unregister a draggable object
     */
    function unregisterDraggable(object) {
        draggableObjects.delete(object);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Handle mouse click
     */
    function handleClick(event) {
        if (!initialized || isDragging) return;
        
        updateMousePosition(event);
        
        // First check for clickable 3D objects (buttons, etc.)
        const objectHit = raycastClickables();
        if (objectHit) {
            const callback = clickableObjects.get(objectHit.object) || 
                             clickableObjects.get(objectHit.object.parent);
            if (callback) {
                callback();
                event.preventDefault();
                return;
            }
        }
        
        // Then check panels
        const hit = raycastPanels();
        if (hit) {
            const { panel, canvasX, canvasY, name } = hit;
            
            // Route to panel's manager
            if (panel.manager && typeof panel.manager.handleClick === 'function') {
                const handled = panel.manager.handleClick(canvasX, canvasY);
                if (handled) {
                    event.preventDefault();
                }
            }
        }
    }
    
    /**
     * Handle mouse down (start drag)
     */
    function handleMouseDown(event) {
        if (!initialized) return;
        
        updateMousePosition(event);
        
        // Check for draggable objects
        const hit = raycastDraggables();
        if (hit) {
            isDragging = true;
            dragTarget = hit.object.parent || hit.object;
            dragStartY = event.clientY;
            event.preventDefault();
        }
    }
    
    /**
     * Handle mouse up (end drag)
     */
    function handleMouseUp(event) {
        if (isDragging) {
            isDragging = false;
            dragTarget = null;
        }
    }
    
    /**
     * Handle mouse move (for hover effects and dragging)
     */
    function handleMouseMove(event) {
        if (!initialized) return;
        
        // Handle dragging
        if (isDragging && dragTarget) {
            const deltaY = event.clientY - dragStartY;
            dragStartY = event.clientY;
            
            // Find callback for drag target
            const callback = draggableObjects.get(dragTarget) ||
                             draggableObjects.get(dragTarget.parent);
            if (callback) {
                callback({ x: 0, y: deltaY });
            }
            return;
        }
        
        updateMousePosition(event);
        
        const hit = raycastPanels();
        
        if (hit) {
            const { panel, canvasX, canvasY, name } = hit;
            
            // Check for hoverable elements
            if (panel.manager && typeof panel.manager.getClickableElements === 'function') {
                const elements = panel.manager.getClickableElements();
                let foundHover = false;
                
                for (const element of elements) {
                    if (canvasX >= element.x && canvasX <= element.x + element.width &&
                        canvasY >= element.y && canvasY <= element.y + element.height) {
                        
                        if (hoveredElement !== element) {
                            hoveredElement = element;
                            hoveredPanel = name;
                            setCursor('pointer');
                        }
                        foundHover = true;
                        break;
                    }
                }
                
                if (!foundHover && hoveredElement) {
                    hoveredElement = null;
                    hoveredPanel = null;
                    setCursor('default');
                }
            }
        } else if (hoveredElement) {
            hoveredElement = null;
            hoveredPanel = null;
            setCursor('default');
        }
    }
    
    /**
     * Handle touch start
     */
    function handleTouchStart(event) {
        if (!initialized || event.touches.length === 0) return;
        
        const touch = event.touches[0];
        updateMousePosition(touch);
        
        const hit = raycastPanels();
        if (hit) {
            const { panel, canvasX, canvasY } = hit;
            
            if (panel.manager && typeof panel.manager.handleClick === 'function') {
                const handled = panel.manager.handleClick(canvasX, canvasY);
                if (handled) {
                    event.preventDefault();
                }
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // RAYCASTING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Update mouse position in normalized device coordinates
     */
    function updateMousePosition(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    /**
     * Raycast against registered panels
     * @returns {Object|null} { panel, canvasX, canvasY, name } or null
     */
    function raycastPanels() {
        raycaster.setFromCamera(mouse, camera);
        
        // Get all panel meshes
        const meshes = [];
        const meshToName = new Map();
        
        for (const [name, panel] of clickablePanels) {
            if (panel.plane && panel.plane.visible) {
                meshes.push(panel.plane);
                meshToName.set(panel.plane, name);
            }
        }
        
        if (meshes.length === 0) return null;
        
        const intersects = raycaster.intersectObjects(meshes);
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            const name = meshToName.get(hit.object);
            const panel = clickablePanels.get(name);
            
            if (panel) {
                // Convert UV coordinates to canvas coordinates
                const uv = hit.uv;
                const canvasX = uv.x * panel.layout.width;
                const canvasY = (1 - uv.y) * panel.layout.height;  // Flip Y
                
                return { panel, canvasX, canvasY, name };
            }
        }
        
        return null;
    }
    
    /**
     * Raycast against clickable 3D objects
     * @returns {Object|null} Intersection result or null
     */
    function raycastClickables() {
        if (clickableObjects.size === 0) return null;
        
        raycaster.setFromCamera(mouse, camera);
        
        // Collect all meshes from clickable objects (including children)
        const meshes = [];
        for (const [obj] of clickableObjects) {
            obj.traverse(child => {
                if (child.isMesh) meshes.push(child);
            });
        }
        
        if (meshes.length === 0) return null;
        
        const intersects = raycaster.intersectObjects(meshes);
        return intersects.length > 0 ? intersects[0] : null;
    }
    
    /**
     * Raycast against draggable 3D objects
     * @returns {Object|null} Intersection result or null
     */
    function raycastDraggables() {
        if (draggableObjects.size === 0) return null;
        
        raycaster.setFromCamera(mouse, camera);
        
        // Collect all meshes from draggable objects (including children)
        const meshes = [];
        for (const [obj] of draggableObjects) {
            obj.traverse(child => {
                if (child.isMesh) meshes.push(child);
            });
        }
        
        if (meshes.length === 0) return null;
        
        const intersects = raycaster.intersectObjects(meshes);
        return intersects.length > 0 ? intersects[0] : null;
    }
    
    /**
     * Set cursor style
     */
    function setCursor(style) {
        if (renderer && renderer.domElement) {
            renderer.domElement.style.cursor = style;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        init,
        registerPanel,
        unregisterPanel,
        registerHandlers,
        
        // 3D object interaction
        registerClickable,
        unregisterClickable,
        registerDraggable,
        unregisterDraggable,
        
        // State
        getHoveredElement: () => hoveredElement,
        getHoveredPanel: () => hoveredPanel,
        
        // Manual raycast (for external use)
        raycast: raycastPanels
    };
})();

console.log('[UIManager] Module loaded');
