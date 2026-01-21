# API Date Format Inconsistency - Detailed Analysis

**Analysis Date:** 2026-01-07
**Project:** TDN9IL (Next.js Food Delivery Application)
**Scope:** All API endpoints in `/src/app/api`

---

## Executive Summary

This document provides a comprehensive analysis of date format inconsistencies identified across all API endpoints in the application. The analysis reveals significant inconsistencies in how dates are handled, stored, and returned to clients.

### Key Findings

- **4 distinct date formatting patterns** identified across 32+ endpoints
- **No standardized approach** for date serialization
- **Mixed usage** of ISO strings, Date objects, human-readable formats, and date-only strings
- **TypeScript type definitions** allow both `Date` and `string`, causing confusion
- **Timezone handling** is inconsistent across endpoints

---

## Date Format Categories Identified

### Category 1: ISO Timestamp Strings (ISO 8601) ✅

**Pattern:** `toISOString()` or manual ISO string construction
**Format:** `2026-01-15T10:30:00.000Z`
**Use Case:** Precise timestamps, analytics, webhooks, audit trails

**Endpoints:**
1. `/api/admin/email-status` - Lines 246, 270
2. `/api/admin/email-analytics/export` - Lines 185-198 (CSV export)
3. `/api/webhooks/resend` - Lines 24, 91
4. `/api/webhooks/stripe` - Lines 95, 160, 208 (all `new Date()`)
5. `/api/admin/email-analytics/dashboard` - Returns Date objects from analytics library
6. `/api/admin/email-analytics` - Returns Date objects from analytics library

**Rationale:**
- ISO strings are machine-readable
- Timezone-aware (UTC)
- Sortable
- Ideal for APIs and data exchange

**Assessment:** ✅ **Correct Usage** - These endpoints follow best practices.

---

### Category 2: Human-Readable Date Strings (Locale-Formatted) ⚠️

**Pattern:** `toLocaleDateString()` with Intl options
**Format:** `Monday, January 15, 2026`
**Use Case:** User-facing displays, UI labels

**Endpoints:**
1. `/api/food-items-day-wise` - Lines 247, 504
   - `formattedDate` field: Uses `toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })`
   - Purpose: Display date in user-friendly format

**Rationale:**
- Provides formatted dates for direct display in UI
- Reduces client-side formatting logic
- **Issue:** This should be done on the frontend, not backend
- **Problem:** Blurs line between data and presentation

**Assessment:** ⚠️ **Mixed Concerns** - Backend should not return presentation-layer formats.

---

### Category 3: Raw Date Objects (MongoDB BSON Dates) ⚠️

**Pattern:** Returning Date objects directly from database
**Format:** JavaScript `Date` object (serialized by Next.js JSON handler)
**Use Case:** Database records, general CRUD operations

**Endpoints:**
1. `/api/orders` - Line 88
   - Returns `orders` array with `createdAt` and `updatedAt` as Date objects
2. `/api/orders/[orderId]` - Line 150
   - Returns single `order` with Date objects
3. `/api/orders/[orderId]/track` - Lines 85, 86, 112, 113
   - Returns `createdAt`, `updatedAt`, and timestamps in timeline
4. `/api/orders/create` - Uses `new Date()` for timestamps (not directly returned)
5. `/api/orders/reviews` - Lines 94, 95, 112
   - Creates reviews with `new Date()` timestamps
6. `/api/account/profile` - Lines 57, 58
   - Returns `user.createdAt`, `user.updatedAt` as Date objects

**Rationale:**
- Next.js automatically serializes Date objects to ISO strings
- **Issue:** Type definitions don't reflect this serialization
- **Problem:** Frontend developers may not know what to expect

**Assessment:** ⚠️ **Unclear Contract** - Works, but unclear from type definitions.

---

### Category 4: Date-Only Strings (YYYY-MM-DD) ✅

**Pattern:** Date strings without time component
**Format:** `2026-01-15`
**Use Case:** Calendar dates, delivery dates, day-wise categorization

**Endpoints:**
1. `/api/food-items-day-wise` - Line 503
   - `date` field: Returns date in `YYYY-MM-DD` format
   - Input parameter: Accepts date in `YYYY-MM-DD` format
2. `/api/available-dates` - Returns dates in YYYY-MM-DD format

**Rationale:**
- Date-only strings are ideal for calendar dates
- Time component is irrelevant
- **Issue:** Timezone handling is critical

**Assessment:** ✅ **Correct Format** - Ideal for date-only values, if timezone-aware.

---

## Detailed Endpoint Analysis

### Orders API Group

#### GET `/api/orders`

**Current Behavior:**
```typescript
// Returns orders array with raw Date objects
{
  success: true,
  data: {
    items: orders,  // Contains createdAt, updatedAt as Date objects
    page: 1,
    pageSize: 10,
    ...
  }
}
```

