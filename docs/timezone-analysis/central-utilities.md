# Timezone Utilities Documentation

**Module:** `src/lib/timezone.ts`
**Timezone:** Pacific Time (America/Los_Angeles)
**Database Storage:** All dates stored in PST (Pacific Standard Time)

## Overview

This application uses **Pacific Time (PST/PDT)** as its canonical timezone for all business operations. All dates are stored in the database in PST, and all date operations should use the utilities provided in this module to ensure consistent timezone handling across the application.

### Key Business Rules
- **Order Cutoff:** All same-day order cutoffs occur at 1 PM Pacific Time
- **Availability Logic:** Day availability is determined using Pacific Time dates. A "day" is considered available until 1 PM PST the DAY BEFORE (e.g., Friday orders close at 1 PM PST on Thursday)
- **Operational Consistency:** Using a single timezone avoids confusion around day boundaries, daylight saving transitions, and customer locations

---

## Function Catalog

### 1. PST_TIMEZONE (Constant)

**Signature:** `const PST_TIMEZONE: string`

**Purpose:** Application timezone identifier that reads from `NEXT_PUBLIC_TIMEZONE` environment variable with fallback to Pacific Time.

**Default Value:** `'America/Los_Angeles'`

**Type:** Configuration constant (not a function)

**Performs Conversion:** No

**Current Usage Across Codebase:**
- `src/lib/dayAvailabilityClient.ts` - Used with `getPSTWeekday()` to extract day names from dates
- `src/lib/deliveryCalculator.ts` - Imported but not directly used in the code
- `src/app/api/food-items-day-wise/route.ts` - Imported but not directly used in the code
- `src/app/page.tsx` - Used with `getPSTWeekday()` to extract day names from dates
- `src/lib/server/availableDates.ts` - Used for date formatting with `toLocaleDateString()`
- `src/lib/server/dayAvailability.ts` - Imported for timezone utilities (deprecated module)

**Necessity Given PST Storage:** **ESSENTIAL** - This constant is used throughout the codebase for timezone-aware operations. Even though dates are stored in PST, this constant is needed for:
- Formatting dates with `Intl.DateTimeFormat` using the `timeZone` option
- Ensuring consistent timezone handling across the application
- Making the timezone configurable via environment variable

**Recommendation:** **KEEP** - This is a core configuration constant that should be used wherever timezone-aware formatting is needed.

---

### 2. getPSTNow()

**Signature:** `function getPSTNow(): Date`

**Purpose:** Returns current time in the configured timezone (Pacific Time)

**Parameters:** None

**Returns:** Current Date adjusted to the application timezone

**Performs Conversion:** No (returns same Date object as `new Date()`, but semantically represents PST now)

**Implementation Details:**
```typescript
export function getPSTNow(): Date {
  const now = new Date();
  return toPSTDate(now);
}
```
Note: Since `toPSTDate()` just returns the input date, this function essentially returns `new Date()`.

**Current Usage Across Codebase:**
- `src/lib/server/dayAvailability.ts` - Used extensively in deprecated functions for date comparisons and calculations
- `src/lib/server/availableDates.ts` - Used to get current time for date filtering and comparisons

**Necessity Given PST Storage:** **QUESTIONABLE** - Since dates are stored in PST in the database, and JavaScript Date objects are always in UTC internally, this function doesn't actually convert anything. However, it provides semantic clarity that the returned date should be treated as PST.

**Recommendation:** **KEEP WITH IMPROVEMENTS** - The function provides semantic value but should be documented better. Consider:
1. Adding clear documentation that it returns a Date object representing the current moment in time
2. Note that it should be used with other PST-aware functions for proper timezone handling
3. The function is useful for consistency with other PST functions in the module

---

### 3. toPSTDate()

**Signature:** `function toPSTDate(date: Date): Date`

**Purpose:** Convert any Date object for display purposes in PST timezone. Returns a new Date object representing the same moment in time.

**Parameters:**
- `date: Date` - The date to convert

**Returns:** Date object representing the same moment in time (no actual conversion)

**Performs Conversion:** **NO** - This is a critical function to understand. It does NOT convert the date. It simply returns a new Date object with the same UTC timestamp.

**Implementation Details:**
```typescript
export function toPSTDate(date: Date): Date {
  return new Date(date);
}
```

