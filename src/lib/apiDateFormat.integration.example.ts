/**
 * ============================================================================
 * API DATE FORMAT - INTEGRATION EXAMPLE
 * ============================================================================
 *
 * This file shows how to integrate the API date formatting utilities
 * into existing API routes. Compare the BEFORE and AFTER examples below.
 *
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';

// ============================================================================
// IMPORT THE DATE FORMATTING UTILITIES
// ============================================================================
import {
  formatAPIDate,
  formatAPIDateOnly,
  formatAPITimestamp,
} from '@/lib/apiDateFormat';

/**
 * ============================================================================
 * EXAMPLE 1: Orders API - BEFORE
 * ============================================================================
 *
 * BEFORE: Inconsistent date formatting, no error handling
 */
export async function GET_BEFORE(request: NextRequest) {
  // ... authentication code ...

  const ordersResult = await db.read('orders', {});

  if (!ordersResult.success || !ordersResult.data) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve orders' },
      { status: 500 }
    );
  }

  const orders = ordersResult.data;

  // ❌ PROBLEMS:
  // - Using .toISOString() directly (no error handling)
  // - Type casting without validation
  // - Inconsistent formats
  // - No handling of null/undefined dates
  return NextResponse.json({
    success: true,
    data: {
      items: orders.map((order: any) => ({
        orderId: order.orderId,
        createdAt: order.createdAt?.toISOString(), // May throw error if null
        updatedAt: order.updatedAt?.toISOString(), // May throw error if null
        deliveryDate: order.deliveryDate as string, // Type casting without formatting
        deliveredAt: order.deliveredAt?.toISOString() || null, // Inconsistent null handling
        actualDeliveryDate: order.actualDeliveryDate as string | undefined, // No formatting
      })),
    },
  });
}

/**
 * ============================================================================
 * EXAMPLE 1: Orders API - AFTER (RECOMMENDED)
 * ============================================================================
 *
 * AFTER: Consistent date formatting with proper error handling
 */
export async function GET_AFTER(request: NextRequest) {
  // ... authentication code ...

  const ordersResult = await db.read('orders', {});

  if (!ordersResult.success || !ordersResult.data) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve orders' },
      { status: 500 }
    );
  }

  const orders = ordersResult.data;

  // ✅ IMPROVEMENTS:
  // - Consistent formatting functions
  // - Graceful error handling
  // - Type-safe operations
  // - Proper null/undefined handling
  return NextResponse.json({
    success: true,
    data: {
      items: orders.map((order: any) => ({
        orderId: order.orderId,
        createdAt: formatAPIDate(order.createdAt), // Safe, consistent formatting
        updatedAt: formatAPIDate(order.updatedAt), // Safe, consistent formatting
        deliveryDate: formatAPIDateOnly(order.deliveryDate), // Date-only formatting
        deliveredAt: formatAPIDate(order.deliveredAt) || null, // Consistent null handling
        actualDeliveryDate: formatAPIDateOnly(order.actualDeliveryDate) || undefined, // Proper formatting
      })),
    },
  });
}

/**
 * ============================================================================
 * EXAMPLE 2: Email Analytics API - BEFORE
 * ============================================================================
 */
export async function getEmailAnalytics_BEFORE(request: NextRequest) {
  // ... authentication and validation code ...

  const eventsResult = await db.read('emailEvents', {});

  if (!eventsResult.success || !eventsResult.data) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve events' },
      { status: 500 }
    );
  }

  const events = eventsResult.data;

  // ❌ PROBLEMS:
  // - Losing millisecond precision
  // - No validation of date objects
  // - Inconsistent formatting
  return NextResponse.json({
    success: true,
    data: {
      events: events.map((event: any) => ({
        eventId: event.eventId,
        type: event.type,
        timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
        createdAt: event.createdAt?.toString(), // Using toString() - inconsistent!
      })),
    },
  });
}

/**
 * ============================================================================
 * EXAMPLE 2: Email Analytics API - AFTER (RECOMMENDED)
 * ============================================================================
 */
export async function getEmailAnalytics_AFTER(request: NextRequest) {
  // ... authentication and validation code ...

  const eventsResult = await db.read('emailEvents', {});

  if (!eventsResult.success || !eventsResult.data) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve events' },
      { status: 500 }
    );
  }

  const events = eventsResult.data;

  // ✅ IMPROVEMENTS:
  // - Consistent millisecond precision
  // - Proper validation and error handling
  // - Using formatAPITimestamp for precision
  return NextResponse.json({
    success: true,
    data: {
      events: events.map((event: any) => ({
        eventId: event.eventId,
        type: event.type,
        timestamp: formatAPITimestamp(event.timestamp), // Precise formatting
        createdAt: formatAPIDate(event.createdAt), // Consistent formatting
      })),
    },
  });
}

/**
 * ============================================================================
 * EXAMPLE 3: Available Dates API - BEFORE
 * ============================================================================
 */
export async function getAvailableDates_BEFORE(request: NextRequest) {
  // ... validation code ...

  const datesResult = await db.read('availableDates', {});

  if (!datesResult.success || !datesResult.data) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve dates' },
      { status: 500 }
    );
  }

  const dates = datesResult.data;

  // ❌ PROBLEMS:
  // - Assuming dates are already strings
  // - No validation of date format
  // - No timezone awareness
  return NextResponse.json({
    success: true,
    data: {
      dates: dates.map((d: any) => d.date), // Assuming it's already a string
    },
  });
}

/**
 * ============================================================================
 * EXAMPLE 3: Available Dates API - AFTER (RECOMMENDED)
 * ============================================================================
 */
export async function getAvailableDates_AFTER(request: NextRequest) {
  // ... validation code ...

  const datesResult = await db.read('availableDates', {});

  if (!datesResult.success || !datesResult.data) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve dates' },
      { status: 500 }
    );
  }

  const dates = datesResult.data;

  // ✅ IMPROVEMENTS:
  // - Explicit formatting to YYYY-MM-DD
  // - Timezone-aware formatting
  // - Consistent output format
  return NextResponse.json({
    success: true,
    data: {
      dates: dates.map((d: any) => formatAPIDateOnly(d.date)), // Explicit formatting
    },
  });
}

/**
 * ============================================================================
 * MIGRATION CHECKLIST
 * ============================================================================
 *
 * When updating an API route to use the new date formatting utilities:
 *
 * Step 1: Import the utilities
 *   import { formatAPIDate, formatAPIDateOnly, formatAPITimestamp } from '@/lib/apiDateFormat';
 *
 * Step 2: Identify all date fields in the response
 *   - createdAt, updatedAt, deletedAt → use formatAPIDate()
 *   - deliveryDate, scheduleDate → use formatAPIDateOnly()
 *   - sentAt, deliveredAt, openedAt → use formatAPITimestamp()
 *
 * Step 3: Replace old patterns
 *   - ❌ date.toISOString() → ✅ formatAPIDate(date)
 *   - ❌ date as string → ✅ formatAPIDateOnly(date)
 *   - ❌ date?.toString() → ✅ formatAPIDate(date)
 *
 * Step 4: Test the endpoint
 *   - Verify date formats are consistent
 *   - Check null/undefined handling
 *   - Confirm timezone correctness
 *
 * Step 5: Update API documentation (if any)
 *   - Document the new date formats
 *   - Update examples if needed
 *
 * ============================================================================
 */
