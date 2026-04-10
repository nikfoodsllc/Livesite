# API Endpoint Migration Guide

## Table of Contents
- [Overview](#overview)
- [Deprecated Endpoints](#deprecated-endpoints)
- [New Endpoints](#new-endpoints)
- [Migration Examples](#migration-examples)
- [Breaking Changes](#breaking-changes)
- [Testing Checklist](#testing-checklist)

---

## Overview

The migration from day-of-week to date-based system includes changes to API endpoints. This guide helps you migrate your API calls to use the new endpoints.

### Key Changes
1. **New endpoint**: `/api/available-dates` (replaces multiple old endpoints)
2. **Response format changes**: Date objects instead of day objects
3. **Query parameters**: More flexible date range filtering
4. **Backward compatibility**: Old endpoints still work but are deprecated

---

## Deprecated Endpoints

### 1. `GET /api/enabled-days`

**Status:** 🚫 DEPRECATED

**Replaced By:** `GET /api/available-dates`

**Deprecation Date:** January 2025

**Removal Date:** July 2025 (6 months after deprecation)

#### Old Endpoint Details

**Endpoint:** `GET /api/enabled-days`

**Purpose:** Fetch list of enabled day names from database

**Response Format:**
```json
{
  "success": true,
  "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
}
```

**⚠️ Day Name Format Note:**
- Old system returned lowercase day names (e.g., "monday", "tuesday")
- New system returns Title Case day names (e.g., "Monday", "Tuesday")
- This aligns with JavaScript's `toLocaleDateString()` formatting

**Headers:**
```http
Deprecation: true
```

#### Migration Path

**Before (Old Endpoint):**
```typescript
const response = await fetch('/api/enabled-days');
const data = await response.json();
if (data.success) {
  const enabledDays = data.days; // ['monday', 'tuesday', ...]
  enabledDays.forEach(day => {
    console.log(`Enabled: ${day}`);
  });
}
```

**After (New Endpoint):**
```typescript
const response = await fetch('/api/available-dates');
const data = await response.json();
if (data.success) {
  const availableDates = data.dates;
  availableDates.forEach(date => {
    console.log(`Available: ${date.date} (${date.formattedDate})`);
  });
}
```

**Migration Notes:**
- New endpoint returns richer date objects instead of simple day names
- If you need day names for backward compatibility, extract them from date objects:
  ```typescript
  const dayNames = availableDates.map(d => d.day);
  ```

---

### 2. `GET /api/days/available`

**Status:** 🚫 DEPRECATED

**Replaced By:** `GET /api/available-dates`

**Deprecation Date:** January 2025

**Removal Date:** July 2025 (6 months after deprecation)

#### Old Endpoint Details

**Endpoint:** `GET /api/days/available`

**Query Parameters:**
- `includeDisabled` (boolean, optional): Include disabled days in response

**Purpose:** Fetch available day options with metadata

**Response Format:**
```json
{
  "success": true,
  "days": [
    {
      "id": "some-id",
      "day": "monday",
      "label": "Mon",
      "sequence": 1,
      "enabled": true,
      "date": "2025-01-20",
      "formattedDate": "Monday (Jan 20)",
      "fullDate": "Monday, January 20, 2025",
      "isToday": false
    }
  ]
}
```

**⚠️ Day Name Format Note:**
- The `day` field in the old system used lowercase format ("monday")
- The `formattedDate` field uses Title Case extracted from `toLocaleDateString()`
- During migration, the `day` field is also converted to Title Case for consistency

**Headers:**
```http
Deprecation: true
```

#### Migration Path

**Before (Old Endpoint):**
```typescript
// Get enabled days only
const response = await fetch('/api/days/available?includeDisabled=false');
const data = await response.json();
if (data.success) {
  const days = data.days;
  days.forEach(day => {
    console.log(`${day.label}: ${day.formattedDate}`);
  });
}
```

**After (New Endpoint):**
```typescript
// Get enabled dates only
const response = await fetch('/api/available-dates');
const data = await response.json();
if (data.success) {
  const dates = data.dates;
  dates.forEach(date => {
    console.log(`${date.formattedDate}`);
  });
}
```

**Advanced Example with Date Range:**
```typescript
// NEW: Get dates for specific range
const startDate = '2025-01-01';
const endDate = '2025-01-31';
const response = await fetch(
  `/api/available-dates?startDate=${startDate}&endDate=${endDate}`
);
const data = await response.json();
if (data.success) {
  console.log(`Found ${data.dates.length} available dates in January`);
}
```

**Key Differences:**
- Old: Used `includeDisabled` query parameter
- New: Always returns enabled dates (no need for parameter)
- New: Added `startDate` and `endDate` for range filtering
- New: Returns actual calendar dates, not recurring day patterns

---

### 3. `GET /api/days/option`

**Status:** 🚫 DEPRECATED

**Replaced By:** `GET /api/available-dates` + client-side filtering

**Deprecation Date:** January 2025

**Removal Date:** July 2025 (6 months after deprecation)

#### Old Endpoint Details

**Endpoint:** `GET /api/days/option`

**Query Parameters:**
- `dayName` (string, required): Name of the day to fetch

**Purpose:** Fetch a specific day option by name

**Response Format:**
```json
{
  "success": true,
  "dayOption": {
    "id": "some-id",
    "day": "monday",
    "label": "Mon",
    "sequence": 1,
    "enabled": true,
    "date": "2025-01-20",
    "formattedDate": "Monday (Jan 20)",
    "fullDate": "Monday, January 20, 2025",
    "isToday": false
  }
}
```

**Headers:**
```http
Deprecation: true
```

#### Migration Path

**Before (Old Endpoint):**
```typescript
// Get Monday option
const dayName = 'monday';
const response = await fetch(`/api/days/option?dayName=${dayName}`);
const data = await response.json();
if (data.success) {
  const monday = data.dayOption;
  console.log(`Monday is ${monday.enabled ? 'enabled' : 'disabled'}`);
}
```

**After (New Endpoint):**
```typescript
// Get all dates and filter for specific date
const response = await fetch('/api/available-dates');
const data = await response.json();
if (data.success) {
  // Option 1: Get specific date
  const specificDate = data.dates.find(d => d.date === '2025-01-20');

  // Option 2: Get all Mondays in range
  const mondays = data.dates.filter(d => {
    const dateObj = new Date(d.date);
    return dateObj.getDay() === 1; // 1 = Monday
  });

  console.log(`Found ${mondays.length} available Mondays`);
}
```

**Alternative - Date Range Query:**
```typescript
// More efficient: Query specific date range first
const startDate = '2025-01-01';
const endDate = '2025-01-31';
const response = await fetch(
  `/api/available-dates?startDate=${startDate}&endDate=${endDate}`
);
const data = await response.json();

if (data.success) {
  const tuesday = data.dates.find(d => {
    const dateObj = new Date(d.date);
    return dateObj.getDay() === 2; // 2 = Tuesday
  });
}
```

**Why This Change?**
- Single-day queries don't make sense in date-based system
- More efficient to fetch range and filter client-side
- Reduces number of API calls
- Better for caching

---

## New Endpoints

### `GET /api/available-dates`

**Status:** ✅ ACTIVE (Use this)

**Purpose:** Fetch available calendar dates from database with flexible filtering

#### Endpoint Details

**Endpoint:** `GET /api/available-dates`

**Authentication:** Not required (public endpoint)

**Query Parameters:**
- `startDate` (string, optional): Start date in YYYY-MM-DD format
  - Default: Today's date
  - Example: `2025-01-01`
- `endDate` (string, optional): End date in YYYY-MM-DD format
  - Default: 60 days from start date
  - Example: `2025-01-31`

**Default Behavior:**
- If no parameters provided, returns available dates from today to 60 days in future
- Always filters for `flatCategoryEnabled: true`
- Returns dates sorted in ascending order by date

#### Response Format

**Success Response:**
```json
{
  "success": true,
  "dates": [
    {
      "id": "2025-01-20",
      "date": "2025-01-20",
      "flatCategoryEnabled": true,
      "dayWiseCategoryEnabled": true,
      "formattedDate": "Monday, Jan 20",
      "fullDate": "Monday, January 20, 2025",
      "isToday": false,
      "isPast": false
    },
    {
      "id": "2025-01-21",
      "date": "2025-01-21",
      "flatCategoryEnabled": true,
      "dayWiseCategoryEnabled": true,
      "formattedDate": "Tuesday, Jan 21",
      "fullDate": "Tuesday, January 21, 2025",
      "isToday": false,
      "isPast": false
    }
  ]
}
```

**Error Response (Invalid Date Format):**
```json
{
  "success": false,
  "error": "Invalid startDate format. Use YYYY-MM-DD format.",
  "dates": []
}
```

**Error Response (Invalid Range):**
```json
{
  "success": false,
  "error": "startDate must be before or equal to endDate",
  "dates": []
}
```

**Error Response (Server Error):**
```json
{
  "success": false,
  "error": "Failed to fetch available dates",
  "dates": []
}
```

#### Usage Examples

**Example 1: Get Default Range (Today to 60 days)**
```typescript
const response = await fetch('/api/available-dates');
const data = await response.json();

if (data.success) {
  console.log(`Found ${data.dates.length} available dates`);
  // Display next 7 dates
  data.dates.slice(0, 7).forEach(date => {
    console.log(date.formattedDate);
  });
}
```

**Example 2: Get Specific Date Range**
```typescript
const startDate = '2025-01-01';
const endDate = '2025-01-31';
const params = new URLSearchParams({
  startDate,
  endDate
});

const response = await fetch(`/api/available-dates?${params}`);
const data = await response.json();

if (data.success) {
  console.log(`Available dates in January: ${data.dates.length}`);
}
```

**Example 3: Get Next Available Date**
```typescript
const response = await fetch('/api/available-dates');
const data = await response.json();

if (data.success && data.dates.length > 0) {
  const nextDate = data.dates.find(d => !d.isPast);
  if (nextDate) {
    console.log(`Next delivery: ${nextDate.formattedDate}`);
  }
}
```

**Example 4: Filter by Day of Week**
```typescript
const response = await fetch('/api/available-dates');
const data = await response.json();

if (data.success) {
  // Get all Tuesdays (day 2)
  const tuesdays = data.dates.filter(d => {
    const dateObj = new Date(d.date);
    return dateObj.getDay() === 2;
  });

  console.log(`Available Tuesdays: ${tuesdays.length}`);
  tuesdays.forEach(tuesday => {
    console.log(tuesday.formattedDate);
  });
}
```

**Example 5: Check if Specific Date is Available**
```typescript
const targetDate = '2025-01-20';
const response = await fetch('/api/available-dates');
const data = await response.json();

if (data.success) {
  const isAvailable = data.dates.some(d => d.date === targetDate);
  console.log(`${targetDate} is ${isAvailable ? 'available' : 'not available'}`);
}
```

**Example 6: Populate Date Selection UI**
```typescript
const response = await fetch('/api/available-dates');
const data = await response.json();

if (data.success) {
  const options = data.dates.map(date => ({
    value: date.date,
    label: date.formattedDate,
    disabled: date.isPast
  }));

  // Use with select dropdown
  return (
    <select>
      {options.map(option => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
```

#### DateOption Interface

```typescript
interface DateOption {
  /** Unique identifier (the date string in YYYY-MM-DD format) */
  id: string;

  /** Date in YYYY-MM-DD format (ISO date string) */
  date: string;

  /** Whether flat category is enabled for this date */
  flatCategoryEnabled: boolean;

  /** Whether day-wise category is enabled for this date */
  dayWiseCategoryEnabled: boolean;

  /** Formatted date for display (e.g., "Friday, Jan 15") */
  formattedDate: string;

  /** Full date with timezone information */
  fullDate: string;

  /** Whether this date is today in PST timezone */
  isToday: boolean;

  /** Whether this date is in the past (timezone-aware) */
  isPast: boolean;
}
```

---

## Migration Examples

### Example 1: Migrating a Date Selection Component

**Before (Using Old Endpoint):**
```typescript
import { generateAvailableDaysFromAPI } from '@/lib/dayAvailabilityClient';

function DateSelector() {
  const [days, setDays] = useState([]);

  useEffect(() => {
    generateAvailableDaysFromAPI(false).then(setDays);
  }, []);

  return (
    <select>
      {days.map(day => (
        <option key={day.id} value={day.day}>
          {day.formattedDate}
        </option>
      ))}
    </select>
  );
}
```

**After (Using New Endpoint):**
```typescript
import { generateAvailableDatesFromAPI } from '@/lib/dayAvailabilityClient';

function DateSelector() {
  const [dates, setDates] = useState([]);

  useEffect(() => {
    generateAvailableDatesFromAPI(false).then(setDates);
  }, []);

  return (
    <select>
      {dates.map(date => (
        <option
          key={date.id}
          value={date.date}
          disabled={date.isPast}
        >
          {date.formattedDate}
        </option>
      ))}
    </select>
  );
}
```

---

### Example 2: Migrating Cart Operations

**Before (Using Day Names):**
```typescript
// Add item to cart with day name
async function addToCart(foodItemId: string, dayName: string) {
  const response = await fetch('/api/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      foodItemId,
      day: dayName,
      quantity: 1
    })
  });
  return response.json();
}

// Usage
addToCart('item123', 'monday');
```

**After (Using Date Strings):**
```typescript
// Add item to cart with date string
async function addToCart(foodItemId: string, date: string) {
  const response = await fetch('/api/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      foodItemId,
      date,
      quantity: 1
    })
  });
  return response.json();
}

// Usage
addToCart('item123', '2025-01-20');
```

---

### Example 3: Migrating Food Items by Category

**Before (Day-Based):**
```typescript
// Old endpoint might have used day names in response
const response = await fetch('/api/food-items-by-category');
const data = await response.json();

if (data.success) {
  const mondayItems = data.itemsByDay['monday'];
  console.log('Monday items:', mondayItems);
}
```

**After (Date-Based):**
```typescript
// New endpoint uses date strings as keys
const response = await fetch('/api/food-items-by-category');
const data = await response.json();

if (data.success) {
  const itemsForDate = data.itemsByDate['2025-01-20'];
  console.log('Items for Jan 20:', itemsForDate);
}
```

---

## Breaking Changes

### 1. Response Field Names

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `day` | `date` | Now uses date string instead of day name |
| `label` | `formattedDate` | More descriptive name |
| `sequence` | *(removed)* | Dates are naturally sorted |
| `enabled` | `flatCategoryEnabled` | More specific name |

### 2. Query Parameters

| Old Parameter | New Parameter | Notes |
|---------------|---------------|-------|
| `includeDisabled` | *(removed)* | New endpoint only returns enabled dates |
| *(none)* | `startDate` | New: filter by start date |
| *(none)* | `endDate` | New: filter by end date |

### 3. Response Structure

**Old Response:**
```json
{
  "success": true,
  "days": [...]  // Array of day objects
}
```

**New Response:**
```json
{
  "success": true,
  "dates": [...]  // Array of date objects
}
```

---

## Testing Checklist

Before deploying to production, ensure:

- [ ] All API calls to `/api/enabled-days` are migrated to `/api/available-dates`
- [ ] All API calls to `/api/days/available` are migrated to `/api/available-dates`
- [ ] All API calls to `/api/days/option` are migrated to `/api/available-dates` + filtering
- [ ] Response field names are updated (`day` → `date`, `label` → `formattedDate`)
- [ ] Date string format is validated (YYYY-MM-DD)
- [ ] Error handling accounts for new error response format
- [ ] UI components properly display dates instead of day labels
- [ ] Date range filtering works correctly
- [ ] Timezone handling is consistent (PST)
- [ ] Cart operations use date strings
- [ ] Backward compatibility is maintained during transition period

---

## Rollback Plan

If issues arise after migration:

1. **Old Endpoints Still Available**: Deprecated endpoints remain functional until removal date
2. **Feature Flags**: Can use feature flags to control which system is used
3. **Database Compatibility**: Both database collections (`availableDays` and `availableDates`) can coexist
4. **Graceful Degradation**: New code can fall back to old endpoints if needed

**Example Rollback Code:**
```typescript
// Try new endpoint first, fall back to old
async function getAvailableDates() {
  try {
    const response = await fetch('/api/available-dates');
    const data = await response.json();
    if (data.success) {
      return data.dates;
    }
  } catch (error) {
    console.warn('New endpoint failed, trying old endpoint');
  }

  // Fallback to old endpoint
  const response = await fetch('/api/days/available');
  const data = await response.json();
  return data.days;
}
```

---

## Summary

| Aspect | Old System | New System |
|--------|-----------|-----------|
| **Endpoint** | `/api/days/available` | `/api/available-dates` |
| **Response** | Day-based objects | Date-based objects |
| **Filtering** | `includeDisabled` | `startDate`, `endDate` |
| **Granularity** | Weekly patterns | Individual dates |
| **Future Planning** | Limited | Unlimited |
| **Holiday Handling** | Difficult | Easy |