**Important Note:** The documentation states "Returns a Date object that can be used with timezone-aware formatting functions to display the correct time in the application timezone." However, the function itself does not perform any conversion. It relies on other functions (like `formatPSTDate()`) to handle the actual timezone-aware display.

**Current Usage Across Codebase:**
- `src/lib/timezone.ts` - Only used internally by `getPSTNow()`

**Necessity Given PST Storage:** **LOW** - Since dates are already stored in PST in the database, and this function doesn't actually convert anything, it's not clear what value it adds. It creates a copy of the Date object, but that's not necessary for most operations.

**Recommendation:** **DEPRECATE OR REDESIGN** - This function is misleading because it doesn't actually convert to PST. Either:
1. Remove it entirely (since it's only used by `getPSTNow()`)
2. Redesign it to actually perform a timezone conversion if needed
3. Add clear documentation explaining that it's just a semantic marker and doesn't convert

---

### 4. getPSTHour()

**Signature:** `function getPSTHour(date: Date = new Date()): number`

**Purpose:** Get current hour in the configured timezone (0-23). Used for cutoff time comparisons and time-based logic.

**Parameters:**
- `date: Date` (optional) - The date to get the hour for. Defaults to current time.

**Returns:** Hour in the application timezone (0-23)

**Performs Conversion:** **YES** - Uses `Intl.DateTimeFormat` with the PST timezone to extract the hour component

**Implementation Details:**
```typescript
export function getPSTHour(date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PST_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  });

  const hour = parseInt(formatter.format(date), 10);
  return hour;
}
```

**Current Usage Across Codebase:**
- Used internally by `isAfterOrEqualPSTHour()` for cutoff time checks in `src/lib/server/availableDates.ts`

**Necessity Given PST Storage:** **HIGH** - This function is essential for cutoff time checks and is actively used in the order cutoff logic implementation.

**Recommendation:** **KEEP - ACTIVE USE** - This function is well-designed and actively used for cutoff time logic. It's essential for:
1. Order cutoff validation (checking if past 1 PM PST)
2. Time-based business rules
3. Availability logic in `availableDates.ts`

---

### 5. getPSTTimeComponents()

**Signature:** `function getPSTTimeComponents(date: Date = new Date()): { hour: number; minute: number; second: number; }`

**Purpose:** Get current hour, minute, and second in the configured timezone. Provides detailed time components for precise cutoff calculations.

**Parameters:**
- `date: Date` (optional) - The date to get time components for. Defaults to current time.

**Returns:** Object with `hour`, `minute`, and `second` in the application timezone

**Performs Conversion:** **YES** - Uses `Intl.DateTimeFormat` with the PST timezone to extract time components

**Implementation Details:**
```typescript
export function getPSTTimeComponents(date: Date = new Date()): {
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PST_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const second = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);

  return { hour, minute, second };
}
```

**Current Usage Across Codebase:**
- No direct usage found in the codebase

**Necessity Given PST Storage:** **LOW** - This function provides detailed time components, but it's not currently used. It would be useful for calculating time until cutoff or displaying countdowns.

**Recommendation:** **KEEP FOR FUTURE USE** - This function could be useful for:
1. Displaying time remaining until cutoff
2. Precise time-based validations
3. Time countdown features
However, if these features are not planned, consider marking it as internal or experimental.

---

### 6. isInPSTPast()

**Signature:** `function isInPSTPast(targetDate: Date, currentDate: Date = getPSTNow()): boolean`

**Purpose:** Check if a given date is in the past relative to the configured timezone. Compares dates at midnight in the application timezone to determine if one day is before another.

**Parameters:**
- `targetDate: Date` - The date to check
- `currentDate: Date` (optional) - Current date for comparison. Defaults to now in application timezone.

**Returns:** `true` if targetDate is strictly before currentDate (at midnight resolution)

**Performs Conversion:** **NO (but uses timezone-aware midnight calculation)**

**Implementation Details:**
```typescript
export function isInPSTPast(targetDate: Date, currentDate: Date = getPSTNow()): boolean {
  const targetMidnight = getPSTMidnight(targetDate);
  const currentMidnight = getPSTMidnight(currentDate);
  return targetMidnight.getTime() < currentMidnight.getTime();
}
```

**Current Usage Across Codebase:**
- `src/lib/server/dayAvailability.ts` - Used in deprecated `isDayDisabled()` function
- `src/lib/server/availableDates.ts` - Used to check if dates are in the past for filtering

**Necessity Given PST Storage:** **HIGH** - This is essential for determining if a delivery date is in the past and should be disabled. Even though dates are stored in PST, this function provides a clean, timezone-aware comparison.

**Recommendation:** **KEEP** - This is a core function for date availability logic. It's essential for:
1. Filtering out past delivery dates
2. Determining if a date is selectable for ordering
3. Timezone-aware date comparisons

---

### 7. isPSTToday()

**Signature:** `function isPSTToday(targetDate: Date, currentDate: Date = getPSTNow()): boolean`

**Purpose:** Check if a given date is today in the configured timezone.

**Parameters:**
- `targetDate: Date` - The date to check
- `currentDate: Date` (optional) - Current date for comparison. Defaults to now in application timezone.

**Returns:** `true` if targetDate is the same day as currentDate in the application timezone

**Performs Conversion:** **NO (but uses timezone-aware midnight calculation)**

**Implementation Details:**
```typescript
export function isPSTToday(targetDate: Date, currentDate: Date = getPSTNow()): boolean {
  const targetMidnight = getPSTMidnight(targetDate);
  const currentMidnight = getPSTMidnight(currentDate);
  return targetMidnight.getTime() === currentMidnight.getTime();
}
```

**Current Usage Across Codebase:**
- `src/lib/server/dayAvailability.ts` - Used in deprecated `generateAvailableDays()` function
- `src/lib/server/availableDates.ts` - Used to check if dates are today for metadata
- `src/lib/orderHelpers.ts` - Used in `isToday()` function to check if delivery date is today

**Necessity Given PST Storage:** **HIGH** - This is essential for UI features like highlighting today's delivery date or showing "delivering today" badges.

**Recommendation:** **KEEP** - This is a core function for date display and highlighting. It's essential for:
1. UI features that highlight today's date
2. Delivery status displays
3. Date selection UI enhancements

---

### 8. getPSTMidnight()

**Signature:** `function getPSTMidnight(date: Date): Date`

**Purpose:** Get midnight (start of day) for a given date in PST timezone. Returns a Date object set to 00:00:00.000 in PST.

**Parameters:**
- `date: Date` - The date to get midnight for

**Returns:** Date object set to midnight PST

**Performs Conversion:** **YES** - Extracts year, month, and day components using PST timezone and creates a new Date at midnight

**Implementation Details:**
```typescript
export function getPSTMidnight(date: Date): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PST_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '0', 10);
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '0', 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '0', 10);

  const midnight = new Date(year, month, day, 0, 0, 0, 0);
  return midnight;
}
```

**Current Usage Across Codebase:**
- `src/lib/timezone.ts` - Used internally by `isInPSTPast()` and `isPSTToday()`
- `src/lib/server/dayAvailability.ts` - Used extensively in deprecated functions
- `src/lib/server/availableDates.ts` - Used in `isPastCutoffTime()` for cutoff logic

**Necessity Given PST Storage:** **HIGH** - This is a fundamental utility function used by other core functions. Even though dates are stored in PST, this function is needed for date comparisons at the day level.

**Recommendation:** **KEEP - ACTIVE USE** - This is a fundamental building block for date comparisons and cutoff logic. It's essential for:
1. Day-level date comparisons (ignoring time)
2. Determining if dates are in the past or today
3. Consistent date boundaries in PST
4. Calculating tomorrow's date for cutoff logic (`addPSTDays(getPSTMidnight(now), 1)`)

---

### 9. createPSTDate()

**Signature:** `function createPSTDate(year: number, month: number, day: number, hour: number = 0, minute: number = 0, second: number = 0): Date`

**Purpose:** Create a PST-aware Date object from date components. Creates a Date object representing the given local time in PST timezone.

**Parameters:**
- `year: number` - Full year (e.g., 2024)
- `month: number` - Month (0-11, where 0 = January)
- `day: number` - Day of month (1-31)
- `hour: number` (optional) - Hour (0-23, defaults to 0)
- `minute: number` (optional) - Minute (0-59, defaults to 0)
- `second: number` (optional) - Second (0-59, defaults to 0)

**Returns:** Date object representing the specified time in PST

**Performs Conversion:** **NO** - Creates a Date object using the local system time, which is assumed to be interpreted as PST

**Implementation Details:**
```typescript
export function createPSTDate(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
): Date {
  const date = new Date(year, month, day, hour, minute, second);
  return date;
}
```

**Important Note:** This function creates a Date object using the JavaScript `Date` constructor, which interprets the parameters in the **local system timezone**, not PST. This is problematic because:
1. If the server is not in PST, the created Date will not represent the intended PST time
2. The function name suggests it creates a PST date, but it doesn't ensure PST timezone

**Current Usage Across Codebase:**
- `src/app/api/food-items-day-wise/route.ts` - Used in `formatDateString()` to create a date object from a date string

**Necessity Given PST Storage:** **MEDIUM** - This function is used to create Date objects from date components, but the implementation is problematic.

**Recommendation:** **REDESIGN** - This function has a subtle bug. The `Date` constructor interprets the parameters in the **local system timezone**, not PST. To properly create a PST date, the function should:
1. Create the date in UTC
2. Or use `toLocaleString()` with PST timezone
3. Or clearly document that it assumes the server is running in PST timezone

**Current Usage Issue:** In `food-items-day-wise/route.ts`, it's used like this:
```typescript
const dateObj = createPSTDate(year, month - 1, day, 0, 0, 0);
```
This creates a date at midnight in the **local timezone**, not PST. If the server is not in PST, this will create the wrong time.

---

### 10. formatPSTDate()

**Signature:** `function formatPSTDate(date: Date, format: 'short' | 'long' | 'weekday' | 'time' = 'short'): string`

**Purpose:** Format a date in PST timezone for display. Provides various formatting options for displaying dates.

**Parameters:**
- `date: Date` - The date to format
- `format: 'short' | 'long' | 'weekday' | 'time'` - Format style:
  - `'short'`: MM/DD/YYYY
  - `'long'`: January 1, 2024
  - `'weekday'`: Tuesday, January 1
  - `'time'`: 1:30 PM

**Returns:** Formatted date string in PST timezone

**Performs Conversion:** **YES** - Uses `Intl.DateTimeFormat` with PST timezone to format the date

**Implementation Details:**
```typescript
export function formatPSTDate(
  date: Date,
  format: 'short' | 'long' | 'weekday' | 'time' = 'short'
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: PST_TIMEZONE,
  };

  switch (format) {
    case 'short':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'long':
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      break;
    case 'weekday':
      options.weekday = 'long';
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      break;
    case 'time':
      options.hour = 'numeric';
      options.minute = '2-digit';
      options.hour12 = true;
      break;
  }

  return new Intl.DateTimeFormat('en-US', options).format(date);
}
```

**Current Usage Across Codebase:**
- `src/components/checkout/CheckoutOrderSummary.tsx` - Imported but the import appears to be unused (line 9)
- `src/components/cart/CartDaySection.tsx` - Imported but the import appears to be unused (line 9)
- `src/lib/orderHelpers.ts` - Imported but the import appears to be unused (line 6)

**Necessity Given PST Storage:** **HIGH** - Even though dates are stored in PST, this function is essential for **displaying** dates in a user-friendly format with proper PST timezone handling.

**Recommendation:** **KEEP** - This is a core function for date display. However, the unused imports should be cleaned up. It's essential for:
1. Displaying dates in UI components
2. Ensuring consistent date formatting across the application
3. Proper timezone-aware date display

**Note:** The function is imported but not actually used in several files. Clean up these unused imports:
- `src/components/checkout/CheckoutOrderSummary.tsx:9`
- `src/components/cart/CartDaySection.tsx:9`
- `src/lib/orderHelpers.ts:6`

---

### 11. getPSTWeekday()

**Signature:** `function getPSTWeekday(date: Date): string`

**Purpose:** Get the day of week name for a date in PST timezone.

**Parameters:**
- `date: Date` - The date to get the weekday for

**Returns:** Full weekday name (e.g., "Monday", "Tuesday")

**Performs Conversion:** **NO** - Uses `Intl.DateTimeFormat` to format the weekday, but does not specify a timezone

**Implementation Details:**
```typescript
export function getPSTWeekday(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
  });

  return formatter.format(date);
}
```

**Important Note:** This function does **NOT** specify a timezone in the `Intl.DateTimeFormat` options. This means it will use the **system's local timezone** to determine the weekday, not PST. This is a bug because:
1. If the date is near midnight and the system is in a different timezone, it might return the wrong weekday
2. The function name suggests it returns the PST weekday, but it doesn't ensure PST timezone

**Current Usage Across Codebase:**
- `src/lib/dayAvailabilityClient.ts` - Used to extract day names from dates for backward compatibility
- `src/app/page.tsx` - Used to extract day names from date strings in day groups

**Necessity Given PST Storage:** **HIGH** - This function is heavily used for extracting day names from dates, which is essential for mapping between the old day-based system and the new date-based system.

**Recommendation:** **FIX BUG** - This function needs to specify the PST timezone to ensure it returns the correct weekday. Change the implementation to:
```typescript
export function getPSTWeekday(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: PST_TIMEZONE, // ADD THIS LINE
  });

  return formatter.format(date);
}
```

---

### 12. getPSTWeekdayNumber()

**Signature:** `function getPSTWeekdayNumber(date: Date): number`

**Purpose:** Get the day of week number for a date in PST timezone.

**Parameters:**
- `date: Date` - The date to get the weekday number for

**Returns:** Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)

