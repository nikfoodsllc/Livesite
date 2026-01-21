# Potential Timezone-Related Issues

**Project:** TDN9IL (NikFoods User-facing Application)
**Analysis Date:** January 7, 2026
**Database:** MongoDB (dates stored in UTC/ISO format)
**Application Timezone:** Pacific Time (America/Los_Angeles)

---

## Executive Summary

This document identifies potential timezone-related issues across the codebase based on analysis of existing bug patterns, timezone utility functions, and date handling code. The issues are categorized by severity and include code examples with recommended fixes.

**Key Findings:**
- **5 Critical Issues** requiring immediate attention
- **8 High-Priority Issues** affecting data integrity
- **6 Medium-Priority Issues** impacting consistency
- **4 Low-Priority Issues** for code quality

---

## Table of Contents

1. [Critical Issues (Immediate Action Required)](#critical-issues)
2. [High-Priority Issues](#high-priority-issues)
3. [Medium-Priority Issues](#medium-priority-issues)
4. [Low-Priority Issues](#low-priority-issues)
5. [Issue Categories Reference](#issue-categories-reference)

---

## Critical Issues

### Issue #1: Missing Timezone in `getPSTWeekday()` Function

**Severity:** CRITICAL
**Location:** `src/lib/timezone.ts:280-286`
**Category:** Inconsistent Timezone Handling

**Problem:**
The `getPSTWeekday()` function does not specify PST timezone in its formatter, causing it to use the system's local timezone instead. This can return incorrect weekday names for dates near midnight when the system is not in Pacific Time.

**Code Example:**
```typescript
// ❌ BUGGY CODE - Missing timezone parameter
export function getPSTWeekday(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    // ❌ Missing: timeZone: PST_TIMEZONE
  });
  return formatter.format(date);
}
```

**Impact:**
- Used in `src/lib/dayAvailabilityClient.ts` for extracting day names
- Used in `src/app/page.tsx` for displaying day groups
- May show "Monday" instead of "Tuesday" for dates near midnight PST
- Affects data migration between day-based and date-based systems

**Recommended Fix:**
```typescript
// ✅ FIXED CODE
export function getPSTWeekday(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: PST_TIMEZONE, // ✅ Add explicit PST timezone
  });
  return formatter.format(date);
}
```

**Testing:**
```typescript
// Test near midnight boundary
const date = new Date('2024-01-15T08:00:00Z'); // 12:00 AM PST
const weekday = getPSTWeekday(date);
// Expected: "Monday" (in PST)
// Bug might return: "Sunday" (in EST or other timezones)
```

---

### Issue #2: Frontend Date Display Without Explicit Timezone

**Severity:** CRITICAL
**Location:**
- `src/components/cart/CartDaySection.tsx:55`
- `src/components/checkout/CheckoutOrderSummary.tsx:67`
**Category:** Date-Only Complications

**Problem:**
Cart and checkout components display dates without explicit timezone, causing users in different timezones to see different dates for the same order.

**Code Example:**
```typescript
// ❌ BUGGY CODE - No timezone specified
{new Date(cartDay.date + 'T00:00:00').toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  // ❌ Missing: timeZone: 'America/Los_Angeles'
})}
```

**Impact:**
- User in PST sees: "Jan 15, 2024"
- User in EST sees: "Jan 14, 2024" (because of timezone shift)
- Customer confusion about delivery dates
- Support requests from customers seeing inconsistent dates

**Real-World Scenario:**
```
Cart date: "2024-01-15"
Appended: "2024-01-15T00:00:00"

PST User (UTC-8):
  Browser interprets as: 2024-01-15 00:00 PST
  Display: "Jan 15, 2024" ✅

EST User (UTC-5):
  Browser interprets as: 2024-01-15 00:00 EST
  Which is: 2024-01-15T05:00:00Z
  Display: "Jan 15, 2024" (correct but inconsistent)

IST User (UTC+5:30):
  Browser interprets as: 2024-01-15 00:00 IST
  Which is: 2024-01-14T18:30:00Z
  Display: "Jan 14, 2024" ❌ WRONG DAY
```

**Recommended Fix:**
```typescript
// Option 1: Use formatPSTDate (already imported but unused)
import { formatPSTDate } from '@/lib/timezone';

{formatPSTDate(new Date(cartDay.date), 'short')}

// Option 2: Add explicit timezone to toLocaleDateString
{new Date(cartDay.date).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/Los_Angeles', // ✅ Add explicit timezone
})}
```

---

### Issue #3: Email Template Missing Timezone

**Severity:** CRITICAL
**Location:** `src/templates/orderConfirmation.ts`
**Category:** Inconsistent Timezone Handling

**Problem:**
Order confirmation emails format dates without explicit timezone, causing recipients to see dates in their local timezone instead of Pacific Time.

**Code Example:**
```typescript
// ❌ BUGGY CODE - No timezone in email template
const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
    // ❌ Missing: timeZone: 'America/Los_Angeles'
  });
};
```

**Impact:**
- Business operates in PST
- Email shows dates in recipient's local timezone
- Customer sees "Tuesday, Jan 14" when business meant "Monday, Jan 13"
- Confusion about delivery dates
- Support overhead from timezone confusion

**Recommended Fix:**
```typescript
// ✅ FIXED CODE - Add explicit PST timezone
const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles', // ✅ Explicit PST
  });
};
```

---

### Issue #4: `createPSTDate()` Uses Local System Timezone

**Severity:** CRITICAL
**Location:** `src/lib/timezone.ts:218-228`
**Category:** Unnecessary Conversions

**Problem:**
The `createPSTDate()` function uses the JavaScript Date constructor which interprets parameters in the **local system timezone**, not PST. This creates incorrect times when the server is not running in Pacific Time.

**Code Example:**
```typescript
// ❌ BUGGY CODE - Uses system timezone
export function createPSTDate(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
): Date {
  const date = new Date(year, month, day, hour, minute, second);
  // ❌ This creates date in SYSTEM timezone, not PST
  return date;
}
```

**Current Usage:**
```typescript
// In src/app/api/food-items-day-wise/route.ts
const [year, month, day] = dateString.split('-').map(Number);
const dateObj = createPSTDate(year, month - 1, day, 0, 0, 0);
// If server is in EST, this creates midnight EST, not midnight PST
```

**Impact:**
- Server in EST (UTC-5): Creates date 3 hours ahead of PST
- Server in UTC: Creates date 8 hours ahead of PST
- Date formatting shows wrong day for PST business logic
- Affects `/api/food-items-day-wise` endpoint

**Recommended Fix:**
```typescript
// Option 1: Create date in UTC and format with PST timezone
export function createPSTDate(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
): Date {
  // Create date as if it were UTC, then format with PST
  const utcString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}Z`;
  return new Date(utcString);
}

// Option 2: Use timezone-aware formatting in calling code
// Instead of createPSTDate, parse date string and format with PST:
function formatDateString(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: PST_TIMEZONE,
  });
}
```

---

### Issue #5: `getPSTWeekdayNumber()` Uses System Timezone

**Severity:** CRITICAL
**Location:** `src/lib/timezone.ts:294-300`
**Category:** Inconsistent Timezone Handling

**Problem:**
Uses native `getDay()` method which returns weekday based on system's local timezone, not PST.

**Code Example:**
```typescript
// ❌ BUGGY CODE - Uses system timezone
export function getPSTWeekdayNumber(date: Date): number {
  const pstDate = new Date(date);
  // ❌ getDay() returns weekday in SYSTEM timezone, not PST
  return pstDate.getDay();
}
```

**Impact:**
- Returns wrong weekday number for dates near midnight
- Used in deprecated `dayAvailability.ts`
- May affect day availability calculations

**Recommended Fix:**
```typescript
// Option 1: Use getPSTWeekday and convert to number
export function getPSTWeekdayNumber(date: Date): number {
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayName = getPSTWeekday(date); // Use the fixed function
  return weekdayNames.indexOf(weekdayName);
}

// Option 2: Use Intl.DateTimeFormat with parts
export function getPSTWeekdayNumber(date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: PST_TIMEZONE,
  });
  const weekdayName = formatter.format(date);
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return weekdayNames.indexOf(weekdayName);
}
```

---

## High-Priority Issues

### Issue #6: Unused Timezone Imports

**Severity:** HIGH
**Location:**
- `src/components/cart/CartDaySection.tsx:9`
- `src/components/checkout/CheckoutOrderSummary.tsx:9`
- `src/lib/orderHelpers.ts:6`
**Category:** Code Quality/Inconsistency

**Problem:**
Components import `formatPSTDate` but don't use it, instead using native `toLocaleDateString()` without timezone.

**Code Example:**
```typescript
// ❌ UNUSED IMPORT
import { formatPSTDate } from '@/lib/timezone';

