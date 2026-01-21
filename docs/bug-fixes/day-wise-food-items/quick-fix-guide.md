# Quick Fix Guide: Empty dayWiseItems Issue

## Quick Diagnosis

Run this query to check which root cause is affecting your system:

```javascript
// 1. Check if availableDates has dayWiseCategoryEnabled
db.availableDates.countDocuments({ dayWiseCategoryEnabled: true })
// Result: 0 = ISSUE FOUND, >0 = Proceed to step 2

// 2. Check categoryfoodmapping format
db.categoryfoodmapping.findOne({
  mappingType: "DAY_WISE"
}, { day: 1, mappingType: 1 })
// Check if "day" field is date format (YYYY-MM-DD) or day name (monday)

// 3. Check if category has DAY_WISE mappings
db.categoryfoodmapping.countDocuments({
  categoryId: ObjectId("YOUR_CATEGORY_ID"),
  mappingType: "DAY_WISE"
})
```

## Quick Fixes

### Fix #1: Enable dayWiseCategoryEnabled in availableDates

```javascript
// Enable day-wise categories for all dates
db.availableDates.updateMany(
  {},
  { $set: { dayWiseCategoryEnabled: true } }
)
```

### Fix #2: Convert Old Day Format to New Date Format

```javascript
// Example: Convert "monday" to "2024-01-15"
db.categoryfoodmapping.updateMany(
  {
    mappingType: "DAY_WISE",
    day: "monday"
  },
  { $set: { day: "2024-01-15" } }
)
```

### Fix #3: Insert Missing availableDates Documents

```javascript
// Insert available dates for next 30 days
const startDate = new Date();
for (let i = 0; i < 30; i++) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + i);
  const dateString = date.toISOString().split('T')[0];

  db.availableDates.updateOne(
    { date: dateString },
    {
      $setOnInsert: {
        date: dateString,
        flatCategoryEnabled: true,
        dayWiseCategoryEnabled: true,
        createdAt: new Date()
      },
      $set: { updatedAt: new Date() }
    },
    { upsert: true }
  );
}
```

## Verification

After applying fixes, verify the API works:

```bash
# Test the API endpoint
curl "https://your-domain.com/api/food-items-by-category?categoryId=YOUR_CATEGORY_ID"

# Expected response:
{
  "data": {
    "_id": "...",
    "name": "Category Name",
    "listingType": "day-wise",
    "dayWiseItems": {
      "2024-01-15": [...items...],
      "2024-01-16": [...items...]
    }
  },
  "message": "success"
}
```

## Most Likely Root Cause

Based on code analysis, the **most common issue** is:

**availableDates collection exists but has `dayWiseCategoryEnabled: false`**

**Quick Fix:**
```javascript
db.availableDates.updateMany(
  { flatCategoryEnabled: true },
  { $set: { dayWiseCategoryEnabled: true } }
)
```
