# Root Cause Analysis: Empty dayWiseItems in /api/food-items-by-category

**Date:** January 6, 2025
**API Endpoint:** `/api/food-items-by-category`
**Issue:** `dayWiseItems` object is empty when querying day-wise categories
**Status:** Root Cause Identified

---

## Executive Summary

The `/api/food-items-by-category` API endpoint returns an empty `dayWiseItems` object for categories with `listingType: 'day-wise'`. This analysis traces the complete data flow from database query to response generation and identifies **THREE POTENTIAL ROOT CAUSES** that could result in empty `dayWiseItems`.

---

## Code Flow Analysis

### 1. API Entry Point (lines 281-343)

**File:** `/opt/imports/TDN9IL/src/app/api/food-items-by-category/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const categoryId = searchParams.get('categoryId');

  // Step 1: Fetch category to determine listingType
  const categoryResult = await db.readOne('foodcategories', {
    _id: new MongoObjectId(categoryId),
    isDraft: { $ne: true }
  });

  const category = categoryResult.data;
  const listingType: CategoryListingType = category.listingType || 'flat';

  // Step 2: Fetch enabled dates from availableDates collection
  const enabledDates = await getEnabledDates();
}
```

**Status:** ✅ Correct - Fetches category and determines listing type properly

---

### 2. Enabled Dates Query (lines 344-380) ⚠️ POTENTIAL ISSUE #1

**File:** `/opt/imports/TDN9IL/src/app/api/food-items-by-category/route.ts`

```typescript
const getEnabledDates = async (): Promise<string[]> => {
  const result = await db.read('availableDates', {
    dayWiseCategoryEnabled: true  // Line 353
  }, {
    sort: { date: 1 }
  });

  if (result.success && result.data && Array.isArray(result.data)) {
    const enabledDates = result.data
      .map((dateDoc: any) => {
        const dateString = typeof dateDoc.date === 'string' ? dateDoc.date.trim() : '';
        return dateString;
      })
      .filter((dateString: string) => {
        // Validate YYYY-MM-DD format
        const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
        return dateString && dateRegex.test(dateString);
      });

    return enabledDates;
  }
  return [];
};
```

**Potential Issue #1: Database Query Returns Empty Array**

If the `availableDates` collection:
- Does not exist
- Has no documents with `dayWiseCategoryEnabled: true`
- Has documents with invalid date format (non-YYYY-MM-DD)

Then `enabledDates` will be an empty array `[]`, causing all day-wise items to be filtered out later (line 628).

**Validation Required:**
```javascript
// Query to check database state
db.availableDates.find({ dayWiseCategoryEnabled: true }).pretty()

// Check if documents exist
db.availableDates.countDocuments({ dayWiseCategoryEnabled: true })
```

---

### 3. Category Food Mapping Query (lines 384-436) ⚠️ POTENTIAL ISSUE #2

**File:** `/opt/imports/TDN9IL/src/app/api/food-items-by-category/route.ts`

```typescript
// Step 3: Fetch category food mappings for this specific category
const categoryFoodMappingResult = await db.read('categoryfoodmapping', {
  categoryId: new MongoObjectId(categoryId)
}, {
  sort: { sequence: 1 }
});

// Step 4: Build list of unique food item IDs from mappings
const foodItemIds = new Set<string>();
const dayWiseMappingMap = new Map<string, string[]>(); // date string -> foodItemIds

if (categoryFoodMappingResult.success && categoryFoodMappingResult.data) {
  for (const mapping of categoryFoodMappingResult.data as CategoryFoodMapping[]) {
    const foodItemIdStr = mapping.foodItemId?.toString();
    const mappingType = mapping.mappingType;

    if (mappingType === 'DAY_WISE') {
      const dateString = mapping.day; // Line 416
      if (!dateString) {
        console.warn(`Skipping DAY_WISE mapping without day field`);
        continue; // Line 419 - Skips if no date
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
      if (!dateRegex.test(dateString)) {
        console.warn(`Skipping DAY_WISE mapping with invalid date format: ${dateString}`);
        continue; // Line 426 - Skips if invalid format
      }

      if (!dayWiseMappingMap.has(dateString)) {
        dayWiseMappingMap.set(dateString, []);
      }
      dayWiseMappingMap.get(dateString)!.push(foodItemIdStr);
      foodItemIds.add(foodItemIdStr);
    }
  }
}
```

