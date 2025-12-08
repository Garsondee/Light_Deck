import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { useSceneStore } from '../store/sceneStore';
import { useSessionStore } from '../store/sessionStore';
import { usePlayerStore } from '../store/playerStore';
import type { ConnectedPlayer } from '../types';

// Socket.io types
interface Socket {
  id: string;
  connected: boolean;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
  emit: (event: string, data: any) => void;
  disconnect: () => void;
}

// Message types (must match server)
const MessageType = {
  JOIN: 'sync:join',
  LEAVE: 'sync:leave',
  PRESENCE: 'sync:presence',
  VIEW_CHANGE: 'sync:view_change',
  CHAT: 'sync:chat',
  ROLL: 'sync:roll',
  SCENE_CHANGE: 'sync:scene_change',
  STATE_SYNC: 'sync:state',
  STATE_REQUEST: 'sync:state_request',
  ERROR: 'sync:error',
  // Session persistence
  TOKEN: 'sync:token',
  NPC_STATE: 'sync:npc_state',
  FLAG_UPDATE: 'sync:flag_update',
};

// Storage key for session token
const TOKEN_STORAGE_KEY = 'lightdeck_gm_session_token';

// Get io from window (loaded via script tag)
function getIO(): ((url: string, options?: any) => Socket) | null {
  return (window as any).io || null;
}

/**
 * Bridge between the React GM Overlay and the server via Socket.io.
 * Handles real-time chat, dice rolls, presence, and scene synchronization.
 */
