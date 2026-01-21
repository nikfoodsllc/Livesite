'use server';

import { Resend } from 'resend';
import { getOrderConfirmationEmailTemplate } from '@/templates/orderConfirmation';
import { Order, EmailStatusInfo } from '@/types/order';
import { EmailType } from '@/types/email';
import { emailAnalytics } from '@/lib/emailAnalytics';

// Initialize email analytics (this will be called when the module is imported)
import '@/lib/emailAnalyticsInit';

// Enhanced logging configuration
const logPrefix = '[Email Service]';
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || '"Nikfoods" <no-reply@nikfoods-email.synngular.com>';

// Email retry configuration
const MAX_RETRY_ATTEMPTS = parseInt(process.env.EMAIL_MAX_RETRY_ATTEMPTS || '3');

// Validate environment configuration
const isConfigured = !!resendApiKey && !!fromEmail;
if (!isConfigured) {
  console.warn(`${logPrefix} Email service not properly configured:`);
  if (!resendApiKey) console.warn(`  - RESEND_API_KEY is missing`);
  if (!fromEmail) console.warn(`  - RESEND_FROM_EMAIL is missing`);
} else {
  console.log(`${logPrefix} Email service configured with fromEmail: ${fromEmail}`);
}

// Initialize Resend conditionally to avoid build-time errors
let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  console.warn(`${logPrefix} RESEND_API_KEY not available, Resend client not initialized`);
}

/**
 * Send password reset OTP email
 */
