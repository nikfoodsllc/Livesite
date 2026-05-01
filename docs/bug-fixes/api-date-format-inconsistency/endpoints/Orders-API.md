# Orders API - Date Format Standards

**API Category:** Orders
**Endpoints:** 5 routes
**Date Format:** ISO 8601 timestamps + YYYY-MM-DD date-only
**Timezone:** UTC for timestamps, PST for date-only values

---

## Overview

The Orders API group handles all order-related operations including creating, retrieving, updating, and tracking orders. All timestamps use ISO 8601 format, while delivery dates use YYYY-MM-DD format.

---

## Endpoint: GET `/api/orders`

### Current Implementation

**File:** `/src/app/api/orders/route.ts`
**Line:** 88

**Current Behavior:**
```typescript
return Response.json({
  success: true,
  data: {
    items: orders,  // Contains createdAt, updatedAt as Date objects
    page: 1,
    pageSize: 10,
    total: orders.length,
  }
});
```

**Date Fields:**
- `items[].createdAt` - Date object (should be ISO string)
- `items[].updatedAt` - Date object (should be ISO string)
- `items[].items[].deliveryDate` - Date or string (should be YYYY-MM-DD)
- `items[].items[].actualDeliveryDate` - Date or string (should be YYYY-MM-DD)

---

### Standardized Implementation

**Step 1: Import utilities**
```typescript
import {
  formatAPIDate,
  formatAPIDateOnly
} from '@/lib/apiDateFormat';
```

**Step 2: Format response**
```typescript
return Response.json({
  success: true,
  data: {
    items: orders.map(order => ({
      ...order,
      // Format timestamps to ISO 8601
      createdAt: formatAPIDate(order.createdAt),
      updatedAt: formatAPIDate(order.updatedAt),
      // Format delivery dates to YYYY-MM-DD
      items: order.items.map(item => ({
        ...item,
        deliveryDate: formatAPIDateOnly(item.deliveryDate),
        actualDeliveryDate: item.actualDeliveryDate
          ? formatAPIDateOnly(item.actualDeliveryDate)
          : null,
      })),
    })),
    page: 1,
    pageSize: 10,
    total: orders.length,
  }
});
```

---

### Expected Response Format

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "orderId": "ORD-123",
        "createdAt": "2026-01-15T10:30:00.000Z",
        "updatedAt": "2026-01-15T11:00:00.000Z",
        "items": [
          {
            "name": "Food Item",
            "deliveryDate": "2026-01-16",
            "actualDeliveryDate": "2026-01-16"
          }
        ]
      }
    ],
    "page": 1,
    "pageSize": 10,
    "total": 1
  }
}
```

---

## Endpoint: GET `/api/orders/[orderId]`

### Current Implementation

**File:** `/src/app/api/orders/[orderId]/route.ts`
**Line:** 150

**Current Behavior:**
```typescript
return Response.json({
  success: true,
  data: order  // Contains createdAt, updatedAt as Date objects
});
```

**Date Fields:**
- `createdAt` - Date object (should be ISO string)
- `updatedAt` - Date object (should be ISO string)
- `items[].deliveryDate` - Date or string (should be YYYY-MM-DD)
- `items[].actualDeliveryDate` - Date or string (should be YYYY-MM-DD)

---

### Standardized Implementation

```typescript
import {
  formatAPIDate,
  formatAPIDateOnly
} from '@/lib/apiDateFormat';

return Response.json({
  success: true,
  data: {
    ...order,
    // Format timestamps to ISO 8601
    createdAt: formatAPIDate(order.createdAt),
    updatedAt: formatAPIDate(order.updatedAt),
    // Format delivery dates to YYYY-MM-DD
    items: order.items.map(item => ({
      ...item,
      deliveryDate: formatAPIDateOnly(item.deliveryDate),
      actualDeliveryDate: item.actualDeliveryDate
        ? formatAPIDateOnly(item.actualDeliveryDate)
        : null,
    })),
  }
});
```

---

## Endpoint: GET `/api/orders/[orderId]/track`

### Current Implementation

**File:** `/src/app/api/orders/[orderId]/track/route.ts`
**Lines:** 85, 86, 112, 113

**Current Behavior:**
```typescript
return Response.json({
  success: true,
  data: {
    order: {
      orderId: order.orderId,
      status: order.status,
      createdAt: order.createdAt,  // Date object
      updatedAt: order.updatedAt   // Date object
    },
    timeline: [
      {
        status: "confirmed",
        label: "Order Confirmed",
        timestamp: order.updatedAt,  // Date object
        completed: true,
        active: false
      },
      // ...
    ],
    estimatedDelivery: firstDeliveryDate  // Date or string
  }
});
```

---

### Standardized Implementation

```typescript
import {
  formatAPIDate,
  formatAPIDateOnly,
  formatAPITimestamp
} from '@/lib/apiDateFormat';

