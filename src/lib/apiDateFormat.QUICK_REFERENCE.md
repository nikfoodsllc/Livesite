# API Date Formatting - Quick Reference

## Import

```typescript
import {
  formatAPIDate,
  formatAPIDateOnly,
  formatAPITimestamp,
  isValidAPIDate,
  formatAPIDateArray
} from '@/lib/apiDateFormat';
```

## Choose the Right Function

| Date Type | Use This Function | Example Output |
|-----------|-------------------|----------------|
| Timestamps (createdAt, updatedAt) | `formatAPIDate()` | `2026-01-15T10:30:00.000Z` |
| Calendar dates (deliveryDate) | `formatAPIDateOnly()` | `2026-01-15` |
| Precise timestamps (events) | `formatAPITimestamp()` | `2026-01-15T10:30:45.123Z` |
| Validate dates | `isValidAPIDate()` | `true` / `false` |
| Arrays of dates | `formatAPIDateArray()` | `['2026-01-15', '2026-01-16']` |

## Common Patterns

### Order API
```typescript
{
  orderId: order.orderId,
  createdAt: formatAPIDate(order.createdAt),
  updatedAt: formatAPIDate(order.updatedAt),
  deliveryDate: formatAPIDateOnly(order.deliveryDate),
  deliveredAt: formatAPIDate(order.deliveredAt) || null
}
```

### Email Analytics
```typescript
{
  eventId: event.eventId,
  sentAt: formatAPITimestamp(event.sentAt),
  deliveredAt: formatAPITimestamp(event.deliveredAt),
  openedAt: formatAPITimestamp(event.openedAt)
}
```

### Available Dates
```typescript
{
  dates: formatAPIDateArray(dateList, formatAPIDateOnly)
}
```

## Migration

### Before ❌
```typescript
createdAt: order.createdAt?.toISOString()
deliveryDate: order.deliveryDate as string
```

### After ✅
```typescript
createdAt: formatAPIDate(order.createdAt)
deliveryDate: formatAPIDateOnly(order.deliveryDate)
```

## Edge Cases

All functions handle:
- `null` → returns `''`
- `undefined` → returns `''`
- Invalid dates → returns `''`

## Documentation

- **Full Guide:** `/src/lib/apiDateFormat.README.md`
- **Integration Examples:** `/src/lib/apiDateFormat.integration.example.ts`
- **Demo:** Run `npx ts-node src/lib/apiDateFormat.demo.ts`
- **Tests:** `/src/lib/__tests__/apiDateFormat.test.ts`
