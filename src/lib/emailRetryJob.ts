'use server';

import { db } from '@/lib/server/db';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { Order } from '@/types/order';

const MAX_RETRY_ATTEMPTS = parseInt(process.env.EMAIL_MAX_RETRY_ATTEMPTS || '3');
const RETRY_DELAY_MINUTES = parseInt(process.env.EMAIL_RETRY_DELAY_MINUTES || '15');

/**
 * Process email retry job - handles failed email retries
 */
export async function processEmailRetryJob(orderId: string): Promise<{
  success: boolean;
  error?: string;
  statusInfo?: Record<string, unknown>;
  shouldRetry: boolean;
  retryDelay?: number;
}> {
  console.log(`[EmailRetryJob] Processing retry for order: ${orderId}`);

  try {
    // Get the order from database
    const orderResult = await db.readOne<Order>('orders', { orderId });

    if (!orderResult.success || !orderResult.data) {
      console.error(`[EmailRetryJob] Order not found: ${orderId}`, orderResult.error);
      return {
        success: false,
        error: 'Order not found',
        shouldRetry: false,
      };
    }

    const order = orderResult.data;

    // Check if email status exists and needs retry
    if (!order.emailStatus) {
      console.log(`[EmailRetryJob] No email status found for order: ${orderId}, skipping retry`);
      return {
        success: true,
        shouldRetry: false,
      };
    }

    const { status, attempts } = order.emailStatus;

    // Check if we should retry
    if (status !== 'failed' && status !== 'retrying') {
      console.log(`[EmailRetryJob] Email status is ${status} for order: ${orderId}, no retry needed`);
      return {
        success: true,
        shouldRetry: false,
      };
    }

    if (attempts >= MAX_RETRY_ATTEMPTS) {
      console.log(`[EmailRetryJob] Max retry attempts reached for order: ${orderId} (${attempts}/${MAX_RETRY_ATTEMPTS})`);
      return {
        success: false,
        error: 'Max retry attempts reached',
        shouldRetry: false,
      };
    }

    // Check if enough time has passed since last attempt
    const now = new Date();
    const lastAttempt = order.emailStatus.lastAttempt ? new Date(order.emailStatus.lastAttempt) : new Date(0);
    const timeSinceLastAttempt = now.getTime() - lastAttempt.getTime();
    const minRetryDelay = attempts * RETRY_DELAY_MINUTES * 60 * 1000; // Exponential backoff

    if (timeSinceLastAttempt < minRetryDelay) {
      const remainingDelay = Math.ceil((minRetryDelay - timeSinceLastAttempt) / (60 * 1000)); // minutes
      console.log(`[EmailRetryJob] Too soon to retry order: ${orderId}. Wait ${remainingDelay} more minutes`);
      return {
        success: true,
        shouldRetry: true,
        retryDelay: remainingDelay,
      };
    }

    console.log(`[EmailRetryJob] Attempting to resend email for order: ${orderId} (attempt ${attempts + 1}/${MAX_RETRY_ATTEMPTS})`);

    // Retry sending the email
    const emailResult = await sendOrderConfirmationEmail(order);

    if (emailResult.success) {
      console.log(`[EmailRetryJob] Email retry successful for order: ${orderId}`, {
        messageId: emailResult.messageId,
        statusInfo: emailResult.statusInfo,
      });
      return {
        success: true,
        statusInfo: emailResult.statusInfo as unknown as Record<string, unknown>,
        shouldRetry: false,
      };
    } else {
      console.error(`[EmailRetryJob] Email retry failed for order: ${orderId}`, {
        error: emailResult.error,
        statusInfo: emailResult.statusInfo,
      });

      // Determine if we should retry again
      const nextAttempts = attempts + 1;
      const shouldRetryAgain = nextAttempts < MAX_RETRY_ATTEMPTS;

      return {
        success: false,
        error: emailResult.error,
        statusInfo: emailResult.statusInfo as unknown as Record<string, unknown>,
        shouldRetry: shouldRetryAgain,
        retryDelay: shouldRetryAgain ? (nextAttempts * RETRY_DELAY_MINUTES) : undefined,
      };
    }
  } catch (error) {
    console.error(`[EmailRetryJob] Exception processing retry for order: ${orderId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      shouldRetry: true, // Retry on unexpected errors
    };
  }
}

/**
 * Find and process all orders that need email retry
 */
export async function processAllEmailRetries(): Promise<{
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  scheduled: number;
  details: Array<{
    orderId: string;
    success: boolean;
    error?: string;
    shouldRetry: boolean;
  }>;
}> {
  console.log(`[EmailRetryJob] Processing all email retries`);

  try {
    // Find orders with failed or retrying email status
    const failedOrdersResult = await db.read<Order>('orders', {
      'emailStatus.status': { $in: ['failed', 'retrying'] },
    });

    if (!failedOrdersResult.success) {
      console.error(`[EmailRetryJob] Failed to fetch orders needing retry:`, failedOrdersResult.error);
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        scheduled: 0,
        details: [],
      };
    }

    const failedOrders = failedOrdersResult.data || [];
    console.log(`[EmailRetryJob] Found ${failedOrders.length} orders needing email retry`);

    let successful = 0;
    let failed = 0;
    let skipped = 0;
    let scheduled = 0;
    const details: Array<{
      orderId: string;
      success: boolean;
      error?: string;
      shouldRetry: boolean;
    }> = [];

    for (const order of failedOrders) {
      const result = await processEmailRetryJob(order.orderId);

      details.push({
        orderId: order.orderId,
        success: result.success,
        error: result.error,
        shouldRetry: result.shouldRetry,
      });

      if (result.success) {
        successful++;
      } else {
        if (result.shouldRetry) {
          scheduled++;
        } else {
          failed++;
        }
      }

      if (!result.shouldRetry && result.error && !result.success) {
        skipped++;
      }
    }

    console.log(`[EmailRetryJob] Retry processing complete:`, {
      totalProcessed: failedOrders.length,
      successful,
      failed,
      skipped,
      scheduled,
    });

    return {
      totalProcessed: failedOrders.length,
      successful,
      failed,
      skipped,
      scheduled,
      details,
    };
  } catch (error) {
    console.error(`[EmailRetryJob] Exception processing all email retries:`, error);
    return {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      scheduled: 0,
      details: [],
    };
  }
}

/**
 * Get email retry statistics
 */
export async function getEmailRetryStats(): Promise<{
  totalOrders: number;
  pendingEmails: number;
  sentEmails: number;
  failedEmails: number;
  retryingEmails: number;
  averageAttempts: number;
  oldestFailedEmail?: Date;
}> {
  try {
    // Get all orders
    const allOrdersResult = await db.read<Order>('orders', {});

    if (!allOrdersResult.success || !allOrdersResult.data) {
      return {
        totalOrders: 0,
        pendingEmails: 0,
        sentEmails: 0,
        failedEmails: 0,
        retryingEmails: 0,
        averageAttempts: 0,
      };
    }

    const orders = allOrdersResult.data;
    let pendingEmails = 0;
    let sentEmails = 0;
    let failedEmails = 0;
    let retryingEmails = 0;
    let totalAttempts = 0;
    let ordersWithEmailStatus = 0;
    let oldestFailedEmail: Date | undefined;

    orders.forEach((order: Order) => {
      if (!order.emailStatus) {
        // Orders without email status are considered pending
        pendingEmails++;
        return;
      }

      ordersWithEmailStatus++;
      const { status, attempts, lastAttempt } = order.emailStatus;

      totalAttempts += attempts;

      switch (status) {
        case 'pending':
          pendingEmails++;
          break;
        case 'sent':
          sentEmails++;
          break;
        case 'failed':
          failedEmails++;
          if (lastAttempt && (!oldestFailedEmail || new Date(lastAttempt) < oldestFailedEmail)) {
            oldestFailedEmail = new Date(lastAttempt);
          }
          break;
        case 'retrying':
          retryingEmails++;
          break;
      }
    });

    const averageAttempts = ordersWithEmailStatus > 0 ? totalAttempts / ordersWithEmailStatus : 0;

    return {
      totalOrders: orders.length,
      pendingEmails,
      sentEmails,
      failedEmails,
      retryingEmails,
      averageAttempts: Math.round(averageAttempts * 100) / 100,
      oldestFailedEmail,
    };
  } catch (error) {
    console.error('[EmailRetryJob] Error getting email retry stats:', error);
    return {
      totalOrders: 0,
      pendingEmails: 0,
      sentEmails: 0,
      failedEmails: 0,
      retryingEmails: 0,
      averageAttempts: 0,
    };
  }
}