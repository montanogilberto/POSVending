// main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { UserProvider } from './components/UserContext';
import { CartProvider } from './context/CartContext';
import { ObservabilityProvider } from './contexts/ObservabilityContext';
import { installObservabilityFetch } from './utils/observability';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

// Install the global fetch interceptor before anything makes a request, so every
// backend call carries trace/identity headers (X-Correlation-Id / X-Workflow-Id / …).
installObservabilityFetch();

// NOTE:
// Removed manual chrome.runtime listener/lastError polling.
// Those handlers can themselves trigger noisy extension-channel errors
// such as: "A listener indicated an asynchronous response..."
// and are unrelated to core app rendering/auth logic.

// ── Render ────────────────────────────────────────────────────────────────
defineCustomElements(window);
console.log("🔵 App root rendered with UserProvider & CartProvider");
const container = document.getElementById('root');
const root = createRoot(container!);

// StrictMode is intentionally not used here: its dev-only double-mount/cleanup
// cycle conflicts with IonRouterOutlet's imperative (non-React) page-transition
// DOM handling, causing a removeChild crash on fast route pushes (e.g. right
// after login). This is a dev-only interaction — StrictMode is already a no-op
// in production builds, so this only affects local dev, not what ships.
root.render(
  <UserProvider>
    <ObservabilityProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </ObservabilityProvider>
  </UserProvider>
);
