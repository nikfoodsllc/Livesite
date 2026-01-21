# Database Date Storage Schema Analysis

**Document Version:** 1.0
**Last Updated:** 2025-01-07
**Source:** TDN9IL Codebase & CXGP03 Admin Panel Analysis
**Database:** MongoDB

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Date Storage by Collection](#date-storage-by-collection)
3. [Date Format Analysis](#date-format-analysis)
4. [Timezone Storage](#timezone-storage)
5. [Query Patterns](#query-patterns)
6. [Key Findings](#key-findings)
7. [Recommendations](#recommendations)

---

## Executive Summary

**Critical Finding:** The database does **NOT** store dates in PST timezone. Dates are stored in MongoDB's standard format:

- **Date Objects (UTC):** Stored as UTC BSON Date objects
- **Date Strings:** Stored as ISO 8601 format (YYYY-MM-DD) without timezone information
- **Timezone Application:** PST timezone is applied **only at read/display time**, not at storage time

This architecture is **correct and follows MongoDB best practices**. The application consistently applies PST timezone when formatting dates for display, ensuring all user-facing dates are in Pacific Time.

---

## Date Storage by Collection

### 1. Collection: `availableDates`

**Purpose:** Manages which calendar dates are available for ordering and which category types are enabled.

#### Schema

```typescript
interface AvailableDateDocument {
  _id?: ObjectId;
  date: string;                      // YYYY-MM-DD format (NO timezone)
  flatCategoryEnabled: boolean;      // Enable FLAT category listing
  dayWiseCategoryEnabled: boolean;   // Enable DAY_WISE category listing
  createdAt?: Date;                  // UTC Date object
  updatedAt?: Date;                  // UTC Date object
}
```

#### Storage Format

| Field | Type | Format | Timezone | Example |
|-------|------|--------|----------|---------|
| `date` | String | YYYY-MM-DD | None (timezone-neutral) | `"2025-01-07"` |
| `createdAt` | Date | BSON Date | UTC | `2025-01-07T10:30:00.000Z` |
| `updatedAt` | Date | BSON Date | UTC | `2025-01-07T10:30:00.000Z` |

#### Sample Document

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "date": "2025-01-07",
  "flatCategoryEnabled": true,
  "dayWiseCategoryEnabled": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

#### Key Points

- **`date` field is stored as a string** in YYYY-MM-DD format
- **No timezone information** in the date string (intentional)
- **Timezone applied on read:** When displaying, the application parses this string and formats it with PST timezone
- **Sortable:** YYYY-MM-DD format sorts chronologically lexicographically
- **Query-efficient:** Enables exact match queries without timezone conversion

#### Validation

**Source:** `src/app/api/available-dates/route.ts`

```typescript
const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

if (startDate && !dateRegex.test(startDate)) {
  return NextResponse.json(
    {
      success: false,
      error: 'Invalid startDate format. Use YYYY-MM-DD format.',
    },
    { status: 400 }
  );
}
```

---

### 2. Collection: `orders`

**Purpose:** Stores customer orders with delivery dates and timestamps.

#### Schema

```typescript
interface Order {
  _id?: ObjectId;
  orderId: string;
  items: OrderDay[];
  // ... other fields
  createdAt: Date;    // UTC Date object
  updatedAt: Date;    // UTC Date object
}

interface OrderDay {
  day: string;                      // e.g., "Monday", "Tuesday"
  deliveryDate: Date | string;      // Delivery date (UTC Date or ISO string)
  actualDeliveryDate?: Date | string; // After clubbing logic
  items: OrderDayItem[];
  dayTotal: number;
}
```

#### Storage Format

| Field | Type | Format | Timezone | Example |
|-------|------|--------|----------|---------|
| `createdAt` | Date | BSON Date | UTC | `2025-01-07T18:30:00.000Z` |
| `updatedAt` | Date | BSON Date | UTC | `2025-01-07T18:30:00.000Z` |
| `items[].deliveryDate` | String | YYYY-MM-DD | None (timezone-neutral) | `"2025-01-07"` |
| `items[].actualDeliveryDate` | String | YYYY-MM-DD | None (timezone-neutral) | `"2025-01-08"` |

#### Sample Document

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "orderId": "ORD-1735907200123",
  "items": [
    {
      "day": "Tuesday",
      "deliveryDate": "2025-01-07",
      "actualDeliveryDate": "2025-01-08",
      "items": [...],
      "dayTotal": 45.00
    }
  ],
  "createdAt": "2025-01-07T10:30:00.000Z",
  "updatedAt": "2025-01-07T10:30:00.000Z"
}
```

#### Key Points

- **Timestamps (`createdAt`, `updatedAt`):** Stored as UTC Date objects (MongoDB standard)
- **Delivery dates:** Stored as **strings** in YYYY-MM-DD format (not Date objects)
- **Timezone applied on read:** Display formatting applies PST timezone
- **No timezone in delivery dates:** Intentional - dates are timezone-neutral calendar dates

---

### 3. Collection: `categoryfoodmapping`

**Purpose:** Stores food item to category relationships with date specificity for DAY_WISE mapping type.

#### Schema

```typescript
interface BaseCategoryFoodMapping {
  _id?: ObjectId;
  foodItemId: ObjectId;
  categoryId: ObjectId;
  sequence: number;
  mappingType: 'FLAT' | 'DAY_WISE';
  createdAt?: Date;
  updatedAt?: Date;
}

interface DayWiseCategoryFoodMapping extends BaseCategoryFoodMapping {
  mappingType: 'DAY_WISE';
  day: string;  // YYYY-MM-DD format (NO timezone)
}
```

#### Storage Format

| Field | Type | Format | Timezone | Example |
|-------|------|--------|----------|---------|
| `day` | String | YYYY-MM-DD | None (timezone-neutral) | `"2025-01-07"` |
| `createdAt` | Date | BSON Date | UTC | `2025-01-07T10:30:00.000Z` |
| `updatedAt` | Date | BSON Date | UTC | `2025-01-07T10:30:00.000Z` |

#### Sample Document (DAY_WISE)

```json
{
  "_id": "507f1f77bcf86cd799439014",
  "foodItemId": "507f1f77bcf86cd799439015",
  "categoryId": "507f1f77bcf86cd799439016",
  "sequence": 0,
  "mappingType": "DAY_WISE",
  "day": "2025-01-07",
  "createdAt": "2025-01-07T10:00:00.000Z",
  "updatedAt": "2025-01-07T10:00:00.000Z"
}
```

#### Key Points

- **`day` field is string** in YYYY-MM-DD format (DAY_WISE mappings only)
- **No timezone information** in the day field
- **Timezone applied on read:** Display formatting uses PST timezone
- **Exact match queries:** Efficient date-based lookups

---

### 4. Collection: `users`

**Purpose:** Stores user account information.

#### Schema

```typescript
interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  // ... other fields
  createdAt: Date;    // UTC Date object
  updatedAt: Date;    // UTC Date object
}
```

#### Storage Format

| Field | Type | Format | Timezone | Example |
|-------|------|--------|----------|---------|
| `createdAt` | Date | BSON Date | UTC | `2025-01-07T10:30:00.000Z` |
| `updatedAt` | Date | BSON Date | UTC | `2025-01-07T10:30:00.000Z` |

#### Sample Document

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2025-01-07T10:30:00.000Z",
  "updatedAt": "2025-01-07T10:30:00.000Z"
}
```

#### Key Points

- **Timestamps stored as UTC Date objects** (MongoDB standard)
- **Timezone applied on read:** Display formatting uses PST timezone

---

### 5. Collection: `cart`

**Purpose:** Stores shopping cart data for users.

#### Schema

```typescript
interface Cart {
  _id?: ObjectId;
  user?: string;
  days: CartDay[];
  selectedAddress?: Address;
  // ... other fields
  createdAt: Date;    // UTC Date object
  updatedAt: Date;    // UTC Date object
}

interface CartDay {
  date: string;       // YYYY-MM-DD format (NO timezone)
  day: string;        // e.g., "Monday"
  items: CartItem[];
  dayTotal: number;
}
```

#### Storage Format

| Field | Type | Format | Timezone | Example |
|-------|------|--------|----------|---------|
| `createdAt` | Date | BSON Date | UTC | `2025-01-07T10:30:00.000Z` |
| `updatedAt` | Date | BSON Date | UTC | `2025-01-07T10:30:00.000Z` |
| `days[].date` | String | YYYY-MM-DD | None (timezone-neutral) | `"2025-01-07"` |

#### Sample Document

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "user": "507f1f77bcf86cd799439012",
  "days": [
    {
      "date": "2025-01-07",
      "day": "Tuesday",
      "items": [...],
      "dayTotal": 45.00
    }
  ],
  "createdAt": "2025-01-07T10:30:00.000Z",
  "updatedAt": "2025-01-07T10:30:00.000Z"
}
```

#### Key Points

- **`date` field in days array** is YYYY-MM-DD string
- **No timezone information** in date strings
- **Timezone applied on read:** Display formatting uses PST timezone

---

### 6. Collection: `emailAnalytics`

**Purpose:** Tracks email sending status and analytics.

#### Schema

```typescript
interface EmailAnalytics {
  _id?: ObjectId;
  orderId: string;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  attempts: number;
  lastAttempt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Storage Format

| Field | Type | Format | Timezone | Example |
|-------|------|--------|----------|---------|
| `lastAttempt` | Date | BSON Date | UTC | `2025-01-07T10:30:00.000Z` |
| `createdAt` | Date | BSON Date | UTC | `2025-01-07T10:30:00.000Z` |
| `updatedAt` | Date | BSON Date | UTC | `2025-01-07T10:30:00.000Z` |

#### Sample Document

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "orderId": "ORD-1735907200123",
  "status": "sent",
  "attempts": 1,
  "lastAttempt": "2025-01-07T10:30:00.000Z",
  "createdAt": "2025-01-07T10:30:00.000Z",
  "updatedAt": "2025-01-07T10:30:00.000Z"
}
```

#### Key Points

- **All dates stored as UTC Date objects**
- **Timezone applied on read:** Display formatting uses PST timezone

---

## Date Format Analysis

### Format Types Used

#### 1. UTC Date Objects (BSON Date)

**Used For:**
- `createdAt` timestamps
- `updatedAt` timestamps
- `lastAttempt` timestamps
- Any temporal metadata

**Format:** ISO 8601 with UTC timezone (Z suffix)
```
2025-01-07T10:30:00.000Z
```

**Storage:** MongoDB BSON Date type (64-bit integer milliseconds since Unix epoch)

**Timezone:** Always UTC
- MongoDB stores all Date objects as UTC internally
- No timezone information is stored with the date
- Timezone interpretation happens at read/display time

#### 2. Date Strings (YYYY-MM-DD)

**Used For:**
- Calendar dates (`availableDates.date`)
- Delivery dates (`orders.items[].deliveryDate`)
- Day-wise mapping dates (`categoryfoodmapping.day`)
- Cart dates (`cart.days[].date`)

**Format:** ISO 8601 date-only format
```
2025-01-07
```

**Storage:** MongoDB String type

**Timezone:** None (timezone-neutral)
- Represents a calendar date, not a specific moment in time
- Interpreted consistently across timezones
- PST timezone applied only when formatting for display

**Why This Format?**
1. **Efficient queries:** Exact match, range queries without timezone conversion
2. **Sortable:** Lexicographic sort = chronological sort
3. **Timezone-neutral:** Same date for all users globally
4. **Human-readable:** Easy to debug and query manually
5. **Compact:** Smaller storage than Date objects

---

## Timezone Storage

### Critical Finding: No PST in Database

**The database does NOT store PST timezone information.**

#### What IS Stored:

1. **UTC timestamps** (for createdAt, updatedAt, etc.)
   - Stored as BSON Date objects
   - Always in UTC (MongoDB standard)
   - No timezone metadata

2. **Date strings** (for calendar dates)
   - Format: YYYY-MM-DD
   - No timezone suffix
   - Timezone-neutral calendar dates

#### What IS NOT Stored:

1. ❌ No PST timezone identifier in date fields
2. ❌ No timezone offset (e.g., -08:00)
3. ❌ No timezone-aware date objects
4. ❌ No "Pacific Time" metadata

#### How PST is Applied:

**Timezone is applied AT READ TIME, not at storage time.**

**Example from `src/lib/server/availableDates.ts`:**

```typescript
// Database stores: "2025-01-07"
const doc = await db.readOne('availableDates', { date: "2025-01-07" });

// Parse and apply PST timezone for display
const dateObj = new Date(doc.date + 'T00:00:00.000Z');
const formattedDate = dateObj.toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
  timeZone: PST_TIMEZONE,  // 'America/Los_Angeles'
});
// Result: "Tuesday, Jan 7"
```

**This architecture is CORRECT because:**

1. **Follows MongoDB best practices:** Store times in UTC, apply timezone at display
2. **Single source of truth:** PST timezone constant in one place (`PST_TIMEZONE`)
3. **Flexibility:** Can change timezone by updating one constant
4. **Efficient queries:** No timezone conversion needed for date comparisons
5. **Consistent display:** All dates formatted with same timezone logic

---

## Query Patterns

### 1. Date Range Queries

**Available Dates Query:**

```typescript
// src/lib/server/availableDates.ts
const filter: any = {
  flatCategoryEnabled: true,
  date: {
    $gte: startDate,  // "2025-01-01"
    $lte: endDate,    // "2025-01-31"
  },
};

const result = await db.read('availableDates', filter, {
  sort: { date: 1 },  // Ascending by date string
});
```

**Key Points:**
- Direct string comparison (no timezone conversion)
- Lexicographic sort works for YYYY-MM-DD format
- Efficient index usage

### 2. Exact Match Queries

**Day-Wise Mapping Query:**

```typescript
// Query categoryfoodmapping for specific date
const mappings = await db.read('categoryfoodmapping', {
  categoryId: ObjectId("..."),
  mappingType: 'DAY_WISE',
  day: '2025-01-07'  // Exact string match
});
```

**Key Points:**
- Exact match on date string
- No timezone conversion needed
- Fast indexed lookup

### 3. Timestamp Queries

**Order Creation Time Range:**

```typescript
// Find orders created in a UTC time range
const orders = await db.read('orders', {
  createdAt: {
    $gte: new Date('2025-01-01T00:00:00.000Z'),
    $lte: new Date('2025-01-31T23:59:59.999Z')
  }
}, {
  sort: { createdAt: -1 }  // Newest first
});
```

**Key Points:**
- Date objects stored as UTC
- Range queries use UTC timestamps
- Sorting uses UTC timestamps

---

## Key Findings

### 1. Database Architecture is Correct

✅ **Follows MongoDB Best Practices:**
- Store temporal data in UTC
- Apply timezone at display time
- Use timezone-neutral formats for calendar dates

✅ **Consistent Across Collections:**
- All timestamps: UTC Date objects
- All calendar dates: YYYY-MM-DD strings
- No PST stored in database

✅ **Efficient Query Patterns:**
- Date strings enable exact match queries
- UTC timestamps enable range queries
- No runtime timezone conversion needed for queries

### 2. Date Storage Formats

| Collection | Date Fields | Storage Format | Timezone Stored |
|------------|-------------|----------------|-----------------|
| `availableDates` | `date` | String (YYYY-MM-DD) | **None** |
| `orders` | `createdAt`, `updatedAt` | Date (UTC) | **UTC only** |
| `orders` | `items[].deliveryDate` | String (YYYY-MM-DD) | **None** |
| `categoryfoodmapping` | `createdAt`, `updatedAt` | Date (UTC) | **UTC only** |
| `categoryfoodmapping` | `day` (DAY_WISE) | String (YYYY-MM-DD) | **None** |
| `users` | `createdAt`, `updatedAt` | Date (UTC) | **UTC only** |
| `cart` | `createdAt`, `updatedAt` | Date (UTC) | **UTC only** |
| `cart` | `days[].date` | String (YYYY-MM-DD) | **None** |
| `emailAnalytics` | All date fields | Date (UTC) | **UTC only** |

### 3. Timezone Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE STORAGE                          │
│  ┌──────────────────┐    ┌────────────────────────────────┐ │
│  │  Date Objects     │    │  Date Strings                  │ │
│  │  (UTC only)       │    │  (YYYY-MM-DD, no timezone)     │ │
│  └──────────────────┘    └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ READ
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Parse date strings to Date objects                    │ │
│  │  Apply PST timezone using:                             │ │
│  │  - PST_TIMEZONE constant                               │ │
│  │  - Intl.DateTimeFormat with timeZone option            │ │
│  │  - toLocaleDateString() with PST                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ FORMAT
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      DISPLAY LAYER                           │
│  All dates displayed in Pacific Time (America/Los_Angeles)  │
│  Examples:                                                  │
│  - "Tuesday, Jan 7, 2025"                                   │
│  - "Jan 07, 2025, 03:30 PM"                                 │
│  - "2025-01-07" (in date picker)                            │
└─────────────────────────────────────────────────────────────┘
```

### 4. Confirmation: DB Does NOT Store PST

**Direct Evidence from Code:**

**1. Database Write (formatOrderForDatabase):**
```typescript
// src/lib/orderHelpers.ts
export function formatOrderForDatabase(order: Order): Order {
  return {
    ...order,
    createdAt: new Date(),  // ← UTC Date object
    updatedAt: new Date(),  // ← UTC Date object
  };
}
```

**2. Database Read (generateAvailableDateOptions):**
```typescript
// src/lib/server/availableDates.ts
const dateObj = new Date(doc.date + 'T00:00:00.000Z');  // ← Parse as UTC
const formattedDate = dateObj.toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
  timeZone: PST_TIMEZONE,  // ← PST applied HERE
});
```

**3. Date String Storage:**
```typescript
// Available date document
{
  date: "2025-01-07",  // ← No timezone, just a date string
  flatCategoryEnabled: true,
  dayWiseCategoryEnabled: true
}
```

**Conclusion:** PST timezone is **NOT** stored in the database. It is applied **only** when formatting dates for display.

---

## Recommendations

### 1. Continue Current Architecture ✅

**DO NOT change the database storage format.** The current approach is correct:

- ✅ Store timestamps as UTC Date objects
- ✅ Store calendar dates as YYYY-MM-DD strings
- ✅ Apply PST timezone at display time only

### 2. Document PST Application Points

Ensure all developers understand that PST is applied at read time, not write time:

**File locations where PST is applied:**
- `src/lib/server/availableDates.ts` - Date option generation
- `src/lib/orderHelpers.ts` - Order date formatting
- `src/lib/timezone.ts` - All PST utility functions

### 3. Consistent Timezone Constant Usage

**Always use the `PST_TIMEZONE` constant:**

```typescript
// ✅ Correct
import { PST_TIMEZONE } from '@/lib/timezone';

date.toLocaleDateString('en-US', {
  timeZone: PST_TIMEZONE
});

// ❌ Avoid hardcoded
date.toLocaleDateString('en-US', {
  timeZone: 'America/Los_Angeles'  // Hardcoded
});
```

**Files to update:**
- `src/lib/orderHelpers.ts` - Replace hardcoded `'America/Los_Angeles'` with `PST_TIMEZONE`

### 4. Date String Validation

Ensure all date strings are validated before storage:

```typescript
function isValidDateFormat(date: string): boolean {
  const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  return regex.test(date) && !isNaN(new Date(date).getTime());
}
```

**Applied in:**
- `src/app/api/available-dates/route.ts` ✅ (already implemented)
- `src/app/api/admin/category-food-mapping/daywise/route.ts` ✅ (already implemented)

### 5. Display Layer Consistency

Ensure all date displays use PST-aware formatting:

```typescript
// ✅ Correct - PST applied
const formatted = date.toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: PST_TIMEZONE
});

// ❌ Incorrect - No timezone specified
const formatted = date.toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
```

**Files to check:**
- `src/templates/orderConfirmation.ts` - Email template date formatting

### 6. Query Optimization

Leverage the YYYY-MM-DD format for efficient queries:

```typescript
// ✅ Efficient - Direct string comparison
db.read('availableDates', {
  date: {
    $gte: '2025-01-01',
    $lte: '2025-01-31'
  }
});

// ❌ Inefficient - Date creation and conversion
db.read('availableDates', {
  date: {
    $gte: new Date('2025-01-01').toISOString().split('T')[0],
    $lte: new Date('2025-01-31').toISOString().split('T')[0]
  }
});
```

---

## Conclusion

### Summary

1. **Database does NOT store PST timezone:**
   - Timestamps stored as UTC Date objects (MongoDB standard)
   - Calendar dates stored as YYYY-MM-DD strings (timezone-neutral)

2. **PST timezone is applied at read time:**
   - Formatting functions use `PST_TIMEZONE` constant
   - `Intl.DateTimeFormat` applies timezone for display
   - Consistent PST display across the application

3. **Architecture is correct and should not change:**
   - Follows MongoDB best practices
   - Enables efficient queries
   - Flexible for future timezone changes

4. **Key Collections:**
   - `availableDates`: Date strings (YYYY-MM-DD)
   - `orders`: UTC timestamps + date strings for delivery dates
   - `categoryfoodmapping`: UTC timestamps + date strings for day-wise mappings
   - All other collections: UTC timestamps only

### Answer to Original Question

**Question:** Does the database store dates in PST timezone?

**Answer:** **NO.** The database stores dates in two formats:
1. **UTC Date objects** (for timestamps like `createdAt`, `updatedat`)
2. **Date strings in YYYY-MM-DD format** (for calendar dates, no timezone)

PST timezone is applied **only when formatting dates for display**, not at storage time. This is the correct and recommended approach for MongoDB applications.

---

## Related Documentation

- [Timezone Utilities](./central-utilities.md) - Complete guide to PST utility functions
- [Backend Timezone Usage](./backend-usage.md) - How PST is applied in backend code
- [Admin Data Structure Analysis](../bug-fixes/day-wise-food-items/admin-data-structure-analysis.md) - Database schema from CXGP03 admin panel
- [Date System Migration](../migration/day-to-date-system/README.md) - Migration from day names to dates

---

**End of Document**
