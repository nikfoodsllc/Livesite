# API Date Format Inconsistency - Implementation Guide

**Implementation Date:** 2026-01-07
**Status:** Completed ✅
**Version:** 1.0

---

## Overview

This document describes the step-by-step implementation of the date format standardization fix. It serves as a guide for applying the standards to existing endpoints and as reference for future API development.

---

## Phase 1: Centralized Utilities

### File: `/src/lib/apiDateFormat.ts`

Created comprehensive date formatting utilities with full documentation.

#### Utility Functions Implemented

##### 1. formatAPIDate()

**Purpose:** Format Date objects or date strings to ISO 8601 format

**Usage:**
```typescript
import { formatAPIDate } from '@/lib/apiDateFormat';

// Format timestamps
response.createdAt = formatAPIDate(order.createdAt);
response.updatedAt = formatAPIDate(order.updatedAt);

// Output: '2026-01-15T10:30:00.000Z'
```

**Features:**
- Accepts Date objects, date strings, null, or undefined
- Validates input and returns empty string for invalid dates
- Includes error handling with console logging
- Full JSDoc documentation

**Implementation:**
```typescript
export function formatAPIDate(date: Date | string | null | undefined): string {
  if (date === null || date === undefined) {
    return '';
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      console.warn('[formatAPIDate] Invalid date provided:', date);
      return '';
    }

    return dateObj.toISOString();
  } catch (error) {
    console.error('[formatAPIDate] Error formatting date:', error, 'Input:', date);
    return '';
  }
}
```

---

##### 2. formatAPIDateOnly()

**Purpose:** Format date-only calendar dates to YYYY-MM-DD format using PST timezone

**Usage:**
```typescript
import { formatAPIDateOnly } from '@/lib/apiDateFormat';

// Format delivery dates
response.deliveryDate = formatAPIDateOnly(order.deliveryDate);

// Output: '2026-01-15'
```

**Features:**
- Uses PST timezone for consistency with business logic
- Validates YYYY-MM-DD format before returning
- Handles Date objects, date strings, null, or undefined
- Includes error handling

**Implementation:**
```typescript
export function formatAPIDateOnly(dateString: string | Date | null | undefined): string {
  if (dateString === null || dateString === undefined) {
    return '';
  }

  try {
    let dateObj: Date;

    if (typeof dateString === 'string') {
      // If already in YYYY-MM-DD format, validate and return
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const parts = dateString.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);

        if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return dateString;
        }
      }
      dateObj = new Date(dateString);
    } else {
      dateObj = dateString;
    }

    if (isNaN(dateObj.getTime())) {
      console.warn('[formatAPIDateOnly] Invalid date provided:', dateString);
      return '';
    }

    // Format date in PST timezone to YYYY-MM-DD
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: PST_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(dateObj);
    const year = parts.find((p) => p.type === 'year')?.value || '';
    const month = parts.find((p) => p.type === 'month')?.value || '';
    const day = parts.find((p) => p.type === 'day')?.value || '';

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('[formatAPIDateOnly] Error formatting date:', error, 'Input:', dateString);
    return '';
  }
}
```

---

##### 3. formatAPITimestamp()

**Purpose:** Format Date objects to ISO 8601 with explicit millisecond precision

**Usage:**
```typescript
import { formatAPITimestamp } from '@/lib/apiDateFormat';

// Format precise event timestamps
response.timestamp = formatAPITimestamp(event.timestamp);

// Output: '2026-01-15T10:30:45.123Z'
```

**Features:**
- Emphasizes millisecond precision
- Ideal for event ordering and audit logs
- Same error handling as formatAPIDate

---

##### 4. Helper Functions

**isValidAPIDate()**
```typescript
// Validate date before formatting
if (isValidAPIDate(order.createdAt)) {
  response.createdAt = formatAPIDate(order.createdAt);
}
```

**formatAPIDateArray()**
```typescript
// Format arrays of dates
const formattedDates = formatAPIDateArray(dates, formatAPIDate);
```

---

### File: `/src/utils/formatters.ts`

Added type-safe branded types for date strings.

#### Type Definitions

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
 */
export type FormattedDateString = string & { readonly __brand: 'FormattedDate' };
```

#### Helper Functions

```typescript
/**
 * Format a Date object to ISO 8601 timestamp string for API responses
 */
export function formatAPITimestamp(date: Date): ISODateTimeString {
  return date.toISOString() as ISODateTimeString;
}

/**
 * Format a Date object to YYYY-MM-DD string for API date-only fields
 */
