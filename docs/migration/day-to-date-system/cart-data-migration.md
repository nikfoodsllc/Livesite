# Cart Data Migration Guide

## Table of Contents
- [Overview](#overview)
- [Understanding Cart Data Structure](#understanding-cart-data-structure)
- [Migration Strategy](#migration-strategy)
- [Handling Old Cart Data](#handling-old-cart-data)
- [LocalStorage Cart Migration](#localstorage-cart-migration)
- [Server-Side Cart Migration](#server-side-cart-migration)
- [Data Validation](#data-validation)
- [Testing Migration](#testing-migration)

---

**⚠️ IMPORTANT - Day Name Format Change:**
- **Old format**: Day names in lowercase (e.g., "monday", "tuesday", "wednesday")
- **New format**: Day names in Title Case (e.g., "Monday", "Tuesday", "Wednesday")
- This affects the `day` field in cart items and LocalStorage data
- The new format aligns with JavaScript's `toLocaleDateString()` formatting
- Migration helpers automatically convert lowercase to Title Case

---

## Overview

During the transition from day-of-week to date-based system, cart data exists in potentially three states:

1. **Old Format**: Only `day` field (legacy) - lowercase day names
2. **Transition Format**: Both `day` and `date` fields (current) - Title Case day names
3. **New Format**: Only `date` field (future)

This guide explains how to handle cart data during each stage of migration.

---

## Understanding Cart Data Structure

### CartItem Interface

```typescript
interface CartItem {
  _id: string;
  foodItem: FoodItem;
  quantity: number;

  // Legacy field (deprecated)
  /** @deprecated Legacy field - use 'date' field instead */
  day: DayType;

  // New field (preferred)
  /** Preferred field for date operations (ISO date format) */
  date: string;

  selectedCustomizations?: SelectedCustomization[];
  selectedSpiceLevel?: SpiceLevel;
  selectedPortion?: string;
  selectedPortionPrice?: number;
  isEcoFriendlyContainer?: boolean;
  ecoContainerCharge?: number;
  comboSelections?: Record<string, string>;
  notes?: string;
  price: number;
  subtotal: number;
  totalPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### CartDay Interface

```typescript
interface CartDay {
  _id: string;

  // Legacy field (deprecated)
  /** @deprecated Legacy field - use 'date' field instead */
  day: DayType;

  // New field (preferred)
  /** Preferred field for date operations (ISO date format) */
  date: string;

  items: CartItem[];
  subtotal: number;
  dayTotal: number;
  deliveryMessage?: DeliveryMessage;
  meetsMinimum: boolean;
}
```

### LocalStorage Cart Structure

```typescript
interface LocalCart {
  days: {
    [day: string]: LocalCartDay;  // Key is DayType during transition
  };
  version: string;
  lastUpdated: string;
}

interface LocalCartDay {
  day: DayType;    // Legacy: "monday" (lowercase) → Now: "Monday" (Title Case)
  date: string;    // New: "2025-01-20"
  items: {
    [foodItemId: string]: LocalCartItem;
  };
}

**Day Name Format Evolution:**
- **Legacy**: Lowercase format (e.g., "monday", "tuesday")
- **Current**: Title Case format (e.g., "Monday", "Tuesday")
- Migration helpers automatically convert old lowercase to Title Case
```

---

## Migration Strategy

### Phase 1: Dual Field Storage (Current) ✅

**Status**: Currently Active

**Description**: Both `day` and `date` fields are stored in cart data

**Rationale**:
- Maintains backward compatibility with old code
- Allows gradual migration of components
- Enables A/B testing during transition

**Example**:
```json
{
  "_id": "cart-item-123",
  "foodItem": {...},
  "quantity": 2,
  "day": "monday",           // Legacy field
  "date": "2025-01-20",      // New field
  "price": 15.00,
  "totalPrice": 30.00
}
```

**Code Behavior**:
- Old code reads/writes `day` field
- New code reads `date` field, writes both fields
- Both systems work simultaneously

---

### Phase 2: Date-Only Storage (Planned) 🔄

**Status**: Planned (Future Release)

**Description**: Only `date` field is stored, `day` field removed

**Prerequisites**:
- All components migrated to use `date` field
- All API endpoints updated
- No remaining dependencies on `day` field

**Example**:
```json
{
  "_id": "cart-item-123",
  "foodItem": {...},
  "quantity": 2,
  "date": "2025-01-20",      // Only date field
  "price": 15.00,
  "totalPrice": 30.00
}
```

---

## Handling Old Cart Data

### Scenario 1: Reading Cart with Only `day` Field

**Problem**: Old cart data has `day` field but no `date` field

**Solution**: Derive `date` from `day` using current week's date

```typescript
/**
 * Migrate cart item from old format to new format
 * Adds date field based on day field
 */
function migrateCartItem(item: CartItem): CartItem {
  // If date already exists, no migration needed
  if (item.date) {
    return item;
  }

  // Derive date from day field
  const dayName = item.day.toLowerCase();
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate days until next occurrence of this day
  const targetDay = getDayNumber(dayName);
  let daysUntilTarget = (targetDay - dayOfWeek + 7) % 7;

  // If today is the target day, use today
  if (daysUntilTarget === 0) {
    daysUntilTarget = 7; // Use next week's occurrence
  }

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntilTarget);

  // Add date field to item
  return {
    ...item,
    date: targetDate.toISOString().split('T')[0]
  };
}

function getDayNumber(dayName: string): number {
  const days: Record<string, number> = {
    'sunday': 0,
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6
  };
  return days[dayName.toLowerCase()] ?? 0;
}
```

**Usage**:
```typescript
// When loading cart from storage
const cart = await loadCartFromDatabase();

const migratedCart = {
  ...cart,
  days: cart.days.map(cartDay => ({
    ...cartDay,
    items: cartDay.items.map(migrateCartItem)
  }))
};
```

---

### Scenario 2: Adding Items to Existing Cart

**Problem**: Need to ensure both `day` and `date` fields are populated

**Solution**: Always populate both fields when adding items

```typescript
/**
 * Add item to cart with both day and date fields
 */
async function addToCart(
  foodItemId: string,
  dateString: string,
  quantity: number,
  customizations: CartCustomizations
): Promise<CartItem> {
  // Parse date string to get day name
  const dateObj = new Date(dateString + 'T00:00:00.000Z');
  const dayName = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'America/Los_Angeles'
  }).toLowerCase();

  // Create cart item with both fields
  const cartItem: CartItem = {
    _id: generateId(),
    foodItem: await getFoodItem(foodItemId),
    quantity,
    day: dayName,      // Legacy field (for backward compatibility)
    date: dateString,   // New field (preferred)
    ...customizations,
    price: calculatePrice(foodItem, customizations),
    subtotal: calculatePrice(foodItem, customizations) * quantity,
    totalPrice: calculatePrice(foodItem, customizations) * quantity,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return cartItem;
}
```

---

### Scenario 3: Filtering/Sorting Cart Days

**Problem**: Need to sort cart days by actual date, not by day name

**Solution**: Use `date` field for sorting, fallback to `day` if needed

```typescript
/**
 * Sort cart days by date (newest first)
 */
function sortCartDaysByDate(days: CartDay[]): CartDay[] {
  return [...days].sort((a, b) => {
    // Prefer date field
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }

    // Fallback to day field (legacy)
    if (a.day && b.day) {
      const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      return dayOrder.indexOf(b.day.toLowerCase()) - dayOrder.indexOf(a.day.toLowerCase());
    }

    return 0;
  });
}
```

---

## LocalStorage Cart Migration

### localStorageCart.ts Functions

The `localStorageCart.ts` file already has dual-field support:

```typescript
export function addItem(
  day: DayType,
  date: string,
  foodItem: FoodItem,
  quantity: number,
  customizations: CartCustomizations = {}
): LocalCart {
  const cart = getCart();

  // Initialize day if it doesn't exist
  if (!cart.days[day]) {
    cart.days[day] = {
      day,      // Legacy field
      date,     // New field
      items: {}
    };
  }

  // ... rest of function

  saveCart(cart);
  return cart;
}
```

### Migration Helper for LocalStorage

```typescript
/**
 * Migrate existing localStorage cart to include date fields
 * Called on app initialization to ensure data consistency
 */
export async function migrateLocalStorageCart(): Promise<void> {
  const cart = getCart();
  let hasMigrated = false;

  for (const [dayKey, dayData] of Object.entries(cart.days)) {
    // Skip if date field already exists
    if (dayData.date) {
      continue;
    }

    // Fetch available dates to map day name to date
    const dateOptions = await generateAvailableDatesFromAPI(false);

    // Find matching date for this day
    const matchingDate = dateOptions.find(option =>
      option.day === dayKey.toLowerCase()
    );

    if (matchingDate) {
      dayData.date = matchingDate.date;
      hasMigrated = true;
      console.log(`Migrated ${dayKey} to ${matchingDate.date}`);
    } else {
      // If no matching date found, remove this day from cart
      console.warn(`No available date found for ${dayKey}, removing from cart`);
      delete cart.days[dayKey];
      hasMigrated = true;
    }
  }

  if (hasMigrated) {
    saveCart(cart);
    console.log('localStorage cart migration complete');
  }
}
```

**Usage in App Initialization**:
```typescript
// In your app root or layout component
useEffect(() => {
  migrateLocalStorageCart();
}, []);
```

---

## Server-Side Cart Migration

### Database Cart Schema

If you store carts in MongoDB, you may need to migrate existing documents:

```typescript
/**
 * Migration script for database cart collection
 * Run this once to migrate all existing cart documents
 */
async function migrateDatabaseCarts(): Promise<void> {
  const { db } = await import('@/lib/server/db');

  // Find all carts that don't have date field in items
  const result = await db.read('carts', {
    'days.items': { $exists: true },
    'days.items.date': { $exists: false }
  });

  if (!result.success || !result.data) {
    console.log('No carts to migrate');
    return;
  }

  const carts = result.data;
  console.log(`Found ${carts.length} carts to migrate`);

  for (const cart of carts) {
    let hasChanges = false;

    // Migrate each day in the cart
    for (const cartDay of cart.days) {
      for (const item of cartDay.items) {
        if (!item.date && item.day) {
          // Derive date from day field
          const dayName = item.day.toLowerCase();
          const today = new Date();
          const targetDate = getNextOccurrenceOfDay(dayName, today);
          item.date = targetDate.toISOString().split('T')[0];
          hasChanges = true;
        }
      }
    }

    // Update cart in database if changes were made
    if (hasChanges) {
      await db.update('carts', { _id: cart._id }, cart);
      console.log(`Migrated cart ${cart._id}`);
    }
  }

  console.log('Database cart migration complete');
}

function getNextOccurrenceOfDay(dayName: string, fromDate: Date): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayName.toLowerCase());
  const currentDay = fromDate.getDay();

  let daysUntilTarget = (targetDay - currentDay + 7) % 7;
  if (daysUntilTarget === 0) {
    daysUntilTarget = 7;
  }

  const targetDate = new Date(fromDate);
  targetDate.setDate(fromDate.getDate() + daysUntilTarget);
  return targetDate;
}
```

---

## Data Validation

### Validate Cart Item Structure

```typescript
/**
 * Validate that cart item has required fields
 */
function validateCartItem(item: CartItem): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!item._id) errors.push('Missing _id');
  if (!item.foodItem) errors.push('Missing foodItem');
  if (!item.quantity && item.quantity !== 0) errors.push('Missing quantity');

  // Check date field (new requirement)
  if (!item.date) {
    errors.push('Missing date field (required in new system)');
  } else {
    // Validate date format
    const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
    if (!dateRegex.test(item.date)) {
      errors.push(`Invalid date format: ${item.date}`);
    }
  }

  // Check day field (for backward compatibility)
  if (!item.day) {
    errors.push('Missing day field (required for backward compatibility)');
  }

  // Validate date/day consistency
  if (item.date && item.day) {
    const dateObj = new Date(item.date + 'T00:00:00.000Z');
    const expectedDay = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'America/Los_Angeles'
    }).toLowerCase();

    if (expectedDay !== item.day.toLowerCase()) {
      errors.push(`Date/day mismatch: date=${item.date} implies ${expectedDay}, but day=${item.day}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

**Usage**:
```typescript
const cart = await loadCart();
cart.days.forEach(cartDay => {
  cartDay.items.forEach(item => {
    const validation = validateCartItem(item);
    if (!validation.valid) {
      console.error('Invalid cart item:', validation.errors);
      // Handle invalid item (remove from cart, fix it, etc.)
    }
  });
});
```

---

### Validate Cart Day Structure

```typescript
/**
 * Validate that cart day has required fields
 */
function validateCartDay(cartDay: CartDay): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!cartDay._id) errors.push('Missing _id');
  if (!Array.isArray(cartDay.items)) errors.push('Missing or invalid items array');

  // Check date field
  if (!cartDay.date) {
    errors.push('Missing date field (required in new system)');
  }

  // Check day field (for backward compatibility)
  if (!cartDay.day) {
    errors.push('Missing day field (required for backward compatibility)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## Testing Migration

### Unit Tests

```typescript
describe('Cart Data Migration', () => {
  test('should migrate cart item with only day field', () => {
    const oldItem: CartItem = {
      _id: 'test-1',
      foodItem: mockFoodItem,
      quantity: 1,
      day: 'monday',
      date: '',  // Empty date field
      price: 10,
      subtotal: 10,
      totalPrice: 10
    };

    const migratedItem = migrateCartItem(oldItem);

    expect(migratedItem.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(migratedItem.day).toBe('monday');
  });

  test('should not migrate cart item that already has date', () => {
    const existingItem: CartItem = {
      _id: 'test-2',
      foodItem: mockFoodItem,
      quantity: 1,
      day: 'monday',
      date: '2025-01-20',
      price: 10,
      subtotal: 10,
      totalPrice: 10
    };

    const migratedItem = migrateCartItem(existingItem);

    expect(migratedItem.date).toBe('2025-01-20');
  });

  test('should validate cart item correctly', () => {
    const validItem: CartItem = {
      _id: 'test-3',
      foodItem: mockFoodItem,
      quantity: 1,
      day: 'monday',
      date: '2025-01-20',
      price: 10,
      subtotal: 10,
      totalPrice: 10
    };

    const validation = validateCartItem(validItem);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('should detect date/day mismatch', () => {
    const invalidItem: CartItem = {
      _id: 'test-4',
      foodItem: mockFoodItem,
      quantity: 1,
      day: 'monday',
      date: '2025-01-21',  // This is a Tuesday
      price: 10,
      subtotal: 10,
      totalPrice: 10
    };

    const validation = validateCartItem(invalidItem);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('Date/day mismatch'))).toBe(true);
  });
});
```

---

### Integration Tests

```typescript
describe('Cart Migration Integration', () => {
  test('should migrate localStorage cart on app load', async () => {
    // Setup: Create old format cart
    const oldCart: LocalCart = {
      days: {
        'monday': {
          day: 'monday',
          date: '',  // Missing date
          items: {}
        }
      },
      version: '1.0',
      lastUpdated: new Date().toISOString()
    };

    localStorage.setItem('nikfoods_guest_cart', JSON.stringify(oldCart));

    // Run migration
    await migrateLocalStorageCart();

    // Verify migration
    const migratedCart = getCart();
    expect(migratedCart.days['monday'].date).toBeTruthy();
    expect(migratedCart.days['monday'].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

---

## Summary Checklist

Use this checklist to ensure proper cart data migration:

- [ ] All cart items have both `day` and `date` fields populated
- [ ] Date format is validated (YYYY-MM-DD)
- [ ] Date/day consistency is validated
- [ ] localStorage migration function is called on app initialization
- [ ] Database migration script is run (if applicable)
- [ ] Cart validation functions are implemented
- [ ] Unit tests cover migration scenarios
- [ ] Integration tests cover end-to-end migration
- [ ] Rollback plan is documented
- [ ] Monitoring is in place to detect migration issues

---

## Rollback Plan

If migration issues arise:

1. **Keep Both Fields**: Maintain both `day` and `date` fields
2. **Feature Flags**: Use feature flags to control which field is used
3. **Validation**: Add validation to reject invalid data
4. **Logging**: Log all migration errors for investigation
5. **Backup**: Keep backups of pre-migration data

**Example Rollback Code**:
```typescript
function getCartItemDate(item: CartItem): string {
  // Try new field first
  if (item.date) {
    return item.date;
  }

  // Fallback to old field
  if (item.day) {
    console.warn('Using legacy day field for item', item._id);
    return deriveDateFromDay(item.day);
  }

  throw new Error('Cart item has neither day nor date field');
}
```