// Then in the component:
{new Date(cartDay.date + 'T00:00:00').toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})}
// ❌ Should use formatPSTDate() since it's already imported
```

**Impact:**
- Code confusion about intended behavior
- Missed opportunity for consistency
- Maintenance burden

**Recommended Fix:**
```typescript
// Option 1: Remove unused import
// import { formatPSTDate } from '@/lib/timezone'; // ❌ Remove this

// Option 2: Actually use the imported function
import { formatPSTDate } from '@/lib/timezone';

{formatPSTDate(new Date(cartDay.date), 'short')}
```

---

### Issue #7: Delivery Date Formatting Without Timezone

**Severity:** HIGH
**Location:** `src/lib/deliveryCalculator.ts:168-175`
**Category:** Inconsistent Timezone Handling

**Problem:**
`formatDeliveryDate()` does not specify timezone in `toLocaleDateString()`.

**Code Example:**
```typescript
// ❌ BUGGY CODE
export function formatDeliveryDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    // ❌ Missing: timeZone: PST_TIMEZONE
  };
  return date.toLocaleDateString('en-US', options);
}
```

**Impact:**
- Used in `DeliveryDateBadge` component
- Inconsistent with other date formatting
- Shows different dates to users in different timezones

**Recommended Fix:**
```typescript
// ✅ FIXED CODE
export function formatDeliveryDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: PST_TIMEZONE, // ✅ Add explicit timezone
  };
  return date.toLocaleDateString('en-US', options);
}
```

---

### Issue #8: Tracking Timestamps Without Timezone

**Severity:** HIGH
**Location:** `src/components/orders/TrackOrderDialog.tsx`
**Category:** Inconsistent Timezone Handling

**Problem:**
Order tracking step timestamps use `toLocaleString()` without explicit timezone.

**Code Example:**
```typescript
// ❌ BUGGY CODE - No timezone
{new Date(step.timestamp).toLocaleString('en-US', {
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  // ❌ Missing: timeZone: 'America/Los_Angeles'
})}
```

**Impact:**
- Inconsistent with order timestamps (which use PST)
- Customer confusion when comparing times
- Different users see different times for same event

**Recommended Fix:**
```typescript
// ✅ FIXED CODE
{new Date(step.timestamp).toLocaleString('en-US', {
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Los_Angeles', // ✅ Add PST timezone
})}
```

---

### Issue #9: Mixed Timezone Usage Patterns

**Severity:** HIGH
**Category:** Inconsistent Timezone Handling

**Problem:**
Some code uses `PST_TIMEZONE` constant, other code hardcodes `'America/Los_Angeles'`.

**Code Examples:**
```typescript
// Using constant (✅ Good)
timeZone: PST_TIMEZONE