**Performs Conversion:** **NO** - Uses the native `Date.getDay()` method, which returns the weekday based on the **system's local timezone**, not PST

**Implementation Details:**
```typescript
export function getPSTWeekdayNumber(date: Date): number {
  // Create a new Date object to avoid mutating the original
  const pstDate = new Date(date);
  // Use native getDay() which returns 0-6 (Sunday-Saturday)
  // The date should already be in the correct moment in time
  return pstDate.getDay();
}
```

**Important Note:** The comment says "The date should already be in the correct moment in time," but this is misleading. The `getDay()` method returns the weekday based on the **system's local timezone**, not the UTC timestamp. This means:
1. If the system is not in PST, this will return the wrong weekday number for dates near midnight
2. The function name suggests it returns the PST weekday number, but it doesn't ensure PST timezone

**Current Usage Across Codebase:**
- `src/lib/server/dayAvailability.ts` - Used in deprecated `generateAvailableDays()` function

**Necessity Given PST Storage:** **MEDIUM** - This function is used in deprecated code, but it might be needed for future features.

**Recommendation:** **FIX BUG OR DEPRECATE** - This function has the same issue as `getPSTWeekday()`. It should either:
1. Be fixed to use PST timezone (though this is more complex for a number return value)
2. Be deprecated in favor of using `getPSTWeekday()` and converting to number
3. Be clearly documented to only work correctly if the system is in PST timezone

