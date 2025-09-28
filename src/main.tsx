// main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Route, BrowserRouter as Router, Switch } from 'react-router-dom'; // Import BrowserRouter
import Login from './pages/Authentication/Login';
import App from './App';
import ForgotPassword from './pages/Authentication/ForgotPassword';
import CreateAccount from './pages/Authentication/CreateAccount';

const container = document.getElementById('root');
const root = createRoot(container!);
import { UserProvider } from './components/UserContext';

const Main: React.FC = () => {
  // State to manage authentication
  const [authenticated, setAuthenticated] = React.useState(false);

  // Callback to set authentication state when login is successful
  const handleLoginSuccess = () => {
    setAuthenticated(true);
  };

  return (
    <UserProvider>
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
    </UserProvider>
  );
};

root.render(<Main />);