// Hardcoded string (❌ Inconsistent)
timeZone: 'America/Los_Angeles'
```

**Locations:**
- `src/lib/orderHelpers.ts:116,432` - Hardcoded
- `src/lib/orderHelpers.ts:243,444` - Hardcoded
- `src/lib/server/dayAvailability.ts:286` - Hardcoded
- Most other files use `PST_TIMEZONE` constant

**Impact:**
- Inconsistent pattern makes future timezone changes difficult
- If NEXT_PUBLIC_TIMEZONE is changed, hardcoded locations won't update
- Maintenance burden

**Recommended Fix:**
Replace all hardcoded `'America/Los_Angeles'` with `PST_TIMEZONE` constant:
```typescript
// ❌ Before
return d.toLocaleString('en-US', {
  timeZone: 'America/Los_Angeles',
  ...
});

// ✅ After
return d.toLocaleString('en-US', {
  timeZone: PST_TIMEZONE,
  ...
});
```

---

### Issue #10: Double Date Parsing Risk

**Severity:** HIGH
**Category:** Date-Only Complications

**Problem:**
Multiple layers of date string parsing can cause off-by-one errors.

**Code Example:**
```typescript
// Database stores: "2024-01-15"
// Frontend receives: "2024-01-15"

// Step 1: Append 'T00:00:00'
const str = "2024-01-15" + "T00:00:00"; // "2024-01-15T00:00:00"

