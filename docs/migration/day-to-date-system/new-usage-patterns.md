# New Usage Patterns

## Table of Contents
- [Overview](#overview)
- [Date Selection Patterns](#date-selection-patterns)
- [Cart Operation Patterns](#cart-operation-patterns)
- [Display and Formatting Patterns](#display-and-formatting-patterns)
- [API Integration Patterns](#api-integration-patterns)
- [Common Use Cases](#common-use-cases)

---

## Overview

This document provides practical examples of how to use the new date-based system. Each example shows the old pattern (day-based) alongside the new pattern (date-based) for easy comparison.

**⚠️ IMPORTANT - Day Name Format Change:**
- **Old system**: Day names in lowercase (e.g., "monday", "tuesday", "wednesday")
- **New system**: Day names in Title Case (e.g., "Monday", "Tuesday", "Wednesday")
- This change aligns with JavaScript's `toLocaleDateString()` formatting and ensures consistency
- All examples below reflect the new Title Case format

---

## Date Selection Patterns

### Pattern 1: Fetching Available Delivery Dates

**❌ Old Pattern (Day-Based)**:
```typescript
import { generateAvailableDaysFromAPI } from '@/lib/dayAvailabilityClient';

const availableDays = await generateAvailableDaysFromAPI(false);

// Display options
availableDays.forEach(day => {
  console.log(`${day.label}: ${day.formattedDate}`);
});
// Output:
// Mon: Monday (Jan 20)
// Tue: Tuesday (Jan 21)
// Wed: Wednesday (Jan 22)
```

**✅ New Pattern (Date-Based)**:
```typescript
import { generateAvailableDatesFromAPI } from '@/lib/dayAvailabilityClient';

const availableDates = await generateAvailableDatesFromAPI(false);

// Display options
availableDates.forEach(date => {
  console.log(date.formattedDate);
});
// Output:
// Monday, Jan 20
// Tuesday, Jan 21
// Wednesday, Jan 22
```

---

### Pattern 2: Populating Date Selection Dropdown

**❌ Old Pattern**:
```typescript
const [selectedDay, setSelectedDay] = useState('');
const [availableDays, setAvailableDays] = useState([]);

useEffect(() => {
  generateAvailableDaysFromAPI(false).then(setAvailableDays);
}, []);

return (
  <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
    <option value="">Select a day</option>
    {availableDays.map(day => (
      <option key={day.id} value={day.day}>
        {day.label} - {day.formattedDate}
      </option>
    ))}
  </select>
);
```

**✅ New Pattern**:
```typescript
const [selectedDate, setSelectedDate] = useState('');
const [availableDates, setAvailableDates] = useState([]);

useEffect(() => {
  generateAvailableDatesFromAPI(false).then(setAvailableDates);
}, []);

return (
  <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
    <option value="">Select a delivery date</option>
    {availableDates
      .filter(date => !date.isPast)  // Exclude past dates
      .map(date => (
        <option
          key={date.id}
          value={date.date}
          disabled={date.isPast}
        >
          {date.formattedDate}
          {date.isToday && ' (Today)'}
        </option>
      ))}
  </select>
);
```

---

### Pattern 3: Getting Next Available Delivery Date

**❌ Old Pattern**:
```typescript
import { getNextAvailableDay } from '@/lib/server/dayAvailability';

const nextDay = await getNextAvailableDay();
if (nextDay) {
  console.log(`Next delivery: ${nextDay.label} (${nextDay.date})`);
}
```

**✅ New Pattern**:
```typescript
import { getNextAvailableDate } from '@/lib/server/availableDates';

const nextDate = await getNextAvailableDate();
if (nextDate) {
  console.log(`Next delivery: ${nextDate.formattedDate}`);
}

// Example output: "Next delivery: Monday, Jan 20"
```

---

### Pattern 4: Filtering Dates by Range

**❌ Old Pattern (Not Supported)**:
```typescript
// Old system couldn't filter by date range
// Had to fetch all days and filter manually
const allDays = await generateAvailableDaysFromAPI(false);
const futureDays = allDays.filter(day => {
  const dayDate = new Date(day.date);
  const today = new Date();
  const daysDiff = (dayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff >= 0 && daysDiff <= 30;
});
```

**✅ New Pattern**:
```typescript
// New system supports date range filtering at API level
const startDate = '2025-01-01';
const endDate = '2025-01-31';
const datesInRange = await generateAvailableDatesFromAPI(false, startDate, endDate);

console.log(`Found ${datesInRange.length} available dates in January`);
```

---

### Pattern 5: Checking if Specific Date is Available

**❌ Old Pattern**:
```typescript
// Had to fetch all days and find by day name
// Note: Old system used lowercase day names
const allDays = await generateAvailableDaysFromAPI(false);
const monday = allDays.find(day => day.day === 'monday');

if (monday && monday.enabled) {
  console.log('Monday is available');
}
```

**✅ New Pattern**:
```typescript
// Check specific date directly
const targetDate = '2025-01-20';
const allDates = await generateAvailableDatesFromAPI(false);
const isAvailable = allDates.some(d => d.date === targetDate);

if (isAvailable) {
  console.log(`${targetDate} is available for delivery`);
}

// Alternative: Use server function
import { isDateDisabled } from '@/lib/server/availableDates';

const isDisabled = isDateDisabled('2025-01-20');
if (!isDisabled) {
  console.log('Date is available');
}
```

---

## Cart Operation Patterns

### Pattern 1: Adding Item to Cart

**❌ Old Pattern**:
```typescript
import { addItem } from '@/lib/localStorageCart';

// Add item for Monday
await addItem(
  'monday',           // Day name
  foodItem,
  2,
  customizations
);
```

**✅ New Pattern**:
```typescript
import { addItem } from '@/lib/localStorageCart';

// Add item for specific date
await addItem(
  'monday',           // Day name (for backward compatibility)
  '2025-01-20',       // Date string (preferred)
  foodItem,
  2,
  customizations
);

// Type-safe version
const deliveryDate: DateType = '2025-01-20';
await addItem('monday', deliveryDate, foodItem, 2, customizations);
```

---

### Pattern 2: Getting Items for Specific Date

**❌ Old Pattern**:
```typescript
import { getItemsForDay } from '@/lib/localStorageCart';

const mondayItems = getItemsForDay('monday');
console.log(`Monday items: ${mondayItems.length}`);
```

**✅ New Pattern**:
```typescript
import { getAllDays } from '@/lib/localStorageCart';

const allDays = await getAllDays();

// Option 1: Filter by date string
const itemsForDate = allDays.find(day => day.date === '2025-01-20');
if (itemsForDate) {
  const itemList = Object.values(itemsForDate.items);
  console.log(`Items for Jan 20: ${itemList.length}`);
}

// Option 2: Filter by day name (backward compatible)
// Note: Day names are now in Title Case format
const mondayItems = allDays.find(day => day.day === 'Monday');
if (mondayItems) {
  const itemList = Object.values(mondayItems.items);
  console.log(`Monday items: ${itemList.length}`);
}
```

---

### Pattern 3: Updating Cart Item Quantity

**❌ Old Pattern**:
```typescript
import { updateQuantity } from '@/lib/localStorageCart';

await updateQuantity('monday', 'food-item-123', 3);
```

**✅ New Pattern**:
```typescript
import { updateQuantity } from '@/lib/localStorageCart';

// Still uses day name as key (for backward compatibility)
// Note: Day names are now in Title Case format
await updateQuantity('Monday', 'food-item-123', 3);

// Recommended: Use date to find the day first
const allDays = await getAllDays();
const targetDay = allDays.find(d => d.date === '2025-01-20');
if (targetDay) {
  await updateQuantity(targetDay.day, 'food-item-123', 3);
}
```

---

### Pattern 4: Displaying Cart by Delivery Date

**❌ Old Pattern**:
```typescript
const days = await getAllDays();

days.forEach(day => {
  console.log(`${day.day}: ${Object.values(day.items).length} items`);
});
// Output:
// monday: 3 items
// tuesday: 2 items
```

**✅ New Pattern**:
```typescript
const days = await getAllDays();

days.forEach(day => {
  console.log(`${day.date} (${day.day}): ${Object.values(day.items).length} items`);
});
// Output:
// 2025-01-20 (Monday): 3 items
// 2025-01-21 (Tuesday): 2 items

// Or display formatted date
days.forEach(day => {
  const dateObj = new Date(day.date);
  const formatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
  console.log(`${formatted}: ${Object.values(day.items).length} items`);
});
// Output:
// Monday, Jan 20: 3 items
// Tuesday, Jan 21: 2 items
```

---

## Display and Formatting Patterns

### Pattern 1: Displaying Delivery Date in UI

**❌ Old Pattern**:
```typescript
function DeliveryDateDisplay({ day }: { day: string }) {
  return <span>Delivers on {day.charAt(0).toUpperCase() + day.slice(1)}</span>;
}

// Usage: <DeliveryDateDisplay day="monday" />
// Output: "Delivers on Monday"
```

**✅ New Pattern**:
```typescript
function DeliveryDateDisplay({ date }: { date: string }) {
  const dateObj = new Date(date + 'T00:00:00.000Z');

  const formatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles'
  });

  return <span>Delivers on {formatted}</span>;
}

// Usage: <DeliveryDateDisplay date="2025-01-20" />
// Output: "Delivers on Monday, January 20, 2025"
```

---

### Pattern 2: Showing Relative Date (Today, Tomorrow, etc.)

**❌ Old Pattern**:
```typescript
function RelativeDayDisplay({ day, date }: { day: string; date: string }) {
  const dateObj = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isToday = dateObj.toDateString() === today.toDateString();
  const isTomorrow = dateObj.toDateString() === tomorrow.toDateString();

  if (isToday) return <span>Today ({day})</span>;
  if (isTomorrow) return <span>Tomorrow ({day})</span>;
  return <span>{day}</span>;
}
```

**✅ New Pattern**:
```typescript
import { isPSTToday } from '@/lib/timezone';

function RelativeDateDisplay({ date, isToday, isPast }: {
  date: string;
  isToday: boolean;
  isPast: boolean;
}) {
  if (isPast) return <span className="text-gray-500">{date} (Past)</span>;
  if (isToday) return <span className="text-green-600">{date} (Today)</span>;

  // Calculate if tomorrow
  const dateObj = new Date(date + 'T00:00:00.000Z');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isTomorrow = dateObj.toDateString() === tomorrow.toDateString();
  if (isTomorrow) return <span className="text-blue-600">{date} (Tomorrow)</span>;

  return <span>{date}</span>;
}

// Usage with API data
const dates = await generateAvailableDatesFromAPI();
dates.forEach(date => (
  <RelativeDateDisplay
    key={date.id}
    date={date.formattedDate}
    isToday={date.isToday}
    isPast={date.isPast}
  />
));
```

---

### Pattern 3: Sorting Cart by Delivery Date

**❌ Old Pattern**:
```typescript
const days = await getAllDays();

// Sort by day sequence (not ideal)
const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
days.sort((a, b) => {
  return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
});
```

**✅ New Pattern**:
```typescript
const days = await getAllDays();

// Sort by actual calendar date
days.sort((a, b) => {
  return new Date(a.date).getTime() - new Date(b.date).getTime();
});

// Display in chronological order
days.forEach(day => {
  console.log(`${day.date}: ${Object.values(day.items).length} items`);
});
```

---

## API Integration Patterns

### Pattern 1: Fetching Food Items by Date

**❌ Old Pattern**:
```typescript
const response = await fetch('/api/food-items-by-category');
const data = await response.json();

if (data.success) {
  const mondayItems = data.itemsByDay['monday'];
  const tuesdayItems = data.itemsByDay['tuesday'];
}
```

**✅ New Pattern**:
```typescript
const response = await fetch('/api/food-items-by-category');
const data = await response.json();

if (data.success) {
  const itemsForDate = data.itemsByDate['2025-01-20'];

  // Or filter by multiple dates
  const datesToCheck = ['2025-01-20', '2025-01-21', '2025-01-22'];
  datesToCheck.forEach(date => {
    const items = data.itemsByDate[date];
    console.log(`Items for ${date}:`, items?.length || 0);
  });
}
```

---

### Pattern 2: Creating Order with Delivery Date

**❌ Old Pattern**:
```typescript
const orderData = {
  items: cartItems,
  deliveryDay: 'monday',
  deliveryDate: null,
  addressId,
  ...
};

const response = await fetch('/api/orders/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderData)
});
```

**✅ New Pattern**:
```typescript
const orderData = {
  items: cartItems,
  deliveryDate: '2025-01-20',
  addressId,
  ...
};

const response = await fetch('/api/orders/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderData)
});
```

---

### Pattern 3: Validating Date Before Adding to Cart

**❌ Old Pattern**:
```typescript
import { isDayDisabled } from '@/lib/server/dayAvailability';

const dayToCheck = new Date('2025-01-20');
if (isDayDisabled(dayToCheck)) {
  alert('This day is not available for delivery');
  return;
}
```

**✅ New Pattern**:
```typescript
import { isDateDisabled } from '@/lib/server/availableDates';

const dateToCheck = '2025-01-20';
if (isDateDisabled(dateToCheck)) {
  alert('This date is not available for delivery');
  return;
}

// Or check against available dates
const availableDates = await generateAvailableDatesFromAPI();
const isAvailable = availableDates.some(d => d.date === dateToCheck && !d.isPast);

if (!isAvailable) {
  alert('This date is not available for delivery');
  return;
}
```

---

## Common Use Cases

### Use Case 1: Date Picker Component

**Implementation**:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { generateAvailableDatesFromAPI } from '@/lib/dayAvailabilityClient';

interface DatePickerProps {
  onSelect: (date: string) => void;
  selectedDate?: string;
}

export function DatePicker({ onSelect, selectedDate }: DatePickerProps) {
  const [availableDates, setAvailableDates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateAvailableDatesFromAPI(false)
      .then(dates => {
        setAvailableDates(dates.filter(d => !d.isPast));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading available dates...</div>;

  return (
    <div className="date-picker">
      <label>Select Delivery Date</label>
      <select
        value={selectedDate || ''}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">Choose a date</option>
        {availableDates.map(date => (
          <option
            key={date.id}
            value={date.date}
            disabled={date.isPast}
          >
            {date.formattedDate}
            {date.isToday && ' - Today'}
          </option>
        ))}
      </select>
    </div>
  );
}
```

**Usage**:
```typescript
const [selectedDate, setSelectedDate] = useState('');

<DatePicker
  onSelect={setSelectedDate}
  selectedDate={selectedDate}
/>
```

---

### Use Case 2: Cart Summary by Date

**Implementation**:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { getAllDays } from '@/lib/localStorageCart';

export function CartSummaryByDate() {
  const [cartDays, setCartDays] = useState([]);

  useEffect(() => {
    getAllDays().then(setCartDays);
  }, []);

  if (cartDays.length === 0) {
    return <div>Your cart is empty</div>;
  }

  return (
    <div className="cart-summary">
      <h2>Order Summary by Delivery Date</h2>
      {cartDays.map(cartDay => {
        const items = Object.values(cartDay.items);
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

        return (
          <div key={cartDay.date} className="cart-day">
            <h3>{cartDay.date}</h3>
            <p>{itemCount} items</p>
            <p>Subtotal: ${subtotal.toFixed(2)}</p>
          </div>
        );
      })}
    </div>
  );
}
```

---

### Use Case 3: Upcoming Deliveries Display

**Implementation**:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { getAllDays } from '@/lib/localStorageCart';

export function UpcomingDeliveries() {
  const [upcomingDeliveries, setUpcomingDeliveries] = useState([]);

  useEffect(() => {
    getAllDays().then(days => {
      // Sort by date and filter future dates
      const sorted = days
        .filter(day => {
          const dayDate = new Date(day.date);
          const today = new Date();
          return dayDate >= today;
        })
        .sort((a, b) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

      setUpcomingDeliveries(sorted);
    });
  }, []);

  if (upcomingDeliveries.length === 0) {
    return <div>No upcoming deliveries</div>;
  }

  return (
    <div className="upcoming-deliveries">
      <h2>Upcoming Deliveries</h2>
      {upcomingDeliveries.map(delivery => {
        const items = Object.values(delivery.items);
        const dateObj = new Date(delivery.date);

        return (
          <div key={delivery.date} className="delivery-card">
            <div className="delivery-date">
              {dateObj.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div className="delivery-items">
              {items.length} items
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

### Use Case 4: Date Availability Checker

**Implementation**:
```typescript
'use client';

import { useState } from 'react';
import { isDateDisabled } from '@/lib/server/availableDates';

export function DateAvailabilityChecker() {
  const [dateInput, setDateInput] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkDate = async () => {
    setChecking(true);
    const disabled = isDateDisabled(dateInput);
    setAvailable(!disabled);
    setChecking(false);
  };

  return (
    <div className="date-checker">
      <h3>Check Date Availability</h3>
      <input
        type="date"
        value={dateInput}
        onChange={(e) => setDateInput(e.target.value)}
        min={new Date().toISOString().split('T')[0]}
      />
      <button onClick={checkDate} disabled={checking || !dateInput}>
        {checking ? 'Checking...' : 'Check Availability'}
      </button>

      {available !== null && (
        <div className={available ? 'available' : 'unavailable'}>
          {available
            ? `✓ ${dateInput} is available for delivery`
            : `✗ ${dateInput} is not available for delivery`
          }
        </div>
      )}
    </div>
  );
}
```

---

## Summary

### Key Benefits of New Patterns

1. **More Explicit**: Date strings are clearer than day names
2. **Better UX**: Users see actual delivery dates, not abstract day names
3. **Flexible**: Easy to filter, sort, and query specific dates
4. **Future-Proof**: Can handle any date, not just recurring weekly patterns
5. **Type-Safe**: Date format is validated (YYYY-MM-DD)

### Migration Quick Reference

| Task | Old Pattern | New Pattern |
|------|-------------|-------------|
| Fetch available | `generateAvailableDaysFromAPI()` | `generateAvailableDatesFromAPI()` |
| Add to cart | `addItem('monday', ...)` | `addItem('monday', '2025-01-20', ...)` |
| Check availability | `isDayDisabled(date)` | `isDateDisabled(date)` |
| Get next available | `getNextAvailableDay()` | `getNextAvailableDate()` |
| Display date | `day.label` | `date.formattedDate` |

### Best Practices

1. **Always use date strings** for new code
2. **Validate date format** (YYYY-MM-DD) before storage
3. **Filter out past dates** in UI components
4. **Show relative dates** (Today, Tomorrow) when possible
5. **Sort chronologically** for better UX
6. **Use timezone-aware functions** for date calculations
7. **Keep both fields** during migration period for compatibility