---

### 13. isBeforePSTHour()

**Signature:** `function isBeforePSTHour(hour: number, date: Date = getPSTNow()): boolean`

**Purpose:** Check if current time in PST is before a specific hour. Useful for cutoff time checks.

**Parameters:**
- `hour: number` - Hour to check against (0-23)
- `date: Date` (optional) - Date to check. Defaults to now.

**Returns:** `true` if current PST time is before the specified hour

**Performs Conversion:** **YES** - Uses `getPSTHour()` to get the current hour in PST timezone

**Implementation Details:**
```typescript
export function isBeforePSTHour(hour: number, date: Date = getPSTNow()): boolean {
  const currentHour = getPSTHour(date);
  return currentHour < hour;
}
```

**Current Usage Across Codebase:**
- No direct usage found in the codebase

**Necessity Given PST Storage:** **MEDIUM** - This function would be useful for cutoff time checks, but it's currently not being used anywhere.

**Recommendation:** **KEEP FOR FUTURE USE** - This function is well-designed and useful for cutoff time logic. It should be kept for:
1. Future cutoff time implementations
2. Order validation logic
3. Time-based business rules

---

### 14. isAfterOrEqualPSTHour()

**Signature:** `function isAfterOrEqualPSTHour(hour: number, date: Date = getPSTNow()): boolean`

