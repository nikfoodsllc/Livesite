# Frontend Developer Migration Guide

**Target Audience:** Frontend Developers
**Migration Type:** Date Format Standardization
**Difficulty:** Low to Medium
**Breaking Changes:** Yes (minor)

---

## Overview

This guide helps frontend developers migrate to the new standardized date format APIs. The backend now consistently returns ISO 8601 strings for timestamps and YYYY-MM-DD strings for date-only values.

---

## What Changed?

### Before (Inconsistent)

```typescript
// Orders API
{
  "createdAt": Date object or ISO string (unclear)
  "deliveryDate": Date object or string (unclear)
}

// Food Items API
{
  "date": "2026-01-15",
  "formattedDate": "Monday, January 15, 2026"  // Backend formatted
}
```

### After (Standardized)

```typescript
// Orders API
{
  "createdAt": "2026-01-15T10:30:00.000Z",  // Always ISO string
  "deliveryDate": "2026-01-15"  // Always YYYY-MM-DD
}

// Food Items API
{
  "date": "2026-01-15",  // Machine-readable
  "formattedDate": "Monday, January 15, 2026"  // Optional display format
}
```

---

## Migration Strategy

### Phase 1: Update Type Definitions (No Breaking Changes)

Update your API client types to match the new standard:

```typescript
// Before
interface Order {
  orderId: string;
  createdAt: Date | string;  // ❌ Unclear
  deliveryDate: Date | string;  // ❌ Unclear
}

// After
interface Order {
  orderId: string;
  createdAt: string;  // ✅ ISO 8601 timestamp
  deliveryDate: string;  // ✅ YYYY-MM-DD date
}
```

---

### Phase 2: Update Date Parsing (Minimal Changes)

Most of your code probably already parses ISO strings correctly. Just verify:

```typescript
// Parse ISO timestamp to Date object
const createdAt = new Date(order.createdAt);

// Parse date-only string to Date object (add time component)
const deliveryDate = new Date(order.deliveryDate + 'T00:00:00-08:00');  // PST
```

---

### Phase 3: Update Date Display (Optional)

If you were using `formattedDate` from the backend, you have two options:

**Option A: Continue using `formattedDate` (easiest, no changes)**

```typescript
// Before
<Text>{item.formattedDate}</Text>

// After (no changes needed)
<Text>{item.formattedDate}</Text>
```

**Option B: Format dates on frontend (more flexibility)**

```typescript
// Create a date formatting utility
function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00-08:00');  // PST
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles'
  });
}

// Use in components
<Text>{formatDisplayDate(item.date)}</Text>
```

---

## Step-by-Step Migration

### Step 1: Audit Current Date Usage

Search your codebase for date usage:

```bash
# Search for date field usage
grep -r "createdAt" src/
grep -r "deliveryDate" src/
grep -r "formattedDate" src/
grep -r "\.toDate" src/
grep -r "new Date(" src/
```

---

### Step 2: Update API Client Types

Create shared types for date formats:

```typescript
// src/types/api.ts

/**
 * ISO 8601 timestamp string
 * Format: YYYY-MM-DDTHH:mm:ss.sssZ
 * Example: "2026-01-15T10:30:00.000Z"
 */
export type ISODateTimeString = string;

/**
 * Date-only string in YYYY-MM-DD format
 * Format: YYYY-MM-DD
 * Example: "2026-01-15"
 */
export type DateOnlyString = string;

/**
 * Formatted date string for UI display (optional)
 * Format: Locale-specific
 * Example: "Monday, January 15, 2026"
 */
export type FormattedDateString = string;
```

Update API response types:

```typescript
// src/types/orders.ts

import type { ISODateTimeString, DateOnlyString } from './api';

export interface Order {
  orderId: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  items: OrderItem[];
}

export interface OrderItem {
  name: string;
  deliveryDate: DateOnlyString;
  actualDeliveryDate?: DateOnlyString | null;
}

export interface OrderResponse {
  success: boolean;
  data: Order;
}
```

---

### Step 3: Create Date Formatting Utilities

