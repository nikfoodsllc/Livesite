# Comprehensive Test Plan: Day-Wise Food Items Implementation

**Date:** January 6, 2025
**Project:** TDN9IL (User-facing application)
**Feature:** Day-wise food categories with date-specific menu items
**API Endpoint:** `/api/food-items-day-wise`

---

## Table of Contents

1. [Overview](#overview)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [Database Verification](#database-verification)
5. [Edge Cases](#edge-cases)
6. [Error Scenarios](#error-scenarios)
7. [Performance Testing](#performance-testing)
8. [Test Execution Checklist](#test-execution-checklist)

---

## Overview

### Feature Description

The day-wise food items feature allows food categories to display different menu items on different calendar dates. This is implemented through:

1. **API Endpoint:** `/api/food-items-day-wise` - Fetches items for a specific category and date
2. **Frontend Integration:** Main homepage (`src/app/page.tsx`) displays day-wise categories with date-grouped items
3. **Database Collections:**
   - `categoryfoodmapping` - Maps food items to categories with date associations
   - `availableDates` - Controls which dates are enabled for ordering
   - `foodcategories` - Category configuration with `listingType: 'day-wise'`
   - `fooditems` - Food item data

### Key Implementation Details

- **Date Format:** YYYY-MM-DD (e.g., "2024-01-15")
- **Mapping Type:** `DAY_WISE` in `categoryfoodmapping`
- **Filtering:** Only shows dates where `availableDates.dayWiseCategoryEnabled = true`
- **Response Structure:** Returns items for a single date with formatted date display

---

## Unit Testing

### Test Suite: `/api/food-items-day-wise` Endpoint

#### Test 1: Valid Request with Items

**Test Case ID:** UT-DW-001
**Description:** Fetch items for a valid category and date that has mapped items

**Request:**
```http
GET /api/food-items-day-wise?categoryId=VALID_CATEGORY_ID&date=2024-01-15
```

**Expected Response:**
```json
{
  "data": {
    "categoryId": "VALID_CATEGORY_ID",
    "categoryListingType": "day-wise",
    "date": "2024-01-15",
    "formattedDate": "Monday, January 15, 2024",
    "foodItems": [
      {
        "_id": "item_id_1",
        "name": "Food Item 1",
        "description": "Description",
        "price": 12.99,
        "veg": true,
        "available": true,
        "url": "image_url",
        "hasCombo": false,
        "portions": [],
        "sections": []
      }
    ]
  },
  "message": "success"
}
```

**Status Code:** 200

**Validation Points:**
- ✅ Response contains `data` object
- ✅ `categoryId` matches request
- ✅ `categoryListingType` is "day-wise"
- ✅ `date` matches request in YYYY-MM-DD format
- ✅ `formattedDate` is human-readable
- ✅ `foodItems` is a non-empty array
- ✅ All food items have required fields
- ✅ Combo sections are populated if `hasCombo = true`

---

#### Test 2: Valid Request with No Items

**Test Case ID:** UT-DW-002
**Description:** Fetch items for a valid category and date that has no mapped items

**Request:**
```http
GET /api/food-items-day-wise?categoryId=VALID_CATEGORY_ID&date=2024-12-25
```

**Expected Response:**
```json
{
  "message": "No items found for this date",
  "error": "No food items are mapped to category VALID_CATEGORY_ID for date 2024-12-25"
}
```

**Status Code:** 404

**Validation Points:**
- ✅ Response status is 404
- ✅ Error message is clear and informative
- ✅ No `data` field in response
- ✅ Console log indicates no mappings found

---

#### Test 3: Invalid categoryId Format

**Test Case ID:** UT-DW-003
**Description:** Request with invalid categoryId format

**Request:**
```http
GET /api/food-items-day-wise?categoryId=invalid-id&date=2024-01-15
```

**Expected Response:**
```json
{
  "message": "Invalid categoryId format",
  "error": "categoryId must be a valid ObjectId"
}
```

**Status Code:** 400

**Validation Points:**
- ✅ Response status is 400
- ✅ Error message mentions ObjectId format
- ✅ No database queries executed

---

#### Test 4: Invalid Date Format

**Test Case ID:** UT-DW-004
**Description:** Request with invalid date format

**Test Cases:**

**4a: Invalid format (MM-DD-YYYY)**
```http
GET /api/food-items-day-wise?categoryId=VALID_CATEGORY_ID&date=01-15-2024
```
**Expected:** 400 with "Invalid date format" error

**4b: Invalid format (DD/MM/YYYY)**
```http
GET /api/food-items-day-wise?categoryId=VALID_CATEGORY_ID&date=15/01/2024
```
**Expected:** 400 with "Invalid date format" error

**4c: Invalid date value**
```http
GET /api/food-items-day-wise?categoryId=VALID_CATEGORY_ID&date=2024-13-45
```
**Expected:** 400 with "Invalid date format" error (regex validation)

**4d: Empty date**
```http
GET /api/food-items-day-wise?categoryId=VALID_CATEGORY_ID&date=
```
**Expected:** 400 with "date query parameter is required" error

**Validation Points:**
- ✅ All invalid formats return 400 status
- ✅ Error message specifies YYYY-MM-DD format
- ✅ Regex validation prevents invalid dates
- ✅ No database queries executed for invalid input

---

#### Test 5: VegOnly Filter

**Test Case ID:** UT-DW-005
**Description:** Filter food items by vegetarian status

**Request:**
```http
GET /api/food-items-day-wise?categoryId=VALID_CATEGORY_ID&date=2024-01-15&vegOnly=true
```

**Expected Response:**
```json
{
  "data": {
    "categoryId": "VALID_CATEGORY_ID",
    "categoryListingType": "day-wise",
    "date": "2024-01-15",
    "formattedDate": "Monday, January 15, 2024",
    "foodItems": [
      {
        "_id": "veg_item_id",
        "name": "Vegetarian Item",
        "veg": true,
        "price": 10.99
      }
    ]
  },
  "message": "success"
}
```

**Validation Points:**
- ✅ All returned items have `veg: true` or `veg` not explicitly `false`
- ✅ Non-vegetarian items are filtered out
- ✅ Response still includes all required fields
- ✅ Empty array if no vegetarian items exist

---

#### Test 6: Date with availableDates Enabled

**Test Case ID:** UT-DW-006
**Description:** Request for a date that is enabled in `availableDates` collection

**Prerequisites:**
- Database has `availableDates` document with:
  - `date: "2024-01-15"`
  - `dayWiseCategoryEnabled: true`

**Request:**
```http
GET /api/food-items-day-wise?categoryId=VALID_CATEGORY_ID&date=2024-01-15
```

**Expected Response:**
```json
{
  "data": {
    "categoryId": "VALID_CATEGORY_ID",
    "categoryListingType": "day-wise",
    "date": "2024-01-15",
    "formattedDate": "Monday, January 15, 2024",
    "foodItems": [...]
  },
  "message": "success"
}
```

**Status Code:** 200

**Validation Points:**
- ✅ Items are returned successfully
- ✅ Date matches the enabled date in database
- ✅ Console log shows successful fetch

---

#### Test 7: Date with availableDates Disabled

**Test Case ID:** UT-DW-007
**Description:** Request for a date that is disabled or missing from `availableDates`

**Prerequisites:**
- Database has `availableDates` document with:
  - `date: "2024-01-16"`
  - `dayWiseCategoryEnabled: false`
- OR date doesn't exist in `availableDates` collection

**Request:**
```http
GET /api/food-items-day-wise?categoryId=VALID_CATEGORY_ID&date=2024-01-16
```

**Expected Response:**
```json
{
  "message": "No items found for this date",
  "error": "No food items are mapped to category VALID_CATEGORY_ID for date 2024-01-16"
}
```

**Status Code:** 404

**Validation Points:**
- ✅ Returns 404 even if mappings exist
- ✅ Console log shows no items found
- ✅ Frontend filters out this date from display

---

#### Test 8: Category Not Found

**Test Case ID:** UT-DW-008
**Description:** Request with non-existent category ID

**Request:**
```http
GET /api/food-items-day-wise?categoryId=000000000000000000000000&date=2024-01-15
```

**Expected Response:**
```json
{
  "message": "Category not found",
  "error": "No category exists with the provided categoryId"
}
```

**Status Code:** 404

**Validation Points:**
- ✅ Returns 404 before querying mappings
- ✅ Error message is clear
- ✅ No unnecessary database queries

---

#### Test 9: Category with Wrong Listing Type

**Test Case ID:** UT-DW-009
**Description:** Request for a flat category (not day-wise)

**Prerequisites:**
- Category exists with `listingType: "flat"`

**Request:**
```http
GET /api/food-items-day-wise?categoryId=FLAT_CATEGORY_ID&date=2024-01-15
```

**Expected Response:**
```json
{
  "message": "Invalid category type",
  "error": "This endpoint only supports day-wise categories, but the provided category has listingType: flat"
}
```

**Status Code:** 400

**Validation Points:**
- ✅ Returns 400 (bad request)
- ✅ Error message explains the mismatch
- ✅ Suggests using correct endpoint

---

#### Test 10: Combo Items with Sections

**Test Case ID:** UT-DW-010
**Description:** Verify combo items have populated sections

**Prerequisites:**
- Food item with `hasCombo: true` and `sections` array exists

**Request:**
```http
GET /api/food-items-day-wise?categoryId=VALID_CATEGORY_ID&date=2024-01-15
```

**Expected Response:**
```json
{
  "data": {
    "foodItems": [
      {
        "_id": "combo_item_id",
        "name": "Combo Meal",
        "hasCombo": true,
        "sections": [
          {
            "_id": "section-0-main-course",
            "title": "Main Course",
            "selectedItems": [
              {
                "_id": "item-0-paneer-tikka",
                "item": {
                  "_id": "item_id",
                  "name": "Paneer Tikka",
                  "description": "Spiced cottage cheese",
                  "price": 8.99,
                  "veg": true,
                  "url": "image_url"
                }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Validation Points:**
- ✅ Combo sections are populated with full item objects
- ✅ Each `selectedItem` has `item` object with all fields
- ✅ No ObjectId references in response (all populated)
- ✅ Invalid combo items are handled gracefully with error items

---

#### Test 11: Missing Required Parameters

**Test Case ID:** UT-DW-011
**Description:** Request without required parameters

**Test Cases:**

**11a: Missing categoryId**
```http
GET /api/food-items-day-wise?date=2024-01-15
```
**Expected:** 400 with "Missing required parameter: categoryId"

**11b: Missing date**
```http
GET /api/food-items-day-wise?categoryId=VALID_CATEGORY_ID
```
**Expected:** 400 with "Missing required parameter: date"

**11c: Missing both parameters**
```http
GET /api/food-items-day-wise
```
**Expected:** 400 with "Missing required parameter: categoryId"

**Validation Points:**
- ✅ Returns 400 for each missing parameter
- ✅ Error message specifies which parameter is missing
- ✅ No database queries executed

---

#### Test 12: Draft Category Filter

**Test Case ID:** UT-DW-012
**Description:** Ensure draft categories are not returned

**Prerequisites:**
- Category exists with `isDraft: true`

**Request:**
```http
GET /api/food-items-day-wise?categoryId=DRAFT_CATEGORY_ID&date=2024-01-15
```

**Expected Response:**
```json
{
  "message": "Category not found",
  "error": "No category exists with the provided categoryId"
}
```

**Status Code:** 404

**Validation Points:**
- ✅ Draft categories are filtered out
- ✅ Query includes `isDraft: { $ne: true }`
- ✅ No draft category data leaked

---

#### Test 13: Draft Food Items Filter

**Test Case ID:** UT-DW-013
**Description:** Ensure draft food items are not returned

**Prerequisites:**
- Valid category and date
- Some food items have `isDraft: true`

**Request:**
```http
GET /api/food-items-day-wise?categoryId=VALID_CATEGORY_ID&date=2024-01-15
```

**Expected Response:**
```json
{
  "data": {
    "foodItems": [
      // Only non-draft items included
    ]
  }
}
```

**Validation Points:**
- ✅ Draft items are filtered out
- ✅ Query includes `isDraft: { $ne: true }`
- ✅ Only published items in response

---

#### Test 14: Unavailable Food Items Filter

**Test Case ID:** UT-DW-014
**Description:** Ensure unavailable food items are not returned

**Prerequisites:**
- Valid category and date
- Some food items have `available: false`

**Request:**
```http
GET /api/food-items-day-wise?categoryId=VALID_CATEGORY_ID&date=2024-01-15
```

**Expected Response:**
```json
{
  "data": {
    "foodItems": [
      // Only available items included
    ]
  }
}
```

**Validation Points:**
- ✅ Unavailable items are filtered out
- ✅ Query includes `available: true`
- ✅ Only available items in response

---

## Integration Testing

### Test Suite: Customer Website UI

#### Test 1: Day-wise Category Displays Items Correctly

**Test Case ID:** IT-DW-001
**Description:** Homepage displays day-wise category with items grouped by date

**Test Steps:**

1. **Setup Database:**
   ```javascript
   // Create day-wise category
   db.foodcategories.insertOne({
     _id: ObjectId("daywise_category_id"),
     name: "Daily Specials",
     listingType: "day-wise",
     isDraft: false
   })

   // Create available dates
   db.availableDates.insertMany([
     {
       date: "2024-01-15",
       dayWiseCategoryEnabled: true,
       flatCategoryEnabled: true
     },
     {
       date: "2024-01-16",
       dayWiseCategoryEnabled: true,
       flatCategoryEnabled: true
     }
   ])

   // Create food items
   db.fooditems.insertMany([
     { _id: ObjectId("item1"), name: "Special 1", available: true, isDraft: false, veg: true, price: 12.99 },
     { _id: ObjectId("item2"), name: "Special 2", available: true, isDraft: false, veg: false, price: 15.99 }
   ])

   // Create day-wise mappings
   db.categoryfoodmapping.insertMany([
     {
       categoryId: ObjectId("daywise_category_id"),
       foodItemId: ObjectId("item1"),
       mappingType: "DAY_WISE",
       day: "2024-01-15",
       sequence: 1
     },
     {
       categoryId: ObjectId("daywise_category_id"),
       foodItemId: ObjectId("item2"),
       mappingType: "DAY_WISE",
       day: "2024-01-16",
       sequence: 1
     }
   ])
   ```

2. **Navigate to Homepage:** Open `http://localhost:3000`

3. **Verify Category Display:**
   - ✅ "Daily Specials" category header is visible
   - ✅ Category has border-left accent (primary color)
   - ✅ No loading spinner after initial load

4. **Verify Date Grouping:**
   - ✅ Two date sections are visible (2024-01-15, 2024-01-16)
   - ✅ Each date has a chip with formatted date (e.g., "Monday, January 15, 2024")
   - ✅ Date sections are in chronological order

5. **Verify Item Display:**
   - ✅ Date "2024-01-15" shows "Special 1"
   - ✅ Date "2024-01-16" shows "Special 2"
   - ✅ Items are displayed in responsive grid
   - ✅ Each item shows: image, name, price, veg indicator

6. **Verify Cart Integration:**
   - ✅ "Add to Cart" button is visible on each item
   - ✅ Initial quantity is 0 for all items
   - ✅ Items can be added to cart
   - ✅ Success notification shows "added to cart for [date]"

**Browser Console Logs:**
```
[page.tsx] Fetching day-wise items for categoryId: daywise_category_id, date: 2024-01-15
[food-items-day-wise] Found 1 mappings for date: 2024-01-15
[food-items-day-wise] Found 1 food items
[food-items-day-wise] Returning 1 unique items
```

---

#### Test 2: Multiple Dates Show Different Items

**Test Case ID:** IT-DW-002
**Description:** Different dates show different sets of items

**Test Steps:**

1. **Setup:** Use same database as IT-DW-001

2. **Verify Item Separation:**
   - ✅ "Special 1" only appears under "2024-01-15"
   - ✅ "Special 2" only appears under "2024-01-16"
   - ✅ Items are not duplicated across dates

3. **Verify Cart Context:**
   - ✅ Adding "Special 1" adds it to cart for 2024-01-15
   - ✅ Adding "Special 2" adds it to cart for 2024-01-16
   - ✅ Cart shows separate quantities for each date
   - ✅ Quantity counter on item reflects quantity for that specific date

4. **Verify Day Selection Popup:**
   - ✅ Clicking "Add to Cart" for "Special 1" adds directly (no popup)
   - ✅ Item is added to cart for the correct date (2024-01-15)
   - ✅ Success message includes formatted date

---

#### Test 3: Flat Categories Still Work (No Regression)

**Test Case ID:** IT-DW-003
**Description:** Flat categories continue to work as before

**Test Steps:**

1. **Setup Database:**
   ```javascript
   // Create flat category
   db.foodcategories.insertOne({
     _id: ObjectId("flat_category_id"),
     name: "Regular Menu",
     listingType: "flat",
     isDraft: false
   })

   // Create flat mappings
   db.categoryfoodmapping.insertMany([
     {
       categoryId: ObjectId("flat_category_id"),
       foodItemId: ObjectId("item1"),
       mappingType: "FLAT",
       sequence: 1
     }
   ])
   ```

2. **Navigate to Homepage**

3. **Verify Flat Category Display:**
   - ✅ "Regular Menu" category header is visible
   - ✅ No date chips/sections (all items in single grid)
   - ✅ Items are displayed in responsive grid
   - ✅ All items from category are shown

4. **Verify Cart Behavior:**
   - ✅ Clicking "Add to Cart" opens day selection popup
   - ✅ Popup shows all available dates
   - ✅ User can select multiple dates
   - ✅ Quantity can be adjusted per date

5. **Verify No Regression:**
   - ✅ Existing flat categories work exactly as before
   - ✅ No changes to flat category API
   - ✅ No visual differences for flat categories

---

#### Test 4: VegOnly Filter Works for Both Types

**Test Case ID:** IT-DW-004
**Description:** VegOnly filter works for both flat and day-wise categories

**Test Steps:**

1. **Setup Database:**
   - Create items with mixed `veg` status
   - Some items have `veg: true`, others have `veg: false`

2. **Enable VegOnly Filter:**
   - Click VegOnly toggle in header

3. **Verify Day-wise Category Filtering:**
   - ✅ Only vegetarian items shown in day-wise categories
   - ✅ Date sections with no vegetarian items are hidden
   - ✅ Category may show "No vegetarian items available" if all items filtered

4. **Verify Flat Category Filtering:**
   - ✅ Only vegetarian items shown in flat categories
   - ✅ Non-vegetarian items are hidden
   - ✅ Category may show "No vegetarian items available" if all items filtered

5. **Verify Cart Integration:**
   - ✅ Only vegetarian items can be added to cart
   - ✅ Non-vegetarian items are not interactable
   - ✅ Quantities for non-vegetarian items remain unchanged

6. **Toggle Filter Off:**
   - ✅ All items reappear when filter is toggled off
   - ✅ Cart quantities are preserved during filter toggle

---

#### Test 5: Day Selection Popup Works for Day-wise Items

**Test Case ID:** IT-DW-005
**Description:** Day selection popup behavior for items with portions/combo

**Test Steps:**

1. **Setup Database:**
   ```javascript
   // Create item with portions in day-wise category
   db.fooditems.insertOne({
     _id: ObjectId("portion_item"),
     name: "Portion Item",
     hasCombo: false,
     portions: ["Half", "Full"],
     portionPrices: [8.99, 15.99],
     available: true,
     isDraft: false,
     veg: true
   })

   db.categoryfoodmapping.insertOne({
     categoryId: ObjectId("daywise_category_id"),
     foodItemId: ObjectId("portion_item"),
     mappingType: "DAY_WISE",
     day: "2024-01-15",
     sequence: 2
   })
   ```

2. **Open Food Details Dialog:**
   - Click on "Portion Item" to open details dialog

3. **Select Portion:**
   - Choose "Half" portion
   - Verify price updates to $8.99

4. **Click "Add to Cart":**
   - ✅ Day selection popup should NOT appear (item is already assigned to 2024-01-15)
   - ✅ Item should be added directly to cart for 2024-01-15
   - ✅ Success message: "added to cart for Monday, January 15, 2024"

5. **Verify Cart:**
   - ✅ Cart shows item with correct portion
   - ✅ Item is assigned to correct date (2024-01-15)
   - ✅ Quantity is 1

---

#### Test 6: Cart Functionality Works with Day-wise Items

**Test Case ID:** IT-DW-006
**Description:** Full cart workflow with day-wise items

**Test Steps:**

1. **Add Items to Cart:**
   - Add "Special 1" (from 2024-01-15) → Quantity: 1
   - Add "Special 2" (from 2024-01-16) → Quantity: 1
   - Add "Special 1" again → Quantity: 2

2. **Verify Cart Preview:**
   - ✅ Cart icon shows total quantity: 3
   - ✅ Cart preview sidebar shows both dates
   - ✅ Items grouped by date

3. **Open Cart Page:**
   - Navigate to `/cart`

4. **Verify Cart Display:**
   - ✅ Cart shows items grouped by date
   - ✅ Each date section has formatted date header
   - ✅ "Special 1" shows quantity: 2 under 2024-01-15
   - ✅ "Special 2" shows quantity: 1 under 2024-01-16
   - ✅ Cart total is calculated correctly

5. **Modify Cart:**
   - ✅ Can increment "Special 1" quantity to 3
   - ✅ Can decrement "Special 2" quantity to 0 (removed)
   - ✅ Can remove entire date section

6. **Proceed to Checkout:**
   - ✅ Checkout page shows items grouped by date
   - ✅ Delivery date badges show correct dates
   - ✅ Order can be completed successfully

---

## Database Verification

### Test Suite: Database State Validation

#### Test 1: categoryfoodmapping Has DAY_WISE Entries

**Test Case ID:** DB-DW-001
**Description:** Verify DAY_WISE mappings exist in database

**MongoDB Query:**
```javascript
db.categoryfoodmapping.find({
  mappingType: "DAY_WISE"
}).pretty()
```

**Expected Output:**
```javascript
{
  _id: ObjectId("..."),
  categoryId: ObjectId("..."),
  foodItemId: ObjectId("..."),
  mappingType: "DAY_WISE",
  day: "2024-01-15",  // Date string in YYYY-MM-DD format
  sequence: 1
}
```

**Validation Points:**
- ✅ Documents with `mappingType: "DAY_WISE"` exist
- ✅ `day` field contains date strings (YYYY-MM-DD)
- ✅ `categoryId` references valid categories
- ✅ `foodItemId` references valid food items
- ✅ `sequence` field is populated for ordering

---

#### Test 2: Date Format is YYYY-MM-DD

**Test Case ID:** DB-DW-002
**Description:** Verify all DAY_WISE mappings use correct date format

**MongoDB Query:**
```javascript
// Find all DAY_WISE mappings
db.categoryfoodmapping.find({
  mappingType: "DAY_WISE"
}, { day: 1, mappingType: 1 })

// Check for invalid date formats
db.categoryfoodmapping.find({
  mappingType: "DAY_WISE",
  day: { $not: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/ }
})
```

**Validation Points:**
- ✅ All `day` values match regex: `^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$`
- ✅ No old day names exist (e.g., "monday", "tuesday")
- ✅ No invalid date strings (e.g., "2024-13-45")
- ✅ No empty or null `day` values

---

#### Test 3: Food Items Are Properly Linked

**Test Case ID:** DB-DW-003
**Description:** Verify food items in mappings exist in fooditems collection

**MongoDB Query:**
```javascript
// Find orphaned mappings (foodItemId doesn't exist)
var mappingItemIds = db.categoryfoodmapping.distinct("foodItemId", {
  mappingType: "DAY_WISE"
})
var existingItemIds = db.fooditems.distinct("_id", {
  _id: { $in: mappingItemIds }
})
var orphanedIds = mappingItemIds.filter(id => !existingItemIds.some(existingId => existingId.equals(id)))

print("Orphaned food item IDs:")
orphanedIds.forEach(id => print(id))

// Expected: No orphaned IDs
```

**Validation Points:**
- ✅ All `foodItemId` values in mappings reference existing food items
- ✅ Referenced food items have `available: true`
- ✅ Referenced food items have `isDraft: false`
- ✅ No orphaned mappings

---

#### Test 4: Available Dates Has Enabled Dates

**Test Case ID:** DB-DW-004
**Description:** Verify availableDates collection has enabled dates

**MongoDB Query:**
```javascript
// Check availableDates collection
db.availableDates.find({
  dayWiseCategoryEnabled: true
}).sort({ date: 1 }).pretty()

// Count enabled dates
db.availableDates.countDocuments({
  dayWiseCategoryEnabled: true
})
```

**Expected Output:**
```javascript
{
  _id: ObjectId("..."),
  date: "2024-01-15",
  flatCategoryEnabled: true,
  dayWiseCategoryEnabled: true,  // Must be true
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z")
}
```

**Validation Points:**
- ✅ `availableDates` collection exists
- ✅ At least one document has `dayWiseCategoryEnabled: true`
- ✅ `date` field is in YYYY-MM-DD format
- ✅ Dates are sorted chronologically
- ✅ No duplicate dates

---

#### Test 5: Categories Have Correct Listing Type

**Test Case ID:** DB-DW-005
**Description:** Verify categories are configured correctly

**MongoDB Query:**
```javascript
// Check day-wise categories
db.foodcategories.find({
  listingType: "day-wise",
  isDraft: { $ne: true }
}, { name: 1, listingType: 1 })

// Verify each has DAY_WISE mappings
db.foodcategories.find({
  listingType: "day-wise",
  isDraft: { $ne: true }
}).forEach(category => {
  var mappingCount = db.categoryfoodmapping.countDocuments({
    categoryId: category._id,
    mappingType: "DAY_WISE"
  })
  print(`${category.name}: ${mappingCount} DAY_WISE mappings`)
})
```

**Validation Points:**
- ✅ Categories with `listingType: "day-wise"` exist
- ✅ Each day-wise category has at least one DAY_WISE mapping
- ✅ Categories are not draft (`isDraft: false` or `isDraft` doesn't exist)

---

## Edge Cases

### Test Suite: Edge Case Scenarios

#### Edge Case 1: Day-wise Category with No Mappings

**Test Case ID:** EC-DW-001
**Description:** Category is day-wise but has no DAY_WISE mappings

**Setup:**
```javascript
db.foodcategories.insertOne({
  _id: ObjectId("empty_category"),
  name: "Empty Day-wise Category",
  listingType: "day-wise",
  isDraft: false
})
// No categoryfoodmapping entries for this category
```

**Test Steps:**
1. Navigate to homepage
2. Observe category display

**Expected Behavior:**
- ✅ Category header is visible
- ✅ Message: "No items available in this category"
- ✅ No date sections shown
- ✅ No error thrown
- ✅ API returns 404 with "No items found for this date"

---

#### Edge Case 2: Day-wise Category with Disabled Dates

**Test Case ID:** EC-DW-002
**Description:** Category has mappings but all dates are disabled

**Setup:**
```javascript
db.categoryfoodmapping.insertOne({
  categoryId: ObjectId("daywise_category_id"),
  foodItemId: ObjectId("item1"),
  mappingType: "DAY_WISE",
  day: "2024-01-15",
  sequence: 1
})

db.availableDates.updateOne(
  { date: "2024-01-15" },
  { $set: { dayWiseCategoryEnabled: false } }
)
```

**Test Steps:**
1. Navigate to homepage
2. Observe category display

**Expected Behavior:**
- ✅ Category header is visible
- ✅ Message: "No items available in this category"
- ✅ No date sections shown
- ✅ API returns 404 for disabled date
- ✅ Frontend filters out disabled dates

---

#### Edge Case 3: Food Items Marked as Draft

**Test Case ID:** EC-DW-003
**Description:** Mapped items have `isDraft: true`

**Setup:**
```javascript
db.fooditems.updateOne(
  { _id: ObjectId("item1") },
  { $set: { isDraft: true } }
)
```

**Test Steps:**
1. Navigate to homepage
2. Observe category display

**Expected Behavior:**
- ✅ Draft items are filtered out
- ✅ Category may show "No items available" if all items are draft
- ✅ API doesn't include draft items in response
- ✅ Console log shows 0 items after filtering

---

#### Edge Case 4: Food Items with Available: False

**Test Case ID:** EC-DW-004
**Description:** Mapped items have `available: false`

**Setup:**
```javascript
db.fooditems.updateOne(
  { _id: ObjectId("item1") },
  { $set: { available: false } }
)
```

**Test Steps:**
1. Navigate to homepage
2. Observe category display

**Expected Behavior:**
- ✅ Unavailable items are filtered out
- ✅ Category may show "No items available" if all items are unavailable
- ✅ API doesn't include unavailable items in response
- ✅ Items can't be added to cart

---

#### Edge Case 5: Combo Items with Sections

**Test Case ID:** EC-DW-005
**Description:** Combo item has sections with invalid item references

**Setup:**
```javascript
db.fooditems.insertOne({
  _id: ObjectId("combo_item"),
  name: "Combo Meal",
  hasCombo: true,
  sections: [
    {
      title: "Main Course",
      selectedItems: [
        {
          item: ObjectId("non_existent_item"),
          _id: "selected_item_1"
        }
      ]
    }
  ],
  available: true,
  isDraft: false
})
```

**Test Steps:**
1. Navigate to homepage
2. Open combo item details
3. Observe section items

**Expected Behavior:**
- ✅ Invalid combo items are handled gracefully
- ✅ Placeholder item shown: "Item Not Available"
- ✅ Description: "Item with ID ... is not available or has been removed"
- ✅ No error thrown
- ✅ Combo section is still rendered
- ✅ Console warning about failed to populate combo item

---

#### Edge Case 6: Duplicate Mappings for Same Date

**Test Case ID:** EC-DW-006
**Description:** Multiple mappings for same item on same date

**Setup:**
```javascript
db.categoryfoodmapping.insertMany([
  {
    categoryId: ObjectId("daywise_category_id"),
    foodItemId: ObjectId("item1"),
    mappingType: "DAY_WISE",
    day: "2024-01-15",
    sequence: 1
  },
  {
    categoryId: ObjectId("daywise_category_id"),
    foodItemId: ObjectId("item1"),
    mappingType: "DAY_WISE",
    day: "2024-01-15",
    sequence: 2
  }
])
```

**Test Steps:**
1. Navigate to homepage
2. Observe date section for 2024-01-15

**Expected Behavior:**
- ✅ Item appears only once (deduplicated)
- ✅ No duplicate items in grid
- ✅ API includes deduplication logic
- ✅ Console log shows "1 unique items" (not 2)

---

#### Edge Case 7: Date with Only Non-Veg Items (VegOnly Filter)

**Test Case ID:** EC-DW-007
**Description:** Date has only non-vegetarian items, VegOnly filter is enabled

**Setup:**
```javascript
db.fooditems.insertOne({
  _id: ObjectId("non_veg_item"),
  name: "Chicken Curry",
  veg: false,
  available: true,
  isDraft: false
})

db.categoryfoodmapping.insertOne({
  categoryId: ObjectId("daywise_category_id"),
  foodItemId: ObjectId("non_veg_item"),
  mappingType: "DAY_WISE",
  day: "2024-01-15",
  sequence: 1
})
```

**Test Steps:**
1. Enable VegOnly filter
2. Navigate to homepage
3. Observe category display

**Expected Behavior:**
- ✅ Date section is hidden (no vegetarian items)
- ✅ No error thrown
- ✅ Category may show "No vegetarian items available"
- ✅ Other dates with vegetarian items still show

---

#### Edge Case 8: Combo Item with Invalid ObjectId

**Test Case ID:** EC-DW-008
**Description:** Combo section item has invalid ObjectId format

**Setup:**
```javascript
db.fooditems.insertOne({
  _id: ObjectId("combo_item"),
  name: "Combo Meal",
  hasCombo: true,
  sections: [
    {
      title: "Main Course",
      selectedItems: [
        {
          item: "invalid-object-id-format",
          _id: "selected_item_1"
        }
      ]
    }
  ],
  available: true,
  isDraft: false
})
```

**Test Steps:**
1. Navigate to homepage
2. Open combo item details
3. Observe section items

**Expected Behavior:**
- ✅ Invalid ObjectId is handled gracefully
- ✅ Placeholder item shown: "Invalid Item ID"
- ✅ Description: "Invalid ObjectId format: invalid-object-id-format"
- ✅ No error thrown
- ✅ Combo section is still rendered
- ✅ Console warning about invalid ObjectId

---

#### Edge Case 9: Empty Combo Sections

**Test Case ID:** EC-DW-009
**Description:** Combo item has sections with no selected items

**Setup:**
```javascript
db.fooditems.insertOne({
  _id: ObjectId("combo_item"),
  name: "Empty Combo Meal",
  hasCombo: true,
  sections: [
    {
      title: "Appetizers",
      selectedItems: []
    }
  ],
  available: true,
  isDraft: false
})
```

**Test Steps:**
1. Navigate to homepage
2. Open combo item details
3. Observe section

**Expected Behavior:**
- ✅ Section is rendered with empty items array
- ✅ Section shows title: "Appetizers"
- ✅ No error thrown
- ✅ Section has `_id` generated from title

---

#### Edge Case 10: Category with Mixed Mapping Types

**Test Case ID:** EC-DW-010
**Description:** Category has both FLAT and DAY_WISE mappings

**Setup:**
```javascript
db.foodcategories.insertOne({
  _id: ObjectId("mixed_category"),
  name: "Mixed Category",
  listingType: "day-wise",
  isDraft: false
})

db.categoryfoodmapping.insertMany([
  {
    categoryId: ObjectId("mixed_category"),
    foodItemId: ObjectId("item1"),
    mappingType: "FLAT",
    sequence: 1
  },
  {
    categoryId: ObjectId("mixed_category"),
    foodItemId: ObjectId("item2"),
    mappingType: "DAY_WISE",
    day: "2024-01-15",
    sequence: 1
  }
])
```

**Test Steps:**
1. Navigate to homepage
2. Observe category display

**Expected Behavior:**
- ✅ Category is displayed as day-wise
- ✅ Only DAY_WISE mappings are shown
- ✅ FLAT mappings are ignored
- ✅ No mixing of flat and day-wise items

---

#### Edge Case 11: Date Far in Future

**Test Case ID:** EC-DW-011
**Description:** Category has items mapped to a date far in the future

**Setup:**
```javascript
db.categoryfoodmapping.insertOne({
  categoryId: ObjectId("daywise_category_id"),
  foodItemId: ObjectId("item1"),
  mappingType: "DAY_WISE",
  day: "2099-12-31",
  sequence: 1
})

db.availableDates.insertOne({
  date: "2099-12-31",
  dayWiseCategoryEnabled: true,
  flatCategoryEnabled: true
})
```

**Test Steps:**
1. Navigate to homepage
2. Observe category display

**Expected Behavior:**
- ✅ Future date is shown
- ✅ Formatted date: "Thursday, December 31, 2099"
- ✅ Items can be added to cart
- ✅ Date sorting is chronological

---

#### Edge Case 12: Date Far in Past

**Test Case ID:** EC-DW-012
**Description:** Category has items mapped to a date far in the past

**Setup:**
```javascript
db.categoryfoodmapping.insertOne({
  categoryId: ObjectId("daywise_category_id"),
  foodItemId: ObjectId("item1"),
  mappingType: "DAY_WISE",
  day: "2020-01-01",
  sequence: 1
})

db.availableDates.insertOne({
  date: "2020-01-01",
  dayWiseCategoryEnabled: true,
  flatCategoryEnabled: true
})
```

**Test Steps:**
1. Navigate to homepage
2. Observe category display

**Expected Behavior:**
- ✅ Past date is shown
- ✅ Formatted date: "Wednesday, January 1, 2020"
- ✅ Items can be added to cart (if business logic allows)
- ✅ Date sorting is chronological

---

## Error Scenarios

### Test Suite: Error Handling

#### Error Scenario 1: Network Failure

**Test Case ID:** ER-DW-001
**Description:** API endpoint is unreachable

**Simulation:**
- Disconnect internet or block API endpoint
- Navigate to homepage

**Expected Behavior:**
- ✅ Error notification: "Network error loading items for [date]. Please check your connection."
- ✅ Loading spinner stops
- ✅ Category shows error state
- ✅ Console error logged
- ✅ Page remains functional (can navigate, use cart)
- ✅ Retry is possible (refresh page)

---

#### Error Scenario 2: API Timeout

**Test Case ID:** ER-DW-002
**Description:** API endpoint takes too long to respond

**Simulation:**
- Add artificial delay to API endpoint
- Navigate to homepage

**Expected Behavior:**
- ✅ Loading spinner shows
- ✅ Timeout after reasonable duration (e.g., 30 seconds)
- ✅ Error notification shown
- ✅ Console error logged
- ✅ No partial data displayed
- ✅ Retry is possible

---

#### Error Scenario 3: Invalid Data from Database

**Test Case ID:** ER-DW-003
**Description:** Database returns malformed data

**Simulation:**
- Corrupt data in database (e.g., invalid ObjectId, missing required fields)
- Navigate to homepage

**Expected Behavior:**
- ✅ Error caught and logged
- ✅ Corrupted items are skipped
- ✅ Valid items are still displayed
- ✅ Console warning about corrupted data
- ✅ No application crash
- ✅ User sees partial data (not complete failure)

---

#### Error Scenario 4: Missing Required Fields

**Test Case ID:** ER-DW-004
**Description:** Food item is missing required fields

**Simulation:**
```javascript
db.fooditems.insertOne({
  _id: ObjectId("incomplete_item"),
  name: "Incomplete Item",
  // Missing: description, price, url, etc.
  available: true,
  isDraft: false
})
```

**Expected Behavior:**
- ✅ API handles missing fields gracefully
- ✅ Default values used:
  - `description: ""`
  - `price: 0`
  - `url: ""`
  - `veg: false`
- ✅ No error thrown
- ✅ Item is displayed (with incomplete info)

---

#### Error Scenario 5: Database Connection Lost

**Test Case ID:** ER-DW-005
**Description:** Database connection fails during request

**Simulation:**
- Stop MongoDB server
- Navigate to homepage

**Expected Behavior:**
- ✅ Error notification: "Failed to load items. Please try again."
- ✅ Loading spinner stops
- ✅ Console error logged
- ✅ Page remains functional
- ✅ Retry is possible (refresh page)

---

#### Error Scenario 6: Concurrent Requests

**Test Case ID:** ER-DW-006
**Description:** Multiple simultaneous requests for same data

**Simulation:**
- Rapidly switch between categories
- Quick toggle of VegOnly filter

**Expected Behavior:**
- ✅ No race conditions
- ✅ Final UI state is consistent
- ✅ No duplicate items shown
- ✅ No missing items
- ✅ Loading states managed correctly
- ✅ Requests are deduplicated or handled in order

---

#### Error Scenario 7: Large Dataset

**Test Case ID:** ER-DW-007
**Description:** Category has many items across many dates

**Simulation:**
```javascript
// Create 100 items across 30 dates
for (var dateIdx = 0; dateIdx < 30; dateIdx++) {
  var date = new Date();
  date.setDate(date.getDate() + dateIdx);
  var dateString = date.toISOString().split('T')[0];

  for (var itemIdx = 0; itemIdx < 10; itemIdx++) {
    var itemId = ObjectId();
    db.fooditems.insertOne({
      _id: itemId,
      name: "Item " + itemIdx,
      price: 10 + itemIdx,
      available: true,
      isDraft: false,
      veg: true
    });

    db.categoryfoodmapping.insertOne({
      categoryId: ObjectId("daywise_category_id"),
      foodItemId: itemId,
      mappingType: "DAY_WISE",
      day: dateString,
      sequence: itemIdx
    });
  }

  db.availableDates.updateOne(
    { date: dateString },
    {
      $set: {
        dayWiseCategoryEnabled: true,
        flatCategoryEnabled: true
      }
    },
    { upsert: true }
  );
}
```

**Expected Behavior:**
- ✅ Page loads without timeout
- ✅ All items are displayed
- ✅ UI remains responsive
- ✅ Virtual scrolling or pagination if needed
- ✅ No memory leaks
- ✅ Console logs show progress

---

#### Error Scenario 8: Invalid Category ID in URL

**Test Case ID:** ER-DW-008
**Description:** User manually modifies URL with invalid category ID

**Simulation:**
- Navigate to `/?category=invalid-category-id`

**Expected Behavior:**
- ✅ No crash or error page
- ✅ Category not found (ignored)
- ✅ All categories shown (default view)
- ✅ Console warning logged
- ✅ Graceful degradation

---

## Performance Testing

### Test Suite: Performance and Load Testing

#### Performance Test 1: API Response Time

**Test Case ID:** PF-DW-001
**Description:** Measure API response time for various dataset sizes

**Test Cases:**

**1a. Small dataset (1-10 items per date)**
- Expected: < 100ms

**1b. Medium dataset (10-50 items per date)**
- Expected: < 300ms

**1c. Large dataset (50-100 items per date)**
- Expected: < 500ms

**Measurement:**
```javascript
console.time('API Request');
fetch('/api/food-items-day-wise?categoryId=xxx&date=2024-01-15')
  .then(response => response.json())
  .then(data => console.timeEnd('API Request'));
```

**Validation Points:**
- ✅ Response time is acceptable
- ✅ No significant degradation with larger datasets
- ✅ Database queries are optimized (indexes exist)

---

#### Performance Test 2: Combo Population Performance

**Test Case ID:** PF-DW-002
**Description:** Measure combo section population performance

**Setup:**
- Combo item with 5 sections
- Each section has 10 items
- Total: 50 combo items to populate

**Expected Behavior:**
- ✅ API response < 1 second
- ✅ All combo items populated
- ✅ No nested N+1 queries (should use bulk operations)

**Optimization Check:**
```javascript
// Verify combo items are fetched in bulk, not one-by-one
// Should see: db.read('fooditems', { _id: { $in: [...] } })
// NOT: Individual db.readOne() calls in loop
```

---

#### Performance Test 3: Frontend Rendering Performance

**Test Case ID:** PF-DW-003
**Description:** Measure frontend rendering time

**Setup:**
- Category with 10 dates
- Each date has 20 items
- Total: 200 items to render

**Measurement:**
```javascript
performance.mark('render-start');
// Trigger render
performance.mark('render-end');
performance.measure('render-time', 'render-start', 'render-end');
console.log(performance.getEntriesByName('render-time')[0].duration);
```

**Expected Behavior:**
- ✅ Initial render < 2 seconds
- ✅ Subsequent renders < 500ms (with React optimization)
- ✅ No UI freezing
- ✅ Smooth scrolling
- ✅ Images are lazy-loaded

---

#### Performance Test 4: Database Query Performance

**Test Case ID:** PF-DW-004
**Description:** Analyze database query performance

**MongoDB Explain:**
```javascript
db.categoryfoodmapping.find({
  categoryId: ObjectId("xxx"),
  mappingType: "DAY_WISE",
  day: "2024-01-15"
}).explain("executionStats")
```

**Validation Points:**
- ✅ Query uses index on `categoryId`, `mappingType`, `day`
- ✅ `executionTimeMillis` < 50ms
- ✅ `totalDocsExamined` ≈ `totalKeysExamined` (index is selective)
- ✅ No collection scans

**Recommended Indexes:**
```javascript
db.categoryfoodmapping.createIndex({
  categoryId: 1,
  mappingType: 1,
  day: 1
})

db.fooditems.createIndex({
  available: 1,
  isDraft: 1,
  _id: 1
})

db.availableDates.createIndex({
  date: 1,
  dayWiseCategoryEnabled: 1
})
```

---

#### Performance Test 5: Memory Usage

**Test Case ID:** PF-DW-005
**Description:** Monitor memory usage during testing

**Measurement:**
```javascript
// Before
console.log('Memory before:', performance.memory.usedJSHeapSize);

// Load data
await fetchDayWiseItems();

// After
console.log('Memory after:', performance.memory.usedJSHeapSize);
```

**Expected Behavior:**
- ✅ Memory increase is proportional to dataset size
- ✅ No memory leaks (memory is released after component unmount)
- ✅ Combo items don't cause excessive memory usage
- ✅ Images are properly garbage collected

---

## Test Execution Checklist

### Pre-Test Setup

- [ ] Database is backed up
- [ ] Test environment is isolated (not production)
- [ ] MongoDB indexes are created
- [ ] Node.js server is running
- [ ] Frontend dev server is running
- [ ] Browser console is open for logs
- [ ] Network tab is open for API monitoring
- [ ] Test data is prepared and documented

### Unit Testing Execution

- [ ] UT-DW-001: Valid request with items
- [ ] UT-DW-002: Valid request with no items
- [ ] UT-DW-003: Invalid categoryId format
- [ ] UT-DW-004: Invalid date format (all variants)
- [ ] UT-DW-005: VegOnly filter
- [ ] UT-DW-006: Date with availableDates enabled
- [ ] UT-DW-007: Date with availableDates disabled
- [ ] UT-DW-008: Category not found
- [ ] UT-DW-009: Category with wrong listing type
- [ ] UT-DW-010: Combo items with sections
- [ ] UT-DW-011: Missing required parameters
- [ ] UT-DW-012: Draft category filter
- [ ] UT-DW-013: Draft food items filter
- [ ] UT-DW-014: Unavailable food items filter

### Integration Testing Execution

- [ ] IT-DW-001: Day-wise category displays items correctly
- [ ] IT-DW-002: Multiple dates show different items
- [ ] IT-DW-003: Flat categories still work (no regression)
- [ ] IT-DW-004: VegOnly filter works for both types
- [ ] IT-DW-005: Day selection popup works for day-wise items
- [ ] IT-DW-006: Cart functionality works with day-wise items

### Database Verification Execution

- [ ] DB-DW-001: categoryfoodmapping has DAY_WISE entries
- [ ] DB-DW-002: Date format is YYYY-MM-DD
- [ ] DB-DW-003: Food items are properly linked
- [ ] DB-DW-004: Available dates has enabled dates
- [ ] DB-DW-005: Categories have correct listing type

### Edge Cases Execution

- [ ] EC-DW-001: Day-wise category with no mappings
- [ ] EC-DW-002: Day-wise category with disabled dates
- [ ] EC-DW-003: Food items marked as draft
- [ ] EC-DW-004: Food items with available: false
- [ ] EC-DW-005: Combo items with sections
- [ ] EC-DW-006: Duplicate mappings for same date
- [ ] EC-DW-007: Date with only non-veg items (VegOnly filter)
- [ ] EC-DW-008: Combo item with invalid ObjectId
- [ ] EC-DW-009: Empty combo sections
- [ ] EC-DW-010: Category with mixed mapping types
- [ ] EC-DW-011: Date far in future
- [ ] EC-DW-012: Date far in past

### Error Scenarios Execution

- [ ] ER-DW-001: Network failure
- [ ] ER-DW-002: API timeout
- [ ] ER-DW-003: Invalid data from database
- [ ] ER-DW-004: Missing required fields
- [ ] ER-DW-005: Database connection lost
- [ ] ER-DW-006: Concurrent requests
- [ ] ER-DW-007: Large dataset
- [ ] ER-DW-008: Invalid category ID in URL

### Performance Testing Execution

- [ ] PF-DW-001: API response time
- [ ] PF-DW-002: Combo population performance
- [ ] PF-DW-003: Frontend rendering performance
- [ ] PF-DW-004: Database query performance
- [ ] PF-DW-005: Memory usage

### Post-Test Cleanup

- [ ] Test data is removed from database
- [ ] Database is restored to original state
- [ ] Test results are documented
- [ ] Bugs are logged in issue tracker
- [ ] Performance metrics are recorded
- [ ] Test coverage is calculated

---

## Test Results Template

### Test Summary

| Test Suite | Total Tests | Passed | Failed | Blocked | Pass Rate |
|------------|-------------|--------|--------|---------|-----------|
| Unit Testing | 14 | | | | |
| Integration Testing | 6 | | | | |
| Database Verification | 5 | | | | |
| Edge Cases | 12 | | | | |
| Error Scenarios | 8 | | | | |
| Performance Testing | 5 | | | | |
| **TOTAL** | **50** | | | | |

### Failed Tests Details

| Test ID | Test Name | Error Message | Severity | Status |
|---------|-----------|---------------|----------|--------|
| | | | | |

### Bugs Found

| Bug ID | Description | Steps to Reproduce | Severity | Assigned To |
|--------|-------------|-------------------|----------|-------------|
| | | | | |

### Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| API Response Time (small dataset) | < 100ms | | |
| API Response Time (large dataset) | < 500ms | | |
| Frontend Render Time | < 2s | | |
| Database Query Time | < 50ms | | |
| Memory Usage Increase | < 50MB | | |

---

## Conclusion

This comprehensive test plan covers all aspects of the day-wise food items implementation:

1. **Unit Tests:** Verify API endpoint behavior for all input combinations
2. **Integration Tests:** Verify frontend UI and user workflows
3. **Database Verification:** Ensure data integrity and correct format
4. **Edge Cases:** Handle unusual but valid scenarios
5. **Error Scenarios:** Graceful error handling and recovery
6. **Performance Tests:** Ensure acceptable performance metrics

**Test Execution Estimate:** 6-8 hours for complete test suite

**Test Automation Potential:** Unit tests can be automated with Jest/Supertest. Integration tests can be automated with Playwright/Cypress.

**Next Steps:**
1. Execute all tests in this plan
2. Document results in `/docs/bug-fixes/day-wise-food-items/test-results.md`
3. Fix any bugs found during testing
4. Create automated test suite for regression testing
5. Monitor production performance metrics after deployment

---

**Test Plan Version:** 1.0
**Last Updated:** January 6, 2025
**Author:** Test Engineer
**Reviewed By:** Tech Lead