**Purpose:** Check if current time in PST is after or equal to a specific hour. Useful for cutoff time checks.

**Parameters:**
- `hour: number` - Hour to check against (0-23)
- `date: Date` (optional) - Date to check. Defaults to now.

**Returns:** `true` if current PST time is after or equal to the specified hour

**Performs Conversion:** **YES** - Uses `getPSTHour()` to get the current hour in PST timezone

**Implementation Details:**
```typescript
export function isAfterOrEqualPSTHour(hour: number, date: Date = getPSTNow()): boolean {
  const currentHour = getPSTHour(date);
  return currentHour >= hour;
}
```

**Current Usage Across Codebase:**
- `src/lib/server/availableDates.ts` - Used in `isPastCutoffTime()` to check if past 1 PM PST cutoff
- Core function for implementing the order cutoff time business rule

**Necessity Given PST Storage:** **HIGH** - This function is actively used for order cutoff validation and is essential for the day-before ordering cutoff logic.

**Recommendation:** **KEEP - ACTIVE USE** - This function is well-designed and essential for cutoff time logic. It's actively used for:
1. Order cutoff validation (checking if past 1 PM PST)
2. Time-based business rules
3. Availability logic in `availableDates.ts`

---

### 15. addPSTDays()

**Signature:** `function addPSTDays(date: Date, days: number): Date`