**Date Fields:**
- `items[].createdAt` - Date object
- `items[].updatedAt` - Date object
- `items[].items[].deliveryDate` - Date or string (from OrderDay type)
- `items[].items[].actualDeliveryDate` - Date or string

**Issues:**
- Type definition says `Date | string` (inconsistent)
- Next.js serializes to ISO, but frontend may expect Date objects
- No explicit control over serialization format
- No documentation of expected format

**Impact:**
- Frontend confusion about what to expect
- Type safety issues
- Harder to maintain

**Recommended Format:**
- ISO 8601 strings for timestamps (`createdAt`, `updatedAt`)
- YYYY-MM-DD strings for delivery dates (timeless dates)

---

#### GET `/api/orders/[orderId]`

**Current Behavior:**
```typescript
// Returns single order with raw Date objects
{
  success: true,
  data: order  // Contains createdAt, updatedAt as Date objects
}
```

**Date Fields:**
- `createdAt` - Date object
- `updatedAt` - Date object
- `items[].deliveryDate` - Date or string
- `items[].actualDeliveryDate` - Date or string

**Issues:**
- Same as `/api/orders`
- No documentation
- Unclear type definitions

**Recommended Format:**
- ISO 8601 strings for all timestamp fields
- YYYY-MM-DD strings for delivery dates

---

#### GET `/api/orders/[orderId]/track`

**Current Behavior:**
```typescript
// Returns tracking timeline with Date objects
{
  success: true,
  data: {
    order: {
      orderId: "...",
      status: "...",
      createdAt: order.createdAt,  // Date object
      updatedAt: order.updatedAt   // Date object
    },
    timeline: [
      {
        status: "...",
        label: "...",
        timestamp: order.updatedAt,  // Date object
        completed: true,
        active: true
      }
    ],
    estimatedDelivery: firstDeliveryDate  // Date or string
  }
}
```

**Date Fields:**
- `order.createdAt` - Date object
- `order.updatedAt` - Date object
- `timeline[].timestamp` - Date object
- `estimatedDelivery` - Date or string

**Issues:**
- Timeline timestamps need precision
- No documentation of format
- Mixed types (Date vs string)

**Recommended Format:**
- ISO 8601 strings for all timestamps
- YYYY-MM-DD string for estimatedDelivery (date only)

---

### Email Analytics API Group

#### GET `/api/admin/email-status`

**Current Behavior:**
```typescript
// Returns email status with mixed date formats
{
  success: true,
  data: {
    orders: orders.map(order => ({
      orderId: order.orderId,
      customerName: order.customerInfo.name,
      // ...
      createdAt: order.createdAt,  // Date object
      emailStatus: order.emailStatus || { ... }
    })),
    report: {
      recentFailures: [
        {
          orderId: order.orderId,
          customerEmail: order.customerInfo.email,
          // ...
          lastAttempt: emailStatus.lastAttempt
            ? new Date(emailStatus.lastAttempt).toISOString()  // ISO string
            : 'unknown',
          attempts: emailStatus.attempts,
          error: emailStatus.error,
        }
      ],
      emailsByDate: [
        {
          date: getPSTDateString(new Date(order.createdAt)),  // PST date string
          total: 10,
          sent: 8,
          failed: 2,
          ...
        }
      ]
    }
  }
}
```

**Date Fields:**
- `orders[].createdAt` - Date object
- `report.recentFailures[].lastAttempt` - **ISO string** (explicit conversion)
- `report.emailsByDate[].date` - PST date string (YYYY-MM-DD)

**Issues:**
- Inconsistent: Some fields use ISO, some use Date objects, some use custom formatted strings
- `lastAttempt` explicitly converts to ISO, but `createdAt` doesn't
- `getPSTDateString()` returns date strings in PST timezone
- No clear pattern

**Impact:**
- Frontend doesn't know what to expect
- Inconsistent parsing logic required

**Recommended Format:**
- Standardize all timestamps to ISO 8601 strings
- Keep `emailsByDate[].date` as YYYY-MM-DD (calendar date)

---

#### GET `/api/admin/email-analytics/export`

**Current Behavior:**
```typescript
// CSV export with ISO timestamps
const csvRows = chunk.map(summary => {
  const row = [
    summary.messageId,
    summary.emailType,
    summary.toEmail,
    // ...
    summary.sentAt ? new Date(summary.sentAt).toISOString() : '',  // ISO
    summary.deliveredAt ? new Date(summary.deliveredAt).toISOString() : '',  // ISO
    summary.openedAt ? new Date(summary.openedAt).toISOString() : '',  // ISO
    summary.clickedAt ? new Date(summary.clickedAt).toISOString() : '',  // ISO
    summary.bouncedAt ? new Date(summary.bouncedAt).toISOString() : '',  // ISO
    summary.complainedAt ? new Date(summary.complainedAt).toISOString() : '',  // ISO
    summary.rejectedAt ? new Date(summary.rejectedAt).toISOString() : '',  // ISO
    // ...
    new Date(summary.createdAt).toISOString(),  // ISO
    new Date(summary.updatedAt).toISOString(),  // ISO
  ];
  return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
});
```

