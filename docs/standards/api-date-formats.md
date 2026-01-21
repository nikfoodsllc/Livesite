# API Date Format Standards

**Document Version:** 1.0
**Last Updated:** 2026-01-07
**Status:** Active Standard

---

## Overview

This document defines the standard date and time formats that must be used across all API endpoints in the application. These standards ensure consistency, machine readability, and proper timezone handling for all API responses.

## Table of Contents

1. [Date Format Categories](#date-format-categories)
2. [API Response Guidelines](#api-response-guidelines)
3. [Timezone Handling](#timezone-handling)
4. [Implementation Examples](#implementation-examples)
5. [Code Examples](#code-examples)
6. [Common Mistakes to Avoid](#common-mistakes-to-avoid)
7. [Migration Notes](#migration-notes)

---

## Date Format Categories

### A. Timestamps (Date + Time)

**Format:** ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)

**Use Cases:**
- `createdAt` - Resource creation timestamp
- `updatedAt` - Last modification timestamp
- `lastAttempt` - Last retry or attempt timestamp
- `timestamp` - Event or log timestamp
- `sentAt`, `deliveredAt`, `openedAt` - Email analytics timestamps
- `bouncedAt`, `complainedAt`, `rejectedAt` - Email event timestamps

**Examples:**
- `'2026-01-15T10:30:00.000Z'`
- `'2026-01-15T18:45:30.123Z'`

**Helper Function:**
```typescript
/**
 * Format a Date object to ISO 8601 timestamp string for API responses
 *
 * @param date - Date object to format
 * @returns ISO 8601 timestamp string (e.g., "2026-01-15T10:30:00.000Z")
 *
 * @example
 * formatAPITimestamp(new Date()) // Returns "2026-01-15T10:30:00.000Z"
 */
export function formatAPITimestamp(date: Date): string {
  return date.toISOString();
}
```

**Implementation Notes:**
- Always use `.toISOString()` for timestamp fields
- ISO format includes UTC timezone indicator (`Z`)
-Sortable and machine-readable
- Easily parsed by JavaScript `new Date(isoString)`

---

### B. Date-Only (Calendar Dates)

**Format:** `YYYY-MM-DD` (ISO 8601 date-only format)

**Use Cases:**
- Delivery dates
- Available dates
- Filter dates
- Date parameters
- Day-wise categorization keys
- `date`, `deliveryDate`, `actualDeliveryDate`

**Examples:**
- `'2026-01-15'`
- `'2026-12-31'`

**Helper Function:**
```typescript
/**
 * Format a Date object to YYYY-MM-DD string for API date-only fields
 *
 * IMPORTANT: This function uses PST timezone to ensure consistency with
 * business logic. Do NOT use `toISOString().split('T')[0]` as it uses UTC.
 *
 * @param date - Date object to format
 * @returns Date-only string in YYYY-MM-DD format using PST timezone
 *
 * @example
 * formatAPIDateOnly(new Date()) // Returns "2026-01-15"
 */
export function formatAPIDateOnly(date: Date): string {
  // Import from src/lib/timezone.ts
  const { getPSTDateString } = require('@/lib/timezone');
  return getPSTDateString(date);
}
```

**Implementation Notes:**
- Must use PST timezone for consistency with business logic
- Use `getPSTDateString()` from `/src/lib/timezone.ts`
- Do NOT use `.toISOString().split('T')[0]` (uses UTC, can cause off-by-one errors)
- Timezone-independent for comparisons and sorting
- Validatable with regex: `/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/`

---

### C. Display Dates (Optional)

**Format:** Human-readable locale string

**Use Cases:**
- UI display convenience (optional field)
- User-facing text where client-side formatting is not feasible

**Examples:**
- `'Monday, January 15, 2026'`
- `'Friday (Jan 15)'`

**Helper Function:**
```typescript
/**
 * Format a date string to human-readable format for UI display
 *
 * PURPOSE: This function provides a UI-friendly date format for display purposes.
 * It is intentionally separate from the canonical 'date' field (YYYY-MM-DD) to follow
 * API best practices of providing both machine-readable and human-readable formats.
 *
 * WHY THIS EXISTS:
 * - Frontend components can directly display formattedDate without additional formatting logic
 * - Provides consistent date formatting across all clients
 * - Reduces client-side JavaScript processing for date display
 * - Maintains ISO 8601 standard in 'date' field for data processing
 *
 * @param dateString - Date string in YYYY-MM-DD format (ISO 8601)
 * @returns Formatted date string (e.g., "Monday, January 15, 2026") in PST timezone
 *
 * @example
 * formatAPIDisplayDate("2026-01-15") // Returns "Monday, January 15, 2026"
 */
export function formatAPIDisplayDate(dateString: string): string {
  // Import from src/lib/timezone.ts
  const { createPSTDate, PST_TIMEZONE } = require('@/lib/timezone');

  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = createPSTDate(year, month - 1, day, 0, 0, 0);

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: PST_TIMEZONE,
  };

  try {
    return dateObj.toLocaleDateString('en-US', options);
  } catch (error) {
    console.warn(`Failed to format date: ${dateString}`, error);
    return dateString; // Fallback to ISO format
  }
}
```

**Implementation Notes:**
- Only include if frontend needs it
- Otherwise, format on client side for better flexibility
- Must use PST timezone (`PST_TIMEZONE` constant)
- Use locale 'en-US' for consistency
- Always provide a fallback to the ISO format

---

## API Response Guidelines

### 1. Always Return Machine-Readable Format

All date/timestamp fields MUST be returned in ISO 8601 format for machine readability.

```typescript
// ✅ CORRECT - Return timestamp as ISO string
return Response.json({
  orderId: 'ORD-123',
  createdAt: '2026-01-15T10:30:00.000Z', // ISO 8601
  updatedAt: '2026-01-15T11:45:30.000Z', // ISO 8601
});

// ❌ WRONG - Return Date objects
return Response.json({
  orderId: 'ORD-123',
  createdAt: new Date(), // Will be serialized, but unclear from types
  updatedAt: new Date(),
});
```

### 2. Dual Format Pattern (For Calendar Dates)

For calendar dates, provide both machine-readable and human-readable formats:

```typescript
// ✅ CORRECT - Dual format pattern
return Response.json({
  data: {
    categoryId: '65a1b2c3d4e5f6789abcdef0',
    categoryListingType: 'day-wise',
    // Canonical API date format (ISO 8601: YYYY-MM-DD)
    // Use this for: data processing, filtering, API interactions, date comparisons
    date: '2026-01-15',

    // Human-readable date format for UI display
    // Use this for: direct display in UI components, user-facing text
    // Avoid using for: date comparisons, sorting, data processing
    formattedDate: 'Monday, January 15, 2026',

    foodItems: [...],
  },
  message: 'success',
});
```

### 3. Never Rely on Client-Side Timezone for Business Logic

All date calculations and business logic MUST use PST timezone:

```typescript
// ✅ CORRECT - Use PST for date calculations
import { getPSTDateString, PST_TIMEZONE } from '@/lib/timezone';

const deliveryDate = getPSTDateString(deliveryDateObj);

// ❌ WRONG - Rely on UTC or client timezone
const deliveryDate = dateObj.toISOString().split('T')[0]; // Uses UTC - can be wrong day in PST
```

### 4. Document Timezone Handling in API Docs

Every API endpoint that returns dates must document the timezone used:

```typescript
/**
 * API Endpoint: GET /api/food-items-day-wise
 *
 * Query Parameters:
 * - categoryId: string
 * - date: string (YYYY-MM-DD format, interpreted as PST date)
 *
 * Response Fields:
 * - date: string (YYYY-MM-DD) - Date in Pacific Time timezone
 * - formattedDate: string - Human-readable date in Pacific Time
 * - foodItems: array
 *
 * Timezone: All dates use Pacific Time (America/Los_Angeles)
 */
```

---

## Examples by Endpoint Type

### Order APIs

**Return timestamps as ISO 8601**

```typescript
// GET /api/orders
{
  "success": true,
  "data": {
    "items": [
      {
        "orderId": "ORD-123",
        "createdAt": "2026-01-15T10:30:00.000Z",  // ISO timestamp
        "updatedAt": "2026-01-15T11:45:30.000Z",  // ISO timestamp
        "items": [
          {
            "name": "Item 1",
            "deliveryDate": "2026-01-16",  // Date-only (YYYY-MM-DD)
            "actualDeliveryDate": "2026-01-16"  // Date-only (YYYY-MM-DD)
          }
        ]
      }
    ]
  }
}
```

### Analytics APIs

**Return all timestamps as ISO 8601**

```typescript
// GET /api/admin/email-analytics
{
  "success": true,
  "data": {
    "events": [
      {
        "messageId": "msg-123",
        "timestamp": "2026-01-15T10:30:00.000Z",  // ISO timestamp
        "eventType": "delivered",
        "data": { ... }
      }
    ],
    "summary": {
      "sentAt": "2026-01-15T10:30:00.000Z",      // ISO timestamp
      "deliveredAt": "2026-01-15T10:31:00.000Z",  // ISO timestamp
      "openedAt": "2026-01-15T10:35:00.000Z",     // ISO timestamp
      "clickedAt": "2026-01-15T10:36:00.000Z",    // ISO timestamp
      "bouncedAt": null,
      "createdAt": "2026-01-15T10:30:00.000Z",   // ISO timestamp
      "updatedAt": "2026-01-15T10:36:00.000Z"    // ISO timestamp
    }
  }
}
```

### Calendar APIs

**Return dates as YYYY-MM-DD**

```typescript
// GET /api/available-dates
{
  "success": true,
  "dates": [
    {
      "id": "2026-01-15",
      "date": "2026-01-15",              // Date-only (YYYY-MM-DD)
      "formattedDate": "Friday (Jan 15)", // Human-readable (optional)
      "fullDate": "Friday, January 15, 2026",
      "flatCategoryEnabled": true,
      "dayWiseCategoryEnabled": true,
      "isToday": false,
      "isPast": false,
      "isPastCutoff": false
    }
  ]
}
```

### Reporting APIs

**Return timestamps as ISO 8601**

```typescript
// GET /api/admin/email-status
{
  "success": true,
  "data": {
    "orders": [
      {
        "orderId": "ORD-123",
        "customerName": "John Doe",
        "createdAt": "2026-01-15T10:30:00.000Z",  // ISO timestamp
        "emailStatus": {
          "sent": true,
          "delivered": true,
          "lastAttempt": "2026-01-15T10:31:00.000Z"  // ISO timestamp
        }
      }
    ],
    "report": {
      "recentFailures": [
        {
          "orderId": "ORD-456",
          "lastAttempt": "2026-01-15T09:15:00.000Z",  // ISO timestamp
          "attempts": 3,
          "error": "Bounce"
        }
      ],
      "emailsByDate": [
        {
          "date": "2026-01-15",  // Date-only (YYYY-MM-DD)
          "total": 10,
          "sent": 8,
          "failed": 2
        }
      ]
    }
  }
}
```

---

## Code Examples

### Correct Usage of Date Formatting Utilities

```typescript
import { formatAPITimestamp, formatAPIDateOnly, formatAPIDisplayDate } from '@/utils/formatters';
import { getPSTDateString, PST_TIMEZONE } from '@/lib/timezone';

// Example 1: Formatting timestamps for order creation
const newOrder = {
  orderId: generateOrderId(),
  userId,
  items: orderItems,
  createdAt: formatAPITimestamp(new Date()),  // "2026-01-15T10:30:00.000Z"
  updatedAt: formatAPITimestamp(new Date()),  // "2026-01-15T10:30:00.000Z"
};

// Example 2: Formatting delivery dates
const orderItem = {
  foodItemId,
  quantity,
  deliveryDate: formatAPIDateOnly(deliveryDateObj),  // "2026-01-16"
  actualDeliveryDate: formatAPIDateOnly(actualDateObj),  // "2026-01-16"
};

// Example 3: Returning food items day-wise
return Response.json({
  data: {
    categoryId,
    categoryListingType: 'day-wise',
    date: '2026-01-15',  // YYYY-MM-DD
    formattedDate: formatAPIDisplayDate('2026-01-15'),  // "Monday, January 15, 2026"
    foodItems: uniqueItems,
  },
  message: 'success',
});

// Example 4: Formatting analytics timestamps
const analyticsEvent = {
  messageId,
  eventType: 'delivered',
  timestamp: formatAPITimestamp(new Date()),  // "2026-01-15T10:30:00.000Z"
  data: eventData,
};
```

### API Response Examples

```typescript
// Example 1: Order API response
return Response.json({
  success: true,
  data: {
    orderId: 'ORD-123',
    createdAt: formatAPITimestamp(order.createdAt),  // ISO timestamp
    updatedAt: formatAPITimestamp(order.updatedAt),  // ISO timestamp
    items: order.items.map(item => ({
      ...item,
      deliveryDate: formatAPIDateOnly(item.deliveryDate),  // YYYY-MM-DD
      actualDeliveryDate: item.actualDeliveryDate
        ? formatAPIDateOnly(item.actualDeliveryDate)
        : null,
    })),
  },
});

// Example 2: Available dates API response
return Response.json({
  success: true,
  dates: availableDates.map(date => ({
    id: date.date,
    date: date.date,  // YYYY-MM-DD
    formattedDate: formatAPIDisplayDate(date.date),  // Human-readable
    fullDate: formatPSTDate(date.dateObj, 'long'),  // "Friday, January 15, 2026"
    flatCategoryEnabled: date.flatCategoryEnabled,
    dayWiseCategoryEnabled: date.dayWiseCategoryEnabled,
    isToday: isPSTToday(date.dateObj),
    isPast: isInPSTPast(date.dateObj),
    isPastCutoff: date.isPastCutoff,
  })),
});

// Example 3: Email analytics export (CSV)
const csvRows = chunk.map(summary => {
  const row = [
    summary.messageId,
    summary.emailType,
    summary.toEmail,
    summary.sentAt ? formatAPITimestamp(new Date(summary.sentAt)) : '',
    summary.deliveredAt ? formatAPITimestamp(new Date(summary.deliveredAt)) : '',
    summary.openedAt ? formatAPITimestamp(new Date(summary.openedAt)) : '',
    summary.clickedAt ? formatAPITimestamp(new Date(summary.clickedAt)) : '',
    summary.bouncedAt ? formatAPITimestamp(new Date(summary.bouncedAt)) : '',
    summary.complainedAt ? formatAPITimestamp(new Date(summary.complainedAt)) : '',
    summary.rejectedAt ? formatAPITimestamp(new Date(summary.rejectedAt)) : '',
    formatAPITimestamp(new Date(summary.createdAt)),
    formatAPITimestamp(new Date(summary.updatedAt)),
  ];
  return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
});
```

---

## Common Mistakes to Avoid

### Mistake 1: Using UTC for Date Calculations

```typescript
// ❌ WRONG - Uses UTC timezone
const dateStr = date.toISOString().split('T')[0];

// Example of off-by-one error:
const date = new Date('2026-01-16T02:00:00Z'); // 6 PM PST on Jan 15
date.toISOString().split('T')[0]; // Returns "2026-01-16" (WRONG DAY for PST!)

// ✅ CORRECT - Uses PST timezone
import { getPSTDateString } from '@/lib/timezone';
const dateStr = getPSTDateString(date);

// Example with correct PST handling:
const date = new Date('2026-01-16T02:00:00Z'); // 6 PM PST on Jan 15
getPSTDateString(date); // Returns "2026-01-15" (PST date - CORRECT!)
```

### Mistake 2: Mixing Date Objects and ISO Strings

```typescript
// ❌ WRONG - Inconsistent types
return Response.json({
  createdAt: new Date(),  // Date object (serialized by Next.js)
  updatedAt: '2026-01-15T10:30:00.000Z',  // ISO string
});

// ✅ CORRECT - Consistent ISO strings
return Response.json({
  createdAt: formatAPITimestamp(new Date()),  // ISO string
  updatedAt: formatAPITimestamp(new Date()),  // ISO string
});
```

### Mistake 3: Not Using Helper Functions

```typescript
// ❌ WRONG - Inconsistent formatting
return Response.json({
  date: `${year}-${month}-${day}`,
  timestamp: new Date().toISOString(),
  formatted: date.toLocaleDateString(),
});

// ✅ CORRECT - Use helper functions
import { formatAPITimestamp, formatAPIDateOnly, formatAPIDisplayDate } from '@/utils/formatters';

return Response.json({
  date: formatAPIDateOnly(dateObj),  // Consistent YYYY-MM-DD
  timestamp: formatAPITimestamp(dateObj),  // Consistent ISO 8601
  formatted: formatAPIDisplayDate(dateString),  // Consistent formatted display
});
```

### Mistake 4: Using Formatted Dates for Comparisons

```typescript
// ❌ WRONG - Using formatted date for comparison
if (item.formattedDate > otherItem.formattedDate) {
  // This will not work correctly!
}

// ✅ CORRECT - Using ISO date for comparison
if (item.date > otherItem.date) {
  // YYYY-MM-DD strings are comparable
}

// ✅ ALSO CORRECT - Using Date objects for timestamp comparison
if (new Date(item.createdAt) > new Date(otherItem.createdAt)) {
  // Timestamps comparison
}
```

### Mistake 5: Forgetting Timezone in Display Dates

```typescript
// ❌ WRONG - No timezone specified
const formatted = date.toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

// ✅ CORRECT - Explicit PST timezone
import { PST_TIMEZONE } from '@/lib/timezone';

const formatted = date.toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: PST_TIMEZONE,  // Explicit timezone
});
```

---

## Migration Notes

### From Previous Patterns

If you're updating existing code to follow this standard:

#### 1. Changing from Date Objects to ISO Strings

**Before:**
```typescript
return Response.json({
  orderId: order.orderId,
  createdAt: order.createdAt,  // Date object
  updatedAt: order.updatedAt,  // Date object
});
```

**After:**
```typescript
return Response.json({
  orderId: order.orderId,
  createdAt: formatAPITimestamp(order.createdAt),  // ISO string
  updatedAt: formatAPITimestamp(order.updatedAt),  // ISO string
});
```

**Impact:**
- Frontend currently receives ISO strings (due to Next.js serialization)
- If frontend parses as Date objects, **no change needed**
- If frontend expects Date objects directly, **may need adjustment**

#### 2. Adding formattedDate Field

**Before:**
```typescript
return Response.json({
  data: {
    date: '2026-01-15',
    foodItems: [...],
  },
});
```

**After:**
```typescript
return Response.json({
  data: {
    date: '2026-01-15',  // Machine-readable
    formattedDate: formatAPIDisplayDate('2026-01-15'),  // Human-readable
    foodItems: [...],
  },
});
```

**Impact:**
- Frontend can now use `formattedDate` directly for display
- Reduces client-side formatting logic
- **Not a breaking change** - frontend can still format `date` field if needed

#### 3. Fixing Date-Only Calculations

**Before:**
```typescript
// ❌ Uses UTC
const deliveryDate = dateObj.toISOString().split('T')[0];
```

**After:**
```typescript
// ✅ Uses PST
import { getPSTDateString } from '@/lib/timezone';
const deliveryDate = getPSTDateString(dateObj);
```

**Impact:**
- **Critical fix** - prevents off-by-one errors
- Previous code could show wrong day when UTC and PST are on different calendar days
- **Breaking change** if frontend depends on the incorrect UTC-based date

### Breaking Changes for Frontend

If you're making breaking changes to date formats:

1. **Coordinate with frontend team** - Plan migration together
2. **Version the API** - Consider API versioning if changes are significant
3. **Provide migration period** - Support both old and new formats temporarily if needed
4. **Update API documentation** - Clearly document breaking changes
5. **Communicate early** - Give frontend team advance notice

### Testing After Migration

After updating date formats:

1. **Verify API responses** - Use curl or Postman to check response formats
2. **Test frontend display** - Check dates display correctly in UI
3. **Test date calculations** - Verify delivery dates, cutoff times, etc.
4. **Test timezone handling** - Test with users in different timezones
5. **Test date filtering** - Verify filter/sort operations work correctly
6. **Check CSV exports** - Verify date formats in exported files

---

## Type Definitions

### TypeScript Type Safety

Use specific string types for different date formats:

```typescript
/**
 * ISO 8601 timestamp string
 * Format: YYYY-MM-DDTHH:mm:ss.sssZ
 * Example: "2026-01-15T10:30:00.000Z"
 */
export type ISODateTimeString = string & { readonly __brand: 'ISODateTime' };

/**
 * Date-only string in YYYY-MM-DD format
 * Format: YYYY-MM-DD
 * Example: "2026-01-15"
 */
export type DateOnlyString = string & { readonly __brand: 'DateOnly' };

/**
 * Formatted date string for UI display
 * Format: Locale-specific (e.g., "Monday, January 15, 2026")
 * Example: "Monday, January 15, 2026"
 */
export type FormattedDateString = string & { readonly __brand: 'FormattedDate' };

/**
 * Helper function to create ISODateTimeString
 */
export function toISOString(date: Date): ISODateTimeString {
  return date.toISOString() as ISODateTimeString;
}

/**
 * Helper function to create DateOnlyString
 */
export function toDateOnlyString(date: Date): DateOnlyString {
  const { getPSTDateString } = require('@/lib/timezone');
  return getPSTDateString(date) as DateOnlyString;
}

/**
 * Example interface using typed date fields
 */
export interface OrderResponse {
  orderId: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  items: OrderItemResponse[];
}

export interface OrderItemResponse {
  name: string;
  deliveryDate: DateOnlyString;
  actualDeliveryDate?: DateOnlyString | null;
}
```

---

## Related Documents

- **Date Handling Convention:** `/docs/standards/date-handling-convention.md`
- **API Date Format Standardization:** `/docs/api-date-format-standardization.md`
- **Timezone Utilities:** `/src/lib/timezone.ts`
- **Order Cutoff Logic:** `/docs/standards/order-cutoff-logic.md`

---

## Quick Reference

| Use Case | Format | Example | Helper Function | Type Definition |
|----------|--------|---------|-----------------|-----------------|
| Timestamps (created, updated, sent, etc.) | ISO 8601 | `2026-01-15T10:30:00.000Z` | `formatAPITimestamp(date)` | `ISODateTimeString` |
| Calendar dates (delivery dates, scheduled dates) | YYYY-MM-DD | `2026-01-15` | `formatAPIDateOnly(date)` | `DateOnlyString` |
| UI display (optional) | Locale-formatted | "Monday, January 15, 2026" | `formatAPIDisplayDate(dateString)` | `FormattedDateString` |
| Database storage | BSON Date | `Date` object | N/A | `Date` |

---

## Questions or Issues?

If you have questions about this standard or need clarification on implementation:

1. Review the examples in this document
2. Check the fully documented endpoints listed in `/docs/api-date-format-standardization.md`
3. Refer to the timezone utilities in `/src/lib/timezone.ts`
4. Consult the date handling convention document

---

**Standard Owner:** Backend Team
**Last Updated:** 2026-01-07
**Status:** Active Standard