**Purpose:** Add days to a date in PST timezone.

**Parameters:**
- `date: Date` - The base date
- `days: number` - Number of days to add (can be negative)

**Returns:** New date with days added in PST timezone

**Performs Conversion:** **YES** - Uses UTC millisecond arithmetic to add days, which is timezone-safe

**Implementation Details:**
```typescript
export function addPSTDays(date: Date, days: number): Date {
  const daysToAdd = days * 24 * 60 * 60 * 1000;
  const newTimestamp = date.getTime() + daysToAdd;
  return new Date(newTimestamp);
}
```

**Current Usage Across Codebase:**
- `src/lib/server/availableDates.ts` - Used in `isPastCutoffTime()` to calculate tomorrow's midnight for cutoff logic
- Essential for determining if a target date is "tomorrow" for cutoff purposes

**Necessity Given PST Storage:** **HIGH** - This function is actively used for calculating tomorrow's date in the cutoff logic implementation.

**Recommendation:** **KEEP - ACTIVE USE** - This function is correctly implemented using UTC milliseconds and actively used for cutoff time logic. It's essential for:
1. Calculating tomorrow's date for cutoff checks
2. Date arithmetic in timezone-safe manner
3. Determining if a date is affected by the day-before cutoff

---

### 16. getPSTDayDifference()

**Signature:** `function getPSTDayDifference(date1: Date, date2: Date): number`

**Purpose:** Calculate the difference in days between two dates in PST timezone.

**Parameters:**
- `date1: Date` - First date
- `date2: Date` - Second date

**Returns:** Number of days difference (date2 - date1)

**Performs Conversion:** **YES** - Uses `getPSTMidnight()` to get midnight for both dates in PST timezone before calculating the difference

**Implementation Details:**
```typescript
export function getPSTDayDifference(date1: Date, date2: Date): number {
  const midnight1 = getPSTMidnight(date1);
  const midnight2 = getPSTMidnight(date2);
  const diffMs = midnight2.getTime() - midnight1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
```

**Current Usage Across Codebase:**
- No direct usage found in the codebase

**Necessity Given PST Storage:** **MEDIUM** - This function is correctly implemented and would be useful for date calculations, but it's currently not being used anywhere.

**Recommendation:** **KEEP FOR FUTURE USE** - This function is well-designed and correctly uses `getPSTMidnight()` for timezone-aware day differences. It should be kept for:
1. Date range calculations
2. Day countdown features
3. Date comparison logic

---

### 17. getPSTDateString()

**Signature:** `function getPSTDateString(date: Date = getPSTNow()): string`

**Purpose:** Generate a PST-aware date string in YYYY-MM-DD format. This function replaces the anti-pattern `.toISOString().split('T')[0]` which generates UTC-based date strings instead of PST-based date strings.

**Parameters:**
- `date: Date` (optional) - The date to convert. Defaults to current time in PST.

**Returns:** Date string in format YYYY-MM-DD using Pacific Time timezone

**Performs Conversion:** **YES** - Uses `Intl.DateTimeFormat` with the PST timezone to extract year, month, and day components

