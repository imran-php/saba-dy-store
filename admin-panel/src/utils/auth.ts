import { AdminSession } from '../types';
import { adminStorage } from './storage';

const SESSION_DURATION_HOURS = 8;

/**
 * Create admin session
 */
export const createAdminSession = (): AdminSession => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

  const session: AdminSession = {
    isAuthenticated: true,
    loginTime: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  adminStorage.saveSession(session);
  return session;
};

/**
 * Check if admin is authenticated
 */
export const isAuthenticated = (): boolean => {
  return adminStorage.isSessionValid();
};

/**
 * Logout admin
 */
export const logoutAdmin = (): void => {
  adminStorage.clearSession();
};

/**
 * Get session info
 */
export const getSessionInfo = (): AdminSession | null => {
  return adminStorage.getSession();
};

/**
 * Check if session is about to expire (within 30 minutes)
 */
export const isSessionExpiringSoon = (): boolean => {
  const session = getSessionInfo();
  if (!session) return false;

  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  const thirtyMinutes = 30 * 60 * 1000;

  return (expiresAt.getTime() - now.getTime()) < thirtyMinutes;
};

/**
 * Extend session
 */
export const extendSession = (): boolean => {
  if (!isAuthenticated()) {
    return false;
  }

  createAdminSession();
  return true;
};