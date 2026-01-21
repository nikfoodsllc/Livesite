/**
 * Email retry cron job
 *
 * This file contains the logic for scheduling email retries.
 * In a production environment, this would be set up as a cron job
 * or scheduled task to run periodically (e.g., every 15 minutes).
 */

import { processAllEmailRetries, getEmailRetryStats } from '@/lib/emailRetryJob';

/**
 * Main cron job function to process email retries
 *
 * This function should be called by a cron scheduler or background job runner.
 * Recommended schedule: every 15 minutes
 *
 * Environment variables to configure:
 * - EMAIL_RETRY_CRON_ENABLED: Enable/disable the cron job (default: "true")
 * - EMAIL_RETRY_CRON_SCHEDULE: Cron schedule expression (default: "*\\/15 * * * *")
 */
export async function runEmailRetryCronJob(): Promise<{
  success: boolean;
  message: string;
  results?: Record<string, unknown>;
  error?: string;
}> {
  const cronEnabled = process.env.EMAIL_RETRY_CRON_ENABLED !== 'false';

  if (!cronEnabled) {
    console.log('[EmailRetryCron] Email retry cron job is disabled');
    return {
      success: true,
      message: 'Email retry cron job is disabled',
    };
  }

  console.log('[EmailRetryCron] Starting email retry cron job at:', new Date().toISOString());

  try {
    // Get current stats before processing
    const statsBefore = await getEmailRetryStats();

    console.log('[EmailRetryCron] Email status before processing:', {
      totalOrders: statsBefore.totalOrders,
      pendingEmails: statsBefore.pendingEmails,
      failedEmails: statsBefore.failedEmails,
      retryingEmails: statsBefore.retryingEmails,
    });

    // Process all email retries
    const results = await processAllEmailRetries();

    // Get stats after processing
    const statsAfter = await getEmailRetryStats();

    console.log('[EmailRetryCron] Email retry processing complete:', {
      processed: results.totalProcessed,
      successful: results.successful,
      failed: results.failed,
      skipped: results.skipped,
      scheduled: results.scheduled,
      statsBefore: {
        pendingEmails: statsBefore.pendingEmails,
        failedEmails: statsBefore.failedEmails,
      },
      statsAfter: {
        pendingEmails: statsAfter.pendingEmails,
        failedEmails: statsAfter.failedEmails,
      },
    });

    // Log detailed results for failed emails
    if (results.details.length > 0) {
      console.log('[EmailRetryCron] Detailed results:', results.details);
    }

    return {
      success: true,
      message: `Processed ${results.totalProcessed} email retries: ${results.successful} successful, ${results.failed} failed, ${results.scheduled} scheduled for retry`,
      results: {
        processed: results.totalProcessed,
        successful: results.successful,
        failed: results.failed,
        skipped: results.skipped,
        scheduled: results.scheduled,
        details: results.details,
        statsBefore,
        statsAfter,
      },
    };
  } catch (error) {
    console.error('[EmailRetryCron] Error processing email retry cron job:', error);
    return {
      success: false,
      message: 'Email retry cron job failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Health check function for the email retry system
 */
export async function getEmailRetryHealthCheck(): Promise<{
  healthy: boolean;
  message: string;
  stats?: Record<string, unknown>;
  lastCheck?: string;
}> {
  try {
    const stats = await getEmailRetryStats();

    // Determine system health based on various metrics
    let healthy = true;
    let message = 'Email retry system is healthy';

    // Check if there are too many failed emails
    const failureRate = stats.totalOrders > 0 ? (stats.failedEmails / stats.totalOrders) * 100 : 0;
    if (failureRate > 20) {
      healthy = false;
      message = `High failure rate: ${failureRate.toFixed(1)}% of emails failed`;
    }

    // Check if there are very old failed emails
    if (stats.oldestFailedEmail) {
      const hoursSinceOldestFailure = (Date.now() - new Date(stats.oldestFailedEmail).getTime()) / (1000 * 60 * 60);
      if (hoursSinceOldestFailure > 24) {
        healthy = false;
        message = `Very old failed emails found: ${Math.round(hoursSinceOldestFailure)} hours old`;
      }
    }

    // Check average attempts
    if (stats.averageAttempts > 2) {
      healthy = false;
      message = `High average retry attempts: ${stats.averageAttempts.toFixed(1)}`;
    }

    return {
      healthy,
      message,
      stats,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastCheck: new Date().toISOString(),
    };
  }
}

/**
 * Manual trigger for email retry processing
 * This can be called from an API endpoint or admin interface
 */
export async function manualEmailRetryTrigger(options: {
  orderId?: string;
  force?: boolean;
} = {}): Promise<{
  success: boolean;
  message: string;
  results?: Record<string, unknown>;
  error?: string;
}> {
  console.log('[EmailRetryCron] Manual trigger activated:', options);

  try {
    const { processEmailRetryJob, processAllEmailRetries } = await import('@/lib/emailRetryJob');

    let results;

    if (options.orderId) {
      // Process specific order
      results = await processEmailRetryJob(options.orderId);

      return {
        success: results.success,
        message: results.success
          ? `Email retry for order ${options.orderId} processed successfully`
          : `Email retry for order ${options.orderId} failed: ${results.error}`,
        results,
      };
    } else {
      // Process all pending retries
      results = await processAllEmailRetries();

      return {
        success: true,
        message: `Processed email retries: ${results.successful} successful, ${results.failed} failed, ${results.scheduled} scheduled`,
        results,
      };
    }
  } catch (error) {
    console.error('[EmailRetryCron] Manual trigger failed:', error);
    return {
      success: false,
      message: 'Manual email retry trigger failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export configuration constants
