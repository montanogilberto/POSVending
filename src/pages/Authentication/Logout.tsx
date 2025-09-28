// src/pages/Logout.tsx
import React from 'react';
import { useHistory } from 'react-router-dom';

const Logout: React.FC = () => {
  const history = useHistory();

  const handleLogout = () => {
    // Implement your logout logic here
    // For example, clear authentication tokens, user data, etc.
    // Then redirect to the login page
    console.log('enter');
    
    history.push('/login');
  };

  return (
    <div>
      <h1>Logout</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Logout;
