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
  ERROR: 'sync:error',
};

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
  const { addRecentScene } = useSessionStore();
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
      
      // Join as GM
      socket.emit(MessageType.JOIN, {
        name: 'Game Master',
        role: 'gm',
        view: 'gm-overlay',
        sessionId: 'default',
      });

      // Add system message
      addMessage({
        type: 'system',
        text: 'Connected to server',
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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [ioReady, addMessage, setConnectedPlayers, addConnectedPlayer, removeConnectedPlayer]);

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
