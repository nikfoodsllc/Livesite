# Deprecated Functions Reference

## Table of Contents
- [Server-Side Deprecated Functions](#server-side-deprecated-functions)
- [Client-Side Deprecated Functions](#client-side-deprecated-functions)
- [TypeScript Type Changes](#typescript-type-changes)
- [Migration Examples](#migration-examples)

---

**⚠️ IMPORTANT - Day Name Format Change:**
- **Old format**: Day names in lowercase (e.g., "monday", "tuesday", "wednesday")
- **New format**: Day names in Title Case (e.g., "Monday", "Tuesday", "Wednesday")
- This affects all functions that return or accept day names
- The new format aligns with JavaScript's `toLocaleDateString()` formatting
- All examples below reflect the new Title Case format

---

## Server-Side Deprecated Functions

**File Location:** `src/lib/server/dayAvailability.ts`

⚠️ **IMPORTANT:** This entire file is deprecated. All functions have been migrated to `src/lib/server/availableDates.ts`.

### Complete Function Migration Map

| Old Function (Deprecated) | New Function (Use Instead) | File |
|---------------------------|---------------------------|------|
| `getEnabledDaysFromDatabase()` | `getAvailableDatesFromDatabase()` | `availableDates.ts` |
| `getEnabledDaysFromDB()` | `getAvailableDatesFromDatabase()` | `availableDates.ts` |
| `generateAvailableDays()` | `generateAvailableDateOptions()` | `availableDates.ts` |
| `getNextAvailableDay()` | `getNextAvailableDate()` | `availableDates.ts` |
| `getDayOption(dayName)` | (use date-based queries) | `availableDates.ts` |
| `isDayDisabled(date)` | `isDateDisabled(date)` | `availableDates.ts` |
| `isTomorrow(date)` | (use PST timezone utilities directly) | `timezone.ts` |

---

### Individual Function Details

#### `getEnabledDaysFromDatabase(includeDisabled?: boolean)`

**Status:** 🚫 DEPRECATED

**Replacement:** `getAvailableDatesFromDatabase(startDate?, endDate?)`

**Why Deprecated:**
- Returns day-of-week patterns instead of specific dates
- Part of old day-based system
- Limited flexibility for date-specific operations

**Old Signature:**
```typescript
async function getEnabledDaysFromDatabase(
  includeDisabled: boolean = false
): Promise<AvailableDay[]>
```

**New Signature:**
```typescript
async function getAvailableDatesFromDatabase(
  startDate?: string,  // YYYY-MM-DD format
  endDate?: string     // YYYY-MM-DD format
): Promise<AvailableDateDocument[]>
```

**Migration Example:**
```typescript
// ❌ OLD (Deprecated)
const enabledDays = await getEnabledDaysFromDatabase(false);

// ✅ NEW (Recommended)
const today = new Date().toISOString().split('T')[0];
const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
  .toISOString().split('T')[0];
const availableDates = await getAvailableDatesFromDatabase(today, endDate);
```

---

#### `getEnabledDaysFromDB()`

**Status:** 🚫 DEPRECATED

**Replacement:** `getAvailableDatesFromDatabase()`

**Why Deprecated:**
- Returns array of day names instead of date records
- Less informative than new function
- Part of old day-based system

**Old Signature:**
```typescript
async function getEnabledDaysFromDB(): Promise<string[]>
// Returns: ['monday', 'tuesday', 'wednesday'] - lowercase format
```

**⚠️ Day Name Format Note:**
- Old system returned lowercase day names (e.g., "monday")
- New system uses Title Case day names (e.g., "Monday") extracted from formatted dates
- This ensures consistency with JavaScript's `toLocaleDateString()` formatting

**New Signature:**
```typescript
async function getAvailableDatesFromDatabase(
  startDate?: string,
  endDate?: string
): Promise<AvailableDateDocument[]>
// Returns: [{ date: '2025-01-20', flatCategoryEnabled: true, ... }]
```

**Migration Example:**
```typescript
// ❌ OLD (Deprecated)
const dayNames = await getEnabledDaysFromDB();
// ['monday', 'tuesday', 'wednesday']

// ✅ NEW (Recommended)
const dates = await getAvailableDatesFromDatabase();
const enabledDates = dates.filter(d => d.flatCategoryEnabled);
// [{ date: '2025-01-20', flatCategoryEnabled: true, ... }, ...]
```

---

#### `generateAvailableDays(includeDisabled?: boolean)`

**Status:** 🚫 DEPRECATED

**Replacement:** `generateAvailableDateOptions(documents, includeDisabled?)`

**Why Deprecated:**
- Generated day-of-week options instead of date options
- Required manual date calculations
- Less efficient than new system

**Old Signature:**
```typescript
async function generateAvailableDays(
  includeDisabled: boolean = false
): Promise<DayOption[]>
```

**New Signature:**
```typescript
function generateAvailableDateOptions(
  documents: AvailableDateDocument[],
  includeDisabled: boolean = false
): DateOption[]
```

**Key Differences:**
- Old: Async function that fetched and processed data
- New: Sync function that processes already-fetched documents
- Old: Used weekly patterns
- New: Uses specific calendar dates

**Migration Example:**
```typescript
// ❌ OLD (Deprecated)
const dayOptions = await generateAvailableDays(false);

// ✅ NEW (Recommended)
const documents = await getAvailableDatesFromDatabase();
const dateOptions = generateAvailableDateOptions(documents, false);
```

---

#### `getNextAvailableDay()`

**Status:** 🚫 DEPRECATED

**Replacement:** `getNextAvailableDate()`

**Why Deprecated:**
- Returned day option instead of date option
- Less specific than new function
- Part of old day-based system

**Old Signature:**
```typescript
async function getNextAvailableDay(): Promise<DayOption | null>
```

**New Signature:**
```typescript
async function getNextAvailableDate(): Promise<DateOption | null>
```

**Migration Example:**
```typescript
// ❌ OLD (Deprecated)
const nextDay = await getNextAvailableDay();
if (nextDay) {
  console.log(`Next available: ${nextDay.label} (${nextDay.date})`);
}

// ✅ NEW (Recommended)
const nextDate = await getNextAvailableDate();
if (nextDate) {
  console.log(`Next available: ${nextDate.formattedDate}`);
}
```

---

#### `getDayOption(dayName: string)`

**Status:** 🚫 DEPRECATED

**Replacement:** Use date-based queries with `getAvailableDatesFromDatabase()`

**Why Deprecated:**
- Query by day name doesn't make sense in date-based system
- New system uses specific calendar dates
- Function doesn't translate to new paradigm

**Old Signature:**
```typescript
async function getDayOption(dayName: string): Promise<DayOption | null>
```

**New Approach:**
```typescript
// Query for specific date range and filter
const dates = await getAvailableDatesFromDatabase(startDate, endDate);
const targetDate = dates.find(d => d.date === '2025-01-20');
```

**Migration Example:**
```typescript
// ❌ OLD (Deprecated)
const tuesday = await getDayOption('tuesday');

// ✅ NEW (Recommended)
// Option 1: Get specific date
const dates = await getAvailableDatesFromDatabase();
const specificDate = dates.find(d => d.date === '2025-01-21');

// Option 2: Get all Tuesdays in range
const startDate = '2025-01-01';
const endDate = '2025-01-31';
const allDates = await getAvailableDatesFromDatabase(startDate, endDate);
const tuesdays = allDates.filter(d => {
  const dayOfWeek = new Date(d.date).getDay();
  return dayOfWeek === 2; // 2 = Tuesday
});
```

---

#### `isDayDisabled(date: Date)`

**Status:** 🚫 DEPRECATED

**Replacement:** `isDateDisabled(date: string \| Date)`

**Why Deprecated:**
- Old naming convention
- Part of deprecated file
- New function has better type safety

**Old Signature:**
```typescript
function isDayDisabled(date: Date): boolean
```

**New Signature:**
```typescript
function isDateDisabled(date: string | Date): boolean
```

**Key Improvements:**
- Accepts both string dates and Date objects
- Better type safety
- Clearer function name

**Migration Example:**
```typescript
// ❌ OLD (Deprecated)
if (isDayDisabled(someDate)) {
  // handle disabled
}

// ✅ NEW (Recommended)
if (isDateDisabled('2025-01-20')) {
  // handle disabled
}

// Also works with Date objects
if (isDateDisabled(new Date())) {
  // handle disabled
}
```

---

#### `isTomorrow(date: Date, now?: Date)`

**Status:** 🚫 DEPRECATED

**Replacement:** Use PST timezone utilities directly from `@/lib/timezone.ts`

**Why Deprecated:**
- Utility function with limited use case
- Better to use timezone utilities directly
- More flexible to not use wrapper

**Old Signature:**
```typescript
function isTomorrow(date: Date, now: Date = getPSTNow()): boolean
```

**New Approach:**
```typescript
import { getPSTMidnight, getPSTNow } from '@/lib/timezone';

function checkIfIsTomorrow(date: Date): boolean {
  const startOfToday = getPSTMidnight(getPSTNow());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const targetDate = getPSTMidnight(date);
  return targetDate.getTime() === startOfTomorrow.getTime();
}
```

**Migration Example:**
```typescript
// ❌ OLD (Deprecated)
if (isTomorrow(someDate)) {
  // handle tomorrow
}

// ✅ NEW (Recommended)
import { getPSTMidnight, getPSTNow } from '@/lib/timezone';

const today = getPSTNow();
const tomorrow = new Date(getPSTMidnight(today));
tomorrow.setDate(tomorrow.getDate() + 1);

if (getPSTMidnight(someDate).getTime() === tomorrow.getTime()) {
  // handle tomorrow
}
```

---

## Client-Side Deprecated Functions

**File Location:** `src/lib/dayAvailabilityClient.ts`

### Function Migration Map

| Old Function (Deprecated) | New Function (Use Instead) | Notes |
|---------------------------|---------------------------|-------|
| `getEnabledDaysFromAPI()` | `generateAvailableDatesFromAPI()` | Returns richer date objects |
| `generateAvailableDaysFromAPI()` | `generateAvailableDatesFromAPI()` | Same function name, different implementation |
| `getDayOptionFromAPI(dayName)` | `generateAvailableDatesFromAPI().find()` | Query and filter |

---

### `getEnabledDaysFromAPI()`

**Status:** 🚫 DEPRECATED

**Replacement:** `generateAvailableDatesFromAPI()`

**Why Deprecated:**
- Returns simple string array instead of rich date objects
- Less informative than new function
- Doesn't provide date-specific information

**Old Signature:**
```typescript
async function getEnabledDaysFromAPI(): Promise<string[]>
// Returns: ['monday', 'tuesday', 'wednesday']
```

**New Signature:**
```typescript
async function generateAvailableDatesFromAPI(
  includeDisabled: boolean = false,
  startDate?: string,
  endDate?: string
): Promise<DayOption[]>
// Returns: [{ id, date, formattedDate, isToday, ... }]
```

**Migration Example:**
```typescript
// ❌ OLD (Deprecated)
const enabledDays = await getEnabledDaysFromAPI();
enabledDays.forEach(day => {
  console.log(`Enabled: ${day}`);
});

// ✅ NEW (Recommended)
const dates = await generateAvailableDatesFromAPI();
dates.forEach(dateOption => {
  console.log(`Enabled: ${dateOption.date} (${dateOption.formattedDate})`);
});

// If you need just enabled dates (backward compatible)
const enabledDates = dates.filter(d => d.enabled);
const dayNames = enabledDates.map(d => d.day);
```

---

### `generateAvailableDaysFromAPI(includeDisabled?)`

**Status:** 🚫 DEPRECATED

**Replacement:** `generateAvailableDatesFromAPI(includeDisabled?, startDate?, endDate?)`

**Why Deprecated:**
- Old implementation used day-of-week system
- New implementation provides actual calendar dates
- Better date range filtering

**Old Signature:**
```typescript
async function generateAvailableDaysFromAPI(
  includeDisabled: boolean = false
): Promise<DayOption[]>
```

**New Signature:**
```typescript
async function generateAvailableDatesFromAPI(
  includeDisabled: boolean = false,
  startDate?: string,
  endDate?: string
): Promise<DayOption[]>
```

**Key Improvements:**
- Adds `startDate` and `endDate` parameters for date range filtering
- Returns actual calendar dates instead of recurring patterns
- Better for future planning and holiday management

**Migration Example:**
```typescript
// ❌ OLD (Deprecated)
const days = await generateAvailableDaysFromAPI(false);

// ✅ NEW (Recommended)
// Same functionality
const dates = await generateAvailableDatesFromAPI(false);

// NEW: With date range filtering
const datesInRange = await generateAvailableDatesFromAPI(
  false,
  '2025-01-01',
  '2025-01-31'
);
```

---

### `getDayOptionFromAPI(dayName: string)`

**Status:** 🚫 DEPRECATED

**Replacement:** `generateAvailableDatesFromAPI()` with `.find()`

**Why Deprecated:**
- Single-day queries don't make sense in date-based system
- Better to fetch all dates and filter as needed
- Reduces API calls

**Old Signature:**
```typescript
async function getDayOptionFromAPI(dayName: string): Promise<DayOption | null>
```

**New Approach:**
```typescript
const dates = await generateAvailableDatesFromAPI();
const specificDate = dates.find(d => d.date === '2025-01-20');
```

**Migration Example:**
```typescript
// ❌ OLD (Deprecated)
const tuesday = await getDayOptionFromAPI('tuesday');

// ✅ NEW (Recommended)
// Option 1: Get specific date
const dates = await generateAvailableDatesFromAPI();
const specificDate = dates.find(d => d.date === '2025-01-21');

// Option 2: Get all dates for a specific day of week
const tuesdays = dates.filter(d => {
  const date = new Date(d.date);
  return date.getDay() === 2; // 2 = Tuesday
});
```

---

## TypeScript Type Changes

### Deprecated Types

#### `DayType`

**Status:** ⚠️ LEGACY (Will be removed)

**Definition:**
```typescript
/**
 * Day Type - Delivery days
 * @deprecated Kept for backward compatibility with existing cart data.
 * New code should use DateType for date operations.
 * This field will be removed once all cart data is migrated to use 'date' field.
 */
export type DayType = string;
```

**Migration Path:**
- Use `DateType` for new code
- `DayType` still exists for backward compatibility
- Will be removed in future release

---

### New Types

#### `DateType`

**Status:** ✅ ACTIVE (Use this)

**Definition:**
```typescript
/**
 * Date Type - ISO date format string (e.g., "2024-01-15")
 * Used for date-based cart operations and storage
 */
export type DateType = string;
```

**Usage:**
```typescript
// ✅ NEW (Recommended)
const deliveryDate: DateType = "2025-01-20";
```

---

## Migration Examples

### Example 1: Fetching Available Delivery Dates

**Before (Day-Based):**
```typescript
import { generateAvailableDaysFromAPI } from '@/lib/dayAvailabilityClient';

const days = await generateAvailableDaysFromAPI(false);
days.forEach(day => {
  console.log(`${day.label}: ${day.formattedDate}`);
});
```

**After (Date-Based):**
```typescript
import { generateAvailableDatesFromAPI } from '@/lib/dayAvailabilityClient';

const dates = await generateAvailableDatesFromAPI(false);
dates.forEach(date => {
  console.log(`${date.formattedDate}`);
});
```

---

### Example 2: Checking if a Date is Available

**Before (Day-Based):**
```typescript
import { isDayDisabled } from '@/lib/server/dayAvailability';

const dateToCheck = new Date('2025-01-20');
if (isDayDisabled(dateToCheck)) {
  console.log('This day is disabled');
}
```

**After (Date-Based):**
```typescript
import { isDateDisabled } from '@/lib/server/availableDates';

const dateToCheck = '2025-01-20';
if (isDateDisabled(dateToCheck)) {
  console.log('This date is disabled');
}
```

---

### Example 3: Getting Next Delivery Date

**Before (Day-Based):**
```typescript
import { getNextAvailableDay } from '@/lib/server/dayAvailability';

const nextDay = await getNextAvailableDay();
console.log(`Next delivery: ${nextDay.label} (${nextDay.date})`);
```

**After (Date-Based):**
```typescript
import { getNextAvailableDate } from '@/lib/server/availableDates';

const nextDate = await getNextAvailableDate();
console.log(`Next delivery: ${nextDate.formattedDate}`);
```

---

### Example 4: Cart Operations with Dates

**Before (Day-Based):**
```typescript
import { addItem } from '@/lib/localStorageCart';

await addItem('monday', foodItem, quantity, customizations);
```

**After (Date-Based):**
```typescript
import { addItem } from '@/lib/localStorageCart';

await addItem('monday', '2025-01-20', foodItem, quantity, customizations);
// Note: day parameter kept for backward compatibility
// New code should rely on date parameter
```

---

## Summary Checklist

Use this checklist to ensure you've migrated all deprecated function calls:

- [ ] Replace `getEnabledDaysFromDatabase()` → `getAvailableDatesFromDatabase()`
- [ ] Replace `getEnabledDaysFromDB()` → `getAvailableDatesFromDatabase()`
- [ ] Replace `generateAvailableDays()` → `generateAvailableDateOptions()`
- [ ] Replace `getNextAvailableDay()` → `getNextAvailableDate()`
- [ ] Replace `getDayOption()` → date-based queries
- [ ] Replace `isDayDisabled()` → `isDateDisabled()`
- [ ] Replace `isTomorrow()` → PST timezone utilities
- [ ] Replace `getEnabledDaysFromAPI()` → `generateAvailableDatesFromAPI()`
- [ ] Replace `generateAvailableDaysFromAPI()` → `generateAvailableDatesFromAPI()`
- [ ] Replace `getDayOptionFromAPI()` → `generateAvailableDatesFromAPI().find()`
- [ ] Update type annotations from `DayType` to `DateType` where appropriate
- [ ] Update cart operations to use `date` field instead of `day` field