**Implementation Details:**
```typescript
export function getPSTDateString(date: Date = getPSTNow()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value || '';
  const month = parts.find((p) => p.type === 'month')?.value || '';
  const day = parts.find((p) => p.type === 'day')?.value || '';

  return `${year}-${month}-${day}`;
}
```

**Current Usage Across Codebase:**
- This is a new function and should replace all instances of `.toISOString().split('T')[0]` throughout the codebase

**Necessity Given PST Storage:** **CRITICAL** - This function is essential for generating PST-aware date strings for:
1. Database queries that filter by date
2. Date comparisons and validations
3. Date storage in YYYY-MM-DD format
4. Replacing the incorrect `.toISOString().split('T')[0]` pattern

**Why It's Needed:**
The pattern `.toISOString().split('T')[0]` is problematic because:
- `toISOString()` always returns UTC time
- When UTC and PST are on different calendar days, this produces the wrong date
- Example: If it's 8 PM PST on January 15 (which is 4 AM UTC on January 16), `toISOString().split('T')[0]` returns "2024-01-16" instead of the correct PST date "2024-01-15"

**Recommendation:** **IMMEDIATE IMPLEMENTATION** - This function should be used to replace all instances of `.toISOString().split('T')[0]` in the codebase. It's essential for:
1. Correct date handling in all API routes
2. Proper date string generation for database operations
3. Ensuring consistent PST-based date representation
4. Preventing off-by-one errors in date calculations

**Usage Examples:**
```typescript
// Get today's date in PST
const today = getPSTDateString();
// Returns: "2024-01-15" (assuming it's Jan 15 in Pacific Time)

// Convert a specific date to PST date string
const utcDate = new Date('2024-01-16T02:00:00Z'); // 6 PM PST on Jan 15
const pstDateString = getPSTDateString(utcDate);
// Returns: "2024-01-15" (date in Pacific Time, not UTC)

// Usage in database queries
const startDate = getPSTDateString(); // Today in PST
const results = await db.read('availableDates', {
  date: { $gte: startDate }
});
```

---

## Usage Patterns Summary

### Heavily Used Functions
1. **PST_TIMEZONE** - Used across 6 files for timezone-aware formatting
2. **getPSTWeekday()** - Used in 2 files for extracting day names from dates (but has a bug)
3. **isInPSTPast()** - Used in 2 files for date filtering
4. **isPSTToday()** - Used in 3 files for date comparison and UI highlighting
5. **getPSTMidnight()** - Used internally by multiple functions
6. **getPSTNow()** - Used in 3 files for getting current time

### Moderately Used Functions
7. **formatPSTDate()** - Imported in 3 files but the imports are unused (should clean up)
8. **createPSTDate()** - Used in 1 file but has a timezone bug
9. **getPSTWeekdayNumber()** - Used in deprecated code only

### New Function (Ready for Implementation)
17. **getPSTDateString()** - NEW function to replace `.toISOString().split('T')[0]` pattern
    - Critical for correct PST date string generation
    - Should replace all instances of the UTC-based anti-pattern
    - Essential for database queries and date comparisons

### Unused Functions
11. **getPSTTimeComponents()** - Not used anywhere (but useful for countdowns)
12. **isBeforePSTHour()** - Not used anywhere (but useful for cutoff checks)
15. **getPSTDayDifference()** - Not used anywhere (but correctly implemented)
16. **toPSTDate()** - Only used internally by `getPSTNow()`

### Functions Now Active for Cutoff Logic
4. **getPSTHour()** - ✅ NOW IN USE: Used by `isAfterOrEqualPSTHour()` for cutoff time checks
8. **getPSTMidnight()** - ✅ NOW IN USE: Used in `isPastCutoffTime()` for date boundary calculations
14. **isAfterOrEqualPSTHour()** - ✅ NOW IN USE: Core function for 1 PM PST cutoff checks in `availableDates.ts`
15. **addPSTDays()** - ✅ NOW IN USE: Used to calculate tomorrow's date for cutoff logic

---

## Critical Bugs Found