export function useSyncManager() {
  const socketRef = useRef<Socket | null>(null);
  const [ioReady, setIoReady] = useState(() => getIO() !== null);
  const { addMessage } = useChatStore();
  const { goToSceneById, loadScenes, activateScene } = useSceneStore();
  const { addRecentScene, setFlag } = useSessionStore();
  const { setConnectedPlayers, addConnectedPlayer, removeConnectedPlayer } = usePlayerStore();

  // Wait for Socket.io to load
  useEffect(() => {
    if (ioReady) return;
    
    console.log('[GM Overlay] Waiting for Socket.io to load...');
    
    const checkIO = () => {
      if (getIO()) {
        console.log('[GM Overlay] Socket.io loaded');
        setIoReady(true);
      }
    };
    
    // Check periodically
    const interval = setInterval(checkIO, 200);
    
    // Also check on script load events
    const handleLoad = () => checkIO();
    window.addEventListener('load', handleLoad);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('load', handleLoad);
    };
  }, [ioReady]);

  // Connect to Socket.io server once io is ready
  useEffect(() => {
    if (!ioReady) return;
    
    const io = getIO();
    if (!io) return;

    // Connect to the main server
    // In dev, connect directly to port 3000 since we're using CDN for socket.io client
    const serverUrl = window.location.port === '5174' || window.location.port === '5175'
      ? 'http://localhost:3000'
      : '/';
    
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[GM Overlay] Connected to server:', socket.id);
      
      // Check for existing session token
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      
      // Join as GM (with token for reconnection)
      socket.emit(MessageType.JOIN, {
        name: 'Game Master',
        role: 'gm',
        view: 'gm-overlay',
        sessionId: 'default',
        token: storedToken,
      });

      // Add system message
      addMessage({
        type: 'system',
        text: storedToken ? 'Reconnected to server' : 'Connected to server',
      });
    });

    socket.on('disconnect', () => {
      console.log('[GM Overlay] Disconnected from server');
      addMessage({
        type: 'system',
        text: 'Disconnected from server',
      });
    });

    // Handle incoming chat messages
    socket.on(MessageType.CHAT, (data) => {
      // Don't duplicate our own messages (we add them locally)
      if (data.from === socket.id) return;
      
      addMessage({
        type: data.type === 'gm' ? 'gm' : 'player',
        sender: data.name,
        text: data.text,
      });
    });

    // Handle dice rolls
    socket.on(MessageType.ROLL, (data) => {
      addMessage({
        type: 'rolls',
        sender: data.name,
        text: `rolled ${data.expression} = ${data.total}`,
      });
    });

    // Handle presence updates
    socket.on(MessageType.PRESENCE, (data) => {
      console.log('[GM Overlay] Presence update:', data.users);
      
      // Update player store with connected users
      const players: ConnectedPlayer[] = data.users.map((u: any) => ({
        socketId: u.socketId || u.id,
        name: u.name,
        role: u.role,
        view: u.view || 'unknown',
        characterId: u.characterId,
      }));
      setConnectedPlayers(players);
      
      addMessage({
        type: 'system',
        text: `${data.users.length} user(s) connected`,
      });
    });

    // Handle user join
    socket.on(MessageType.JOIN, (data) => {
      // Add to connected players
      addConnectedPlayer({
        socketId: data.socketId || data.id || '',
        name: data.name,
        role: data.role,
        view: data.view || 'unknown',
        characterId: data.characterId,
      });
      
      addMessage({
        type: 'system',
        text: `${data.name} joined (${data.role})`,
      });
    });

    // Handle user leave
    socket.on(MessageType.LEAVE, (data) => {
      // Remove from connected players
      if (data?.socketId) {
        removeConnectedPlayer(data.socketId);
      }
      
      addMessage({
        type: 'system',
        text: `User left`,
      });
    });

    // Handle errors
    socket.on(MessageType.ERROR, (data) => {
      console.error('[GM Overlay] Server error:', data.message);
      addMessage({
        type: 'system',
        text: `Error: ${data.message}`,
      });
    });

    // Handle session token (store for reconnection)
    socket.on(MessageType.TOKEN, (data) => {
      if (data.token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        console.log('[GM Overlay] Session token stored');
      }
    });

    // Handle state sync (restore session state on reconnect)
    socket.on(MessageType.STATE_SYNC, (data) => {
      console.log('[GM Overlay] State sync received:', data);
      
      // Restore scene if provided
      if (data.currentScene) {
        console.log('[GM Overlay] Restoring scene:', data.currentScene);
        goToSceneById(data.currentScene);
        addRecentScene(data.currentScene);
      }
      
      // Restore flags if provided
      if (data.flags) {
        console.log('[GM Overlay] Restoring flags:', Object.keys(data.flags).length);
        for (const [key, value] of Object.entries(data.flags)) {
          setFlag(key, value as boolean | string);
        }
      }
      
      addMessage({
        type: 'system',
        text: 'Session state restored',
      });
    });

    // Handle NPC state updates
    socket.on(MessageType.NPC_STATE, (data) => {
      // Don't echo our own updates
      if (data.from === socket.id) return;
      
      console.log('[GM Overlay] NPC state update:', data.npcId, data);
      // NPC state updates are handled by the scene store or a dedicated NPC store
      // For now, just log them - can be wired to UI later
    });

    // Handle flag updates from other clients
    socket.on(MessageType.FLAG_UPDATE, (data) => {
      // Don't echo our own updates
      if (data.from === socket.id) return;
      
      console.log('[GM Overlay] Flag update:', data.key, '=', data.value);
      setFlag(data.key, data.value);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [ioReady, addMessage, setConnectedPlayers, addConnectedPlayer, removeConnectedPlayer, goToSceneById, addRecentScene, setFlag]);

  // Handle scene activation events
  useEffect(() => {
    const handleActivateScene = (e: CustomEvent) => {
      const { sceneId, scene } = e.detail;
      
      // Log to chat
      addMessage({
        type: 'system',
        text: `Scene activated: ${scene?.title || sceneId}`,
      });
      
      // Track as recent
      addRecentScene(sceneId);
      
      // Broadcast to players via Socket.io
      if (socketRef.current?.connected) {
        socketRef.current.emit(MessageType.SCENE_CHANGE, {
          scene: sceneId,
          transition: 'fade',
        });
        console.log('[GM Overlay] Scene broadcast to players:', sceneId);
      }
    };

    window.addEventListener('gm-overlay:activate-scene', handleActivateScene as EventListener);

    return () => {
      window.removeEventListener('gm-overlay:activate-scene', handleActivateScene as EventListener);
    };
  }, [addMessage, addRecentScene]);

  // Expose API for components to send messages
  useEffect(() => {
    (window as any).GMOverlay = {
      socket: socketRef.current,
      chat: {
        send: (text: string) => {
          if (socketRef.current?.connected) {
            socketRef.current.emit(MessageType.CHAT, {
              text,
              type: 'gm',
              timestamp: Date.now(),
            });
          }
        },
        addMessage: (msg: { type: string; sender?: string; text: string }) => {
          addMessage(msg as any);
        },
      },
      scene: {
        goTo: (sceneId: string) => {
          goToSceneById(sceneId);
          addRecentScene(sceneId);
        },
        reload: (adventureId: string) => {
          loadScenes(adventureId);
        },
        activate: (sceneId: string) => {
          activateScene(sceneId);
        },
      },
    };

    return () => {
      delete (window as any).GMOverlay;
    };
  }, [addMessage, goToSceneById, addRecentScene, loadScenes, activateScene]);
}
