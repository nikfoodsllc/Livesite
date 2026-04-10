'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SESSION_EXPIRED_KEY } from '@/hooks/useApiClient';

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: string;
  isCompleted: boolean;
  addresses?: string[]; // Optional field for address IDs (type consistency with address system)
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User, token: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Decodes a JWT token and checks if it has expired
 * Uses base64 decoding on the client side (no jwt library needed)
 * @param token - The JWT token string
 * @returns true if token is expired or invalid, false if valid
 */
function isTokenExpired(token: string): boolean {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return true; // Invalid token format
    }

    // Decode the payload (second part)
    const payload = parts[1];
    // Handle base64url encoding (replace - with + and _ with /)
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));

    // Check if exp claim exists
    if (!decoded.exp) {
      return true; // No expiration claim, consider expired
    }

    // Compare expiration time with current time
    // exp is in seconds, Date.now() is in milliseconds
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Error decoding token for expiration check:', error);
    return true; // Consider invalid tokens as expired
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Clears all auth-related data from localStorage
   */
  const clearAuthData = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  // Check localStorage for existing user on mount and validate token expiration
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in useEffect
    setTimeout(() => {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('accessToken');

      if (storedUser && storedToken) {
        // Check if the token has expired
        if (isTokenExpired(storedToken)) {
          console.log('Token expired on app load, clearing session');
          // Set session expired flag to show login dialog
          localStorage.setItem(SESSION_EXPIRED_KEY, 'true');
          // Clear invalid session data
          clearAuthData();
          setUser(null);
          setIsLoading(false);
          return;
        }

        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsLoading(false);
        } catch (error) {
          console.error('Error parsing stored user:', error);
          // Clear invalid data
          clearAuthData();
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }, 0);
  }, []);

  const login = (userData: User, token: string, refreshToken: string) => {
    // Strip "Bearer " prefix if present to ensure raw token is stored
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    const cleanRefreshToken = refreshToken.startsWith('Bearer ') ? refreshToken.substring(7) : refreshToken;

    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', cleanToken);
    localStorage.setItem('refreshToken', cleanRefreshToken);

    // Clear address prompt dismissal state to allow re-showing after login
    // This ensures first-time users see the prompt after each new login session
    localStorage.removeItem('hasDismissedAddressPrompt');
  };

  const logout = () => {
    setUser(null);
    clearAuthData();
  };

  // Monitor token expiration periodically while user is logged in
  // This ensures users are automatically logged out when their token expires mid-session
  useEffect(() => {
    // Only set up monitoring if user is logged in
    if (!user) {
      return;
    }

    const checkTokenExpiration = () => {
      const storedToken = localStorage.getItem('accessToken');

      // If no token exists or token is expired, log out the user
      if (!storedToken || isTokenExpired(storedToken)) {
        console.log('Token expired during session, logging out user');
        // Set session expired flag to show login dialog with appropriate message
        localStorage.setItem(SESSION_EXPIRED_KEY, 'true');
        // Clear auth data
        clearAuthData();
        // Update user state
        setUser(null);
        // Redirect to home page
        window.location.href = '/';
      }
    };

    // Check token expiration every 60 seconds
    const intervalId = setInterval(checkTokenExpiration, 60000);

    // Cleanup interval on unmount or when user changes
    return () => {
      clearInterval(intervalId);
    };
  }, [user]);

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
