// main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Route, BrowserRouter as Router, Switch } from 'react-router-dom'; // Import BrowserRouter
import Login from './pages/Authentication/Login';
import App from './App';
import ForgotPassword from './pages/Authentication/ForgotPassword';
import CreateAccount from './pages/Authentication/CreateAccount';

// Chrome Runtime Error Suppression
// This prevents the "Unchecked runtime.lastError" warning from appearing in console
// We use a type-safe approach to check for chrome.runtime
const getChromeRuntime = () => {
  if (typeof window !== 'undefined' && (window as any).chrome?.runtime) {
    return (window as any).chrome.runtime;
  }
  return null;
};

const chromeRuntime = getChromeRuntime();

if (chromeRuntime?.onMessage) {
  chromeRuntime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    // Suppress the error by sending a response for async listeners
    try {
      sendResponse({ success: true });
    } catch (e) {
      // Ignore sendResponse errors
    }
    return false; // Don't keep the message channel open
  });
}

// Suppress any runtime.lastError by checking it periodically
const suppressRuntimeErrors = () => {
  try {
    if (chromeRuntime && (chromeRuntime as any).lastError) {
      // Clear the error by accessing it
      const _ = (chromeRuntime as any).lastError;
    }
  } catch (e) {
    // Ignore errors
  }
};

// Periodically suppress runtime errors
if (typeof window !== 'undefined') {
  setInterval(suppressRuntimeErrors, 100);
}

const container = document.getElementById('root');
const root = createRoot(container!);
import { UserProvider } from './components/UserContext';
import { CartProvider } from './context/CartContext';

const Main: React.FC = () => {
  // State to manage authentication, initialized from localStorage
  const [authenticated, setAuthenticated] = React.useState(() => {
    return localStorage.getItem('authenticated') === 'true';
  });

  // Callback to set authentication state when login is successful
  const handleLoginSuccess = () => {
    setAuthenticated(true);
    localStorage.setItem('authenticated', 'true');
  };

  return (
    <UserProvider>
      <CartProvider>
        <Router> {/* Wrap your entire application with BrowserRouter */}
          <React.StrictMode>
            <Switch>
              <Route path="/forgot-password" component={ForgotPassword} />
              <Route path="/create-account" component={CreateAccount} />
              <Route path="/login">
                <Login onLoginSuccess={handleLoginSuccess} />
              </Route>
              <Route>
                {/* Default route */}
                {authenticated ? <App /> : <Login onLoginSuccess={handleLoginSuccess} />}
              </Route>
            </Switch>
          </React.StrictMode>
        </Router>
      </CartProvider>
    </UserProvider>
  );
};

root.render(<Main />);
