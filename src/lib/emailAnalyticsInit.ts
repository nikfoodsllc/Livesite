'use server';

/**
 * Email Analytics Initialization
 * Initialize the email analytics service when the application starts
 */

import { initializeEmailAnalytics } from '@/lib/emailAnalytics';

// Initialize email analytics service
let initialized = false;

export async function ensureEmailAnalyticsInitialized(): Promise<void> {
  if (!initialized) {
    try {
      // Skip initialization during build time
      if (typeof window === 'undefined' && (process.env.NEXT_PHASE === 'phase-production-build' || process.env.BUILD_TIME === 'true')) {
        console.log('[EmailAnalytics] Skipping initialization during build time');
        initialized = true; // Mark as initialized to prevent retries
        return;
      }

      await initializeEmailAnalytics();
      initialized = true;
      console.log('[EmailAnalytics] Service initialized successfully');
    } catch (error) {
      console.error('[EmailAnalytics] Failed to initialize service:', error);
      // Don't throw error to prevent app startup failure
      // Mark as initialized to prevent retry loops
      initialized = true;
    }
  }
}

// Auto-initialize when this module is imported
// This ensures analytics is ready when email functions are called
ensureEmailAnalyticsInitialized().catch(() => {
  // Silently ignore initialization errors
});