// Step 2: Parse to Date
const date = new Date(str);
// Browser interprets as midnight in LOCAL timezone

// Step 3: Format with toLocaleDateString
date.toLocaleDateString('en-US', { ... });
// Converts to local timezone again (double interpretation)
```

**Impact:**
- Each layer of parsing introduces timezone ambiguity
- Risk of off-by-one errors
- Difficult to debug

**Recommended Fix:**
```typescript
// Option 1: Parse as UTC, format as PST
const date = new Date(dateString + 'T00:00:00Z');
date.toLocaleDateString('en-US', {
  timeZone: PST_TIMEZONE,
  ...
});

// Option 2: Use formatPSTDate utility
formatPSTDate(new Date(dateString), 'short');
```

---

### Issue #11: `addPSTDays()` Timezone Bug

**Severity:** HIGH
**Location:** `src/lib/timezone.ts:335-339`
**Category:** Date-Only Complications

**Problem:**
Uses `setDate()` which operates in system timezone, not PST.

**Code Example:**
```typescript
// ❌ BUGGY CODE
export function addPSTDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  // ❌ setDate() operates in SYSTEM timezone
  return result;
}
```

**Impact:**
- Adding days near DST boundaries produces unexpected results
- If server not in PST, adds days in wrong timezone
- Function not currently used but dangerous for future use

**Recommended Fix:**
```typescript
// ✅ FIXED CODE - Use UTC for day arithmetic
export function addPSTDays(date: Date, days: number): Date {
  // Get milliseconds since epoch
  const msPerDay = 24 * 60 * 60 * 1000;
  const newTime = date.getTime() + (days * msPerDay);
  return new Date(newTime);
}
```

---

### Issue #12: Date String to Date Object Inconsistency ✅ RESOLVED

**Severity:** HIGH
**Category:** Unnecessary Conversions
**Status:** RESOLVED - `getPSTDateString()` function added to `src/lib/timezone.ts`

**Problem:**
Some code uses `.toISOString().split('T')[0]` to get date string, other code uses string concatenation.

**Code Examples:**
```typescript
// ❌ Pattern 1: Using toISOString (WRONG - uses UTC)
const dateStr = new Date().toISOString().split('T')[0]; // "2024-01-15" in UTC

// ❌ Pattern 2: String concatenation (inconsistent)
const dateStr = year + '-' + month + '-' + day;

// ❌ Pattern 3: Template literals (inconsistent)
const dateStr = `${year}-${month}-${day}`;

// ✅ Pattern 4: Use PST-aware function (CORRECT)
const dateStr = getPSTDateString(date); // "2024-01-15" in PST timezone
```

**Impact:**
- `toISOString()` returns UTC date, may be different day than local PST
- Inconsistent date string generation
- Potential off-by-one errors

**Resolution:**
Added `getPSTDateString()` function to `src/lib/timezone.ts` (lines 379-430).
This function provides a consistent, PST-aware method for generating date strings.

**Usage:**
```typescript
import { getPSTDateString } from '@/lib/timezone';

// Get current date in PST as YYYY-MM-DD string
const today = getPSTDateString();

// Convert a specific date to PST date string
const dateStr = getPSTDateString(someDate);
```

**See:** `getPSTDateString()` function in `src/lib/timezone.ts`

---

### Issue #13: Midnight UTC vs Midnight PST Confusion

**Severity:** HIGH
**Category:** Date-Only Complications

**Problem:**
Code appends `'T00:00:00'` vs `'T00:00:00Z'` inconsistently.

**Code Example:**
```typescript
// Creates midnight in LOCAL timezone
new Date("2024-01-15T00:00:00")

// Creates midnight in UTC
new Date("2024-01-15T00:00:00Z")

// Used interchangeably in codebase:
// src/lib/deliveryCalculator.ts:170 - No Z
// src/lib/server/availableDates.ts:126 - With .000Z
```

**Impact:**
- Different timezone interpretations
- Inconsistent behavior across the application
- Difficult to predict which timezone will be used

**Recommended Fix:**
Establish clear convention:
```typescript
// For date-only values (no time), parse as UTC midnight
const date = new Date(dateString + 'T00:00:00Z');