return Response.json({
  success: true,
  data: {
    order: {
      orderId: order.orderId,
      status: order.status,
      createdAt: formatAPIDate(order.createdAt),
      updatedAt: formatAPIDate(order.updatedAt)
    },
    timeline: [
      {
        status: "confirmed",
        label: "Order Confirmed",
        timestamp: formatAPITimestamp(order.createdAt),
        completed: true,
        active: false
      },
      {
        status: "preparing",
        label: "Preparing",
        timestamp: formatAPITimestamp(order.updatedAt),
        completed: true,
        active: false
      },
      // ...
    ],
    estimatedDelivery: formatAPIDateOnly(firstDeliveryDate)
  }
});
```

---

### Expected Response Format

```json
{
  "success": true,
  "data": {
    "order": {
      "orderId": "ORD-123",
      "status": "confirmed",
      "createdAt": "2026-01-15T10:30:00.000Z",
      "updatedAt": "2026-01-15T11:00:00.000Z"
    },
    "timeline": [
      {
        "status": "confirmed",
        "label": "Order Confirmed",
        "timestamp": "2026-01-15T10:30:00.000Z",
        "completed": true,
        "active": false
      },
      {
        "status": "preparing",
        "label": "Preparing",
        "timestamp": "2026-01-15T11:00:00.000Z",
        "completed": true,
        "active": false
      }
    ],
    "estimatedDelivery": "2026-01-16"
  }
}
```

---

## Endpoint: POST `/api/orders/create`

### Current Implementation

**File:** `/src/app/api/orders/create/route.ts`

**Current Behavior:**
```typescript
const order: Order = {
  orderId,
  user: userId,
  items: orderItems,
  // createdAt, updatedAt added by database
};
```

**Date Fields:**
- `createdAt` - Date object (added by database)
- `updatedAt` - Date object (added by database)
- `items[].deliveryDate` - Date object (from deliveryCalculator)

---

### Standardized Implementation

**Step 1: Create order with explicit timestamps**
```typescript
import { formatAPIDate, formatAPIDateOnly } from '@/lib/apiDateFormat';
import { getPSTDateString } from '@/lib/timezone';

const now = new Date();

const order: Order = {
  orderId,
  user: userId,
  items: orderItems.map(item => ({
    ...item,
    // Format delivery dates to YYYY-MM-DD in PST
    deliveryDate: getPSTDateString(item.deliveryDate),
  })),
  // Explicitly set timestamps
  createdAt: now,
  updatedAt: now,
};
```

**Step 2: Format response**
```typescript
return Response.json({
  success: true,
  data: {
    orderId: order.orderId,
    createdAt: formatAPIDate(order.createdAt),
    updatedAt: formatAPIDate(order.updatedAt),
    items: order.items,
  }
});
```

---

## Endpoint: POST `/api/orders/reviews`

### Current Implementation

**File:** `/src/app/api/orders/reviews/route.ts`
**Lines:** 94, 95, 112

**Current Behavior:**
```typescript
const review: OrderReview = {
  orderId,
  user: userId,
  rating,
  comment: comment || '',
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

---

### Standardized Implementation

```typescript
import { formatAPIDate } from '@/lib/apiDateFormat';

const review: OrderReview = {
  orderId,
  user: userId,
  rating,
  comment: comment || '',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Format response
return Response.json({
  success: true,
  data: {
    ...review,
    createdAt: formatAPIDate(review.createdAt),
    updatedAt: formatAPIDate(review.updatedAt),
  }
});
```

---

## Date Format Standards for Orders API

### Timestamps Fields

**Fields:** `createdAt`, `updatedAt`, `timeline[].timestamp`

**Format:** ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)

