import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

// Mount the GM Overlay React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Export mount function for integration with main app
export function mountGMOverlay(targetElement?: HTMLElement) {
  const container = targetElement || document.getElementById('gm-overlay-root');
  if (!container) {
    const div = document.createElement('div');
    div.id = 'gm-overlay-root';
    document.body.appendChild(div);
    return mountGMOverlay(div);
  }

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  return {
    unmount: () => root.unmount(),
  };
}

// Expose to window for integration with vanilla JS
declare global {
  interface Window {
    GMOverlayReact: {
      mount: typeof mountGMOverlay;
    };
  }
}

window.GMOverlayReact = { mount: mountGMOverlay };