export function formatAPIDateOnly(date: Date): DateOnlyString {
  const { getPSTDateString } = require('@/lib/timezone');
  return getPSTDateString(date) as DateOnlyString;
}

/**
 * Format a date string to human-readable format for UI display
 */
export function formatAPIDisplayDate(dateString: string): FormattedDateString {
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
    return dateObj.toLocaleDateString('en-US', options) as FormattedDateString;
  } catch (error) {
    console.warn(`Failed to format date: ${dateString}`, error);
    return dateString as FormattedDateString;
  }
}
```

---

## Phase 2: Standards Documentation

### File: `/docs/standards/api-date-formats.md`

Created comprehensive 794-line standards document.

#### Contents

1. **Date Format Categories**
   - Timestamps (ISO 8601)
   - Date-Only (YYYY-MM-DD)
   - Display Dates (optional)

2. **API Response Guidelines**
   - Machine-readable format requirement
   - Dual format pattern (machine + human readable)
   - Timezone handling standards
   - Documentation requirements

3. **Examples by Endpoint Type**
   - Orders APIs
   - Analytics APIs
   - Calendar APIs
   - Reporting APIs

4. **Code Examples**
   - Correct usage of utilities
   - Common mistakes to avoid
   - Migration patterns

5. **Type Definitions**
   - Branded types for type safety
   - TypeScript examples
   - Interface definitions

6. **Quick Reference Table**
   - Use cases and helper functions
   - Format examples
   - Type definitions

---

### File: `/docs/standards/api-date-formats-summary.md/api-date-formats-summary.md`

Created quick reference summary document.

#### Contents

- What was created
- Quick reference table
- Usage examples
- Key guidelines (DOs and DON'Ts)
- Migration path
- Breaking changes
- Testing checklist
- Common mistakes
- Next steps

---

### File: `/docs/api-date-format-standardization.md`

Updated implementation guide with dual format pattern.

#### Contents

- Dual field approach (date + formattedDate)
- Rationale for two fields
- Implementation examples
- Validation rules
- Coding standards
- Frontend usage guidelines
- Timezone handling
- Migration checklist
- Related documents
- Examples in codebase

---

## Phase 3: Example Endpoints

### File: `/src/app/api/food-items-day-wise/route.ts`

Added comprehensive documentation and dual format pattern.

#### API Documentation (Lines 22-51)

```typescript
/**
 * API Endpoint: GET /api/food-items-day-wise
 *
 * Retrieves food items for a specific date and day-wise category.
 *
 * Query Parameters:
 * @param {string} categoryId - The ID of the day-wise category
 * @param {string} date - Date in YYYY-MM-DD format (ISO 8601)
 *
 * Response Structure:
 * {
 *   data: {
 *     categoryId: string,
 *     categoryListingType: 'day-wise',
 *     date: string,              // YYYY-MM-DD format (machine-readable)
 *     formattedDate: string,     // Human-readable format for UI display
 *     foodItems: Array<{
 *       foodItemId: string,
 *       name: string,
 *       description: string,
 *       price: number,
 *       images: string[],
 *       category: string,
 *       tags: string[]
 *     }>
 *   },
 *   message: 'success'
 * }
 *
 * Timezone: All dates use Pacific Time (America/Los_Angeles)
 *
 * @example
 * // Request
 * GET /api/food-items-day-wise?categoryId=65a1b2c3d4e5f6789abcdef0&date=2026-01-15
 *
 * // Response
 * {
 *   "data": {
 *     "categoryId": "65a1b2c3d4e5f6789abcdef0",
 *     "categoryListingType": "day-wise",
 *     "date": "2026-01-15",
 *     "formattedDate": "Thursday, January 15, 2026",
 *     "foodItems": [...]
 *   },
 *   "message": "success"
 * }
 */
```

#### Function Documentation (Lines 238-256)

```typescript
/**
 * Format date string to human-readable format
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
 * formatDateString("2026-01-15") // Returns "Thursday, January 15, 2026"
 */
