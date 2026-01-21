'use client';

import { useCallback } from 'react';

/**
 * Session expired flag key for localStorage
 * Used to trigger login dialog when user is redirected after token expiration
 */
export const SESSION_EXPIRED_KEY = 'sessionExpired';

/**
 * Clears all auth-related data from localStorage
 */
const clearAuthData = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

/**
 * Custom hook that provides an authenticated fetch function
 * Automatically handles 401 Unauthorized responses by logging out the user
 * and redirecting to the home page with a session expired flag
 */
export function useApiClient() {
  /**
   * Handles session expiration by logging out and redirecting
   */
  const handleSessionExpired = useCallback(() => {
    // Set session expired flag for login dialog prompt
    localStorage.setItem(SESSION_EXPIRED_KEY, 'true');

    // Clear auth data
    clearAuthData();

    // Redirect to home page
    window.location.href = '/';
  }, []);

  /**
   * Makes an authenticated fetch request with automatic 401 handling
   * @param url - The URL to fetch
   * @param options - Fetch options (method, body, etc.)
   * @returns The fetch response
   */
  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      // Get token from localStorage
      const token = localStorage.getItem('accessToken');

      // If no token, handle as session expired
      if (!token) {
        handleSessionExpired();
        throw new Error('No authentication token found');
      }

      // Merge headers with Authorization
      const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };

      // Make the fetch request
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Check for 401 Unauthorized response
      if (response.status === 401) {
        handleSessionExpired();
        throw new Error('Session expired. Please log in again.');
      }

      return response;
    },
    [handleSessionExpired]
  );

  return {
    authenticatedFetch,
    handleSessionExpired,
  };
}

/**
 * Utility function to clear the session expired flag
 * Call this after showing the login dialog
 */
export function clearSessionExpiredFlag(): void {
  localStorage.removeItem(SESSION_EXPIRED_KEY);
}

/**
 * Utility function to check if session has expired
 * @returns true if session expired flag is set
 */
export function isSessionExpired(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SESSION_EXPIRED_KEY) === 'true';
}
