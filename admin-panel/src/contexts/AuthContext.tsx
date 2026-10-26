import React, { createContext, useContext, useState, useEffect } from 'react';
import { isAuthenticated, createAdminSession, logoutAdmin } from '../utils/auth';
import { AdminSession } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  session: AdminSession | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  checkAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = () => {
    const authenticated = isAuthenticated();
    setIsAuth(authenticated);
    setIsLoading(false);
  };

  useEffect(() => {
    // Check authentication status on mount
    checkAuth();

    // Check authentication status periodically (every 30 seconds)
    const interval = setInterval(checkAuth, 30000);

    return () => clearInterval(interval);
  }, []);

  const login = async (pin: string): Promise<boolean> => {
    try {
      const { adminStorage } = await import('../utils/storage');
      const { createAdminSession } = await import('../utils/auth');
      
      const isValid = await adminStorage.login(pin);
      
      if (isValid) {
        const newSession = createAdminSession();
        setSession(newSession);
        setIsAuth(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    logoutAdmin();
    setIsAuth(false);
    setSession(null);
  };

  const value: AuthContextType = {
    isAuthenticated: isAuth,
    session,
    login,
    logout,
    isLoading,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};