# Day-to-Date System Migration Overview

## Table of Contents
- [Why This Migration Was Done](#why-this-migration-was-done)
- [Key Differences Between Systems](#key-differences-between-systems)
- [Migration Timeline](#migration-timeline)
- [Impact on Codebase](#impact-on-codebase)

---

## Why This Migration Was Done

### Limitations of the Day-of-Week System

The previous system used a **day-of-week** based approach where:
- Days were defined as recurring weekly patterns (e.g., "Monday", "Tuesday", "Wednesday")
- The `availableDays` collection stored static day configurations
- Each day had an `enabled` flag that controlled availability globally
- All "Mondays" shared the same configuration regardless of the actual calendar date

**Problems with this approach:**

1. **Inflexible Date Management**: Couldn't disable specific dates (e.g., holidays, special events)
2. **No Date-Specific Control**: All Mondays were treated identically - couldn't have Monday Jan 15 enabled but Monday Jan 22 disabled
3. **Limited Future Planning**: Hard to manage availability months in advance with fixed day patterns
4. **Seasonal Variations**: Couldn't easily handle seasonal schedule changes
5. **Special Event Handling**: Couldn't block specific dates for events, maintenance, or holidays

### Benefits of the Date-Based System

The new **date-based** system provides:

1. **Granular Control**: Each calendar date can be individually enabled/disabled
2. **Holiday Management**: Easy to disable specific dates like Christmas, Thanksgiving, etc.
3. **Flexible Scheduling**: Can handle irregular schedules and special events
4. **Better Admin Experience**: More intuitive date management in CXGP03 admin panel
5. **Future-Proof**: Easy to plan availability months or years in advance
6. **Date-Specific Features**: Enables features like:
   - Holiday-specific menus
   - Special pricing on specific dates
   - Event-based availability
   - Maintenance day handling

### Database Schema Changes

#### Old Schema (`availableDays` collection)
```javascript
{
  _id: ObjectId,
  day: "monday",              // Day of week (lowercase) - LEGACY FORMAT
  label: "Mon",               // Display label
  sequence: 1,                // Sort order (1-7)
  enabled: true               // Global enable/disable for this day
}
```

**⚠️ IMPORTANT**: Day names in the old system used lowercase format (e.g., "monday", "tuesday"). The new system uses **Title Case** format (e.g., "Monday", "Tuesday") for consistency with JavaScript's `toLocaleDateString()` formatting.

#### New Schema (`availableDates` collection)
```javascript
{
  _id: ObjectId,
  date: "2025-01-15",         // Specific calendar date (YYYY-MM-DD)
  flatCategoryEnabled: true,  // Enable flat category for this date
  dayWiseCategoryEnabled: true, // Enable day-wise category for this date
  createdAt: Date,
  updatedAt: Date
}
```

---

## Key Differences Between Systems

| Aspect | Day-of-Week System | Date-Based System |
|--------|-------------------|-------------------|
| **Granularity** | Weekly recurring patterns | Individual calendar dates |
| **Configuration** | 7 records (one per day) | Unlimited records (one per date) |
| **Holiday Handling** | Difficult, requires manual overrides | Easy, disable specific dates |
| **Future Planning** | Limited to weekly patterns | Can plan months/years ahead |
| **Database Collection** | `availableDays` | `availableDates` |
| **Enable Field** | `enabled: boolean` | `flatCategoryEnabled: boolean` |
| **Date Storage** | Day name ("monday") - lowercase | ISO date string ("2025-01-15") |
| **Day Name Format** | lowercase ("monday") - legacy | Title Case ("Monday") - standard |
| **Admin Control** | Day-level only | Date-level with category flags |

---

## Migration Timeline

### Phase 1: Development & Testing (Completed)
- ✅ Created new `availableDates` collection
- ✅ Implemented new date-based utilities
- ✅ Built backward compatibility layer
- ✅ Added deprecation warnings to old functions

### Phase 2: Dual Operation (Current State)
- ✅ Both systems running in parallel
- ✅ Old functions issue deprecation warnings
- ✅ New code uses date-based system
- ✅ Cart data supports both `day` and `date` fields

### Phase 3: Migration & Cleanup (Planned)
- 🔄 Migrate existing cart data to use only `date` field
- 🔄 Update all remaining usages of deprecated functions
- 🔄 Remove old `availableDays` collection dependencies
- ⏳ Full removal of deprecated code (6 months after Phase 2 completion)

### Phase 4: Full Removal (Future)
- ⏳ Remove deprecated functions from codebase
- ⏳ Remove backward compatibility fields from types
- ⏳ Clean up old API endpoints
- ⏳ Update documentation

---

## Impact on Codebase

### Files Modified
1. **Types** (`src/types/cart.ts`)
   - Added `date` field alongside `day` field
   - Marked `day` field as `@deprecated`
   - Added `DateType` and `DayType` type definitions

2. **Client-Side** (`src/lib/dayAvailabilityClient.ts`)
   - Added `generateAvailableDatesFromAPI()` (new)
   - Deprecated: `getEnabledDaysFromAPI()`, `generateAvailableDaysFromAPI()`, `getDayOptionFromAPI()`

3. **Server-Side** (`src/lib/server/dayAvailability.ts`)
   - Entire file marked as deprecated
   - All functions migrated to `src/lib/server/availableDates.ts`

4. **Local Storage Cart** (`src/lib/localStorageCart.ts`)
   - Updated to store both `day` and `date` fields
   - Migration helper functions added

5. **API Endpoints**
   - New: `GET /api/available-dates`
   - Deprecated: `GET /api/enabled-days`, `GET /api/days/available`, `GET /api/days/option`

### Backward Compatibility Strategy

To ensure smooth transition:

1. **Dual Field Storage**: Cart items store both `day` (legacy) and `date` (new) fields
2. **Compatibility Layer**: New API responses include both fields for old clients
3. **Deprecation Warnings**: Console warnings guide developers to new functions
4. **Graceful Degradation**: System works with old data format during migration
5. **Automatic Migration**: Cart data automatically upgraded when accessed

### Data Migration Path

```
Old Cart Format                New Cart Format
{                              {
  day: "monday",    →    day: "Monday",        // legacy (to be removed) - NOW IN TITLE CASE
  date: undefined,       date: "2025-01-20",   // new (required)
  ...items               ...items
}                              }
```

**Migration Steps:**
1. Existing cart data retains `day` field for backward compatibility
2. New operations populate both `day` and `date` fields
3. **Day names are now in Title Case format** (e.g., "Monday" instead of "monday")
   - This aligns with JavaScript's `toLocaleDateString()` output
   - Ensures consistency throughout the application
4. New functions prefer `date` field over `day` field
5. Eventually remove `day` field after all clients migrate

**⚠️ IMPORTANT - Day Name Format Change:**
- **Old format**: lowercase (e.g., "monday", "tuesday", "wednesday")
- **New format**: Title Case (e.g., "Monday", "Tuesday", "Wednesday")
- This change affects the `day` field in cart items and any code that references day names directly
- The `date` field (ISO date string) is preferred for all new code

---

## Next Steps

For detailed migration instructions, see:
- [Deprecated Functions Reference](./deprecated-functions.md)
- [API Endpoint Migration](./api-migration.md)
- [Cart Data Handling](./cart-data-migration.md)
- [New Usage Patterns](./new-usage-patterns.md)
- [Removal Timeline](./removal-timeline.md)

---

## Summary of Day Name Format Changes

### Key Points

1. **Old System (Lowercase)**:
   - Day names stored in lowercase: "monday", "tuesday", "wednesday", etc.
   - Used in old `availableDays` collection
   - Backward compatibility maintained

2. **New System (Title Case)**:
   - Day names in Title Case: "Monday", "Tuesday", "Wednesday", etc.
   - Extracted from `toLocaleDateString('en-US', { weekday: 'long' })`
   - Ensures consistency throughout the application
   - Used in new `availableDates` collection responses

3. **Migration Path**:
   - Existing lowercase day names are automatically converted to Title Case
   - New code should expect Title Case format
   - Cart data migration helpers handle the conversion
   - No breaking changes for properly implemented code

### Why Title Case?

- **Consistency**: Aligns with JavaScript's native date formatting
- **User Experience**: More natural display format
- **Standards**: Follows common localization practices
- **Maintainability**: Reduces need for custom case conversion

### Impact on Code

**Minimal Impact:**
- Most code uses the `date` field (ISO format) rather than `day` field
- The `day` field is primarily for backward compatibility
- Migration helpers handle automatic conversion

**Areas Affected:**
- Cart item `day` field values
- LocalStorage cart data
- Any direct string comparisons with day names
- Display logic that uses day names

**Recommended Actions:**
1. Use the `date` field (ISO format) for all new code
2. Avoid direct string comparisons with day names
3. Let migration helpers handle day name conversion
4. Update any hardcoded lowercase day name strings to Title Case
