# Frontend Timezone Usage Analysis

**Date:** 2025-01-07
**Project:** NikFoods Frontend Application
**Tech Stack:** Node.js/Next.js

---

## Executive Summary

This document analyzes all frontend files that use PST timezone functions and date formatting patterns. The application uses Pacific Time (America/Los_Angeles) as its canonical timezone for all business operations, with a well-defined timezone utility module.

---

## Table of Contents

1. [Timezone Utility Module](#timezone-utility-module)
2. [Components Using Timezone Functions](#components-using-timezone-functions)
3. [Client-Side Date Formatting Patterns](#client-side-date-formatting-patterns)
4. [Date Display Logic by Component](#date-display-logic-by-component)
5. [Conversion Analysis](#conversion-analysis)
6. [Current Patterns and Best Practices](#current-patterns-and-best-practices)
7. [Potential Issues](#potential-issues)
8. [Recommendations](#recommendations)

---

## Timezone Utility Module

### Location
`src/lib/timezone.ts`

### Key Functions Exported

#### Core Timezone Functions
```typescript
// Application timezone (configurable via NEXT_PUBLIC_TIMEZONE)
export const PST_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || 'America/Los_Angeles';

// Get current time in configured timezone
export function getPSTNow(): Date

// Convert date to timezone for display
export function toPSTDate(date: Date): Date

// Format date for display
export function formatPSTDate(
  date: Date,
  format: 'short' | 'long' | 'weekday' | 'time' = 'short'
): string

// Get PST weekday name
export function getPSTWeekday(date: Date): string

// Get PST weekday number (0-6)
export function getPSTWeekdayNumber(date: Date): number
```

#### Time Comparison Functions
```typescript
// Check if date is in past (PST)
export function isInPSTPast(targetDate: Date, currentDate?: Date): boolean

// Check if date is today (PST)
export function isPSTToday(targetDate: Date, currentDate?: Date): boolean

// Get midnight for a date in PST
export function getPSTMidnight(date: Date): Date

// Get current hour in PST (0-23)
export function getPSTHour(date?: Date): number

// Check if before/after specific hour in PST
export function isBeforePSTHour(hour: number, date?: Date): boolean
export function isAfterOrEqualPSTHour(hour: number, date?: Date): boolean
```

#### Date Manipulation Functions
```typescript
// Add days to date in PST
export function addPSTDays(date: Date, days: number): Date

// Calculate day difference in PST
export function getPSTDayDifference(date1: Date, date2: Date): number
```

---

## Components Using Timezone Functions

### 1. CartDaySection Component

**File:** `src/components/cart/CartDaySection.tsx`

**Usage:**
```typescript
import { formatPSTDate } from '@/lib/timezone';

// Format date for display in cart
{new Date(cartDay.date + 'T00:00:00').toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})}
```

**Pattern:**
- Receives `cartDay.date` as a date string (YYYY-MM-DD format)
- Appends 'T00:00:00' to create midnight timestamp
- Uses `toLocaleDateString()` without explicit timezone parameter
- **NOT using formatPSTDate** despite importing it

**Issue Identified:**
- Imports `formatPSTDate` but doesn't actually use it
- Uses native `toLocaleDateString()` which relies on browser's locale settings
- Should use `formatPSTDate()` for consistency

---

### 2. CheckoutOrderSummary Component

**File:** `src/components/checkout/CheckoutOrderSummary.tsx`

**Usage:**
```typescript
import { formatPSTDate } from '@/lib/timezone';

// Display day with date
{cartDay.day} ({new Date(cartDay.date + 'T00:00:00').toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})})
```

**Pattern:**
- Same as CartDaySection
- Imports `formatPSTDate` but uses native `toLocaleDateString()`
- Date strings in YYYY-MM-DD format from cart

**Issue Identified:**
- Unused import of `formatPSTDate`
- Inconsistent date formatting approach

---

### 3. DeliveryDateBadge Component

**File:** `src/components/checkout/DeliveryDateBadge.tsx`

**Usage:**
```typescript
import { formatDeliveryDate, isDeliveryDateDifferent } from '@/lib/deliveryCalculator';

// Uses formatDeliveryDate from deliveryCalculator
const deliveryDate = formatDeliveryDate(dayInfo.actualDeliveryDate);
```

**Pattern:**
- Does NOT directly use timezone.ts functions
- Uses `formatDeliveryDate` from `deliveryCalculator.ts` instead
- The `deliveryCalculator.ts` function internally uses:
  ```typescript
  export function formatDeliveryDate(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  }
  ```

**Issue Identified:**
- No explicit timezone parameter intoLocaleDateString()
- Relies on browser locale settings
- Should use PST_TIMEZONE for consistency

---

### 4. OrderCard Component

**File:** `src/components/orders/OrderCard.tsx`

**Usage:**
```typescript
import { formatOrderDate } from '@/lib/orderHelpers';

// Display order creation date
{formatOrderDate(order.createdAt!)}
```

**Pattern:**
- Uses `formatOrderDate` from `orderHelpers.ts`
- The helper function uses explicit timezone:
  ```typescript
  export function formatOrderDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Los_Angeles', // ✅ Explicit timezone
    });
  }
  ```

**Status:**
- ✅ CORRECT: Uses explicit timezone
- ✅ Displays in PST as intended

---

### 5. OrderConfirmation Component

**File:** `src/components/checkout/OrderConfirmation.tsx`

**Usage:**
```typescript
import { formatDeliveryDate } from '@/lib/orderHelpers';

// Display delivery date for each order day
{formatDeliveryDate(dayOrder.deliveryDate)}
```

**Pattern:**
- Uses `formatDeliveryDate` from `orderHelpers.ts`
- Helper function uses explicit timezone:
  ```typescript
  export function formatDeliveryDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      timeZone: 'America/Los_Angeles', // ✅ Explicit timezone
    });
  }
  ```

**Status:**
- ✅ CORRECT: Uses explicit timezone
- ✅ Displays in PST as intended

---

### 6. TrackOrderDialog Component

**File:** `src/components/orders/TrackOrderDialog.tsx`

**Usage:**
```typescript
import { formatDeliveryDate } from '@/lib/orderHelpers';

// Display estimated delivery date
{formatDeliveryDate(estimatedDelivery)}

// Display tracking step timestamps
{new Date(step.timestamp).toLocaleString('en-US', {
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})}
```

**Pattern:**
- Uses `formatDeliveryDate` for estimated delivery (✅ has explicit timezone)
- Uses native `toLocaleString()` for step timestamps (❌ NO explicit timezone)

**Issue Identified:**
- Tracking timestamps lack explicit timezone parameter
- Will display in user's local timezone, not PST

---

### 7. OrderConfirmation Template

**File:** `src/templates/orderConfirmation.ts`

**Usage:**
```typescript
// Email template date formatting
const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
```

**Pattern:**
- Used for HTML email templates
- No explicit timezone parameter

**Issue Identified:**
- Email dates will render in recipient's local timezone
- Should use explicit PST timezone for business consistency

---

### 8. EmailAnalytics Component (Admin)

**File:** `src/components/admin/EmailAnalytics.tsx`

**Usage:**
```typescript
// Number formatting (not date-related)
{dashboard.overview.totalEmails.toLocaleString()}
{issue.count.toLocaleString()}
{day.sent.toLocaleString()}
```

**Pattern:**
- Uses `toLocaleString()` for NUMBER formatting only
- Adds thousand separators to numbers
- Not related to dates/timezones

**Status:**
- ✅ CORRECT: This is number formatting, not date formatting
- No timezone concerns

---

## Client-Side Date Formatting Patterns

### Pattern 1: Explicit Timezone (✅ Recommended)

**Location:** `src/lib/orderHelpers.ts`

```typescript
// ✅ CORRECT - Explicit timezone
export function formatOrderDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles', // Explicit PST
  });
}
```

**Used By:**
- OrderCard
- OrderConfirmation
- TrackOrderDialog (partial)

---

### Pattern 2: Native toLocaleDateString Without Timezone (❌ Issue)

**Location:** `src/components/cart/CartDaySection.tsx`, `src/components/checkout/CheckoutOrderSummary.tsx`

```typescript
// ❌ INCORRECT - No timezone specified
{new Date(cartDay.date + 'T00:00:00').toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})}
```

**Problem:**
- Date displays in user's browser timezone, not PST
- Inconsistent display across users in different timezones
- Business logic uses PST, but display uses local timezone

**Should Be:**
```typescript
// ✅ CORRECT
{formatPSTDate(new Date(cartDay.date), 'short')}
```

---

### Pattern 3: Midnight Date String Creation

**Location:** Multiple components

```typescript
// Pattern: Append 'T00:00:00' to date string
new Date(cartDay.date + 'T00:00:00')
```

**Purpose:**
- Ensures date is interpreted as midnight
- Prevents timezone shift when parsing date strings

**Status:**
- ⚠️ Works but relies on browser's timezone interpretation
- Better to use timezone-aware parsing

**Better Approach:**
```typescript
// Use timezone utility
const dateObj = createPSTDate(year, month, day); // from timezone.ts
```

---

## Date Display Logic by Component

### Cart Display

**Components:**
- CartDaySection
- CheckoutOrderSummary

**Current Behavior:**
```typescript
// Input: cartDay.date = "2024-01-15"
// Display: "Jan 15, 2024" (in user's local timezone)
```

**Issue:**
- Date stored as "2024-01-15" (UTC midnight)
- Displayed in user's browser timezone
- May show different day for users in different timezones

**Example Problem:**
- User in PST (UTC-8): Sees "Jan 15, 2024"
- User in EST (UTC-5): Sees "Jan 14, 2024" at 9 PM (because date shifted)

---

### Order Display

**Components:**
- OrderCard
- OrderConfirmation
- TrackOrderDialog

**Current Behavior:**
```typescript
// Input: order.createdAt = "2024-01-15T20:00:00Z"
// Display: "Jan 15, 2024, 12:00 PM" (explicitly in PST)
```

**Status:**
- ✅ Correct - uses explicit timezone
- Consistent across all users

---

### Delivery Date Display

**Components:**
- DeliveryDateBadge
- OrderConfirmation
- TrackOrderDialog

**Current Behavior:**
```typescript
// Input: dateString = "2024-01-15"
// Helper: formatDeliveryDate() from deliveryCalculator.ts
// Display: "Monday, Jan 15" (NO explicit timezone - uses browser locale)
```

**Issue:**
- Inconsistent with order date formatting
- Should use explicit PST timezone

---

## Conversion Analysis

### Data Flow: Database → Frontend

#### 1. Date Storage Format

**Database Schema:**
- Dates stored as ISO strings: `"2024-01-15"` or `"2024-01-15T20:00:00Z"`
- Timezone: UTC (MongoDB default)
- Format: ISO 8601

#### 2. API Response

**Example CartDay Object:**
```typescript
{
  _id: "...",
  day: "monday",
  date: "2024-01-15",  // Date in YYYY-MM-DD format
  items: [...],
  dayTotal: 45.00
}
```

#### 3. Frontend Processing

**Pattern A: Correct (with explicit timezone)**
```typescript
// orderHelpers.ts
export function formatOrderDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles', // ✅ Explicit
    ...
  });
}
```

**Pattern B: Incorrect (no explicit timezone)**
```typescript
// CartDaySection.tsx
new Date(cartDay.date + 'T00:00:00').toLocaleDateString('en-US', {
  // ❌ No timeZone parameter
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
```

---

### When Are Dates Being Converted When They Should Not?

#### Issue 1: Date-Only Values Should Not Have Timezone Conversion

**Current:**
```typescript
// cartDay.date = "2024-01-15" (represents entire day in PST)
new Date(cartDay.date + 'T00:00:00').toLocaleDateString('en-US', {...})
```

**Problem:**
- Appending 'T00:00:00' creates "2024-01-15T00:00:00"
- Browser interprets this as midnight in user's timezone
- For EST user (UTC-5), this becomes: 2024-01-15T05:00:00Z
- For PST user (UTC-8), this becomes: 2024-01-15T08:00:00Z
- Same input date, different interpretation!

**Correct Approach:**
```typescript
// Option 1: Use formatPSTDate with timezone-aware parsing
const [year, month, day] = cartDay.date.split('-').map(Number);
const dateObj = new Date(Date.UTC(year, month - 1, day));
formatPSTDate(dateObj, 'short');

// Option 2: Explicit timezone in toLocaleDateString
const dateObj = new Date(cartDay.date + 'T00:00:00');
dateObj.toLocaleDateString('en-US', {
  timeZone: 'America/Los_Angeles',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
```

---

#### Issue 2: Timestamps Should Always Use Explicit Timezone

**Current (TrackOrderDialog):**
```typescript
// Step timestamps
new Date(step.timestamp).toLocaleString('en-US', {
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  // ❌ Missing timeZone parameter
})
```

**Problem:**
- Shows in user's local timezone
- Inconsistent with business logic (PST)

**Correct:**
```typescript
new Date(step.timestamp).toLocaleString('en-US', {
  timeZone: 'America/Los_Angeles', // ✅ Add this
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})
```

---

#### Issue 3: Email Template Date Formatting

**Current (orderConfirmation.ts):**
```typescript
const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
    // ❌ No timeZone
  });
};
```

**Problem:**
- Email recipients see dates in their own timezone
- Business operation is in PST, but email shows local timezone
- Confusing for customers

**Correct:**
```typescript
const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles' // ✅ Add explicit timezone
  });
};
```

---

## Current Patterns and Best Practices

### ✅ Good Patterns

1. **Using timezone utility functions**
   - `formatPSTDate()`
   - `getPSTNow()`
   - `isPSTToday()`
   - `getPSTWeekday()`

2. **Explicit timezone in toLocaleString/toLocaleDateString**
   ```typescript
   date.toLocaleString('en-US', {
     timeZone: 'America/Los_Angeles',
     ...
   })
   ```

3. **Centralized formatting functions**
   - `formatOrderDate()` in orderHelpers.ts
   - `formatDeliveryDate()` in orderHelpers.ts (with timezone)
   - `formatPSTDate()` in timezone.ts

### ❌ Anti-Patterns

1. **Unused imports**
   - Importing `formatPSTDate` but not using it
   - Creates confusion about intended behavior

2. **Missing timezone parameter**
   - Using `toLocaleDateString()` without `timeZone` option
   - Inconsistent display across users

3. **Midnight concatenation without timezone awareness**
   - `new Date(dateString + 'T00:00:00')`
   - Relies on browser's timezone interpretation

4. **Direct date formatting in components**
   - Should use centralized utility functions
   - Harder to maintain and update

---

## Potential Issues

### Issue 1: Inconsistent Date Display Across Users

**Severity:** High

**Description:** Users in different timezones see different dates for the same order.

**Example:**
- Order date: "2024-01-15"
- PST user sees: "Jan 15, 2024"
- EST user sees: "Jan 14, 2024" (because of timezone shift)

**Impact:**
- Customer confusion
- Support requests
- Order delivery misunderstandings

**Affected Components:**
- CartDaySection
- CheckoutOrderSummary
- DeliveryDateBadge (via deliveryCalculator)

---

### Issue 2: Unused Timezone Imports

**Severity:** Low

**Description:** Components import timezone functions but don't use them.

**Impact:**
- Code confusion
- Maintenance burden
- Missed opportunity for consistency

**Affected Components:**
- CartDaySection (imports formatPSTDate, doesn't use it)
- CheckoutOrderSummary (imports formatPSTDate, doesn't use it)

---

### Issue 3: Email Timezone Inconsistency

**Severity:** Medium

**Description:** Email templates show dates in recipient's timezone, not PST.

**Impact:**
- Business logic vs. display mismatch
- Customer confusion about delivery dates
- Support overhead

**Affected Files:**
- src/templates/orderConfirmation.ts

---

### Issue 4: Tracking Timestamp Timezone

**Severity:** Medium

**Description:** Order tracking timestamps show in user's local timezone.

**Impact:**
- Inconsistent with order timestamps
- May confuse customers comparing times

**Affected Component:**
- TrackOrderDialog (step.timestamp formatting)

---

## Recommendations

### Priority 1: Fix Cart and Checkout Date Display

**Files to Update:**
1. `src/components/cart/CartDaySection.tsx`
2. `src/components/checkout/CheckoutOrderSummary.tsx`

**Change:**
```typescript
// Before (❌)
{new Date(cartDay.date + 'T00:00:00').toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})}

// After (✅)
{formatPSTDate(new Date(cartDay.date), 'short')}
// OR
{new Date(cartDay.date).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/Los_Angeles',
})}
```

**Benefits:**
- Consistent date display across all users
- Aligns with business logic (PST)
- Removes unused imports

---

### Priority 2: Fix Delivery Date Badge

**File to Update:**
1. `src/lib/deliveryCalculator.ts`

**Change:**
```typescript
// Before (❌)
export function formatDeliveryDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
}

// After (✅)
export function formatDeliveryDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Los_Angeles', // Add explicit timezone
  };
  return date.toLocaleDateString('en-US', options);
}
```

---

### Priority 3: Fix Email Template Date Formatting

**File to Update:**
1. `src/templates/orderConfirmation.ts`

**Change:**
```typescript
// Before (❌)
const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// After (✅)
const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles', // Add explicit timezone
  });
};
```

---

### Priority 4: Fix Tracking Timestamps

**File to Update:**
1. `src/components/orders/TrackOrderDialog.tsx`

**Change:**
```typescript
// Before (❌)
{new Date(step.timestamp).toLocaleString('en-US', {
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})}

// After (✅)
{new Date(step.timestamp).toLocaleString('en-US', {
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Los_Angeles', // Add explicit timezone
})}
```

---

### Priority 5: Use Centralized Timezone Utilities

**Recommendation:** Create a unified date formatting utility.

**New File:** `src/lib/dateFormatters.ts`

```typescript
import { PST_TIMEZONE } from './timezone';

/**
 * Format date for display in UI components
 * Always uses PST timezone for consistency
 */
export function formatUIDate(date: Date | string, options?: {
  includeTime?: boolean;
  includeWeekday?: boolean;
  format?: 'short' | 'long' | 'weekday';
}): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const baseOptions: Intl.DateTimeFormatOptions = {
    timeZone: PST_TIMEZONE,
  };

  if (options?.includeTime) {
    baseOptions.hour = 'numeric';
    baseOptions.minute = '2-digit';
    baseOptions.hour12 = true;
  }

  if (options?.includeWeekday || options?.format === 'weekday') {
    baseOptions.weekday = 'long';
  }

  switch (options?.format) {
    case 'short':
      baseOptions.month = 'short';
      baseOptions.day = 'numeric';
      baseOptions.year = 'numeric';
      break;
    case 'long':
      baseOptions.month = 'long';
      baseOptions.day = 'numeric';
      baseOptions.year = 'numeric';
      break;
    case 'weekday':
      baseOptions.weekday = 'long';
      baseOptions.month = 'long';
      baseOptions.day = 'numeric';
      break;
    default:
      baseOptions.month = 'short';
      baseOptions.day = 'numeric';
      baseOptions.year = 'numeric';
  }

  return d.toLocaleString('en-US', baseOptions);
}
```

**Usage:**
```typescript
import { formatUIDate } from '@/lib/dateFormatters';

// In CartDaySection
{formatUIDate(cartDay.date, { format: 'short' })}

// In OrderCard
{formatUIDate(order.createdAt, { includeTime: true })}

// In DeliveryDateBadge
{formatUIDate(dayInfo.actualDeliveryDate, { includeWeekday: true })}
```

---

## Testing Recommendations

### Test Cases

1. **Cart Date Display**
   - Test with users in PST, EST, GMT, IST
   - Verify all see same date for same cart

2. **Order Timestamp Display**
   - Verify explicit timezone parameter working
   - Check time format (12-hour vs 24-hour)

3. **Delivery Date Calculations**
   - Test date boundary conditions
   - Verify clubbed days show correct delivery date

4. **Email Date Formatting**
   - Test emails sent to different timezone recipients
   - Verify dates show in PST, not recipient timezone

5. **Tracking Timestamps**
   - Compare with order timestamps
   - Ensure consistency

### Cross-Timezone Testing

Use browser DevTools to simulate different timezones:

```javascript
// In browser console
// Test as PST user
// (No change needed if already in PST)

// Test as EST user
const originalTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Use Chrome DevTools > More tools > Sensors > Location to change
```

---

## Summary

### Key Findings

1. **Partial Timezone Implementation**
   - Some components use explicit PST timezone ✅
   - Some components rely on browser locale ❌
   - Inconsistent user experience across timezones

2. **Unused Imports**
   - Two components import `formatPSTDate` but don't use it
   - Suggests intended but incomplete implementation

3. **Centralized Utilities Underutilized**
   - `timezone.ts` provides comprehensive functions
   - Not consistently used across components

4. **Correct Patterns Exist**
   - `orderHelpers.ts` shows correct implementation
   - Can be used as template for other components

### Files Requiring Changes

| File | Issue | Priority |
|------|-------|----------|
| `src/components/cart/CartDaySection.tsx` | No explicit timezone | High |
| `src/components/checkout/CheckoutOrderSummary.tsx` | No explicit timezone | High |
| `src/lib/deliveryCalculator.ts` | Missing timezone in formatDeliveryDate | High |
| `src/templates/orderConfirmation.ts` | Email dates not in PST | Medium |
| `src/components/orders/TrackOrderDialog.tsx` | Tracking timestamps not in PST | Medium |

### Files Already Correct

| File | Status |
|------|--------|
| `src/lib/orderHelpers.ts` | ✅ Correct |
| `src/components/orders/OrderCard.tsx` | ✅ Correct |
| `src/components/checkout/OrderConfirmation.tsx` | ✅ Correct |
| `src/lib/timezone.ts` | ✅ Correct |

---

## Conclusion

The frontend has a solid foundation with the `timezone.ts` utility module and some components correctly implementing PST timezone display. However, there are inconsistencies that need to be addressed:

1. **Immediate Action Required:** Fix cart and checkout date display to use explicit PST timezone
2. **Short-term:** Update delivery date formatting and email templates
3. **Long-term:** Create centralized date formatting utilities and deprecate direct `toLocaleDateString` calls in favor of timezone-aware helpers

The recommended changes will ensure all users see consistent dates regardless of their browser timezone settings, aligning the frontend display with the business logic that operates in Pacific Time.
