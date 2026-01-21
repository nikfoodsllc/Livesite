# Calendar API - Date Format Standards

**API Category:** Calendar
**Endpoints:** 2 routes
**Date Format:** YYYY-MM-DD date-only + optional formatted display
**Timezone:** PST

---

## Overview

The Calendar API group handles available dates and food items by date. Uses dual format pattern (machine-readable + human-readable).

---

## Standard Format

### Date Fields

**Format:** YYYY-MM-DD for machine-readable, locale-formatted for display

**Fields:**
- `date` - YYYY-MM-DD (machine-readable)
- `formattedDate` - Human-readable (optional)
- `fullDate` - Extended human-readable (optional)

**Helper Functions:**
- `formatAPIDateOnly(date)` - YYYY-MM-DD
- `formatDateString(dateString)` - Human-readable

---

## Endpoints

### GET `/api/food-items-day-wise` ✅

**Status:** Already follows standards

**Current Implementation:**
```typescript
return Response.json({
  data: {
    categoryId: categoryId,
    categoryListingType: 'day-wise',
    date: date,  // YYYY-MM-DD
    formattedDate: formatDateString(date),  // Human-readable
    foodItems: uniqueItems,
  },
  message: 'success',
});
```

**Action Required:** None - already correct ✅

**Documentation:** Comprehensive (lines 22-51, 238-256, 524-542)

---

### GET `/api/available-dates` ✅

**Status:** Already follows standards

**Current Implementation:**
```typescript
return Response.json({
  success: true,
  dates: availableDates.map(date => ({
    id: date.date,
    date: date.date,  // YYYY-MM-DD
    formattedDate: formatDateString(date.date),  // Short format
    fullDate: formatPSTDate(date.dateObj, 'long'),  // Long format
    flatCategoryEnabled: date.flatCategoryEnabled,
    dayWiseCategoryEnabled: date.dayWiseCategoryEnabled,
    isToday: isPSTToday(date.dateObj),
    isPast: isInPSTPast(date.dateObj),
    isPastCutoff: date.isPastCutoff,
  })),
});
```

**Action Required:** None - already correct ✅

**Documentation:** Comprehensive (lines 31-63, 173-262)

---

## Expected Response Format

### Food Items Day-wise

```json
{
  "data": {
    "categoryId": "65a1b2c3d4e5f6789abcdef0",
    "categoryListingType": "day-wise",
    "date": "2026-01-15",
    "formattedDate": "Thursday, January 15, 2026",
    "foodItems": [...]
  },
  "message": "success"
}
```

### Available Dates

```json
{
  "success": true,
  "dates": [
    {
      "id": "2026-01-15",
      "date": "2026-01-15",
      "formattedDate": "Friday (Jan 15)",
      "fullDate": "Friday, January 15, 2026",
      "flatCategoryEnabled": true,
      "dayWiseCategoryEnabled": true,
      "isToday": false,
      "isPast": false,
      "isPastCutoff": false
    }
  ]
}
```

---

## Type Definitions

```typescript
import type { DateOnlyString } from '@/utils/formatters';

export interface FoodItemsDayWiseResponse {
  categoryId: string;
  categoryListingType: 'day-wise';
  date: DateOnlyString;
  formattedDate: string;
  foodItems: FoodItem[];
}

export interface AvailableDate {
  id: DateOnlyString;
  date: DateOnlyString;
  formattedDate: string;
  fullDate: string;
  flatCategoryEnabled: boolean;
  dayWiseCategoryEnabled: boolean;
  isToday: boolean;
  isPast: boolean;
  isPastCutoff: boolean;
}
```

---

## Summary

**Status:** All endpoints follow standards ✅
**Priority:** Low
**Breaking Changes:** None

---

**Last Updated:** 2026-01-07
