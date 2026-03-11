import React, { createContext, useContext, useState, ReactNode } from 'react';

// ── Storage key ────────────────────────────────────────────────────────────
const STORAGE_KEY = 'pos_gmo_auth';

// ── Types ──────────────────────────────────────────────────────────────────
export interface AuthData {
  isAuthenticated: boolean;
  userId: number;
  username: string;
  avatarUrl: string;
  companyId: number;
  companyName: string;
  branchId: number;
  branchName: string;
}

interface UserContextProps extends AuthData {
  /** Legacy setters kept for backward compatibility */
  setUsername: (username: string) => void;
  setAvatarUrl: (url: string) => void;
  /** Set user data after credentials validated (before company selection) */
  setUserData: (data: Partial<AuthData>) => void;
  /** Finalise login with all data — sets isAuthenticated = true & persists */
  login: (data: Partial<AuthData>) => void;
  /** Clear session */
  logout: () => void;
}

// ── Defaults ───────────────────────────────────────────────────────────────
const DEFAULT_AUTH: AuthData = {
  isAuthenticated: false,
  userId: 0,
  username: '',
  avatarUrl: 'https://www.w3schools.com/howto/img_avatar.png',
  companyId: 0,
  companyName: '',
  branchId: 0,
  branchName: '',
};

// ── localStorage helpers ───────────────────────────────────────────────────
const loadStoredAuth = (): AuthData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_AUTH, ...JSON.parse(raw) } : DEFAULT_AUTH;
  } catch {
    return DEFAULT_AUTH;
  }
};

const persistAuth = (data: AuthData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
};

// ── Context ────────────────────────────────────────────────────────────────
const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthData>(loadStoredAuth);

  const saveAuth = (data: AuthData) => {
    setAuth(data);
    persistAuth(data);
  };

  /** Partial update — does NOT set isAuthenticated */
  const setUserData = (data: Partial<AuthData>) => {
    setAuth((prev) => ({ ...prev, ...data }));
  };

  /** Full login — merges data and marks session as authenticated */
  const login = (data: Partial<AuthData>) => {
    const next: AuthData = { ...auth, ...data, isAuthenticated: true };
    saveAuth(next);
  };

  /** Logout — clears everything */
  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(DEFAULT_AUTH);
  };

  // Legacy setters
  const setUsername  = (username: string)  => saveAuth({ ...auth, username });
  const setAvatarUrl = (avatarUrl: string) => saveAuth({ ...auth, avatarUrl });

  return (
    <UserContext.Provider
      value={{
        ...auth,
        setUsername,
        setAvatarUrl,
        setUserData,
        login,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextProps => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
};
