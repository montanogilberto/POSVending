// main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { UserProvider } from './components/UserContext';
import { CartProvider } from './context/CartContext';

// NOTE:
// Removed manual chrome.runtime listener/lastError polling.
// Those handlers can themselves trigger noisy extension-channel errors
// such as: "A listener indicated an asynchronous response..."
// and are unrelated to core app rendering/auth logic.

// ── Render ────────────────────────────────────────────────────────────────
console.log("🔵 App root rendered with UserProvider & CartProvider");
const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <UserProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </UserProvider>
  </React.StrictMode>
);