**Date Fields:**
- All timestamp fields explicitly converted to ISO strings

**Issues:**
- None - consistent approach for CSV export

**Assessment:** ✅ **Correct Usage** - ISO strings in CSV exports is best practice.

---

### Food Items API Group

#### GET `/api/food-items-day-wise`

**Current Behavior:**
```typescript
// Returns food items with dual date format
return Response.json(
  {
    data: {
      categoryId: categoryId,
      categoryListingType: 'day-wise',
      date: date,  // YYYY-MM-DD format (input parameter)
      formattedDate: formatDateString(date),  // "Monday, January 15, 2026"
      foodItems: uniqueItems,
    },
    message: 'success',
  },
  { status: 200 }
);

// Helper function
function formatDateString(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = createPSTDate(year, month - 1, day, 0, 0, 0);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return dateObj.toLocaleDateString('en-US', options);  // "Monday, January 15, 2026"
}
```

**Date Fields:**
- `date` - YYYY-MM-DD string (input parameter, echoed back)
- `formattedDate` - Human-readable string (e.g., "Monday, January 15, 2026")

**Issues:**
- `formattedDate` should be generated on frontend, not backend
- Backend should only return machine-readable formats
- Increases payload size unnecessarily
- Blurs separation of concerns

**Impact:**
- Frontend depends on backend for formatting
- Can't customize format per user locale
- Larger API responses

**Recommended Format:**
- Remove `formattedDate` field
- Frontend should format `date` field using `Intl.DateTimeFormat`
- Keep `date` as YYYY-MM-DD string

---

### Webhooks API Group

#### POST `/api/webhooks/resend`

**Current Behavior:**
```typescript
// Logs webhook with ISO timestamps
console.log('[Webhook] Received Resend webhook:', {
  hasSignature: !!signature,
  bodyLength: body.length,
  timestamp: new Date().toISOString(),  // ISO string
});

// Also returns ISO timestamp in response
console.log('[Webhook] Webhook processed successfully:', {
  processedEvents: result.processedEvents,
  timestamp: new Date().toISOString(),  // ISO string
});
```

**Date Fields:**
- Console logging uses ISO strings
- No dates returned to client (only success/error responses)

**Assessment:** ✅ **Correct Usage** - ISO strings for logging is best practice.

---

#### POST `/api/webhooks/stripe`

**Current Behavior:**
```typescript
// Updates order with new Date() timestamps
const updateResult = await db.updateOne('orders',
  { orderId: order.orderId },
  {
    $set: {
      paymentStatus: 'paid',
      status: 'confirmed',
      updatedAt: new Date(),  // Date object
    },
  }
);
```

**Date Fields:**
- `updatedAt` - Date object (stored in MongoDB)

**Assessment:** ✅ **Correct Usage** - MongoDB stores Date objects, Next.js serializes to ISO when returned.

---

### Account API Group

#### GET `/api/account/profile`

**Current Behavior:**
```typescript
// Returns user profile with Date objects
return NextResponse.json({
  success: true,
  data: {
    id: user._id!.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isCompleted: user.isCompleted,
    createdAt: user.createdAt,  // Date object
    updatedAt: user.updatedAt,  // Date object
  },
});
```

**Date Fields:**
- `createdAt` - Date object
- `updatedAt` - Date object

**Issues:**
- Type definitions allow Date | string
- Frontend may not know what to expect
- No documentation

**Recommended Format:**
- ISO 8601 strings (via Next.js serialization)
- Update type definitions to be explicit

---

## Type Definition Issues

### Problem Areas in TypeScript Types

#### `src/types/order.ts`

```typescript
export interface OrderDay {
  day: string;
  deliveryDate: Date | string;  // ❌ Ambiguous type
  actualDeliveryDate?: Date | string;  // ❌ Ambiguous type
  items: OrderDayItem[];
  dayTotal: number;
}

export interface Order {
  // ...
  createdAt?: Date | string;  // ❌ Ambiguous type
  updatedAt?: Date | string;  // ❌ Ambiguous type
}

export interface OrderReview {
  // ...
  createdAt?: Date | string;  // ❌ Ambiguous type
  updatedAt?: Date | string;  // ❌ Ambiguous type
}
```

**Issues:**
- Type definitions allow both `Date` and `string`
- No clear indication of which format is used
- Frontend developers don't know what to expect
- TypeScript can't catch format mismatches
- Reduces type safety

