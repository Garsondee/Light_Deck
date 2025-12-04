/**
 * SceneManager - Scene state, navigation, and caching
 * 
 * Responsibilities:
 * - Load and cache scene data from server
 * - Track current scene index
 * - Provide prev/next navigation
 * - Emit events when scene changes
 * - Coordinate with SyncManager for multiplayer
 */

const SceneManager = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let initialized = false;
    
    // Scene data
    const state = {
        scenes: [],           // All scenes (sorted)
        currentIndex: -1,     // Current scene index (-1 = none)
        currentScene: null,   // Current scene data
        loading: false
    };
    
    // Cache for loaded scenes
    const cache = new Map();
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Initialize the scene manager
     */
    async function init() {
        if (initialized) {
            console.warn('[SceneManager] Already initialized');
            return;
        }
        
        // Load scene list
        await loadSceneList();
        
        // Listen for sync scene changes (from other GM)
        if (typeof EventBus !== 'undefined') {
            EventBus.on('sync:scene_change', handleRemoteSceneChange);
        }
        
        initialized = true;
        console.log('[SceneManager] Initialized with', state.scenes.length, 'scenes');
        
        return state.scenes;
    }
    
    /**
     * Load the list of all scenes from server
     */
    async function loadSceneList() {
        try {
            state.loading = true;
            const response = await fetch('/api/scenes');
            state.scenes = await response.json();
            state.loading = false;
            
            // Cache all scenes
            for (const scene of state.scenes) {
                cache.set(scene.id, scene);
            }
            
            console.log('[SceneManager] Loaded', state.scenes.length, 'scenes');
        } catch (err) {
            console.error('[SceneManager] Failed to load scenes:', err);
            state.scenes = [];
            state.loading = false;
        }
    }
    
    /**
     * Handle remote scene change from SyncManager
     */
    function handleRemoteSceneChange(data) {
        const { scene: sceneId } = data;
        
        // Find scene in our list
        const index = state.scenes.findIndex(s => s.id === sceneId);
        if (index !== -1) {
            setCurrentIndex(index, false); // Don't broadcast (we received it)
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Go to a specific scene by index
     * @param {number} index - Scene index
     * @param {boolean} broadcast - Whether to broadcast to other players (default: true)
     * @param {boolean} withTransition - Whether to use power-down/up transition (default: true)
     */
    function setCurrentIndex(index, broadcast = true, withTransition = true) {
        if (index < 0 || index >= state.scenes.length) {
            console.warn('[SceneManager] Invalid scene index:', index);
            return false;
        }
        
        // Skip transition if it's the initial load (no previous scene)
        const isInitialLoad = state.currentIndex === -1;
        const shouldTransition = withTransition && !isInitialLoad && typeof TransitionManager !== 'undefined';
        
        const previousIndex = state.currentIndex;
        const newScene = state.scenes[index];
        
        if (shouldTransition) {
            // Use TransitionManager for smooth scene change
            TransitionManager.transition({
                powerDownDuration: 1800,
                blackPauseDuration: 900,
                powerUpDuration: 1500,
                onMidpoint: () => {
                    // Update state at the black point
                    state.currentIndex = index;
                    state.currentScene = newScene;
                    
                    console.log('[SceneManager] Scene changed:', state.currentScene.title);
                    
                    // Load the scene image
                    if (typeof ThreeSetup !== 'undefined' && state.currentScene.imageUrl) {
                        ThreeSetup.loadSceneImage(state.currentScene.imageUrl);
                    }
                    
                    // Emit local event
                    if (typeof EventBus !== 'undefined') {
                        EventBus.emit('scene:changed', {
                            scene: state.currentScene,
                            index: state.currentIndex,
                            previousIndex
                        });
                    }
                    
                    // Broadcast to other players if GM
                    if (broadcast && typeof SyncManager !== 'undefined' && SyncManager.isGM()) {
                        SyncManager.broadcastSceneChange(state.currentScene.id, { fade: true });
                    }
                }
            });
        } else {
            // Immediate change (initial load or transition disabled)
            state.currentIndex = index;
            state.currentScene = newScene;
            
            console.log('[SceneManager] Scene changed:', state.currentScene.title);
            
            // Emit local event
            if (typeof EventBus !== 'undefined') {
                EventBus.emit('scene:changed', {
                    scene: state.currentScene,
                    index: state.currentIndex,
                    previousIndex
                });
            }
            
            // Broadcast to other players if GM
            if (broadcast && typeof SyncManager !== 'undefined' && SyncManager.isGM()) {
                SyncManager.broadcastSceneChange(state.currentScene.id, { fade: true });
            }
            
            // Load the scene image
            if (typeof ThreeSetup !== 'undefined' && state.currentScene.imageUrl) {
                ThreeSetup.loadSceneImage(state.currentScene.imageUrl);
            }
        }
        
        return true;
    }
    
    /**
     * Go to a scene by ID
     * @param {string} sceneId - Scene ID
     * @param {boolean} broadcast - Whether to broadcast
     */
    function goToScene(sceneId, broadcast = true) {
        const index = state.scenes.findIndex(s => s.id === sceneId);
        if (index === -1) {
            console.warn('[SceneManager] Scene not found:', sceneId);
            return false;
        }
        return setCurrentIndex(index, broadcast);
    }
    
    /**
     * Go to a scene by act.chapter.scene notation
     * @param {number} act
     * @param {number} chapter
     * @param {number} scene
     * @param {boolean} broadcast
     */
    function goToSceneByNumber(act, chapter, scene, broadcast = true) {
        const index = state.scenes.findIndex(s => 
            s.act === act && s.chapter === chapter && s.scene === scene
        );
        if (index === -1) {
            console.warn('[SceneManager] Scene not found:', `${act}.${chapter}.${scene}`);
            return false;
        }
        return setCurrentIndex(index, broadcast);
    }
    
    /**
     * Go to the next scene
     */
    function nextScene() {
        if (state.currentIndex < state.scenes.length - 1) {
            return setCurrentIndex(state.currentIndex + 1);
        }
        return false;
    }
    
    /**
     * Go to the previous scene
     */
    function prevScene() {
        if (state.currentIndex > 0) {
            return setCurrentIndex(state.currentIndex - 1);
        }
        return false;
    }
    
    /**
     * Go to the first scene
     */
    function firstScene() {
        if (state.scenes.length > 0) {
            return setCurrentIndex(0);
        }
        return false;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // GETTERS
    // ═══════════════════════════════════════════════════════════════════
    
    function getCurrentScene() {
        return state.currentScene;
    }
    
    function getCurrentIndex() {
        return state.currentIndex;
    }
    
    function getSceneCount() {
        return state.scenes.length;
    }
    
    function getAllScenes() {
        return [...state.scenes];
    }
    
    function getSceneById(id) {
        return cache.get(id) || null;
    }
    
    function hasNext() {
        return state.currentIndex < state.scenes.length - 1;
    }
    
    function hasPrev() {
        return state.currentIndex > 0;
    }
    
    function isLoading() {
        return state.loading;
    }
    
    /**
     * Get scene position string (e.g., "1.1.2")
     */
    function getScenePosition(scene) {
        scene = scene || state.currentScene;
        if (!scene) return '';
        return `${scene.act}.${scene.chapter}.${scene.scene}`;
    }
    
    /**
     * Get full scene label (e.g., "Act 1 / Chapter 1 / Scene 2: The Chase")
     */
    function getSceneLabel(scene) {
        scene = scene || state.currentScene;
        if (!scene) return '';
        return `Act ${scene.act} / Ch ${scene.chapter} / Scene ${scene.scene}: ${scene.title}`;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        // Lifecycle
        init,
        loadSceneList,
        
        // Navigation
        setCurrentIndex,
        goToScene,
        goToSceneByNumber,
        nextScene,
        prevScene,
        firstScene,
        
        // Getters
        getCurrentScene,
        getCurrentIndex,
        getSceneCount,
        getAllScenes,
        getSceneById,
        hasNext,
        hasPrev,
        isLoading,
        getScenePosition,
        getSceneLabel
    };
})();

console.log('[SceneManager] Module loaded');
