# API Date Formatting Utilities

Centralized, consistent date formatting for all API responses in the application.

## Overview

This module provides standardized date formatting functions to ensure uniform date representation across all API endpoints. It maintains consistency with the application's PST timezone handling and provides type-safe, well-tested utilities for date formatting.

## Features

- ✅ **ISO 8601 Format** for all Date objects with time (timestamps)
- ✅ **YYYY-MM-DD Format** for date-only calendar dates
- ✅ **Timezone Consistency** with PST_TIMEZONE configuration
- ✅ **Type Safety** with full TypeScript support
- ✅ **Edge Case Handling** for null, undefined, and invalid dates
- ✅ **Input Validation** with graceful error handling
- ✅ **Comprehensive Documentation** with JSDoc comments

## Installation

The module is located at `/src/lib/apiDateFormat.ts` and is ready to use:

```typescript
import {
  formatAPIDate,
  formatAPIDateOnly,
  formatAPITimestamp,
  isValidAPIDate,
  formatAPIDateArray
} from '@/lib/apiDateFormat';
```

## Quick Start

### Format Timestamps (createdAt, updatedAt, etc.)

```typescript
import { formatAPIDate } from '@/lib/apiDateFormat';

// In your API route
export async function GET(request: NextRequest) {
  const orders = await db.read('orders', {});

  return Response.json({
    success: true,
    data: orders.map(order => ({
      orderId: order.orderId,
      createdAt: formatAPIDate(order.createdAt),
      updatedAt: formatAPIDate(order.updatedAt)
    }))
  });
}

// Output:
// {
//   "orderId": "ORD-123",
//   "createdAt": "2026-01-15T10:30:00.000Z",
//   "updatedAt": "2026-01-15T11:00:00.000Z"
// }
```

### Format Calendar Dates (deliveryDate, etc.)

```typescript
import { formatAPIDateOnly } from '@/lib/apiDateFormat';

// In your API route
export async function GET(request: NextRequest) {
  const orders = await db.read('orders', {});

  return Response.json({
    success: true,
    data: orders.map(order => ({
      orderId: order.orderId,
      deliveryDate: formatAPIDateOnly(order.deliveryDate)
    }))
  });
}

// Output:
// {
//   "orderId": "ORD-123",
//   "deliveryDate": "2026-01-15"
// }
```

## API Reference

### `formatAPIDate(date)`

Format a Date object or date string to ISO 8601 format for API responses.

**Use for:**
- `createdAt` timestamps
- `updatedAt` timestamps
- `sentAt`, `deliveredAt`, `openedAt` timestamps
- Any datetime fields that include time

**Signature:**
```typescript
function formatAPIDate(date: Date | string | null | undefined): string
```

**Parameters:**
- `date` - Date object, date string, or null/undefined