export async function sendPasswordResetOTP(
  email: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const functionName = 'sendPasswordResetOTP';
  console.log(`${logPrefix} ${functionName} - Starting email send to: ${email}`);

  try {
    // Check configuration
    if (!isConfigured) {
      console.warn(`${logPrefix} ${functionName} - Email service not configured, skipping send to: ${email}`);
      return { success: true }; // Graceful fallback
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error(`${logPrefix} ${functionName} - Invalid email format: ${email}`);
      return {
        success: false,
        error: 'Invalid email format',
      };
    }

    console.log(`${logPrefix} ${functionName} - Sending email with data:`, {
      from: fromEmail,
      to: email,
      subject: 'Reset Your Password - NikFoods',
      hasHtml: !!getPasswordResetEmailTemplate(otp),
      otpLength: otp?.length || 0,
    });

    const emailData = {
      from: fromEmail,
      to: [email], // Resend expects array of emails
      subject: 'Reset Your Password - NikFoods',
      html: getPasswordResetEmailTemplate(otp),
    };

    if (!resend) {
      throw new Error('Resend client not initialized - missing API key');
    }

    const result = await resend.emails.send(emailData);

    console.log(`${logPrefix} ${functionName} - Email sent successfully:`, {
      messageId: result.data?.id,
      to: email,
    });

    // Track email sent event
    if (result.data?.id) {
      try {
        await emailAnalytics.trackEmailSent(
          result.data.id,
          'password_reset' as EmailType,
          email,
          undefined, // No order ID for password reset
          undefined, // No user ID available
          'Reset Your Password - NikFoods',
          fromEmail
        );
      } catch (analyticsError) {
        console.error(`${logPrefix} ${functionName} - Failed to track email analytics:`, analyticsError);
        // Don't fail the email send if analytics tracking fails
      }
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${logPrefix} ${functionName} - Failed to send email to ${email}:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      email: email,
      isConfigured,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Update order email status in database
 */
async function updateOrderEmailStatus(
  orderId: string,
  statusInfo: EmailStatusInfo
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = await import('@/lib/server/db');
    const result = await db.updateOne(
      'orders',
      { orderId },
      {
        $set: {
          emailStatus: statusInfo,
          updatedAt: new Date(),
        },
      }
    );

    if (!result.success) {
      console.error(`${logPrefix} Failed to update email status for order ${orderId}:`, result.error);
      return { success: false, error: result.error };
    }

    console.log(`${logPrefix} Updated email status for order ${orderId}:`, {
      status: statusInfo.status,
      attempts: statusInfo.attempts,
      lastAttempt: statusInfo.lastAttempt,
      messageId: statusInfo.messageId,
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${logPrefix} Exception updating email status for order ${orderId}:`, error);
    return { success: false, error: errorMessage };
  }
}


/**
 * Send order confirmation email with enhanced tracking
 */
export async function sendOrderConfirmationEmail(
  order: Order
): Promise<{ success: boolean; error?: string; messageId?: string; statusInfo?: EmailStatusInfo }> {
  const functionName = 'sendOrderConfirmationEmail';

  // Initialize status info
  const currentStatus: EmailStatusInfo = order.emailStatus || {
    status: 'pending',
    attempts: 0,
    lastAttempt: undefined,
    error: undefined,
    messageId: undefined,
  };

  try {
    // Check configuration
    if (!isConfigured) {
      console.warn(`${logPrefix} ${functionName} - Email service not configured, skipping order confirmation email`);
      const skippedStatus = {
        ...currentStatus,
        status: 'failed' as const,
        lastAttempt: new Date(),
        error: 'Email service not configured',
        attempts: currentStatus.attempts + 1,
      };
      await updateOrderEmailStatus(order.orderId, skippedStatus);
      return { success: false, error: 'Email service not configured', statusInfo: skippedStatus };
    }

    // Validate required order data
    if (!order.orderId || !order.customerInfo || !order.customerInfo.email) {
      console.error(`${logPrefix} ${functionName} - Missing required order data:`, {
        hasOrderId: !!order.orderId,
        hasCustomerInfo: !!order.customerInfo,
        hasEmail: !!order.customerInfo?.email,
        order: order.orderId,
      });
      const errorStatus = {
        ...currentStatus,
        status: 'failed' as const,
        lastAttempt: new Date(),
        error: 'Missing required order data for email send',
        attempts: currentStatus.attempts + 1,
      };
      await updateOrderEmailStatus(order.orderId, errorStatus);
      return {
        success: false,
        error: 'Missing required order data for email send',
        statusInfo: errorStatus,
      };
    }

    const email = order.customerInfo.email;
    const subject = `Order Confirmation - NikFoods (${order.orderId})`;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error(`${logPrefix} ${functionName} - Invalid email format: ${email}`);
      const errorStatus = {
        ...currentStatus,
        status: 'failed' as const,
        lastAttempt: new Date(),
        error: 'Invalid customer email format',
        attempts: currentStatus.attempts + 1,
      };
      await updateOrderEmailStatus(order.orderId, errorStatus);
      return {
        success: false,
        error: 'Invalid customer email format',
        statusInfo: errorStatus,
      };
    }

    // Update status to 'retrying' if this is a retry attempt
    const attemptStatus: EmailStatusInfo = {
      ...currentStatus,
      status: currentStatus.attempts > 0 ? 'retrying' : 'pending',
      lastAttempt: new Date(),
      attempts: currentStatus.attempts + 1,
    };

    // Update status before sending
    await updateOrderEmailStatus(order.orderId, attemptStatus);

    console.log(`${logPrefix} ${functionName} - Sending order confirmation email:`, {
      orderId: order.orderId,
      to: email,
      from: fromEmail,
      subject: subject,
      hasItems: !!order.items && order.items.length > 0,
      totalAmount: order.totalPaid,
      status: order.status,
      attempt: attemptStatus.attempts,
      maxAttempts: MAX_RETRY_ATTEMPTS,
    });

    // Generate email template
    let emailHtml: string;
    try {
      emailHtml = getOrderConfirmationEmailTemplate(order);
      if (!emailHtml || emailHtml.trim().length === 0) {
        throw new Error('Email template is empty');
      }
    } catch (templateError) {
      console.error(`${logPrefix} ${functionName} - Failed to generate email template:`, templateError);
      const errorStatus = {
        ...attemptStatus,
        status: 'failed' as const,
        error: 'Failed to generate email template',
      };
      await updateOrderEmailStatus(order.orderId, errorStatus);
      return {
        success: false,
        error: 'Failed to generate email template',
        statusInfo: errorStatus,
      };
    }

    const emailData = {
      from: fromEmail,
      to: [email], // Resend expects array of emails
      subject: subject,
      html: emailHtml,
    };

    if (!resend) {
      throw new Error('Resend client not initialized - missing API key');
    }

    const result = await resend.emails.send(emailData);

    const successStatus: EmailStatusInfo = {
      status: 'sent',
      attempts: attemptStatus.attempts,
      lastAttempt: new Date(),
      error: undefined,
      messageId: result.data?.id,
    };

    // Update status to 'sent' on success
    await updateOrderEmailStatus(order.orderId, successStatus);

    console.log(`${logPrefix} ${functionName} - Order confirmation email sent successfully:`, {
      orderId: order.orderId,
      messageId: result.data?.id,
      to: email,
      status: order.status,
      totalAmount: order.totalPaid,
      attempts: successStatus.attempts,
    });

    // Track email sent event
    if (result.data?.id) {
      try {
        await emailAnalytics.trackEmailSent(
          result.data.id,
          'order_confirmation' as EmailType,
          email,
          order.orderId,
          order.user, // User ID if available
          subject,
          fromEmail
        );
      } catch (analyticsError) {
        console.error(`${logPrefix} ${functionName} - Failed to track email analytics:`, analyticsError);
        // Don't fail the email send if analytics tracking fails
      }
    }

    return {
      success: true,
      messageId: result.data?.id,
      statusInfo: successStatus
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${logPrefix} ${functionName} - Failed to send order confirmation email:`, {
      orderId: order.orderId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      customerEmail: order.customerInfo?.email,
      isConfigured,
      attempt: currentStatus.attempts + 1,
    });

    const errorStatus: EmailStatusInfo = {
      status: currentStatus.attempts + 1 >= MAX_RETRY_ATTEMPTS ? 'failed' : 'retrying',
      attempts: currentStatus.attempts + 1,
      lastAttempt: new Date(),
      error: errorMessage,
    };

    // Update status to 'failed' or 'retrying'
    await updateOrderEmailStatus(order.orderId, errorStatus);

    return {
      success: false,
      error: errorMessage,
      statusInfo: errorStatus,
    };
  }
}

/**
 * Send password reset confirmation email
 */
export async function sendPasswordResetConfirmation(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const functionName = 'sendPasswordResetConfirmation';
  console.log(`${logPrefix} ${functionName} - Starting email send to: ${email}`);

  try {
    // Check configuration
    if (!isConfigured) {
      console.warn(`${logPrefix} ${functionName} - Email service not configured, skipping send to: ${email}`);
      return { success: true }; // Graceful fallback
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error(`${logPrefix} ${functionName} - Invalid email format: ${email}`);
      return {
        success: false,
        error: 'Invalid email format',
      };
    }

    console.log(`${logPrefix} ${functionName} - Sending password reset confirmation email to: ${email}`);

    const emailData = {
      from: fromEmail,
      to: [email], // Resend expects array of emails
      subject: 'Password Reset Successful - NikFoods',
      html: getPasswordResetConfirmationTemplate(),
    };

    if (!resend) {
      throw new Error('Resend client not initialized - missing API key');
    }

    const result = await resend.emails.send(emailData);

    console.log(`${logPrefix} ${functionName} - Password reset confirmation email sent successfully:`, {
      messageId: result.data?.id,
      to: email,
    });

    // Track email sent event
    if (result.data?.id) {
      try {
        await emailAnalytics.trackEmailSent(
          result.data.id,
          'password_reset_confirmation' as EmailType,
          email,
          undefined, // No order ID for password reset
          undefined, // No user ID available
          'Password Reset Successful - NikFoods',
          fromEmail
        );
      } catch (analyticsError) {
        console.error(`${logPrefix} ${functionName} - Failed to track email analytics:`, analyticsError);
        // Don't fail the email send if analytics tracking fails
      }
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${logPrefix} ${functionName} - Failed to send password reset confirmation to ${email}:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      email: email,
      isConfigured,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get password reset email HTML template
 */
function getPasswordResetEmailTemplate(otp: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #FF9F0D 0%, #FF6B35 100%); padding: 40px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">NikFoods</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px 0; color: #1A1106; font-size: 24px; font-weight: 700;">Reset Your Password</h2>

                  <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                    You recently requested to reset your password for your NikFoods account. Use the verification code below to complete the process:
                  </p>

                  <!-- OTP Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                    <tr>
                      <td align="center">
                        <div style="display: inline-block; background: linear-gradient(135deg, #FFF9F2 0%, #FFE8CC 100%); border: 3px solid #FF9F0D; border-radius: 12px; padding: 24px 48px;">
                          <p style="margin: 0; color: #999999; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Verification Code</p>
                          <p style="margin: 8px 0 0 0; color: #FF9F0D; font-size: 48px; font-weight: 800; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                    This code will expire in <strong>10 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.
                  </p>

                  <!-- Warning Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0; background-color: #FFF4E4; border-left: 4px solid #FFB82E; border-radius: 8px;">
                    <tr>
                      <td style="padding: 16px;">
                        <p style="margin: 0; color: #996B00; font-size: 14px; line-height: 1.5;">
                          <strong>Security Tip:</strong> Never share this code with anyone. NikFoods staff will never ask for your verification code.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                    © ${new Date().getFullYear()} NikFoods. All rights reserved.
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    Authentic Indian food delivered to your doorstep
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Validate email template HTML
 */
function validateEmailTemplate(html: string, templateName: string): { isValid: boolean; error?: string; size: number } {
  if (!html || html.trim().length === 0) {
    return { isValid: false, error: `${templateName} template is empty`, size: 0 };
  }

  if (html.length > 500000) { // 500KB limit
    return { isValid: false, error: `${templateName} template is too large (${html.length} chars)`, size: html.length };
  }

  // Basic HTML validation
  if (!html.includes('<!DOCTYPE html>') || !html.includes('</html>')) {
    return { isValid: false, error: `${templateName} template has invalid HTML structure`, size: html.length };
  }

  return { isValid: true, size: html.length };
}


/**
 * Get password reset confirmation email HTML template
 */
function getPasswordResetConfirmationTemplate(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Successful</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #4CAF50 0%, #45A049 100%); padding: 40px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">✓ Success!</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px 0; color: #1A1106; font-size: 24px; font-weight: 700;">Password Reset Successful</h2>

                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                    Your password has been successfully reset. You can now log in to your NikFoods account with your new password.
                  </p>

                  <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                    If you didn't make this change or believe an unauthorized person has accessed your account, please contact our support team immediately.
                  </p>

                  <!-- Security Tips -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0; background-color: #F0F9FF; border-left: 4px solid #2196F3; border-radius: 8px;">
                    <tr>
                      <td style="padding: 20px;">
                        <p style="margin: 0 0 12px 0; color: #1A1106; font-size: 16px; font-weight: 600;">
                          Security Tips:
                        </p>
                        <ul style="margin: 0; padding-left: 20px; color: #0066B2; font-size: 14px; line-height: 1.8;">
                          <li>Use a unique password that you don't use for other accounts</li>
                          <li>Enable two-factor authentication for added security</li>
                          <li>Never share your password with anyone</li>
                          <li>Update your password regularly</li>
                        </ul>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                    © ${new Date().getFullYear()} NikFoods. All rights reserved.
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    Authentic Indian food delivered to your doorstep
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