// Always format with PST timezone
date.toLocaleDateString('en-US', {
  timeZone: PST_TIMEZONE,
  ...
});
```

---

## Medium-Priority Issues

### Issue #14: Misleading `toPSTDate()` Function

**Severity:** MEDIUM
**Location:** `src/lib/timezone.ts:90-92`
**Category:** Unnecessary Conversions

**Problem:**
Function name suggests conversion, but it just returns a copy of the date. JavaScript Date objects are always UTC internally.

**Code Example:**
```typescript
// ❌ MISLEADING FUNCTION
export function toPSTDate(date: Date): Date {
  return new Date(date); // Just creates a copy, no conversion
}
```

**Impact:**
- Developers may think it converts to PST
- Misleading API
- Only used internally by `getPSTNow()`

**Recommended Fix:**
```typescript
// Option 1: Remove the function (only used once)
export function getPSTNow(): Date {
  return new Date(); // Directly return new Date
}

// Option 2: Rename and document clearly
/**
 * Create a copy of a Date object
 * Note: This does NOT convert timezones. JavaScript Date objects
 * are always UTC internally. Use formatPSTDate() for PST display.
 */
export function copyDate(date: Date): Date {
  return new Date(date);
}
```

---

### Issue #15: Unused Timezone Functions

**Severity:** MEDIUM
**Location:** `src/lib/timezone.ts`
**Category:** Code Quality

**Problem:**
Several timezone functions are well-designed but not used anywhere:
- `getPSTHour()` - Not used (essential for 1 PM cutoff)
- `isBeforePSTHour()` - Not used
- `isAfterOrEqualPSTHour()` - Not used (essential for cutoff logic)
- `getPSTTimeComponents()` - Not used
- `addPSTDays()` - Not used (and has bug)
- `getPSTDayDifference()` - Not used (correctly implemented)

**Impact:**
- Code bloat
- Missed opportunity for cutoff time implementation
- Functions may have bugs that aren't caught

**Recommended Fix:**
1. Implement cutoff time logic using `isAfterOrEqualPSTHour(13)` for 1 PM PST
2. Add unit tests for all unused functions
3. Document intended use cases
4. Consider removing functions that won't be used

---

### Issue #16: Date Comparison Without Timezone

**Severity:** MEDIUM
**Category:** Inconsistent Timezone Handling

**Problem:**
Some date comparisons don't account for timezone.

**Code Example:**
```typescript
// In deliveryCalculator.ts
const sortedDays = [...cartDays].sort(
  (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
);
// ✅ This is actually OK - comparing timestamps is timezone-neutral
```

**However, this pattern is risky:**
```typescript
// ❌ RISKY PATTERN
if (date1 < date2) { ... }
// Without clarifying if this is timestamp comparison or date comparison
```

**Recommended Fix:**
```typescript
// Use explicit comparison functions
// For timestamp comparison (timezone-neutral):
if (date1.getTime() < date2.getTime()) { ... }

// For day-level comparison (timezone-aware):
if (isInPSTPast(date1, date2)) { ... }
```

---

### Issue #17: Database Query Date Range Without Timezone ✅ RESOLVED

**Severity:** MEDIUM → RESOLVED
**Status:** Fixed on January 7, 2026
**Location:**
- src/lib/emailAnalytics.ts (3 instances)
- src/app/api/admin/email-status/route.ts (1 instance)
**Category:** Unnecessary Conversions

**Problem:**
Date range queries may not account for timezone boundaries.

**Code Example:**
```typescript
// Typical pattern in API routes
dbQuery.createdAt = {};
if (query.startDate) {
  dbQuery.createdAt.$gte = new Date(query.startDate);
}
if (query.endDate) {
  dbQuery.createdAt.$lte = new Date(query.endDate);
}
```

**Issue:**
- `query.startDate` might be "2024-01-15"
- `new Date("2024-01-15")` creates UTC midnight
- For PST user, this is 2024-01-14 16:00 PST (4 PM previous day)
- Query may include/exclude wrong records

**Resolution:**
Applied `getPSTMidnight()` for PST-based day boundaries in date range queries.
- For **startDate**: Uses `getPSTMidnight()` to get start of day in PST
- For **endDate**: Uses `getPSTMidnight()` plus 24h minus 1ms to get end of day in PST

**Files Modified:**
- `src/lib/emailAnalytics.ts`: Added getPSTMidnight import, updated 2 query locations
- `src/app/api/admin/email-status/route.ts`: Added getPSTMidnight import, updated 1 query location
- `docs/timezone-analysis/potential-issues.md`: Updated this issue status

**Testing:**
Date range queries now correctly include/exclude records based on PST day boundaries.

---

### Issue #18: Client-Side Timezone Detection Missing

**Severity:** MEDIUM
**Category:** Date-Only Complications

**Problem:**
No client timezone detection or warning for users in very different timezones.

**Impact:**
- Users in IST (UTC+5:30) may see dates that are off by a day
- No indication that dates are in PST
- Users may think dates are wrong

**Recommended Fix:**
```typescript
// Detect client timezone and show warning if very different from PST
const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const pstOffset = -480; // PST in minutes (UTC-8)
const clientOffset = -new Date().getTimezoneOffset();

if (Math.abs(clientOffset - pstOffset) > 120) {
  // More than 2 hours difference
  console.warn('Client timezone is very different from PST');
  // Show UI warning about dates being in Pacific Time
}
```

---

### Issue #19: Order Cutoff Time Not Implemented

**Severity:** MEDIUM
**Category:** Missing Feature

**Problem:**
Documentation mentions 1 PM PST cutoff for same-day orders, but this logic doesn't appear to be implemented using the available timezone functions.

**Impact:**
- Users can order past the cutoff time
- Business rule not enforced
- Operational issues

**Recommended Fix:**
```typescript
// Implement cutoff check
import { isAfterOrEqualPSTHour } from '@/lib/timezone';

function canOrderForDate(date: Date): boolean {
  const cutoffHour = 13; // 1 PM PST
  const now = getPSTNow();

  // Check if target date is tomorrow
  const tomorrow = addPSTDays(getPSTMidnight(now), 1);
  const targetMidnight = getPSTMidnight(date);

  if (isPSTToday(date, now)) {
    // Can't order for same day
    return false;
  }

  if (targetMidnight.getTime() === tomorrow.getTime()) {
    // Ordering for tomorrow - check cutoff
    if (isAfterOrEqualPSTHour(cutoffHour, now)) {
      // Past 1 PM PST, can't order for tomorrow
      return false;
    }
  }

  return true;
}
```

---

## Low-Priority Issues

### Issue #20: Deprecated Code Still Referenced

**Severity:** LOW
**Location:** `src/lib/server/dayAvailability.ts`
**Category:** Code Quality

**Problem:**
Deprecated day-based system still exists and may be called by mistake.

**Recommended Fix:**
- Add TypeScript deprecation warnings
- Update all references to use `availableDates.ts`
- Remove deprecated code after migration verified

---

### Issue #21: Timezone Configuration Not Validated

**Severity:** LOW
**Location:** `src/lib/timezone.ts:60`
**Category:** Configuration

**Problem:**
`NEXT_PUBLIC_TIMEZONE` value is not validated to ensure it's a valid IANA timezone identifier.

**Recommended Fix:**
```typescript
// Validate timezone on startup
export const PST_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || 'America/Los_Angeles';

// Validate at runtime
try {
  new Intl.DateTimeFormat('en-US', { timeZone: PST_TIMEZONE });
} catch (e) {
  console.error(`Invalid timezone: ${PST_TIMEZONE}`, e);
  throw new Error(`Invalid NEXT_PUBLIC_TIMEZONE: ${PST_TIMEZONE}`);
}
```

---

### Issue #22: Date Format Inconsistency in API Responses

**Severity:** LOW
**Category:** API Consistency

**Problem:**
Some APIs return ISO strings, others return formatted dates.

**Examples:**
- `/api/food-items-day-wise` returns both `date: "2024-01-15"` and `formattedDate: "Monday, January 15, 2024"`
- Other APIs return only ISO strings

**Recommended Fix:**
Establish API response standard:
```typescript
// Standard API date response format
interface DateResponse {
  isoDate: string;        // "2024-01-15"
  isoDateTime: string;    // "2024-01-15T20:00:00Z" (if applicable)
  formattedDate: string;  // "Monday, January 15, 2024"
  formattedTime?: string; // "8:00 PM" (if applicable)
  timezone: string;       // "America/Los_Angeles"
}
```

---

### Issue #23: No Timezone in Date Input Validation

**Severity:** LOW
**Category:** Input Validation

**Problem:**
Date string validation doesn't verify timezone implications.

**Code Example:**
```typescript
// Current validation
const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
if (!dateRegex.test(dateString)) {
  return false; // Invalid format
}
// ✅ This is actually fine for date-only strings
```

**Recommended Fix:**
Current validation is adequate for date-only strings. No change needed, but add documentation:
```typescript
/**
 * Validate date string in YYYY-MM-DD format
 * Note: Date-only strings are timezone-neutral. They represent
 * the entire calendar day in the application's timezone (PST).
 */
function isValidDateString(dateString: string): boolean {
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
  return dateRegex.test(dateString);
}
```

---

## Issue Categories Reference

### Category 1: Unnecessary Conversions
**Definition:** Converting dates that are already in the correct timezone or format.

**Examples:**
- Issue #14: `toPSTDate()` creates copy without conversion
- Issue #10: Double parsing of date strings
- Issue #17: Database query timezone conversion when date strings are sufficient

**Prevention:**
- Use date strings (YYYY-MM-DD) for date-only values
- Only convert to Date objects when needed for formatting or calculations
- Use timezone-aware formatting functions

### Category 2: Inconsistent Timezone Handling
**Definition:** Some parts of code use timezone functions, others don't.

**Examples:**
- Issue #1: `getPSTWeekday()` missing timezone
- Issue #3: Email templates missing timezone
- Issue #6: Unused timezone imports
- Issue #9: Mixed constant vs hardcoded timezone

**Prevention:**
- Always use explicit `timeZone` parameter in `toLocaleString()`/`toLocaleDateString()`
- Use `PST_TIMEZONE` constant consistently
- Centralize date formatting in utility functions

### Category 3: Date-Only Complications
**Definition:** Since we only deal with dates (not times), timezone complexity may be unnecessary and causes off-by-one errors.

**Examples:**
- Issue #2: Frontend date display showing wrong day
- Issue #11: `addPSTDays()` DST boundary issues
- Issue #13: Midnight UTC vs PST confusion
- Issue #18: Client timezone differences

**Prevention:**
- Store dates as ISO strings (YYYY-MM-DD) in database
- Parse as UTC midnight when creating Date objects
- Format with explicit PST timezone for display
- Document that date-only values represent entire PST day

### Category 4: Existing Bug Patterns
**Definition:** Similar issues to those documented in previous bugs.

**Reference:** `/docs/bug-fixes/date-formatting-timezone-bug/`

**Examples:**
- Issue #2: Same pattern as previous bug (frontend date display)
- Issue #10: Similar double-conversion pattern
- Issue #4: Date parsing similar to previous timezone issues

**Prevention:**
- Always reference previous bug fixes when implementing new date code
- Use fixed patterns as templates
- Add timezone awareness to code review checklist

---

## Severity Assessment Guide

### Critical
- **Definition:** Bug that causes incorrect data display or calculation affecting user experience
- **Action Required:** Fix immediately before next deployment
- **Examples:** Wrong day displayed, dates off by one, missing timezone in core functions

### High
- **Definition:** Bug that causes inconsistency or has moderate impact on user experience
- **Action Required:** Fix within 1-2 sprints
- **Examples:** Unused imports, inconsistent timezone usage, tracking timestamps without timezone

### Medium
- **Definition:** Code quality issue or potential bug that hasn't manifested yet
- **Action Required:** Fix when time permits or during tech debt sprint
- **Examples:** Misleading function names, unused functions, missing cutoff implementation

### Low
- **Definition:** Minor code quality issue or nice-to-have improvement
- **Action Required:** Fix opportunistically during related work
- **Examples:** Deprecated code cleanup, configuration validation, API consistency

---

## Testing Recommendations

### Unit Tests Needed

```typescript
describe('Timezone Functions', () => {
  describe('getPSTWeekday', () => {
    it('should return correct weekday for date near midnight in PST', () => {
      const date = new Date('2024-01-15T08:00:00Z'); // 12:00 AM PST
      expect(getPSTWeekday(date)).toBe('Monday');
    });

    it('should return correct weekday when system timezone is not PST', () => {
      // Mock system timezone to EST
      const date = new Date('2024-01-15T08:00:00Z');
      expect(getPSTWeekday(date)).toBe('Monday'); // Should still return Monday
    });
  });

  describe('createPSTDate', () => {
    it('should create correct PST date regardless of system timezone', () => {
      const date = createPSTDate(2024, 0, 15, 0, 0, 0);
      const formatted = formatPSTDate(date, 'short');
      expect(formatted).toBe('01/15/2024');
    });
  });

  describe('formatPSTDate', () => {
    it('should format date consistently across system timezones', () => {
      const date = new Date('2024-01-15T08:00:00Z');
      const formatted = formatPSTDate(date, 'long');
      expect(formatted).toBe('January 15, 2024');
    });
  });
});
```

### Integration Tests Needed

```typescript
describe('Date Display Integration', () => {
  it('should show same date to users in different timezones', () => {
    const cartDate = '2024-01-15';
    const formattedPST = formatPSTDate(new Date(cartDate), 'short');
    const formattedEST = formatPSTDate(new Date(cartDate), 'short');
    expect(formattedPST).toBe(formattedEST);
  });

  it('should format email dates in PST regardless of recipient timezone', () => {
    const date = new Date('2024-01-15T08:00:00Z');
    const formatted = formatDateForEmail(date);
    expect(formatted).toContain('Monday');
  });
});
```

### Cross-Timezone Testing

Use browser DevTools to simulate different timezones:
1. Chrome DevTools → More Tools → Sensors → Location
2. Test with PST, EST, GMT, IST timezones
3. Verify all dates show consistently

---

## Implementation Priority

### Phase 1: Critical Fixes (Week 1)
1. Fix `getPSTWeekday()` timezone bug (Issue #1)
2. Fix frontend date display timezone (Issue #2)
3. Fix email template timezone (Issue #3)
4. Fix `createPSTDate()` timezone bug (Issue #4)
5. Fix `getPSTWeekdayNumber()` timezone bug (Issue #5)

### Phase 2: High-Priority Fixes (Week 2-3)
6. Clean up unused timezone imports (Issue #6)
7. Fix delivery date formatting timezone (Issue #7)
8. Fix tracking timestamps timezone (Issue #8)
9. Standardize timezone constant usage (Issue #9)
10. Fix double date parsing pattern (Issue #10)
11. Fix `addPSTDays()` timezone bug (Issue #11)
12. Standardize date string generation (Issue #12)
13. Clarify midnight UTC vs PST convention (Issue #13)

### Phase 3: Medium-Priority Fixes (Week 4-5)
14. Fix `toPSTDate()` misleading name (Issue #14)
15. Implement or document unused functions (Issue #15)
16. Clarify date comparison patterns (Issue #16)
17. ~~Fix database query date ranges (Issue #17)~~ ✅ RESOLVED
18. Add client timezone detection (Issue #18)
19. Implement order cutoff time (Issue #19)

### Phase 4: Low-Priority Fixes (Week 6+)
20. Remove deprecated code (Issue #20)
21. Add timezone configuration validation (Issue #21)
22. Standardize API date response format (Issue #22)
23. Add date input validation documentation (Issue #23)

---

## Summary Statistics

- **Total Issues Identified:** 23
- **Resolved Issues:** 2 (Issue #12, Issue #17)
- **Remaining Issues:** 21
- **Critical Issues:** 5 (21%)
- **High-Priority Issues:** 7 (32%) - Reduced from 8 (Issue #12 resolved)
- **Medium-Priority Issues:** 5 (24%) - Reduced from 6 (Issue #17 resolved)
- **Low-Priority Issues:** 4 (18%)

**Estimated Fix Time:**
- Phase 1 (Critical): 1 week
- Phase 2 (High): 2 weeks
- Phase 3 (Medium): 2 weeks
- Phase 4 (Low): 1+ weeks
- **Total:** 6+ weeks

**Risk Assessment:**
- **High Risk:** Issues #1, #2, #3, #4, #5 affect data correctness
- **Medium Risk:** Issues #6-11, #13 affect consistency and maintainability
- **Low Risk:** Issues #14-23 are code quality and nice-to-haves

---

**Document Version:** 1.0
**Last Updated:** January 7, 2026
**Next Review:** After Phase 1 fixes completed
**Status:** Ready for Implementation Planning