**Examples:**
- `"2026-01-15T10:30:00.000Z"`
- `"2026-01-15T11:00:00.000Z"`

**Helper Function:** `formatAPIDate(date)` or `formatAPITimestamp(date)`

---

### Date-Only Fields

**Fields:** `deliveryDate`, `actualDeliveryDate`, `estimatedDelivery`

**Format:** YYYY-MM-DD

**Examples:**
- `"2026-01-15"`
- `"2026-01-16"`

**Helper Function:** `formatAPIDateOnly(date)`

**Timezone:** PST (Pacific Standard Time)

---

## Type Definitions

### Current Types (Inconsistent)

```typescript
export interface Order {
  orderId: string;
  createdAt?: Date | string;  // ❌ Ambiguous
  updatedAt?: Date | string;  // ❌ Ambiguous
  items: OrderDay[];
}

export interface OrderDay {
  deliveryDate: Date | string;  // ❌ Ambiguous
  actualDeliveryDate?: Date | string;  // ❌ Ambiguous
}
```

---

### Standardized Types

```typescript
import type { ISODateTimeString, DateOnlyString } from '@/utils/formatters';

export interface Order {
  orderId: string;
  createdAt: ISODateTimeString;  // ✅ Clear type
  updatedAt: ISODateTimeString;  // ✅ Clear type
  items: OrderDay[];
}

export interface OrderDay {
  deliveryDate: DateOnlyString;  // ✅ Clear type
  actualDeliveryDate?: DateOnlyString | null;  // ✅ Clear type
}

export interface OrderResponse {
  orderId: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  items: OrderDayItemResponse[];
}

export interface OrderDayItemResponse {
  name: string;
  deliveryDate: DateOnlyString;
  actualDeliveryDate?: DateOnlyString | null;
}
```

---

## Migration Checklist

### For Each Endpoint

- [ ] Import formatting utilities
- [ ] Format all timestamp fields to ISO 8601
- [ ] Format all date-only fields to YYYY-MM-DD
- [ ] Update type definitions
- [ ] Add JSDoc documentation
- [ ] Add inline comments
- [ ] Test with sample data
- [ ] Verify timezone handling
- [ ] Update API documentation

---

## Breaking Changes

### Backend Changes

**Current:** Returns Date objects (serialized to ISO by Next.js)

**After Update:** Explicitly returns ISO strings

**Impact:** Minimal - Next.js already serializes to ISO

---

### Frontend Changes

**Current:** May receive Date objects or ISO strings (unclear)

**After Update:** Always receives ISO strings

**Migration:**
```typescript
// Before (if expecting Date objects)
const createdAt = order.createdAt;  // May be Date or string

// After (always ISO string)
const createdAt = new Date(order.createdAt);  // Parse ISO string
```

---

## Testing

### Unit Tests

```typescript
describe('Orders API Date Formatting', () => {
  it('should format createdAt to ISO 8601', () => {
    const order = { createdAt: new Date('2026-01-15T10:30:00Z') };
    const formatted = formatAPIDate(order.createdAt);
    expect(formatted).toBe('2026-01-15T10:30:00.000Z');
  });

  it('should format deliveryDate to YYYY-MM-DD', () => {
    const date = new Date('2026-01-15T10:30:00Z');
    const formatted = formatAPIDateOnly(date);
    expect(formatted).toBe('2026-01-15');
  });
});
```

### Integration Tests

```typescript
describe('GET /api/orders', () => {
  it('should return orders with ISO timestamps', async () => {
    const response = await fetch('/api/orders');
    const data = await response.json();

    expect(data.data.items[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(data.data.items[0].items[0].deliveryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

---

## Summary

**Standard:** All Orders API endpoints should use:
- ISO 8601 strings for timestamps (`formatAPIDate`, `formatAPITimestamp`)
- YYYY-MM-DD strings for date-only values (`formatAPIDateOnly`)
- PST timezone for date-only calculations
- Type-safe string types (`ISODateTimeString`, `DateOnlyString`)

**Status:** 🔄 Needs Implementation
**Priority:** High
**Breaking Changes:** Minimal (frontend needs to parse ISO strings consistently)

---

**Last Updated:** 2026-01-07
**Document Owner:** Backend Team