**Potential Issue #2: DAY_WISE Mappings Not Found or Invalid**

The `dayWiseMappingMap` will be empty if:
1. No `categoryfoodmapping` documents exist for the given `categoryId`
2. Documents exist but have `mappingType !== 'DAY_WISE'`
3. Documents have `mappingType === 'DAY_WISE'` but `day` field is:
   - Missing (`undefined` or `null`)
   - Empty string
   - Invalid format (not YYYY-MM-DD, e.g., "monday", "tuesday", etc.)

**Validation Required:**
```javascript
// Check if DAY_WISE mappings exist
db.categoryfoodmapping.find({
  categoryId: ObjectId("YOUR_CATEGORY_ID"),
  mappingType: "DAY_WISE"
}).pretty()

// Check the day field values
db.categoryfoodmapping.find({
  categoryId: ObjectId("YOUR_CATEGORY_ID"),
  mappingType: "DAY_WISE"
}, { day: 1, mappingType: 1 })
```

---

### 4. Food Items Query (lines 438-462)

**File:** `/opt/imports/TDN9IL/src/app/api/food-items-by-category/route.ts`

```typescript
// Step 5: Fetch all food items that are mapped to this category
const foodItemsList = Array.from(foodItemIds);
const foodItems: Document[] = [];

if (foodItemsList.length > 0) {
  const query: Query = {
    available: true,
    isDraft: { $ne: true },
    _id: { $in: foodItemsList.map(id => new MongoObjectId(id)) }
  };

  const foodItemsResult = await db.read('fooditems', query, {
    sort: { sequence: 1 },
  });

  if (foodItemsResult.success && foodItemsResult.data) {
    foodItems.push(...foodItemsResult.data);
  }
}
```

**Status:** ✅ Correct - Queries food items properly

**Note:** If `foodItemsList` is empty (no mappings found), this block is skipped.

---

### 5. Food Item Map Creation (lines 569-574)

**File:** `/opt/imports/TDN9IL/src/app/api/food-items-by-category/route.ts`

```typescript
// Create a map of food items for quick lookup
const foodItemMap = new Map<string, Record<string, unknown>>();
for (const foodItem of foodItems) {
  const foodItemIdStr = foodItem._id.toString();
  foodItemMap.set(foodItemIdStr, await createFoodItemObject(foodItem, foodItemIdStr));
}
```

**Status:** ✅ Correct - Creates lookup map properly

---

### 6. dayWiseItems Population (lines 602-648) ⚠️ CRITICAL FILTERING LOGIC

**File:** `/opt/imports/TDN9IL/src/app/api/food-items-by-category/route.ts`

```typescript
// Step 6b: For day-wise categories, return dayWiseItems object
const dayWiseItems: Record<string, Record<string, unknown>[]> = {};

// Process DAY_WISE mappings
if (categoryFoodMappingResult.success && categoryFoodMappingResult.data) {
  for (const mapping of categoryFoodMappingResult.data as CategoryFoodMapping[]) {
    if (mapping.mappingType === 'DAY_WISE') {
      const dateString = mapping.day;
      const foodItemIdStr = mapping.foodItemId?.toString();

      if (!dateString || !foodItemIdStr) {
        continue; // Line 616
      }

      // Validate date format
      const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
      if (!dateRegex.test(dateString)) {
        console.warn(`Skipping DAY_WISE mapping with invalid date format: ${dateString}`);
        continue; // Line 623
      }

      // ⚠️ CRITICAL LINE 628: Check if date is enabled
      const isDateEnabled = enabledDates.includes(dateString);

      if (!isDateEnabled) {
        console.log(`Skipping disabled date: ${dateString}`); // Line 631
        continue; // Line 632 - ALL ITEMS FILTERED OUT HERE
      }

      // Group items by date string
      if (!dayWiseItems[dateString]) {
        dayWiseItems[dateString] = [];
      }

      if (foodItemMap.has(foodItemIdStr)) {
        dayWiseItems[dateString].push(foodItemMap.get(foodItemIdStr)!); // Line 641
      }
    }
  }
}

responseData.dayWiseItems = dayWiseItems; // Line 647
```