**Impact:**
- Runtime errors possible
- Harder to refactor
- Unclear API contract

---

#### `src/types/email.ts`

```typescript
export interface EmailAnalyticsEvent {
  // ...
  timestamp: Date;  // ❌ Date object (will be serialized by Next.js)
  data: { ... };
  createdAt: Date;  // ❌ Date object
}

export interface EmailAnalyticsSummary {
  // ...
  sentAt?: Date;  // ❌ Date object
  deliveredAt?: Date;  // ❌ Date object
  openedAt?: Date;  // ❌ Date object
  clickedAt?: Date;  // ❌ Date object
  bouncedAt?: Date;  // ❌ Date object
  complainedAt?: Date;  // ❌ Date object
  rejectedAt?: Date;  // ❌ Date object
  // ...
  createdAt: Date;  // ❌ Date object
  updatedAt: Date;  // ❌ Date object
}

export interface WebhookPayload {
  id: string;
  created_at: string;  // ✅ Already using string type (ISO)
  type: string;
  data: { ... };
}
```

**Issues:**
- Most fields use `Date` type (will serialize to ISO, but unclear from types)
- `WebhookPayload.created_at` correctly uses `string` type (ISO format)
- Inconsistent type definitions
- Some types clarify format, others don't

**Impact:**
- Unclear API contract
- Inconsistent type safety
- Harder to use for frontend developers

---

## Timezone Issues

### UTC vs PST Inconsistency

**Problem:** Some endpoints use UTC timezone for date formatting while others use PST.

**Example of Off-by-One Error:**

```typescript
// ❌ WRONG - Uses UTC timezone
const dateStr = date.toISOString().split('T')[0];

// Example of error:
const date = new Date('2026-01-16T02:00:00Z'); // 6 PM PST on Jan 15
date.toISOString().split('T')[0]; // Returns "2026-01-16" (WRONG DAY for PST!)

// ✅ CORRECT - Uses PST timezone
import { getPSTDateString } from '@/lib/timezone';
const dateStr = getPSTDateString(date);

// Example with correct PST handling:
const date = new Date('2026-01-16T02:00:00Z'); // 6 PM PST on Jan 15
getPSTDateString(date); // Returns "2026-01-15" (PST date - CORRECT!)
```

**Impact:**
- Dates can be off by one day
- Confusing for users
- Business logic errors (delivery dates, cutoff times)

---

## Recommendations

### 1. Standardize on ISO 8601 for Timestamps

**Rule:** All timestamp fields (createdAt, updatedAt, sentAt, etc.) MUST use ISO 8601 strings

**Format:** `2026-01-15T10:30:00.000Z`

**Rationale:**
- Machine-readable and sortable
- Includes timezone information (UTC)
- Standard for APIs
- Easily parsed by JavaScript `new Date(isoString)`

---

### 2. Use YYYY-MM-DD for Date-Only Values

**Rule:** All date-only fields (deliveryDate, scheduledDate, etc.) MUST use YYYY-MM-DD format

**Format:** `2026-01-15`

**Rationale:**
- Date-only values have no time component
- Timezone-independent
- Sortable as strings
- Easy to validate with regex

**Critical:** Must use PST timezone when converting Date objects to YYYY-MM-DD.

---

### 3. Remove Human-Readable Formats from API

**Rule:** Never return formatted date strings (e.g., "Monday, January 15, 2026") from API

**Rationale:**
- Frontend should handle all presentation formatting
- Reduces payload size
- Allows frontend to adapt to user locale
- Separates concerns (data vs presentation)

---

### 4. Use Explicit Type Definitions

**Rule:** Use specific string types for different date formats in TypeScript

```typescript
// Create shared types
type ISODateTimeString = string & { readonly __brand: 'ISODateTime' };
type DateOnlyString = string & { readonly __brand: 'DateOnly' };
```

**Rationale:**
- Type safety
- Self-documenting code
- Compile-time checks
- Clearer API contract

---

## Summary

The application has significant date format inconsistencies that lead to:
- Confusion for frontend developers
- Timezone-related bugs
- Increased payload size (formatted dates)
- Type safety issues
- Maintenance challenges

**Recommended Actions:**
1. Adopt ISO 8601 as the standard for all timestamps
2. Use YYYY-MM-DD for date-only values (with PST timezone)
3. Remove all human-readable date formatting from API responses
4. Update TypeScript type definitions to be explicit
5. Coordinate with frontend team for migration

**Benefits of Standardization:**
- Clearer API contract
- Better type safety
- Reduced payload sizes
- Easier frontend date handling
- Timezone consistency
- Improved maintainability

---

**Analysis Version:** 1.0
**Last Updated:** 2026-01-07
**Next Review:** After implementation of standardization
