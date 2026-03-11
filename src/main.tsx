// main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { UserProvider } from './components/UserContext';
import { CartProvider } from './context/CartContext';

// ── Chrome Runtime Error Suppression ──────────────────────────────────────
// Prevents "Unchecked runtime.lastError" warnings in console
const getChromeRuntime = () => {
  if (typeof window !== 'undefined' && (window as any).chrome?.runtime) {
    return (window as any).chrome.runtime;
  }
  return null;
};

const chromeRuntime = getChromeRuntime();

if (chromeRuntime?.onMessage) {
  chromeRuntime.onMessage.addListener((_message: any, _sender: any, sendResponse: any) => {
    try {
      sendResponse({ success: true });
    } catch (e) {
      // Ignore sendResponse errors
    }
    return false;
  });
}

const suppressRuntimeErrors = () => {
  try {
    if (chromeRuntime && (chromeRuntime as any).lastError) {
      const _ = (chromeRuntime as any).lastError;
    }
  } catch (e) {
    // Ignore
  }
};

if (typeof window !== 'undefined') {
  setInterval(suppressRuntimeErrors, 100);
}

// ── Render ────────────────────────────────────────────────────────────────
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