```typescript
// src/utils/dateFormatting.ts

/**
 * Parse ISO timestamp string to Date object
 */
export function parseISODateTime(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Parse date-only string to Date object in PST timezone
 */
export function parseDateOnly(dateString: string): Date {
  return new Date(dateString + 'T00:00:00-08:00');
}

/**
 * Format date for display (long format)
 */
export function formatDisplayDateLong(dateString: string): string {
  const date = parseDateOnly(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles'
  });
}

/**
 * Format date for display (short format)
 */
export function formatDisplayDateShort(dateString: string): string {
  const date = parseDateOnly(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Los_Angeles'
  });
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(isoString: string): string {
  const date = parseISODateTime(isoString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles'
  });
}
```

---

### Step 4: Update Components

#### Example 1: Order List Component

```typescript
// Before (might have been using Date objects)
import { Order } from '@/types/orders';

function OrderList({ orders }: { orders: Order[] }) {
  return (
    <div>
      {orders.map(order => (
        <div key={order.orderId}>
          {/* Assuming order.createdAt was already being parsed correctly */}
          <Text>Created: {new Date(order.createdAt).toLocaleString()}</Text>
        </div>
      ))}
    </div>
  );
}

// After (explicit parsing)
import { Order } from '@/types/orders';
import { formatTimestamp } from '@/utils/dateFormatting';

function OrderList({ orders }: { orders: Order[] }) {
  return (
    <div>
      {orders.map(order => (
        <div key={order.orderId}>
          <Text>Created: {formatTimestamp(order.createdAt)}</Text>
        </div>
      ))}
    </div>
  );
}
```

---

#### Example 2: Food Items Component

```typescript
// Before (using backend-formatted date)
function FoodItemsDayWise({ data }: { data: any }) {
  return (
    <div>
      <Text>{data.formattedDate}</Text>
      {/* ... */}
    </div>
  );
}

// After - Option A: Continue using formattedDate (no changes)
function FoodItemsDayWise({ data }: { data: any }) {
  return (
    <div>
      <Text>{data.formattedDate}</Text>
      {/* ... */}
    </div>
  );
}

// After - Option B: Format on frontend
import { formatDisplayDateLong } from '@/utils/dateFormatting';

function FoodItemsDayWise({ data }: { data: any }) {
  return (
    <div>
      <Text>{formatDisplayDateLong(data.date)}</Text>
      {/* ... */}
    </div>
  );
}
```

---

#### Example 3: Order Tracking Timeline

```typescript
// Before
function OrderTracking({ timeline }: { timeline: any[] }) {
  return (
    <div>
      {timeline.map(event => (
        <div key={event.status}>
          <Text>{event.label}</Text>
          <Text>{new Date(event.timestamp).toLocaleString()}</Text>
        </div>
      ))}
    </div>
  );
}

// After
import { formatTimestamp } from '@/utils/dateFormatting';

function OrderTracking({ timeline }: { timeline: any[] }) {
  return (
    <div>
      {timeline.map(event => (
        <div key={event.status}>
          <Text>{event.label}</Text>
          <Text>{formatTimestamp(event.timestamp)}</Text>
        </div>
      ))}
    </div>
  );
}
```

---

## Testing Your Migration

### Manual Testing Checklist

- [ ] Order dates display correctly
- [ ] Delivery dates show correct day (PST timezone)
- [ ] Calendar dates are accurate
- [ ] Timestamps show correct time
- [ ] No "Invalid Date" errors
- [ ] Timezone differences handled correctly

### Automated Testing

```typescript
// src/__tests__/dateFormatting.test.ts

import { parseISODateTime, parseDateOnly, formatDisplayDateLong } from '@/utils/dateFormatting';

describe('Date Formatting', () => {
  it('should parse ISO timestamp correctly', () => {
    const isoString = '2026-01-15T10:30:00.000Z';
    const date = parseISODateTime(isoString);
    expect(date.toISOString()).toBe(isoString);
  });

  it('should parse date-only string correctly', () => {
    const dateString = '2026-01-15';
    const date = parseDateOnly(dateString);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0);  // January
    expect(date.getDate()).toBe(15);
  });

  it('should format date for display', () => {
    const dateString = '2026-01-15';
    const formatted = formatDisplayDateLong(dateString);
    expect(formatted).toContain('January');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2026');
  });
});
```

---

## Common Migration Scenarios

### Scenario 1: Using FormattedDate Field

**Current Code:**
```typescript
<Text>{item.formattedDate}</Text>
```