**Returns:**
- ISO 8601 formatted string (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- Empty string for invalid input

**Examples:**
```typescript
formatAPIDate(new Date('2026-01-15T10:30:00Z'))
// Returns: '2026-01-15T10:30:00.000Z'

formatAPIDate('2026-01-15T10:30:00Z')
// Returns: '2026-01-15T10:30:00.000Z'

formatAPIDate(null)
// Returns: ''
```

---

### `formatAPIDateOnly(dateString)`

Format a date-only calendar date to YYYY-MM-DD format.

**Use for:**
- Delivery dates
- Available dates
- Schedule dates
- Any date-only fields without time

**Signature:**
```typescript
function formatAPIDateOnly(dateString: string | Date | null | undefined): string
```

**Parameters:**
- `dateString` - Date string in YYYY-MM-DD format or Date object, or null/undefined

**Returns:**
- Date string in YYYY-MM-DD format
- Empty string for invalid input

**Examples:**
```typescript
formatAPIDateOnly('2026-01-15')
// Returns: '2026-01-15'

formatAPIDateOnly(new Date('2026-01-15T10:30:00Z'))
// Returns: '2026-01-15' (date in PST timezone)

formatAPIDateOnly(null)
// Returns: ''
```

---

### `formatAPITimestamp(date)`

Format a Date object to ISO 8601 format with explicit millisecond precision.

**Use for:**
- Event timestamps for precise ordering
- Performance timing measurements
- Audit logs requiring high precision

**Signature:**
```typescript
function formatAPITimestamp(date: Date | null | undefined): string
```

**Parameters:**
- `date` - Date object or null/undefined

**Returns:**
- ISO 8601 formatted string with milliseconds (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- Empty string for invalid input

**Examples:**
```typescript
formatAPITimestamp(new Date('2026-01-15T10:30:45.123Z'))
// Returns: '2026-01-15T10:30:45.123Z'

formatAPITimestamp(null)
// Returns: ''
```

---

### `isValidAPIDate(date)`

Validate if a string or Date object represents a valid date.

**Signature:**
```typescript
function isValidAPIDate(date: Date | string | null | undefined): boolean
```

**Parameters:**
- `date` - Date object, date string, or null/undefined

**Returns:**
- `true` if the input is a valid date
- `false` otherwise

**Examples:**
```typescript
isValidAPIDate(new Date('2026-01-15'))
// Returns: true

isValidAPIDate('invalid-date')
// Returns: false

isValidAPIDate(null)
// Returns: false
```

---

### `formatAPIDateArray(dates, formatter)`

Format an array of dates using the specified formatter function.

**Signature:**
```typescript
function formatAPIDateArray(
  dates: Array<Date | string | null | undefined>,
  formatter: (date: Date | string | null | undefined) => string
): string[]
```

**Parameters:**
- `dates` - Array of Date objects, date strings, or null/undefined values
- `formatter` - The formatter function to use (formatAPIDate or formatAPIDateOnly)

**Returns:**
- Array of formatted date strings

**Examples:**
```typescript
const dates = [new Date('2026-01-15'), new Date('2026-01-16')];
formatAPIDateArray(dates, formatAPIDate)
// Returns: ['2026-01-15T00:00:00.000Z', '2026-01-16T00:00:00.000Z']

const dateStrings = ['2026-01-15', '2026-01-16'];
formatAPIDateArray(dateStrings, formatAPIDateOnly)
// Returns: ['2026-01-15', '2026-01-16']
```

## Usage Guide

### Choosing the Right Formatter

| Formatter | Use Case | Output Format | Example |
|-----------|----------|---------------|---------|
| `formatAPIDate` | Timestamps (createdAt, updatedAt, etc.) | ISO 8601 with milliseconds | `2026-01-15T10:30:00.000Z` |
| `formatAPIDateOnly` | Calendar dates (deliveryDate, etc.) | YYYY-MM-DD | `2026-01-15` |
| `formatAPITimestamp` | Precise timestamps (events, audits) | ISO 8601 with milliseconds | `2026-01-15T10:30:45.123Z` |

### Common Patterns

#### Pattern 1: Formatting Order Data

```typescript
// ❌ OLD PATTERN (inconsistent)
return Response.json({
  orderId: order.orderId,
  createdAt: order.createdAt.toISOString(),
  updatedAt: order.updatedAt.toISOString()
});

// ✅ NEW PATTERN (consistent)
import { formatAPIDate } from '@/lib/apiDateFormat';

return Response.json({
  orderId: order.orderId,
  createdAt: formatAPIDate(order.createdAt),
  updatedAt: formatAPIDate(order.updatedAt)
});
```

#### Pattern 2: Formatting Delivery Dates

```typescript
// ❌ OLD PATTERN (no timezone awareness)
return Response.json({
  orderId: order.orderId,
  deliveryDate: order.deliveryDate as string
});

// ✅ NEW PATTERN (timezone-aware)
import { formatAPIDateOnly } from '@/lib/apiDateFormat';

return Response.json({
  orderId: order.orderId,
  deliveryDate: formatAPIDateOnly(order.deliveryDate)
});
```

#### Pattern 3: Handling Optional Date Fields

```typescript
// ✅ NEW PATTERN (graceful handling of null/undefined)
import { formatAPIDate, formatAPIDateOnly } from '@/lib/apiDateFormat';

return Response.json({
  orderId: order.orderId,
  deliveredAt: formatAPIDate(order.deliveredAt),        // Returns '' if null
  actualDeliveryDate: formatAPIDateOnly(order.actualDeliveryDate) // Returns '' if undefined
});
```

#### Pattern 4: Formatting Email Analytics

```typescript
// ✅ NEW PATTERN (precise millisecond timestamps)
import { formatAPITimestamp } from '@/lib/apiDateFormat';

return Response.json({
  eventId: event.eventId,
  sentAt: formatAPITimestamp(event.sentAt),
  deliveredAt: formatAPITimestamp(event.deliveredAt),
  openedAt: formatAPITimestamp(event.openedAt)
});
```

## Migration Guide

### Step 1: Identify Date Fields in API Routes

Search for patterns like:
- `.toISOString()`
- `as string` type casting on dates
- Direct date returns without formatting

### Step 2: Import the Utilities

```typescript
import {
  formatAPIDate,
  formatAPIDateOnly,
  formatAPITimestamp
} from '@/lib/apiDateFormat';
```

### Step 3: Replace Old Patterns

**Before:**
```typescript
return {
  orderId: order.orderId,
  createdAt: order.createdAt?.toISOString(),
  deliveryDate: order.deliveryDate as string
};
```

**After:**
```typescript
return {
  orderId: order.orderId,
  createdAt: formatAPIDate(order.createdAt),
  deliveryDate: formatAPIDateOnly(order.deliveryDate)
};
```

### Step 4: Test Your Changes

Run your API endpoints and verify:
- Date formats are consistent
- Null/undefined dates return empty strings
- Timezone handling is correct
- ISO 8601 format includes milliseconds

## Testing

### Manual Testing

Run the manual test suite:

```bash
npx ts-node src/lib/apiDateFormat.manual.test.ts
```

### Unit Testing

If you add Jest to your project, run the unit tests:

```bash
npm test src/lib/__tests__/apiDateFormat.test.ts
```

### Integration Testing

Test your API endpoints:

```bash
curl http://localhost:3000/api/orders | jq
```

Verify date formats in the response:
```json
{
  "success": true,
  "data": {
    "createdAt": "2026-01-15T10:30:00.000Z",
    "deliveryDate": "2026-01-20"
  }
}
```

## Design Principles

### 1. ISO 8601 Standard
All Date objects with time are formatted in ISO 8601 format (e.g., `2026-01-15T10:30:00.000Z`). This is:
- Internationally recognized
- Machine-readable
- Sortable
- Includes timezone information

### 2. Date-Only Format
Calendar dates use YYYY-MM-DD format (e.g., `2026-01-15`). This is:
- Simple and readable
- Consistent with database date formats
- Easy to parse and validate

### 3. Timezone Consistency
All date formatting respects the PST_TIMEZONE setting from `/src/lib/timezone.ts`. This ensures:
- Consistent dates across server environments
- Correct handling of PST business logic
- Proper DST transitions

### 4. Type Safety
Full TypeScript support with:
- Input type validation
- Return type guarantees
- JSDoc documentation
- IntelliSense support

### 5. Edge Case Handling
Graceful handling of:
- Null inputs → returns empty string
- Undefined inputs → returns empty string
- Invalid dates → returns empty string
- Invalid date strings → returns empty string

## Error Handling

The module uses defensive programming practices:

```typescript
// All functions handle errors gracefully
try {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    console.warn('[formatAPIDate] Invalid date provided:', date);
    return ''; // Return empty string for invalid input
  }
  return dateObj.toISOString();
} catch (error) {
  console.error('[formatAPIDate] Error formatting date:', error);
  return ''; // Return empty string on error
}
```

## Performance Considerations

- **Minimal Overhead**: Functions use native Date methods and Intl.DateTimeFormat
- **No External Dependencies**: Pure TypeScript/JavaScript implementation
- **Efficient Validation**: Early returns for null/undefined inputs
- **Caching**: Intl.DateTimeFormat instances are created per call (could be optimized if needed)

## Related Modules

- **`/src/lib/timezone.ts`**: Core timezone utilities and PST_TIMEZONE configuration
- **`/src/lib/server/db.ts`**: Database operations (where dates are stored/retrieved)
- **`/src/types/`**: TypeScript type definitions with date fields

## Best Practices

### ✅ DO:

1. **Always use formatting functions** for dates in API responses
2. **Validate dates** before formatting if needed using `isValidAPIDate()`
3. **Choose the right formatter** based on the use case
4. **Handle optional date fields** with null/undefined checks
5. **Test with edge cases** (null, invalid dates, DST transitions)

### ❌ DON'T:

1. **Don't use `.toISOString()` directly** in API responses
2. **Don't type cast dates** as strings without formatting
3. **Don't mix date formats** across different endpoints
4. **Don't ignore timezone** when formatting date-only values
5. **Don't assume dates are valid** without validation

## Troubleshooting

### Issue: Dates are one day off

**Cause:** Using UTC-based formatting instead of PST timezone.

**Solution:** Use `formatAPIDateOnly()` for date-only fields, which respects PST timezone.

```typescript
// ❌ WRONG - uses UTC
const dateStr = date.toISOString().split('T')[0];

// ✅ CORRECT - uses PST timezone
const dateStr = formatAPIDateOnly(date);
```

### Issue: Milliseconds are missing

**Cause:** Not using the correct formatter.

**Solution:** Use `formatAPIDate()` or `formatAPITimestamp()` for timestamps.

```typescript
// ✅ CORRECT - includes milliseconds
const timestamp = formatAPIDate(order.createdAt);
```

### Issue: Empty strings in API responses

**Cause:** Date field is null or undefined.

**Solution:** This is expected behavior. Empty strings indicate missing date data. If you need different handling, add conditional logic:

```typescript
createdAt: order.createdAt ? formatAPIDate(order.createdAt) : null
```

## Contributing

When adding new date formatting utilities:

1. Follow the existing naming convention: `formatAPI*`
2. Add comprehensive JSDoc comments
3. Include input validation
4. Handle edge cases (null, undefined, invalid dates)
5. Add tests to both test files
6. Update this README with examples

## Changelog

### Version 1.0.0 (2026-01-15)
- Initial implementation
- Added `formatAPIDate()` for timestamp formatting
- Added `formatAPIDateOnly()` for date-only formatting
- Added `formatAPITimestamp()` for precise timestamps
- Added `isValidAPIDate()` for date validation
- Added `formatAPIDateArray()` for batch formatting
- Comprehensive documentation and tests

## License

This module is part of the Nikfoos web application and follows the same license.