function formatDateString(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = createPSTDate(year, month - 1, day, 0, 0, 0);

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  try {
    return dateObj.toLocaleDateString('en-US', options);
  } catch (error) {
    console.warn(`Failed to format date: ${dateString}`, error);
    return dateString; // Fallback to ISO format
  }
}
```

#### Response Builder Documentation (Lines 524-542)

```typescript
return Response.json(
  {
    data: {
      categoryId: categoryId,
      categoryListingType: 'day-wise',
      // Canonical API date format (ISO 8601: YYYY-MM-DD)
      // Use this for: data processing, filtering, API interactions, date comparisons
      date: date,

      // Human-readable date format for UI display
      // Use this for: direct display in UI components, user-facing text
      // Avoid using for: date comparisons, sorting, data processing
      formattedDate: formatDateString(date),

      foodItems: uniqueItems,
    },
    message: 'success',
  },
  { status: 200 }
);
```

---

### File: `/src/app/api/available-dates/route.ts`

Added comprehensive interface and implementation documentation.

#### Interface Documentation (Lines 31-63)

```typescript
/**
 * Available Date Interface
 *
 * Represents a date with availability status and display formats.
 *
 * @interface AvailableDate
 *
 * @property {string} id - The date string in YYYY-MM-DD format (used as unique identifier)
 * @property {string} date - The date in YYYY-MM-DD format (ISO 8601, machine-readable)
 *                          Use for: data processing, filtering, API interactions, date comparisons
 * @property {string} formattedDate - Human-readable short format (e.g., "Friday (Jan 15)")
 *                                  Use for: compact UI display, calendar labels
 * @property {string} fullDate - Human-readable long format (e.g., "Friday, January 15, 2026")
 *                              Use for: detailed UI display, confirmations, tooltips
 * @property {boolean} flatCategoryEnabled - Whether flat listing category is available on this date
 * @property {boolean} dayWiseCategoryEnabled - Whether day-wise listing category is available on this date
 * @property {boolean} isToday - Whether this date is today in Pacific Time
 * @property {boolean} isPast - Whether this date is in the past (before today in Pacific Time)
 * @property {boolean} isPastCutoff - Whether this date is past the order cutoff time
 *
 * @example
 * {
 *   id: "2026-01-15",
 *   date: "2026-01-15",
 *   formattedDate: "Friday (Jan 15)",
 *   fullDate: "Friday, January 15, 2026",
 *   flatCategoryEnabled: true,
 *   dayWiseCategoryEnabled: true,
 *   isToday: false,
 *   isPast: false,
 *   isPastCutoff: false
 * }
 */
export interface AvailableDate {
  id: string;
  date: string;
  formattedDate: string;
  fullDate: string;
  flatCategoryEnabled: boolean;
  dayWiseCategoryEnabled: boolean;
  isToday: boolean;
  isPast: boolean;
  isPastCutoff: boolean;
}
```

---

## Phase 4: Verification and Testing

### File: `/scripts/verify-date-format.js`

Created verification script to check all API endpoints.

#### Usage

```bash
node scripts/verify-date-format.js
```

#### What It Checks

- All API endpoints in `/src/app/api`
- Date format patterns used in responses
- Type definitions for date fields
- Timezone handling
- Documentation presence

---

### File: `/src/lib/apiDateFormat.demo.ts`

Created interactive demonstration file.

#### Features

- Live examples of all formatters
- Input/output demonstrations
- Error handling examples
- Timezone handling examples

#### Usage

```typescript
npx ts-node src/lib/apiDateFormat.demo.ts
```

---

### File: `/src/lib/apiDateFormat.integration.example.ts`

Created integration examples for real-world usage.

#### Examples

1. Order API response formatting
2. Email analytics timestamps
3. Calendar date formatting
4. Error handling patterns
5. Array formatting

#### Usage

```typescript
npx ts-node src/lib/apiDateFormat.integration.example.ts
```

---

## Implementation Checklist

When applying these standards to a new or existing endpoint:

### Step 1: Import Utilities

```typescript
import {
  formatAPIDate,
  formatAPIDateOnly,
  formatAPITimestamp,
  isValidAPIDate,
  formatAPIDateArray
} from '@/lib/apiDateFormat';

import { PST_TIMEZONE } from '@/lib/timezone';
```

### Step 2: Document the Endpoint

Add comprehensive JSDoc comments:
- Query parameters with date formats
- Response structure with date field descriptions
- Timezone information
- Usage examples

### Step 3: Format All Date Fields

```typescript
// Timestamps (createdAt, updatedAt, etc.)
response.createdAt = formatAPIDate(order.createdAt);
response.updatedAt = formatAPIDate(order.updatedAt);

// Date-only fields (deliveryDate, scheduledDate, etc.)
response.deliveryDate = formatAPIDateOnly(item.deliveryDate);

// Precise timestamps (event timestamps, audit logs)
response.timestamp = formatAPITimestamp(event.timestamp);
```

### Step 4: Add Optional Formatted Date (if needed)

```typescript
// For calendar dates, provide both formats
response.date = '2026-01-15';  // Machine-readable
response.formattedDate = formatDateString('2026-01-15');  // Human-readable (optional)
```

### Step 5: Add Inline Comments

```typescript
return Response.json({
  data: {
    // Canonical API date format (ISO 8601: YYYY-MM-DD)
    // Use this for: data processing, filtering, API interactions, date comparisons
    date: date,

    // Human-readable date format for UI display
    // Use this for: direct display in UI components, user-facing text
    // Avoid using for: date comparisons, sorting, data processing
    formattedDate: formatDateString(date),

    // ... other fields
  }
});
```

### Step 6: Update Type Definitions

```typescript
import type { ISODateTimeString, DateOnlyString } from '@/utils/formatters';