**Critical Filtering Logic (Line 628-633):**

```typescript
const isDateEnabled = enabledDates.includes(dateString);

if (!isDateEnabled) {
  console.log(`Skipping disabled date: ${dateString}`);
  continue; // ⚠️ THIS IS WHERE ITEMS GET FILTERED OUT
}
```

**This is the KEY LINE where empty dayWiseItems occurs:**

If `enabledDates` array is empty (from Potential Issue #1), then `enabledDates.includes(dateString)` will always return `false`, causing **ALL** day-wise items to be skipped.

---

## Root Cause Summary

### Primary Root Cause: Empty enabledDates Array

**MOST LIKELY:** The `availableDates` collection either:
1. Does not contain any documents with `dayWiseCategoryEnabled: true`
2. Contains documents but the `date` field format is invalid (not YYYY-MM-DD)

This causes `enabledDates` to be an empty array `[]`, which then causes **ALL** day-wise items to be filtered out at line 632.

### Secondary Root Cause: Invalid DAY_WISE Mapping Data

The `categoryfoodmapping` collection may contain:
1. Documents with `mappingType: 'DAY_WISE'` but `day` field is missing/invalid
2. Documents with old day-of-week format ("monday", "tuesday") instead of date format ("2024-01-15")
3. No DAY_WISE mappings at all for the given category

---

## Data Validation Steps

### Step 1: Check availableDates Collection

```javascript
// Connect to MongoDB and run:
db.availableDates.find({}).pretty()

// Check if dayWiseCategoryEnabled exists
db.availableDates.find({ dayWiseCategoryEnabled: true }).count()

// Check date format
db.availableDates.find({}, { date: 1, dayWiseCategoryEnabled: 1 })
```

**Expected Data Structure:**
```javascript
{
  _id: ObjectId("..."),
  date: "2024-01-15",              // ✅ YYYY-MM-DD format
  flatCategoryEnabled: true,
  dayWiseCategoryEnabled: true,    // ✅ Must be true
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z")
}
```

### Step 2: Check categoryfoodmapping Collection

```javascript
// Find day-wise mappings for your category
db.categoryfoodmapping.find({
  categoryId: ObjectId("YOUR_CATEGORY_ID"),
  mappingType: "DAY_WISE"
}).pretty()

// Check the day field format
db.categoryfoodmapping.find({
  categoryId: ObjectId("YOUR_CATEGORY_ID"),
  mappingType: "DAY_WISE"
}, { day: 1, foodItemId: 1, mappingType: 1 })
```

**Expected Data Structure:**
```javascript
{
  _id: ObjectId("..."),
  categoryId: ObjectId("..."),
  foodItemId: ObjectId("..."),
  mappingType: "DAY_WISE",
  day: "2024-01-15",              // ✅ Must be YYYY-MM-DD format
  sequence: 1
}
```

**INCORRECT Data Structure (Old System):**
```javascript
{
  _id: ObjectId("..."),
  categoryId: ObjectId("..."),
  foodItemId: ObjectId("..."),
  mappingType: "DAY_WISE",
  day: "monday",                  // ❌ Old day-of-week format
  sequence: 1
}
```

### Step 3: Check foodcategories Collection

```javascript
// Verify the category listing type
db.foodcategories.findOne({
  _id: ObjectId("YOUR_CATEGORY_ID")
}, { name: 1, listingType: 1 })
```

**Expected:**
```javascript
{
  _id: ObjectId("..."),
  name: "Daily Specials",
  listingType: "day-wise"         // ✅ Should be "day-wise"
}
```

---

## Proposed Fix Approach

### Fix Option 1: Populate availableDates Collection (Recommended)

If `availableDates` collection is missing data or has `dayWiseCategoryEnabled: false`:

```javascript
// Update all dates to enable day-wise categories
db.availableDates.updateMany(
  { date: { $exists: true } },
  { $set: { dayWiseCategoryEnabled: true } }
)

// Or for specific dates
db.availableDates.updateMany(
  {
    date: {
      $gte: "2024-01-01",
      $lte: "2024-12-31"
    }
  },
  { $set: { dayWiseCategoryEnabled: true } }
)
```

### Fix Option 2: Convert categoryfoodmapping to Date Format

If `categoryfoodmapping` still has old day-of-week format:

```javascript
// Find all DAY_WISE mappings with old format
db.categoryfoodmapping.find({
  mappingType: "DAY_WISE",
  day: /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i
})

// Update to date format (example for current week)
db.categoryfoodmapping.updateMany(
  {
    mappingType: "DAY_WISE",
    day: "monday"
  },
  { $set: { day: "2024-01-15" } } // Replace with actual date
)
```

### Fix Option 3: Disable enabledDates Filter (Temporary Debugging)

**WARNING:** This is for debugging only. Do not use in production.

```typescript
// Line 628 in route.ts - TEMPORARY DEBUGGING
const isDateEnabled = true; // Disable filtering to see if items appear

// Or add logging
console.log('Date check:', {
  dateString,
  enabledDates,
  isDateEnabled: enabledDates.includes(dateString)
});
```

---

## Console Logs to Enable for Debugging

Add these console logs to trace the issue:

```typescript
// After line 382: Log enabled dates
console.log('[DEBUG] Enabled dates:', enabledDates);
console.log('[DEBUG] Enabled dates count:', enabledDates.length);

// After line 436: Log mappings
console.log('[DEBUG] dayWiseMappingMap:', Object.fromEntries(dayWiseMappingMap));
console.log('[DEBUG] dayWiseMappingMap size:', dayWiseMappingMap.size);

// After line 574: Log food items
console.log('[DEBUG] foodItemMap size:', foodItemMap.size);

// Inside line 628 loop: Log each check
console.log('[DEBUG] Date check:', {
  dateString,
  isDateEnabled: enabledDates.includes(dateString),
  enabledDates
});
```

---

## Next Steps

1. **IMMEDIATE:** Run database validation queries (Step 1-3 above)
2. **Identify:** Which root cause is occurring in your environment
3. **Apply:** Appropriate fix based on data validation results
4. **Test:** Re-run API call and verify dayWiseItems is populated
5. **Monitor:** Add console logs to track data flow in production

---

## Related Files

- **API Route:** `/opt/imports/TDN9IL/src/app/api/food-items-by-category/route.ts`
- **Helper Module:** `/opt/imports/TDN9IL/src/lib/server/availableDates.ts`
- **Database Module:** `/opt/imports/TDN9IL/src/lib/server/db.ts`

---

## Additional Notes

### Data Migration Context

The codebase has been migrated from a **day-of-week system** to a **date-specific system**:

**Old System:**
- Used `availableDays` collection with day names
- `categoryfoodmapping.day` contained "monday", "tuesday", etc.
- Response grouped by day name

**New System:**
- Uses `availableDates` collection with date strings
- `categoryfoodmapping.day` contains "2024-01-15", "2024-01-16", etc.
- Response grouped by date string

**Potential Issue:** If the database was not fully migrated, some documents may still contain old format data, causing the filtering logic to fail.

---

## Contact Information

For questions or additional debugging support, refer to:
- Project: TDN9IL (User-facing application)
- Admin Project: CXGP03 (Admin-facing application - READ-ONLY reference)
- Database: MongoDB (shared between both projects)
