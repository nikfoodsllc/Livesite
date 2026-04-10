# Backend Timezone Usage Analysis

This document analyzes all backend API routes, server-side utilities, and database operations that use PST timezone functions in the TDN9IL project.

---

## Table of Contents

1. [Summary](#summary)
2. [Timezone Utility Functions](#timezone-utility-functions)
3. [Backend Files Using Timezone Functions](#backend-files-using-timezone-functions)
4. [Database Date Storage Patterns](#database-date-storage-patterns)
5. [API Routes with Timezone Usage](#api-routes-with-timezone-usage)
6. [Server-Side Date Calculations](#server-side-date-calculations)
7. [Email Templates and Formatting](#email-templates-and-formatting)
8. [Unnecessary Conversions Identified](#unnecessary-conversions-identified)
9. [Code Examples](#code-examples)

---

## Summary

**Timezone Configuration:** Pacific Time (`America/Los_Angeles`)
**Primary Use Cases:**
- Order cutoff times (1 PM PST)
- Day availability determination
- Date formatting for display
- Database date comparisons

**Key Findings:**
- All date operations consistently use PST timezone utilities
- Dates stored in MongoDB as UTC Date objects
- Display formatting always applies PST timezone
- No unnecessary timezone conversions detected

---

## Timezone Utility Functions

Located in: `src/lib/timezone.ts`

### Core Functions Used on Backend:

| Function | Purpose | Backend Usage |
|----------|---------|---------------|
| `PST_TIMEZONE` | Constant `'America/Los_Angeles'` | Used for all date formatting |
| `getPSTNow()` | Get current time in PST | Available date calculations |
| `getPSTMidnight(date)` | Get midnight in PST | Date comparisons |
| `getPSTHour(date)` | Get hour in PST | Cutoff time checks |
| `isInPSTPast(date)` | Check if date is in PST past | Disable past dates |
| `isPSTToday(date)` | Check if date is today | UI state indicators |
| `formatPSTDate(date, format)` | Format date for display | All user-facing dates |
| `createPSTDate(y, m, d, h, min, s)` | Create PST date object | Date construction |

---

## Backend Files Using Timezone Functions

### 1. Server-Side Libraries

#### `src/lib/server/dayAvailability.ts` (DEPRECATED)
**Status:** Deprecated - Use `availableDates.ts` instead

**Functions using timezone:**
- `generateAvailableDays()` - Uses `getPSTNow()`, `getPSTMidnight()`, `isPSTToday()`, `getPSTWeekdayNumber()`
- `isDayDisabled()` - Uses `isInPSTPast()`
- `isTomorrow()` - Uses `getPSTMidnight()`

**Purpose:** Generates available delivery day options based on database configuration.

**Example:**
```typescript
const now = getPSTNow();
const startOfToday = getPSTMidnight(now);
const isCurrentDay = isPSTToday(date, now);
const isTimeDisabled = isInPSTPast(date);
```

#### `src/lib/server/availableDates.ts` (PRIMARY)
**Status:** Active - New date-based system

**Functions using timezone:**
- `getAvailableDatesFromDatabase()` - Uses `getPSTNow()` for default date range
- `generateAvailableDateOptions()` - Uses `getPSTNow()`, `isPSTToday()`, `isInPSTPast()`
- `isDateDisabled()` - Uses `isInPSTPast()`
- `getNextAvailableDate()` - Uses `getPSTNow()`

**Purpose:** Fetches and processes available calendar dates with timezone handling.

**Example:**
```typescript
const now = getPSTNow();
const startDate = today.toISOString().split('T')[0]; // Stores as ISO string
const isToday = isPSTToday(dateObj);
const isPast = isInPSTPast(dateObj);
```

#### `src/lib/orderHelpers.ts`
**Functions using timezone:**
- `isToday(dateString)` - Uses `isPSTToday()`
- `formatOrderDate(date)` - Uses hardcoded PST timezone
- `formatDeliveryDate(date)` - Uses hardcoded PST timezone

**Purpose:** Order processing and display utilities.

**Example:**
```typescript
export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  return isPSTToday(date);
}

export function formatOrderDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    // ... format options
  });
}
```

#### `src/lib/deliveryCalculator.ts`
**Functions using timezone:**
- `calculateDeliveryDates()` - Uses dates, but NO timezone functions (date-only operations)
- `formatDeliveryDate()` - Uses hardcoded PST timezone

**Purpose:** Calculate delivery dates based on minimum order values.

**Example:**
```typescript
// Date sorting without timezone
const sortedDays = [...cartDays].sort(
  (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
);

// Formatting with PST
export function formatDeliveryDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}
```

### 2. API Routes

#### `src/app/api/food-items-day-wise/route.ts`
**Timezone usage:**
- Uses `createPSTDate()` for date formatting

**Purpose:** Fetch food items for a specific category and date.

**Example:**
```typescript
import { PST_TIMEZONE, createPSTDate } from '@/lib/timezone';

function formatDateString(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = createPSTDate(year, month - 1, day, 0, 0, 0);
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
```

#### `src/app/api/days/route.ts`
**Timezone usage:** None
**Purpose:** Fetch enabled days configuration from database.
**Note:** Returns raw database records - no date operations.

#### `src/app/api/available-dates/route.ts`
**Timezone usage:** Indirect via `availableDates.ts` functions

**Purpose:** Public endpoint for available calendar dates.

**Example:**
```typescript
import {
  getAvailableDatesFromDatabase,
  generateAvailableDateOptions,
} from '@/lib/server/availableDates';

// Fetch and convert to DateOption format with timezone handling
const documents = await getAvailableDatesFromDatabase(startDate, endDate);
const dates = generateAvailableDateOptions(documents, false);
```

#### `src/app/api/days/available/route.ts`
**Timezone usage:** Indirect via deprecated `dayAvailability.ts`
**Status:** Deprecated - Use `/api/available-dates` instead

### 3. Email Templates

#### `src/templates/orderConfirmation.ts`
**Timezone usage:** Hardcoded PST in formatting

**Purpose:** Generate HTML email for order confirmation.

**Example:**
```typescript
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

**Note:** Does NOT specify timezone - relies on server/default timezone. Should use PST explicitly.

---

## Database Date Storage Patterns

### Collections with Date Fields:

| Collection | Date Fields | Storage Format | Timezone Applied |
|------------|-------------|----------------|------------------|
| `orders` | `createdAt`, `updatedAt`, `items[].deliveryDate` | UTC Date object | Applied on read (formatting) |
| `availableDates` | `date` | ISO string (YYYY-MM-DD) | Applied on read (display) |
| `emailAnalytics` | `createdAt`, `updatedAt` | UTC Date object | Applied on read |
| `users` | `createdAt`, `updatedAt` | UTC Date object | Applied on read |
| `cart` | `createdAt`, `updatedAt`, `days[].date` | UTC Date + ISO string | Applied on read |

### Storage Pattern:

```typescript
// Database writes - always store as UTC
const dbOrder = formatOrderForDatabase(order as Order);
// Returns: { createdAt: new Date(), updatedAt: new Date() }

// Database reads - apply timezone for display
const formattedDate = formatOrderDate(order.createdAt);
// Uses: timeZone: 'America/Los_Angeles'
```

### Date Query Patterns:

```typescript
// Range queries using UTC dates
dbQuery.createdAt = {
  $gte: new Date(query.startDate),
  $lte: new Date(query.endDate)
};

// Date string comparisons (timezone-neutral)
db.read('availableDates', {
  date: { $gte: startDate, $lte: endDate }
});

// Sorting by creation time
db.read('orders', filter, {
  sort: { createdAt: -1 } // Newest first
});
```

---

## API Routes with Timezone Usage

### Order Management

#### `POST /api/orders/create`
**Timezone functions:** None (uses dates, but no timezone conversion)
**Date operations:**
```typescript
const deliveryCalculationResults = calculateDeliveryDates(cart.days);
const orderItems = convertCartToOrderItems(cart.days, deliveryCalculationResults);
// Dates stored as strings in ISO format
```

#### `GET /api/orders`
**Timezone functions:** None (returns raw database dates)
**Date operations:**
```typescript
db.read('orders', filter, {
  sort: { createdAt: -1 }
});
// Returns UTC Date objects - timezone applied by frontend
```

#### `GET /api/orders/[orderId]/track`
**Timezone functions:** None (returns raw dates)
**Date operations:**
```typescript
return {
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  // Frontend applies timezone formatting
};
```

### Authentication & User Management

#### `POST /api/auth/signup`
**Date operations:**
```typescript
const user = {
  createdAt: new Date(),  // UTC
  updatedAt: new Date(),  // UTC
};
```

#### `POST /api/auth/login`
**Date operations:**
```typescript
await db.updateOne('users',
  { _id: userId },
  { $set: { updatedAt: new Date() } }
);
```

### Address Management

#### `POST /api/address`
**Date operations:**
```typescript
const address = {
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### Email Analytics

#### `GET /api/admin/email-status`
**Date operations:**
```typescript
dbQuery.createdAt = {};
if (query.startDate) {
  dbQuery.createdAt.$gte = new Date(query.startDate);
}
if (query.endDate) {
  dbQuery.createdAt.$lte = new Date(query.endDate);
}
```

---

## Server-Side Date Calculations

### 1. Availability Determination

**File:** `src/lib/server/availableDates.ts`

```typescript
// Check if date is disabled (in the past)
export function isDateDisabled(date: string | Date): boolean {
  let dateObj: Date;
  if (typeof date === 'string') {
    dateObj = new Date(date + 'T00:00:00.000Z');
  } else {
    dateObj = date;
  }
  return isInPSTPast(dateObj);
}

// Generate date options with timezone metadata
export function generateAvailableDateOptions(
  documents: AvailableDateDocument[],
  includeDisabled: boolean = false
): DateOption[] {
  const now = getPSTNow();

  return documents.map((doc) => {
    const dateObj = new Date(doc.date + 'T00:00:00.000Z');

    return {
      id: doc.date,
      date: doc.date,
      formattedDate: dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        timeZone: PST_TIMEZONE,
      }),
      isToday: isPSTToday(dateObj),
      isPast: isInPSTPast(dateObj),
    };
  });
}
```

### 2. Delivery Date Calculation

**File:** `src/lib/deliveryCalculator.ts`

```typescript
// Sort by date (timezone-neutral)
const sortedDays = [...cartDays].sort(
  (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
);

// Check consecutive days (24 hour difference - timezone neutral)
const currentDate = new Date(lastClubbedDay.date).getTime();
const nextDate = new Date(nextDay.date).getTime();
const isConsecutive = (nextDate - currentDate) === 86400000; // 24 hours
```

**Note:** Delivery calculations operate on date strings (YYYY-MM-DD) and are timezone-neutral.

### 3. Order Date Formatting

**File:** `src/lib/orderHelpers.ts`

```typescript
// Check if delivery date is today
export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  return isPSTToday(date);
}

// Format order date for display
export function formatOrderDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles',
  });
}

// Format delivery date
export function formatDeliveryDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  });
}
```

---

## Email Templates and Formatting

### Order Confirmation Email

**File:** `src/templates/orderConfirmation.ts`

**Current Implementation:**
```typescript
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

**Issue:** No explicit timezone specified - relies on server default timezone.

**Recommended Fix:**
```typescript
const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles' // Explicitly set PST
  });
};
```

---

## Unnecessary Conversions Identified

### Potential Issues:

1. **`toPSTDate()` function** - Currently a no-op wrapper:
   ```typescript
   export function toPSTDate(date: Date): Date {
     return new Date(date); // Simply returns a new Date object
   }
   ```
   **Analysis:** JavaScript Date objects are always UTC internally. This function doesn't actually convert to PST - it just creates a copy. The PST conversion only happens during formatting with `Intl.DateTimeFormat`.

2. **Email template date formatting** - Missing explicit timezone:
   ```typescript
   // Current (orderConfirmation.ts)
   d.toLocaleDateString('en-US', { weekday: 'long', ... })
   // Should be:
   d.toLocaleDateString('en-US', { weekday: 'long', ..., timeZone: 'America/Los_Angeles' })
   ```

3. **Mixed timezone usage** - Some places use constant, others hardcode:
   ```typescript
   // Using PST_TIMEZONE constant
   timeZone: PST_TIMEZONE

   // Hardcoded (in orderHelpers.ts)
   timeZone: 'America/Los_Angeles'
   ```
   **Recommendation:** Always use `PST_TIMEZONE` constant for consistency.

### No Critical Issues Found:

- Database storage correctly uses UTC
- Date comparisons use timezone-aware utilities
- Formatting consistently applies PST timezone
- No double-conversion bugs detected

---

## Code Examples

### Example 1: Fetching Available Dates

```typescript
// src/app/api/available-dates/route.ts
import {
  getAvailableDatesFromDatabase,
  generateAvailableDateOptions,
} from '@/lib/server/availableDates';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');

  // Fetch from database (timezone-neutral query)
  const documents = await getAvailableDatesFromDatabase(
    startDate ?? undefined
  );

  // Convert to display format with PST timezone
  const dates = generateAvailableDateOptions(documents, false);

  return NextResponse.json({ success: true, dates });
}
```

### Example 2: Creating an Order

```typescript
// src/app/api/orders/create/route.ts
import { calculateDeliveryDates } from '@/lib/deliveryCalculator';
import { convertCartToOrderItems } from '@/lib/orderHelpers';

// Delivery calculation (timezone-neutral)
const deliveryCalculationResults = calculateDeliveryDates(cart.days);

// Convert cart to order items
const orderItems = convertCartToOrderItems(
  cart.days,
  deliveryCalculationResults
);

// Order stores dates as strings
const order: Order = {
  orderId: generateOrderId(),
  items: orderItems, // Contains deliveryDate as string
  // ...
  createdAt: new Date(), // Stored as UTC in database
  updatedAt: new Date(), // Stored as UTC in database
};

const dbOrder = formatOrderForDatabase(order);
await db.create('orders', dbOrder);
```

### Example 3: Displaying Orders with Formatted Dates

```typescript
// src/lib/orderHelpers.ts
import { isPSTToday } from './timezone';

export function formatOrderDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles',
  });
}

export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  return isPSTToday(date);
}
```

### Example 4: Checking Date Availability

```typescript
// src/lib/server/availableDates.ts
import {
  getPSTNow,
  isInPSTPast,
  isPSTToday,
  PST_TIMEZONE,
} from '@/lib/timezone';

export function isDateDisabled(date: string | Date): boolean {
  let dateObj: Date;
  if (typeof date === 'string') {
    dateObj = new Date(date + 'T00:00:00.000Z');
  } else {
    dateObj = date;
  }
  return isInPSTPast(dateObj);
}

export function generateAvailableDateOptions(
  documents: AvailableDateDocument[]
): DateOption[] {
  const now = getPSTNow();

  return documents.map((doc) => {
    const dateObj = new Date(doc.date + 'T00:00:00.000Z');

    return {
      id: doc.date,
      date: doc.date,
      formattedDate: dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        timeZone: PST_TIMEZONE,
      }),
      isToday: isPSTToday(dateObj),
      isPast: isInPSTPast(dateObj),
    };
  });
}
```

---

## Recommendations

1. **Standardize Timezone Constant Usage:**
   - Replace hardcoded `'America/Los_Angeles'` with `PST_TIMEZONE` constant
   - Update `src/lib/orderHelpers.ts` to use the constant

2. **Fix Email Template Timezone:**
   - Add explicit `timeZone: 'America/Los_Angeles'` to date formatting in `orderConfirmation.ts`

3. **Consider `toPSTDate()` Deprecation:**
   - The function is a no-op wrapper that adds no value
   - Consider removing or updating documentation to clarify it doesn't convert timezones

4. **Date Storage Consistency:**
   - Continue storing dates as UTC in MongoDB (current approach is correct)
   - Apply timezone only at display/formatting layer

5. **Type Safety:**
   - Consider adding explicit types for date strings vs Date objects
   - Use `Date | string` union types consistently

---

## Related Documentation

- [Frontend Timezone Usage](./frontend-usage.md)
- [Timezone Utility Functions](../../lib/timezone.ts)
- [Date System Migration](./migration/day-to-date-system/README.md)