### 1. getPSTWeekday() Missing Timezone
**Severity:** HIGH
**Issue:** The function does not specify PST timezone, so it uses system timezone instead.
**Impact:** May return wrong weekday for dates near midnight if system is not in PST.
**Fix:** Add `timeZone: PST_TIMEZONE` to the `Intl.DateTimeFormat` options.

### 2. getPSTWeekdayNumber() Wrong Timezone
**Severity:** HIGH
**Issue:** Uses `date.getDay()` which returns weekday in system timezone, not PST.
**Impact:** May return wrong weekday number for dates near midnight if system is not in PST.
**Fix:** Either document the limitation or use timezone-aware calculation.

### 3. createPSTDate() Uses Local Timezone
**Severity:** MEDIUM
**Issue:** The `Date` constructor interprets parameters in system timezone, not PST.
**Impact:** Creates wrong time if server is not in PST timezone.
**Fix:** Create date in UTC or use timezone-aware parsing.

### 4. ~~addPSTDays() Uses Local Timezone~~ ✅ FIXED
**Severity:** MEDIUM
**Issue:** Uses `setDate()` which operates in system timezone, not PST.
**Impact:** May produce unexpected results near DST boundaries if system is not in PST.
**Fix:** Implement timezone-aware day addition.
**Resolution:** Function has been reimplemented using UTC millisecond arithmetic, making it timezone-safe. The new implementation:
```typescript
export function addPSTDays(date: Date, days: number): Date {
  const daysToAdd = days * 24 * 60 * 60 * 1000;
  const newTimestamp = date.getTime() + daysToAdd;
  return new Date(newTimestamp);
}
```
This approach adds exact 24-hour periods in UTC, which correctly handles day arithmetic across DST boundaries and system timezones.

### 5. toPSTDate() Misleading Name
**Severity:** LOW
**Issue:** Function name suggests conversion, but it just returns a copy of the date.
**Impact:** Misleading API, developers may think it converts to PST.
**Fix:** Either remove it or make it actually perform a conversion.

---

## Recommendations

### Must Fix (Critical Bugs)
1. Fix `getPSTWeekday()` to use PST timezone
2. Fix `getPSTWeekdayNumber()` to use PST timezone or deprecate
3. Fix `createPSTDate()` to properly create PST dates

### Should Fix (Important Issues)
4. ~~Fix `addPSTDays()` to handle timezone correctly~~ ✅ FIXED
5. Clean up unused imports of `formatPSTDate()`
6. Add better documentation to `toPSTDate()` explaining it doesn't convert

### Nice to Have
7. ~~Mark `getPSTHour()` and `isAfterOrEqualPSTHour()` as ready for cutoff time implementation~~ ✅ COMPLETED
8. ~~Consider implementing actual cutoff time logic using these functions~~ ✅ COMPLETED
9. Add unit tests for all timezone functions to catch timezone bugs

### Keep As-Is
- `PST_TIMEZONE` constant
- `getPSTNow()` (but improve documentation)
- `isInPSTPast()` (working correctly)
- `isPSTToday()` (working correctly)
- `getPSTMidnight()` (fundamental building block)
- `formatPSTDate()` (working correctly, just clean up unused imports)
- `getPSTDayDifference()` (correctly implemented)

---

## Conclusion

The timezone utilities module provides a comprehensive set of functions for handling Pacific Time dates in the application. However, there are several critical bugs related to timezone handling that need to be fixed:

1. **Functions that don't actually use PST timezone** (even though their names suggest they do):
   - `getPSTWeekday()`
   - `getPSTWeekdayNumber()`
   - `createPSTDate()`
   - `addPSTDays()`

2. **Functions that work correctly but have misleading documentation**:
   - `toPSTDate()` (doesn't convert, just copies)
   - `getPSTNow()` (returns same as `new Date()`)

3. **Well-designed functions that are correctly implemented**:
   - `isInPSTPast()`
   - `isPSTToday()`
   - `getPSTMidnight()`
   - `getPSTDayDifference()`
   - `formatPSTDate()`

4. **Useful functions not currently being used**:
   - `getPSTHour()`
   - `isAfterOrEqualPSTHour()` (essential for 1 PM cutoff logic)
   - `getPSTTimeComponents()`

**Overall Assessment:** The module has good intentions and several well-implemented functions, but it needs critical bug fixes to ensure all functions properly handle PST timezone, especially on servers not running in Pacific Time.
