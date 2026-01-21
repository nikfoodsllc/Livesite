# Analytics API - Date Format Standards

**API Category:** Email Analytics
**Endpoints:** 4 routes
**Date Format:** ISO 8601 timestamps (all fields)
**Timezone:** UTC

---

## Overview

The Analytics API group handles email analytics, export, and dashboard operations. All timestamps use ISO 8601 format for consistency and machine readability.

---

## Standard Format

### All Date Fields

**Format:** ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)

**Fields:**
- `timestamp`
- `sentAt`, `deliveredAt`, `openedAt`, `clickedAt`
- `bouncedAt`, `complainedAt`, `rejectedAt`
- `createdAt`, `updatedAt`
- `lastAttempt`

**Helper Function:** `formatAPITimestamp(date)` or `formatAPIDate(date)`

---

## Endpoints

### GET `/api/admin/email-analytics/export` ✅

**Status:** Already follows standards

**Current Implementation:**
```typescript
summary.sentAt ? new Date(summary.sentAt).toISOString() : '',
summary.deliveredAt ? new Date(summary.deliveredAt).toISOString() : '',
// ... all timestamps converted to ISO
```

**Action Required:** None - already correct ✅

---

### GET `/api/admin/email-analytics`

**Current:** Returns Date objects from library

**Required:** Format to ISO strings

```typescript
import { formatAPITimestamp } from '@/lib/apiDateFormat';

return NextResponse.json({
  success: true,
  data: {
    ...result.data,
    events: result.data.events.map(event => ({
      ...event,
      timestamp: formatAPITimestamp(event.timestamp),
    })),
    summary: {
      sentAt: formatAPITimestamp(summary.sentAt),
      deliveredAt: formatAPITimestamp(summary.deliveredAt),
      openedAt: formatAPITimestamp(summary.openedAt),
      clickedAt: formatAPITimestamp(summary.clickedAt),
      bouncedAt: summary.bouncedAt ? formatAPITimestamp(summary.bouncedAt) : null,
      createdAt: formatAPITimestamp(summary.createdAt),
      updatedAt: formatAPITimestamp(summary.updatedAt),
    },
  }
});
```

---

### GET `/api/admin/email-analytics/dashboard`

**Same as above:** Format all timestamps to ISO 8601

---

### GET `/api/admin/email-status`

**Current:** Mixed formats (some ISO, some Date objects)

**Required:** Standardize all to ISO

```typescript
return Response.json({
  success: true,
  data: {
    orders: orders.map(order => ({
      orderId: order.orderId,
      customerName: order.customerInfo.name,
      createdAt: formatAPIDate(order.createdAt),  // ISO
      emailStatus: order.emailStatus || { ... }
    })),
    report: {
      recentFailures: [
        {
          orderId: order.orderId,
          lastAttempt: formatAPITimestamp(emailStatus.lastAttempt),  // ISO
          attempts: emailStatus.attempts,
          error: emailStatus.error,
        }
      ],
      emailsByDate: [
        {
          date: formatAPIDateOnly(order.createdAt),  // YYYY-MM-DD for grouping
          total: 10,
          sent: 8,
          failed: 2,
        }
      ]
    }
  }
});
```

---

## Expected Response Format

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "messageId": "msg-123",
        "timestamp": "2026-01-15T10:30:00.000Z",
        "eventType": "delivered",
        "data": { ... }
      }
    ],
    "summary": {
      "sentAt": "2026-01-15T10:30:00.000Z",
      "deliveredAt": "2026-01-15T10:31:00.000Z",
      "openedAt": "2026-01-15T10:35:00.000Z",
      "clickedAt": "2026-01-15T10:36:00.000Z",
      "bouncedAt": null,
      "createdAt": "2026-01-15T10:30:00.000Z",
      "updatedAt": "2026-01-15T10:36:00.000Z"
    }
  }
}
```

---

## Type Definitions

```typescript
import type { ISODateTimeString } from '@/utils/formatters';

export interface EmailAnalyticsEvent {
  messageId: string;
  timestamp: ISODateTimeString;
  eventType: string;
  data: Record<string, unknown>;
}

export interface EmailAnalyticsSummary {
  sentAt?: ISODateTimeString | null;
  deliveredAt?: ISODateTimeString | null;
  openedAt?: ISODateTimeString | null;
  clickedAt?: ISODateTimeString | null;
  bouncedAt?: ISODateTimeString | null;
  complainedAt?: ISODateTimeString | null;
  rejectedAt?: ISODateTimeString | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}
```

---

## Summary

**Status:** 1 of 4 endpoints follows standards ✅
**Priority:** Medium
**Breaking Changes:** Minimal (already mostly ISO strings)

---

**Last Updated:** 2026-01-07
