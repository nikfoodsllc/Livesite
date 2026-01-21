# Webhooks API - Date Format Standards

**API Category:** Webhooks
**Endpoints:** 2 routes
**Date Format:** ISO 8601 timestamps (logging only)
**Timezone:** UTC

---

## Overview

The Webhooks API group handles incoming webhooks from external services (Resend, Stripe). Dates are primarily used for logging, not returned to clients.

---

## Standard Format

### Logging Timestamps

**Format:** ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)

**Use Case:** Console logging, audit trails

**Helper Function:** `new Date().toISOString()` (for logging)

---

## Endpoints

### POST `/api/webhooks/resend` ✅

**Status:** Already follows standards

**Current Implementation:**
```typescript
console.log('[Webhook] Received Resend webhook:', {
  hasSignature: !!signature,
  bodyLength: body.length,
  timestamp: new Date().toISOString(),  // ✅ Correct
});

console.log('[Webhook] Webhook processed successfully:', {
  processedEvents: result.processedEvents,
  timestamp: new Date().toISOString(),  // ✅ Correct
});
```

**Action Required:** None - already correct ✅

---

### POST `/api/webhooks/stripe` ✅

**Status:** Already follows standards

**Current Implementation:**
```typescript
const updateResult = await db.updateOne('orders',
  { orderId: order.orderId },
  {
    $set: {
      paymentStatus: 'paid',
      status: 'confirmed',
      updatedAt: new Date(),  // ✅ Correct (stored as Date)
    },
  }
);
```

**Action Required:** None - already correct ✅

---

## Summary

**Status:** All endpoints follow standards ✅
**Priority:** Low
**Breaking Changes:** None

---

**Last Updated:** 2026-01-07
