# API Date Format Standards - Implementation Summary

## What Was Created

### 1. Documentation File
**Location:** `/docs/standards/api-date-formats.md`

This comprehensive 793-line document defines the standard date and time formats for all API endpoints.

### 2. Utility Functions
**Location:** `/src/utils/formatters.ts`

Added 4 new functions for date formatting:
- `formatAPITimestamp(date)` - Format to ISO 8601 timestamp
- `formatAPIDateOnly(date)` - Format to YYYY-MM-DD date-only string
- `formatAPIDisplayDate(dateString)` - Format to human-readable display date
- `toDateOnlyString(date)` - Type-safe helper for DateOnlyString

Plus 3 TypeScript type definitions:
- `ISODateTimeString` - Branded type for ISO 8601 timestamps
- `DateOnlyString` - Branded type for YYYY-MM-DD dates
- `FormattedDateString` - Branded type for display dates

## Quick Reference

### Three Date Format Categories

| Category | Format | Example | Use Case | Helper Function |
|----------|--------|---------|----------|-----------------|
| **Timestamps** | ISO 8601 | `2026-01-15T10:30:00.000Z` | createdAt, updatedAt, sentAt, deliveredAt | `formatAPITimestamp(date)` |
| **Date-Only** | YYYY-MM-DD | `2026-01-15` | deliveryDate, scheduledDate, filter dates | `formatAPIDateOnly(date)` |
| **Display Date** | Locale-formatted | "Monday, January 15, 2026" | formattedDate (optional UI field) | `formatAPIDisplayDate(dateString)` |

### Usage Examples

```typescript
import { formatAPITimestamp, formatAPIDateOnly, formatAPIDisplayDate } from '@/utils/formatters';

// 1. Formatting timestamps
const newOrder = {
  orderId: 'ORD-123',
  createdAt: formatAPITimestamp(new Date()),  // "2026-01-15T10:30:00.000Z"
  updatedAt: formatAPITimestamp(new Date()),
};

// 2. Formatting delivery dates
const orderItem = {
  name: 'Food Item',
  deliveryDate: formatAPIDateOnly(deliveryDateObj),  // "2026-01-15"
};

// 3. Formatting display dates (optional)
return Response.json({
  data: {
    date: "2026-01-15",  // Machine-readable
    formattedDate: formatAPIDisplayDate("2026-01-15"),  // "Monday, January 15, 2026"
  },
});
```

## Key Guidelines

### ✅ DO:
- Use ISO 8601 for all timestamps (`formatAPITimestamp`)
- Use YYYY-MM-DD for date-only fields (`formatAPIDateOnly`)
- Always use PST timezone for business logic dates
- Provide both machine-readable and human-readable formats for calendar dates
- Document timezone handling in API docs

### ❌ DON'T:
- Use `toISOString().split('T')[0]` - uses UTC instead of PST
- Return Date objects directly - use explicit formatting functions
- Use formatted dates for comparisons or sorting
- Mix different date formats in the same API response
- Forget to document timezone in API documentation

## Migration Path

### For Existing Code

1. **Update timestamp fields:**
   ```typescript
   // Before
   createdAt: order.createdAt  // Date object

   // After
   createdAt: formatAPITimestamp(order.createdAt)  // ISO string
   ```

2. **Fix date-only calculations:**
   ```typescript
   // Before (WRONG - uses UTC)
   const dateStr = date.toISOString().split('T')[0];

   // After (CORRECT - uses PST)
   const dateStr = formatAPIDateOnly(date);
   ```

3. **Add formattedDate field (optional):**
   ```typescript
   return Response.json({
     date: "2026-01-15",
     formattedDate: formatAPIDisplayDate("2026-01-15"),  // Optional
   });
   ```

## Breaking Changes

**If you update existing API endpoints:**

1. Coordinate with frontend team
2. Provide migration period if needed
3. Update API documentation
4. Test thoroughly after changes

**Note:** Most endpoints already return ISO strings (Next.js serializes Date objects), so changes may be minimal.

## Related Documents

- **Main Documentation:** `/docs/standards/api-date-formats.md` (detailed standards)
- **Standardization Guide:** `/docs/api-date-format-standardization.md` (implementation examples)
- **Analysis:** `/docs/api-date-format-analysis.md` (current state analysis)
- **Timezone Utilities:** `/src/lib/timezone.ts` (PST timezone handling)
- **Order Cutoff Logic:** `/docs/standards/order-cutoff-logic.md` (business logic)

## Testing Checklist

After implementing the standards:

- [ ] Verify API responses return correct date formats
- [ ] Test date displays in UI (if using formattedDate)
- [ ] Test date calculations (delivery dates, cutoff times)
- [ ] Test timezone handling (PST vs UTC)
- [ ] Test date filtering and sorting
- [ ] Check CSV exports
- [ ] Verify frontend compatibility

## Examples in Codebase

### Fully Documented Endpoints

1. **Food Items Day-wise API** - `/src/app/api/food-items-day-wise/route.ts`
   - Lines: 22-51 (API documentation), 238-256 (function documentation)
   - Uses dual format pattern (date + formattedDate)

2. **Available Dates API** - `/src/app/api/available-dates/route.ts`
   - Lines: 31-63 (interface documentation), 173-262 (implementation)
   - Uses dual format pattern with multiple display formats

## Common Mistakes to Avoid

### Mistake 1: Using UTC for Date Calculations
```typescript
// ❌ WRONG - Uses UTC
const dateStr = date.toISOString().split('T')[0];

// ✅ CORRECT - Uses PST
import { formatAPIDateOnly } from '@/utils/formatters';
const dateStr = formatAPIDateOnly(date);
```

### Mistake 2: Using Formatted Dates for Comparisons
```typescript
// ❌ WRONG
if (item.formattedDate > otherItem.formattedDate) { }

// ✅ CORRECT
if (item.date > otherItem.date) { }
```

### Mistake 3: Forgetting Timezone in Display Dates
```typescript
// ❌ WRONG
const formatted = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// ✅ CORRECT
import { PST_TIMEZONE } from '@/lib/timezone';
const formatted = date.toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: PST_TIMEZONE,
});
```

## Next Steps

1. **Review the documentation** - Read `/docs/standards/api-date-formats.md`
2. **Audit your endpoints** - Check which date formats you're currently using
3. **Update code** - Use the new helper functions from `/src/utils/formatters.ts`
4. **Test thoroughly** - Verify dates display correctly and business logic works
5. **Coordinate with frontend** - Ensure compatibility with any date format changes

---

**Implementation Date:** 2026-01-07
**Status:** Active Standard
**Document Owner:** Backend Team
