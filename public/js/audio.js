/**
 * Light Deck - Audio System
 * MP3 playback with HTML5 Audio + procedural SFX
 */

const Audio = (function() {
    let tracks = [];
    let player = null;  // HTML5 Audio element
    
    const state = {
        musicEnabled: true,
        sfxEnabled: true,
        musicVolume: 0.5,
        sfxVolume: 0.7,
        isPlaying: false,
        currentTrackId: null
    };
    
    /**
     * Load available tracks from server
     */
    async function loadTrackList() {
        try {
            const response = await fetch('/api/music');
            tracks = await response.json();
            console.log(`[AUDIO] Loaded ${tracks.length} tracks`);
            return tracks;
        } catch (err) {
            console.error('[AUDIO] Failed to load track list:', err);
            return [];
        }
    }
    
    /**
     * Play a track by ID or URL
     */
    async function play(trackIdOrUrl, loop = true) {
        console.log(`[AUDIO] play() called with: ${trackIdOrUrl}`);
        
        // Stop any currently playing track
        stop();
        
        // Find track URL
        let url = trackIdOrUrl;
        let trackInfo = null;
        
        if (!trackIdOrUrl.startsWith('/') && !trackIdOrUrl.startsWith('http')) {
            trackInfo = tracks.find(t => t.id === trackIdOrUrl);
            if (trackInfo) {
                url = trackInfo.url;
                console.log(`[AUDIO] Found track: ${trackInfo.name}, URL: ${url}`);
            } else {
                console.error(`[AUDIO] Track not found: ${trackIdOrUrl}`);
                return { success: false, error: `Track not found: ${trackIdOrUrl}` };
            }
        }
        
        try {
            // Create new audio element
            player = new window.Audio(url);
            player.loop = loop;
            player.volume = state.musicVolume;
            
            // Set up event handlers
            player.addEventListener('error', (e) => {
                const error = player.error;
                console.error('[AUDIO] Playback error:', error?.message || 'Unknown error');
            });
            
            player.addEventListener('ended', () => {
                if (!loop) {
                    state.isPlaying = false;
                    state.currentTrackId = null;
                    console.log('[AUDIO] Track ended');
                }
            });
            
            // Start playback
            await player.play();
            
            state.currentTrackId = trackInfo?.id || url;
            state.isPlaying = true;
            
            console.log(`[AUDIO] Playing: ${trackInfo?.name || url}`);
            return { success: true, trackName: trackInfo?.name || url };
            
        } catch (err) {
            const errorMsg = err.message || String(err);
            console.error('[AUDIO] Failed to play:', errorMsg);
            return { success: false, error: errorMsg };
        }
    }
    
    /**
     * Stop playback
     */
    function stop() {
        if (player) {
            player.pause();
            player.currentTime = 0;
            player = null;
        }
        
        state.isPlaying = false;
        state.currentTrackId = null;
        
        console.log('[AUDIO] Stopped');
    }
    
    /**
     * Pause playback
     */
    function pause() {
        if (player && state.isPlaying) {
            player.pause();
            state.isPlaying = false;
            console.log('[AUDIO] Paused');
        }
    }
    
    /**
     * Resume playback
     */
    function resume() {
        if (player && !state.isPlaying) {
            player.play();
            state.isPlaying = true;
            console.log('[AUDIO] Resumed');
        }
    }
    
    /**
     * Set music volume (0-1)
     */
    function setMusicVolume(vol) {
        state.musicVolume = Math.max(0, Math.min(1, vol));
        if (player) {
            player.volume = state.musicVolume;
        }
    }
    
    /**
     * Toggle music on/off
     */
    function toggleMusic(enabled) {
        state.musicEnabled = enabled !== undefined ? enabled : !state.musicEnabled;
        if (!state.musicEnabled && state.isPlaying) {
            pause();
        }
        return state.musicEnabled;
    }
    
    /**
     * Get list of available tracks
     */
    function getTracks() {
        return [...tracks];
    }
    
    /**
     * Get current state
     */
    function getState() {
        return { ...state };
    }
    
    // Procedural SFX using Web Audio API
    const SFX = {
        ctx: null,
        
        getContext() {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            return this.ctx;
        },
        
        keystroke() {
            if (!state.sfxEnabled) return;
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'square';
            osc.frequency.value = 800 + Math.random() * 400;
            
            gain.gain.setValueAtTime(0.1 * state.sfxVolume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        },
        
        beep(freq = 880) {
            if (!state.sfxEnabled) return;
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0.2 * state.sfxVolume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        },
        
        errorBuzz() {
            if (!state.sfxEnabled) return;
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'square';
            osc.frequency.value = 120;
            
            gain.gain.setValueAtTime(0.15 * state.sfxVolume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        },
        
        glitchCrackle(duration = 0.3) {
            if (!state.sfxEnabled) return;
            const ctx = this.getContext();
            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }
            
            const source = ctx.createBufferSource();
            const gain = ctx.createGain();
            
            source.buffer = buffer;
            gain.gain.value = 0.1 * state.sfxVolume;
            
            source.connect(gain).connect(ctx.destination);
            source.start();
        }
    };
    
    // Public API
    return {
        play,
        stop,
        pause,
        resume,
        setMusicVolume,
        toggleMusic,
        getTracks,
        getState,
        loadTrackList,
        SFX
    };
})();
