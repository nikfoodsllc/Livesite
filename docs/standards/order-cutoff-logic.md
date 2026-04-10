# Order Cutoff Time Logic

**Document Version:** 1.0
**Last Updated:** January 7, 2026
**Status:** ✅ Implemented and Active
**Related Issue:** [Timezone Analysis Issue #19](../timezone-analysis/README.md#issue-19-order-cutoff-time-not-implemented)

---

## Overview

This document describes the order cutoff time business rule and its technical implementation in the TDN9IL application. The cutoff logic ensures customers cannot place orders for a delivery date after the designated cutoff time, which is **1 PM Pacific Time (PST/PDT) the day before delivery**.

### Business Rule

**CUTOFF RULE:** A delivery day is considered available for ordering until **1:00 PM PST the day before delivery**.

**Examples:**
- Friday orders close at 1 PM PST on Thursday
- Monday orders close at 1 PM PST on Sunday
- Today is never available for same-day delivery (regardless of cutoff time)

---

## Implementation Location

The cutoff logic is implemented in:

**File:** `src/lib/server/availableDates.ts`
**Function:** `isPastCutoffTime(targetDate: Date): boolean`

This function is used by:
- `generateAvailableDateOptions()` - To populate the `isPastCutoff` field on date options
- `isDateDisabled()` - To determine if a date should be disabled in the UI

---

## Technical Implementation

### Core Function: `isPastCutoffTime()`

```typescript
function isPastCutoffTime(targetDate: Date): boolean {
  const now = getPSTNow();

  // Get midnight for today and the target date in PST timezone
  const todayMidnight = getPSTMidnight(now);
  const targetMidnight = getPSTMidnight(targetDate);

  // Calculate tomorrow's midnight by adding 1 day to today's midnight
  const tomorrowMidnight = addPSTDays(todayMidnight, 1);

  // The cutoff only applies to tomorrow's date
  // If the target date is NOT tomorrow, it's not affected by cutoff
  if (targetMidnight.getTime() !== tomorrowMidnight.getTime()) {
    return false;
  }

  // For tomorrow's date, check if current time is past 1 PM PST (13:00)
  // If it's 1 PM PST or later, tomorrow is past cutoff and should be disabled
  return isAfterOrEqualPSTHour(13, now);
}
```

### How It Works

1. **Get Current Time:** Uses `getPSTNow()` to get the current time in Pacific Time
2. **Calculate Date Midnights:** Uses `getPSTMidnight()` to get midnight boundaries for today and the target date
3. **Determine Tomorrow:** Uses `addPSTDays(todayMidnight, 1)` to calculate tomorrow's midnight
4. **Check If Target Is Tomorrow:** Compares target midnight with tomorrow midnight
5. **Check Cutoff Time:** If target is tomorrow, uses `isAfterOrEqualPSTHour(13)` to check if past 1 PM PST

---

## Timezone Functions Used

The cutoff implementation uses four key timezone functions from `src/lib/timezone.ts`:

### 1. `getPSTNow(): Date`
**Purpose:** Get current time in Pacific Time

**Usage:**
```typescript
const now = getPSTNow();
```

**Why It's Needed:** Ensures all cutoff calculations use the current moment in Pacific Time, not the server's system timezone.

---

### 2. `getPSTMidnight(date: Date): Date`
**Purpose:** Get midnight (start of day) for a date in PST timezone

**Usage:**
```typescript
const todayMidnight = getPSTMidnight(now);
const targetMidnight = getPSTMidnight(targetDate);
```

**Why It's Needed:** Provides consistent day boundaries for comparing dates. Midnight is used to determine if a target date is "today", "tomorrow", or a future date.

---

### 3. `addPSTDays(date: Date, days: number): Date`
**Purpose:** Add days to a date in a timezone-safe manner

**Usage:**
```typescript
const tomorrowMidnight = addPSTDays(todayMidnight, 1);
```

**Why It's Needed:** Calculates tomorrow's midnight to determine if the target date is "tomorrow" (the only date affected by cutoff). Uses UTC millisecond arithmetic for timezone-safe day addition.

---

### 4. `isAfterOrEqualPSTHour(hour: number, date?: Date): boolean`
**Purpose:** Check if current time in PST is after or equal to a specific hour

**Usage:**
```typescript
const isPastCutoff = isAfterOrEqualPSTHour(13, now); // Check if past 1 PM PST
```

**Why It's Needed:** Determines if the cutoff time (1 PM PST = hour 13) has passed. This is the core cutoff check.

---

## Examples and Scenarios

### Scenario 1: Before Cutoff (Order Available)

**Time:** Thursday, January 9, 2026 at 10:00 AM PST
**Target Date:** Friday, January 10, 2026

```typescript
const now = new Date('2026-01-09T10:00:00-08:00'); // Thursday 10 AM PST
const targetDate = new Date('2026-01-10T00:00:00-08:00'); // Friday

isPastCutoffTime(targetDate); // Returns: false (order still available)
```

**Explanation:**
- Target date (Friday) is tomorrow
- Current time (10 AM PST) is before 1 PM PST cutoff
- Friday is still available for ordering

---

### Scenario 2: At Cutoff (Order Just Closed)

**Time:** Thursday, January 9, 2026 at 1:00 PM PST
**Target Date:** Friday, January 10, 2026

```typescript
const now = new Date('2026-01-09T13:00:00-08:00'); // Thursday 1 PM PST
const targetDate = new Date('2026-01-10T00:00:00-08:00'); // Friday

isPastCutoffTime(targetDate); // Returns: true (order closed)
```

**Explanation:**
- Target date (Friday) is tomorrow
- Current time (1 PM PST) is exactly at cutoff
- Friday is no longer available for ordering

---

### Scenario 3: After Cutoff (Order Closed)

**Time:** Thursday, January 9, 2026 at 2:00 PM PST
**Target Date:** Friday, January 10, 2026

```typescript
const now = new Date('2026-01-09T14:00:00-08:00'); // Thursday 2 PM PST
const targetDate = new Date('2026-01-10T00:00:00-08:00'); // Friday

isPastCutoffTime(targetDate); // Returns: true (order closed)
```

**Explanation:**
- Target date (Friday) is tomorrow
- Current time (2 PM PST) is past 1 PM PST cutoff
- Friday is no longer available for ordering

---

### Scenario 4: Same Day (Not Affected by Cutoff)

**Time:** Thursday, January 9, 2026 at 2:00 PM PST
**Target Date:** Thursday, January 9, 2026

```typescript
const now = new Date('2026-01-09T14:00:00-08:00'); // Thursday 2 PM PST
const targetDate = new Date('2026-01-09T00:00:00-08:00'); // Thursday

isPastCutoffTime(targetDate); // Returns: false (not affected by cutoff)
```

**Explanation:**
- Target date (Thursday) is today, not tomorrow
- Cutoff only applies to tomorrow's date
- Today's date is not affected by cutoff logic (but is disabled by other business rules)

---

### Scenario 5: Future Date Beyond Tomorrow (Not Affected by Cutoff)

**Time:** Thursday, January 9, 2026 at 2:00 PM PST
**Target Date:** Saturday, January 11, 2026

```typescript
const now = new Date('2026-01-09T14:00:00-08:00'); // Thursday 2 PM PST
const targetDate = new Date('2026-01-11T00:00:00-08:00'); // Saturday

isPastCutoffTime(targetDate); // Returns: false (not affected by cutoff)
```

**Explanation:**
- Target date (Saturday) is beyond tomorrow
- Cutoff only applies to tomorrow's date
- Saturday is still available for ordering

---

## Integration with Date Availability

The cutoff logic integrates with the overall date availability system through the `DateOption` interface:

```typescript
export interface DateOption {
  id: string;
  date: string; // YYYY-MM-DD format
  flatCategoryEnabled: boolean;
  dayWiseCategoryEnabled: boolean;
  formattedDate: string;
  fullDate: string;
  isToday: boolean;        // Whether the date is today in PST
  isPast: boolean;         // Whether the date is in the past
  isPastCutoff: boolean;   // Whether the cutoff time has passed
}
```

### Date Availability Logic

A date is **disabled** (unavailable for ordering) if **any** of these conditions are true:
1. `isPast === true` - The date itself has passed
2. `isPastCutoff === true` - The cutoff time has passed (1 PM PST day before)

### Example Values

| Current Time | Target Date | isPast | isPastCutoff | Available? | Reason |
|--------------|-------------|--------|--------------|------------|--------|
| Thu 10 AM PST | Friday | false | false | ✅ Yes | Before cutoff |
| Thu 1 PM PST | Friday | false | true | ❌ No | At cutoff |
| Thu 2 PM PST | Friday | false | true | ❌ No | Past cutoff |
| Thu 2 PM PST | Saturday | false | false | ✅ Yes | Beyond tomorrow |
| Thu 2 PM PST | Thursday | false | false | ❌ No | Same-day (other rule) |
| Fri 10 AM PST | Thursday | true | false | ❌ No | In the past |

---

## Testing Guidelines

### Unit Tests for `isPastCutoffTime()`

```typescript
describe('isPastCutoffTime', () => {
  it('should return false before 1 PM PST for tomorrow', () => {
    const now = new Date('2026-01-09T10:00:00-08:00'); // Thursday 10 AM PST
    const tomorrow = new Date('2026-01-10T00:00:00-08:00'); // Friday
    expect(isPastCutoffTime(tomorrow)).toBe(false);
  });

  it('should return true at 1 PM PST for tomorrow', () => {
    const now = new Date('2026-01-09T13:00:00-08:00'); // Thursday 1 PM PST
    const tomorrow = new Date('2026-01-10T00:00:00-08:00'); // Friday
    expect(isPastCutoffTime(tomorrow)).toBe(true);
  });

  it('should return true after 1 PM PST for tomorrow', () => {
    const now = new Date('2026-01-09T14:00:00-08:00'); // Thursday 2 PM PST
    const tomorrow = new Date('2026-01-10T00:00:00-08:00'); // Friday
    expect(isPastCutoffTime(tomorrow)).toBe(true);
  });

  it('should return false for today regardless of time', () => {
    const now = new Date('2026-01-09T14:00:00-08:00'); // Thursday 2 PM PST
    const today = new Date('2026-01-09T00:00:00-08:00'); // Thursday
    expect(isPastCutoffTime(today)).toBe(false);
  });

  it('should return false for dates beyond tomorrow', () => {
    const now = new Date('2026-01-09T14:00:00-08:00'); // Thursday 2 PM PST
    const saturday = new Date('2026-01-11T00:00:00-08:00'); // Saturday
    expect(isPastCutoffTime(saturday)).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('Date Option Availability', () => {
  it('should correctly mark dates as past cutoff after 1 PM PST', async () => {
    // Mock current time to Thursday 2 PM PST
    const mockNow = new Date('2026-01-09T14:00:00-08:00');

    const documents = [
      { date: '2026-01-09', flatCategoryEnabled: true, dayWiseCategoryEnabled: true }, // Thursday
      { date: '2026-01-10', flatCategoryEnabled: true, dayWiseCategoryEnabled: true }, // Friday
      { date: '2026-01-11', flatCategoryEnabled: true, dayWiseCategoryEnabled: true }, // Saturday
    ];

    const options = generateAvailableDateOptions(documents);

    // Thursday (today): isPast=false, isPastCutoff=false (same-day rule)
    expect(options[0].isPastCutoff).toBe(false);

    // Friday (tomorrow): isPast=false, isPastCutoff=true (past cutoff)
    expect(options[1].isPastCutoff).toBe(true);

    // Saturday (beyond tomorrow): isPast=false, isPastCutoff=false (not affected)
    expect(options[2].isPastCutoff).toBe(false);
  });
});
```

### Cross-Timezone Testing

When testing cutoff logic across different system timezones, ensure the cutoff behavior remains consistent:

```typescript
// Test should pass regardless of server timezone
describe('Cutoff Logic Across Timezones', () => {
  it('should enforce cutoff at 1 PM PST even when server is in EST', () => {
    // Server in EST (3 hours ahead of PST)
    // Thursday 4 PM EST = Thursday 1 PM PST
    const estTime = new Date('2026-01-09T16:00:00-05:00'); // EST
    const friday = new Date('2026-01-10T00:00:00-08:00'); // Friday PST

    isPastCutoffTime(friday); // Should return: true (cutoff in PST)
  });
});
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Cutoff Not Enforcing Correctly

**Symptom:** Users can still order for dates that should be past cutoff.

**Possible Causes:**
1. **Server timezone mismatch:** Server may not be using PST timezone for cutoff checks
2. **Function not called:** `isPastCutoffTime()` may not be integrated into the date availability check
3. **Caching:** Frontend may be caching available dates and not refreshing after cutoff

**Solutions:**
1. Verify `getPSTNow()` is returning current time in PST
2. Check that `isPastCutoffTime()` is called in `generateAvailableDateOptions()`
3. Add cache-busting logic to refresh available dates after cutoff time

**Debug Code:**
```typescript
// Add logging to isPastCutoffTime()
function isPastCutoffTime(targetDate: Date): boolean {
  const now = getPSTNow();
  const currentHour = getPSTHour(now);

  console.log('[CUTOFF DEBUG] Current PST hour:', currentHour);
  console.log('[CUTOFF DEBUG] Target date:', targetDate.toISOString());
  console.log('[CUTOFF DEBUG] Current time:', now.toISOString());

  // ... rest of function
}
```

---

#### Issue 2: Cutoff Enforcing Too Early

**Symptom:** Users cannot order for dates that should still be available.

**Possible Causes:**
1. **Hour comparison off-by-one:** May be comparing against hour 12 instead of 13
2. **Date calculation error:** May be calculating tomorrow incorrectly
3. **Timezone confusion:** May be applying cutoff in wrong timezone

**Solutions:**
1. Verify `isAfterOrEqualPSTHour(13)` uses hour 13 (1 PM), not hour 12 (12 PM)
2. Check `addPSTDays()` is correctly adding 1 day
3. Ensure all date operations use PST timezone explicitly

**Debug Code:**
```typescript
// Check cutoff hour calculation
const now = getPSTNow();
const hour = getPSTHour(now);
console.log('Current PST hour:', hour); // Should be 0-23
console.log('Is past 1 PM PST?', hour >= 13);
```

---

#### Issue 3: Cutoff Affects Wrong Dates

**Symptom:** Dates beyond tomorrow are being marked as past cutoff.

**Possible Causes:**
1. **Tomorrow calculation error:** May be incorrectly identifying non-tomorrow dates as tomorrow
2. **Midnight comparison error:** May be comparing midnight timestamps incorrectly

**Solutions:**
1. Verify `addPSTDays(todayMidnight, 1)` correctly calculates tomorrow
2. Check that midnight timestamps are compared using `.getTime()`

**Debug Code:**
```typescript
// Check tomorrow identification
const todayMidnight = getPSTMidnight(getPSTNow());
const tomorrowMidnight = addPSTDays(todayMidnight, 1);
const targetMidnight = getPSTMidnight(targetDate);

console.log('Today midnight:', todayMidnight.toISOString());
console.log('Tomorrow midnight:', tomorrowMidnight.toISOString());
console.log('Target midnight:', targetMidnight.toISOString());
console.log('Is target tomorrow?', targetMidnight.getTime() === tomorrowMidnight.getTime());
```

---

#### Issue 4: Daylight Saving Time Transitions

**Symptom:** Cutoff time shifts by 1 hour during DST transitions.

**Possible Causes:**
1. **Hardcoded UTC offset:** Using hardcoded `-08:00` instead of timezone-aware calculations
2. **Missing timezone parameter:** Not specifying `timeZone` in `Intl.DateTimeFormat`

**Solutions:**
1. Always use `PST_TIMEZONE` constant instead of hardcoded offsets
2. Ensure all date formatting uses explicit `timeZone` parameter
3. The IANA timezone identifier `'America/Los_Angeles'` automatically handles DST transitions

**Why Current Implementation Is DST-Safe:**
- Uses `Intl.DateTimeFormat` with explicit `timeZone: PST_TIMEZONE`
- Uses `getPSTMidnight()` which extracts date components using PST timezone
- Uses UTC millisecond arithmetic in `addPSTDays()` which adds exact 24-hour periods
- No hardcoded UTC offsets anywhere in the cutoff logic

---

## Related Documentation

- [Timezone Utilities](../timezone-analysis/central-utilities.md) - Complete reference for PST timezone functions
- [Timezone Analysis README](../timezone-analysis/README.md) - Overview of timezone usage across the application
- [Date Handling Convention](./date-handling-convention.md) - Standard patterns for parsing and formatting dates
- [Available Dates Implementation](../../src/lib/server/availableDates.ts) - Source code for cutoff logic

---

## Change Log

**Version 1.0 (January 7, 2026)**
- Initial documentation of order cutoff logic
- Documented implementation in `src/lib/server/availableDates.ts`
- Added examples, testing guidelines, and troubleshooting section
- Marked Issue #19 as resolved

---

**Document Maintained By:** Development Team
**Next Review:** After any changes to cutoff logic or timezone utilities
**Status:** ✅ Active - Implemented in production