**Migration:** No changes needed! The field is still provided.

---

### Scenario 2: Parsing ISO Timestamps

**Current Code:**
```typescript
const createdAt = new Date(order.createdAt);
```

**Migration:** No changes needed! `new Date(isoString)` works correctly.

---

### Scenario 3: Date Comparisons

**Current Code:**
```typescript
if (date1 > date2) { ... }
```

**Migration:** Ensure both are Date objects before comparing:

```typescript
const date1 = new Date(item1.deliveryDate + 'T00:00:00-08:00');
const date2 = new Date(item2.deliveryDate + 'T00:00:00-08:00');
if (date1 > date2) { ... }
```

---

### Scenario 4: Filtering by Date

**Current Code:**
```typescript
const filtered = items.filter(item => {
  return new Date(item.date).getDate() === selectedDate.getDate();
});
```

**Migration:** Compare date strings instead (more reliable):

```typescript
const filtered = items.filter(item => {
  return item.date === selectedDateString;  // Both YYYY-MM-DD
});
```

---

## Breakdown by Component

### Orders Pages

**Pages Affected:**
- `/orders`
- `/orders/[orderId]`
- `/orders/[orderId]/track`

**Changes Required:**
1. Update type definitions
2. Ensure timestamp parsing uses `new Date(isoString)`
3. Verify date displays show correct timezone

**Breaking Changes:** None (already parses ISO strings)

---

### Food Items Pages

**Pages Affected:**
- `/menu/[categoryId]` (day-wise)
- Calendar views

**Changes Required:**
1. Can continue using `formattedDate` field (no changes)
2. OR format on frontend for more control

**Breaking Changes:** None (formattedDate still provided)

---

### Admin Dashboard

**Pages Affected:**
- Email analytics
- Order status reports

**Changes Required:**
1. Update type definitions for timestamps
2. Verify timestamp displays

**Breaking Changes:** None

---

## Rollback Plan

If issues arise after migration:

### Rollback Steps

1. **Update API client types back to `Date | string`**
```typescript
interface Order {
  createdAt: Date | string;  // Rollback
}
```

2. **Add parsing logic**
```typescript
const createdAt = typeof order.createdAt === 'string'
  ? new Date(order.createdAt)
  : order.createdAt;
```

3. **Contact backend team** to coordinate rollback

---

## Support and Resources

### Documentation

- **Main Standards:** `/docs/standards/api-date-formats.md`
- **Bug Fix Details:** `/docs/bug-fixes/api-date-format-inconsistency/README.md`
- **Endpoint Guides:** `/docs/bug-fixes/api-date-format-inconsistency/endpoints/`

### Utilities Available

- **Backend:** `/src/lib/apiDateFormat.ts`
- **Backend Types:** `/src/utils/formatters.ts`
- **Demo:** `/src/lib/apiDateFormat.demo.ts`

### Questions?

If you have questions or encounter issues:

1. Check the documentation above
2. Review the endpoint-specific guides
3. Contact the backend team
4. Open an issue with details

---

## Quick Reference

### Date Format Types

| Field Type | Format | Example | Frontend Type |
|------------|--------|---------|---------------|
| Timestamps (createdAt, updatedAt) | ISO 8601 | `2026-01-15T10:30:00.000Z` | `string` |
| Date-Only (deliveryDate, date) | YYYY-MM-DD | `2026-01-15` | `string` |
| Display (formattedDate) | Locale | "Monday, January 15, 2026" | `string` (optional) |

### Parsing Functions

```typescript
// Timestamp to Date object
const date = new Date(isoString);

// Date-only to Date object (PST)
const date = new Date(dateString + 'T00:00:00-08:00');

// Format for display
const formatted = date.toLocaleDateString('en-US', options);
```

### Best Practices

✅ **DO:**
- Use `new Date(isoString)` for timestamps
- Use timezone-aware parsing for date-only values
- Format dates on frontend for flexibility
- Test with different user timezones

❌ **DON'T:**
- Use `formattedDate` for comparisons or sorting
- Assume dates are in local timezone
- Mix date formats in the same component
- Forget to test DST transitions

---

**Migration Guide Version:** 1.0
**Last Updated:** 2026-01-07
**Status:** Ready for Distribution