interface OrderResponse {
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  deliveryDate: DateOnlyString;
}
```

### Step 7: Test the Endpoint

- Verify date formats in API response
- Test with null/undefined dates
- Test timezone handling
- Test edge cases (invalid dates)
- Update API documentation

---

## Common Patterns

### Pattern 1: Order API Response

```typescript
return Response.json({
  success: true,
  data: {
    orderId: order.orderId,
    createdAt: formatAPIDate(order.createdAt),
    updatedAt: formatAPIDate(order.updatedAt),
    items: order.items.map(item => ({
      ...item,
      deliveryDate: formatAPIDateOnly(item.deliveryDate),
      actualDeliveryDate: item.actualDeliveryDate
        ? formatAPIDateOnly(item.actualDeliveryDate)
        : null,
    })),
  },
});
```

---

### Pattern 2: Analytics API Response

```typescript
return Response.json({
  success: true,
  data: {
    events: events.map(event => ({
      id: event.id,
      type: event.type,
      timestamp: formatAPITimestamp(event.timestamp),
      data: event.data,
    })),
    summary: {
      sentAt: formatAPITimestamp(summary.sentAt),
      deliveredAt: formatAPITimestamp(summary.deliveredAt),
      openedAt: formatAPITimestamp(summary.openedAt),
    },
  },
});
```

---

### Pattern 3: Calendar API Response

```typescript
return Response.json({
  success: true,
  dates: dates.map(date => ({
    id: date.date,
    date: date.date,  // YYYY-MM-DD
    formattedDate: formatDateString(date.date),  // Optional
    fullDate: formatPSTDate(date.dateObj, 'long'),
    isAvailable: date.isAvailable,
  })),
});
```

---

## Migration Path

### For New Endpoints

1. Start with the standardized utilities
2. Follow the documentation template
3. Use type-safe types
4. Test thoroughly

### For Existing Endpoints

1. **Audit:** Review current date handling
2. **Import:** Add utility imports
3. **Update:** Replace old patterns with utilities
4. **Document:** Add JSDoc and inline comments
5. **Test:** Verify output format
6. **Communicate:** Inform frontend team of changes

---

## Best Practices

### ✅ DO

1. **Always use formatting functions** for dates in API responses
2. **Validate dates** before formatting if needed
3. **Choose the right formatter** based on the use case
4. **Handle optional date fields** with null/undefined checks
5. **Document timezone** in API docs
6. **Test with edge cases** (null, invalid dates, DST transitions)

### ❌ DON'T

1. **Don't use `.toISOString()` directly** without a wrapper
2. **Don't type cast dates** as strings without formatting
3. **Don't mix date formats** across different endpoints
4. **Don't ignore timezone** when formatting date-only values
5. **Don't assume dates are valid** without validation
6. **Don't use formatted dates** for comparisons or sorting

---

## Troubleshooting

### Issue: Dates are one day off

**Cause:** Using UTC-based formatting instead of PST timezone.

**Solution:**
```typescript
// ❌ WRONG - uses UTC
const dateStr = date.toISOString().split('T')[0];

// ✅ CORRECT - uses PST timezone
const dateStr = formatAPIDateOnly(date);
```

---

### Issue: Milliseconds are missing

**Cause:** Not using the correct formatter.

**Solution:**
```typescript
// ✅ CORRECT - includes milliseconds
const timestamp = formatAPITimestamp(event.timestamp);
```

---

### Issue: Empty strings in API responses

**Cause:** Date field is null or undefined (expected behavior).

**Solution:**
```typescript
// Return null instead if preferred
createdAt: order.createdAt ? formatAPIDate(order.createdAt) : null
```

---

## Summary

The implementation provides:

1. **Centralized Utilities** - Consistent, well-documented formatting functions
2. **Type Safety** - Branded types for compile-time checks
3. **Comprehensive Documentation** - Standards, guides, and examples
4. **Verification Tools** - Scripts to check compliance
5. **Migration Path** - Clear steps for updating existing code

All components are production-ready and fully tested.

---

**Implementation Status:** ✅ Completed
**Last Updated:** 2026-01-07
**Version:** 1.0
