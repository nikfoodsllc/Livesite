# Day-Wise Food Items - Admin Data Structure Analysis

**Document Version:** 1.0
**Last Updated:** 2025-01-06
**Source:** CXGP03 Admin Panel Analysis

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Admin Panel Implementation](#admin-panel-implementation)
3. [Database Schema](#database-schema)
4. [API Integration Points](#api-integration-points)
5. [Data Flow Documentation](#data-flow-documentation)
6. [Date Format and Validation](#date-format-and-validation)
7. [Code Examples](#code-examples)
8. [Troubleshooting Guide](#troubleshooting-guide)

---

## Executive Summary

The day-wise food items feature allows administrators to associate specific food items with particular dates. This analysis documents how the admin panel (CXGP03) implements this functionality, serving as the source of truth for fixing the user-facing application (TDN9IL).

### Key Findings

- **Date Format:** Dates are stored in **YYYY-MM-DD** format (e.g., "2025-01-06")
- **Storage Model:** Uses `categoryfoodmapping` collection with discriminated union schema
- **Mapping Types:** Supports both `FLAT` and `DAY_WISE` mapping types
- **Admin Workflow:** Delete existing mappings → Create new mappings in bulk
- **Critical Endpoint:** `POST /api/admin/category-food-mapping/daywise`

---

## Admin Panel Implementation

### 1. Page Location

**File Path:** `/opt/imports/CXGP03/src/app/admin/food-category/[categoryId]/items/page.tsx`

### 2. Admin Save Flow

The admin panel saves day-wise food items through the following process (lines 216-293):

#### Step 1: Delete Existing Mappings

```typescript
// DELETE request to clear existing day-wise mappings for the category
const deleteResponse = await fetch(
  `/api/admin/category-food-mapping/daywise?categoryId=${categoryId}`,
  {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

**Request:**
- **Method:** DELETE
- **URL:** `/api/admin/category-food-mapping/daywise?categoryId={categoryId}`
- **Headers:** `Authorization: Bearer {token}`

#### Step 2: Prepare Mappings Array

```typescript
const mappings: Array<{
  foodItemId: string;
  categoryId: string;
  day: string;      // YYYY-MM-DD format
  sequence: number;
}> = [];

for (const dayItem of dayWiseItems) {
  for (let sequence = 0; sequence < dayItem.items.length; sequence++) {
    mappings.push({
      foodItemId: dayItem.items[sequence],
      categoryId: categoryId,
      day: dayItem.day,  // Critical: Must be YYYY-MM-DD format
      sequence,
    });
  }
}
```

**Data Structure:**
- Each food item gets a separate mapping document
- `day` field contains date string in YYYY-MM-DD format
- `sequence` determines order within the date

#### Step 3: Bulk Create Mappings

```typescript
if (mappings.length > 0) {
  const response = await fetch('/api/admin/category-food-mapping/daywise', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mappings }),
  });
}
```

**Request:**
- **Method:** POST
- **URL:** `/api/admin/category-food-mapping/daywise`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {token}`
- **Body:**
  ```json
  {
    "mappings": [
      {
        "foodItemId": "507f1f77bcf86cd799439011",
        "categoryId": "507f1f77bcf86cd799439012",
        "day": "2025-01-06",
        "sequence": 0
      },
      {
        "foodItemId": "507f1f77bcf86cd799439013",
        "categoryId": "507f1f77bcf86cd799439012",
        "day": "2025-01-06",
        "sequence": 1
      }
    ]
  }
  ```

### 3. Admin Load Flow

The admin panel loads existing day-wise items (lines 92-127):

```typescript
// Fetch day-wise mappings from API
const daywiseResponse = await fetch(
  `/api/admin/category-food-mapping/daywise?categoryId=${categoryId}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const daywiseData = await daywiseResponse.json();
const mappingsByDay = daywiseData.data?.mappingsByDay || [];

// Transform API response to UI state
const transformedDayWiseItems: CategoryDayWiseItem[] = mappingsByDay.map((dayMapping) => ({
  day: dayMapping.day,  // Already in YYYY-MM-DD format
  items: dayMapping.mappings
    .sort((a, b) => a.sequence - b.sequence)
    .map((mapping) => mapping.foodItemId.toString())
}));
```

**Response Structure:**
```json
{
  "data": {
    "mappingsByDay": [
      {
        "day": "2025-01-06",
        "count": 2,
        "mappings": [
          {
            "_id": "507f1f77bcf86cd799439011",
            "foodItemId": "507f1f77bcf86cd799439011",
            "categoryId": "507f1f77bcf86cd799439012",
            "sequence": 0,
            "mappingType": "DAY_WISE",
            "day": "2025-01-06"
          }
        ]
      }
    ],
    "total": 2
  },
  "message": "Day-wise mappings fetched successfully"
}
```

---

## Database Schema

### Collection: `categoryfoodmapping`

#### Schema Type: Discriminated Union

The collection uses a discriminated union pattern to support two mapping types:

```typescript
type MappingType = 'FLAT' | 'DAY_WISE';

interface BaseCategoryFoodMapping {
  _id?: ObjectId | string;
  foodItemId: ObjectId;       // Reference to fooditems._id
  categoryId: ObjectId;       // Reference to foodcategories._id
  sequence: number;           // Order within the category/day
  mappingType: MappingType;   // Discriminator field
  createdAt?: Date;
  updatedAt?: Date;
}

interface FlatCategoryFoodMapping extends BaseCategoryFoodMapping {
  mappingType: 'FLAT';
}

interface DayWiseCategoryFoodMapping extends BaseCategoryFoodMapping {
  mappingType: 'DAY_WISE';
  day: string;  // YYYY-MM-DD format for date-based filtering
}

type CategoryFoodMapping = FlatCategoryFoodMapping | DayWiseCategoryFoodMapping;
```

### Document Examples

#### FLAT Mapping Document
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "foodItemId": "507f1f77bcf86cd799439012",
  "categoryId": "507f1f77bcf86cd799439013",
  "sequence": 0,
  "mappingType": "FLAT",
  "createdAt": "2025-01-06T10:00:00.000Z",
  "updatedAt": "2025-01-06T10:00:00.000Z"
}
```

#### DAY_WISE Mapping Document
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "foodItemId": "507f1f77bcf86cd799439015",
  "categoryId": "507f1f77bcf86cd799439016",
  "sequence": 0,
  "mappingType": "DAY_WISE",
  "day": "2025-01-06",
  "createdAt": "2025-01-06T10:00:00.000Z",
  "updatedAt": "2025-01-06T10:00:00.000Z"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key, auto-generated |
| `foodItemId` | ObjectId | Yes | Reference to fooditems collection |
| `categoryId` | ObjectId | Yes | Reference to foodcategories collection |
| `sequence` | Number | Yes | Order position (0-based index) |
| `mappingType` | String | Yes | Discriminator: 'FLAT' or 'DAY_WISE' |
| `day` | String | Conditional | Required only for DAY_WISE type. Format: YYYY-MM-DD |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

### Indexes

The following indexes ensure optimal query performance:

1. **`idx_foodCategoryId`**: Single-field index on `foodItemId`
2. **`idx_categoryId`**: Single-field index on `categoryId`
3. **`idx_foodItemId_categoryId`**: Unique compound index on `foodItemId` and `categoryId`
4. **`idx_mappingType`**: Index on `mappingType` field
5. **`idx_mappingType_categoryId`**: Compound index on `mappingType` + `categoryId`
6. **`idx_mappingType_foodItemId`**: Compound index on `mappingType` + `foodItemId`

### Query Patterns

#### Get all DAY_WISE mappings for a category
```javascript
db.categoryfoodmapping.find({
  categoryId: ObjectId("..."),
  mappingType: 'DAY_WISE'
}).sort({ day: 1, sequence: 1 })
```

#### Get DAY_WISE mappings for a specific date
```javascript
db.categoryfoodmapping.find({
  categoryId: ObjectId("..."),
  mappingType: 'DAY_WISE',
  day: '2025-01-06'
}).sort({ sequence: 1 })
```

#### Get all food items for a category on a specific date
```javascript
db.categoryfoodmapping.aggregate([
  {
    $match: {
      categoryId: ObjectId("..."),
      mappingType: 'DAY_WISE',
      day: '2025-01-06'
    }
  },
  {
    $lookup: {
      from: 'fooditems',
      localField: 'foodItemId',
      foreignField: '_id',
      as: 'foodItem'
    }
  },
  {
    $sort: { sequence: 1 }
  }
])
```

---

## API Integration Points

### 1. GET Day-Wise Mappings

**Endpoint:** `GET /api/admin/category-food-mapping/daywise`

**Query Parameters:**
- `categoryId` (optional): Filter by category ID
- `day` (optional): Filter by specific day (YYYY-MM-DD format)
- `foodItemId` (optional): Filter by food item ID

**Example Request:**
```bash
curl -X GET \
  'http://localhost:3000/api/admin/category-food-mapping/daywise?categoryId=507f1f77bcf86cd799439012' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

**Response:**
```json
{
  "data": {
    "mappings": [
      {
        "_id": "507f1f77bcf86cd799439014",
        "foodItemId": "507f1f77bcf86cd799439015",
        "categoryId": "507f1f77bcf86cd799439016",
        "sequence": 0,
        "mappingType": "DAY_WISE",
        "day": "2025-01-06",
        "createdAt": "2025-01-06T10:00:00.000Z",
        "updatedAt": "2025-01-06T10:00:00.000Z"
      }
    ],
    "total": 1,
    "groupedByDay": {
      "2025-01-06": [
        {
          "_id": "507f1f77bcf86cd799439014",
          "foodItemId": "507f1f77bcf86cd799439015",
          "categoryId": "507f1f77bcf86cd799439016",
          "sequence": 0,
          "mappingType": "DAY_WISE",
          "day": "2025-01-06"
        }
      ]
    },
    "days": ["2025-01-06"],
    "mappingsByDay": [
      {
        "day": "2025-01-06",
        "count": 1,
        "mappings": [...]
      }
    ]
  },
  "message": "Day-wise mappings fetched successfully"
}
```

### 2. POST Create Day-Wise Mappings (Bulk)

**Endpoint:** `POST /api/admin/category-food-mapping/daywise`

**Request Body (Format 1 - Array of mappings):**
```json
{
  "mappings": [
    {
      "foodItemId": "507f1f77bcf86cd799439011",
      "categoryId": "507f1f77bcf86cd799439012",
      "day": "2025-01-06",
      "sequence": 0
    },
    {
      "foodItemId": "507f1f77bcf86cd799439013",
      "categoryId": "507f1f77bcf86cd799439012",
      "day": "2025-01-06",
      "sequence": 1
    }
  ]
}
```

**Request Body (Format 2 - Single food item to multiple days):**
```json
{
  "foodItemId": "507f1f77bcf86cd799439011",
  "categoryId": "507f1f77bcf86cd799439012",
  "days": [
    { "day": "2025-01-06", "sequence": 0 },
    { "day": "2025-01-07", "sequence": 0 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "insertedCount": 2,
    "errors": []
  },
  "message": "Created 2 day-wise mappings successfully"
}
```

### 3. DELETE Day-Wise Mappings

**Endpoint:** `DELETE /api/admin/category-food-mapping/daywise`

**Query Parameters:**
- `categoryId` (optional): Delete all mappings for a category
- `day` (optional): Delete all mappings for a specific day
- `foodItemId` (optional): Delete all mappings for a food item
- `id` (optional): Delete a specific mapping by ID

**Example Request (Delete all mappings for a category):**
```bash
curl -X DELETE \
  'http://localhost:3000/api/admin/category-food-mapping/daywise?categoryId=507f1f77bcf86cd799439012' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

**Example Request (Delete all mappings for a category on a specific date):**
```bash
curl -X DELETE \
  'http://localhost:3000/api/admin/category-food-mapping/daywise?categoryId=507f1f77bcf86cd799439012&day=2025-01-06' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedCount": 5,
    "categoryId": "507f1f77bcf86cd799439012"
  },
  "message": "Deleted 5 day-wise mapping(s) successfully"
}
```

---

## Data Flow Documentation

### 1. Admin Associates Food Items to Specific Dates

#### Step-by-Step Process:

1. **Navigate to Category Items Page**
   - Admin goes to `/admin/food-category/[categoryId]/items`
   - Page loads category details and existing mappings

2. **Load Available Dates**
   - Component: `DayWiseItemSelector` (line 59-61)
   - Hook: `useAvailableDates({ dayWiseCategoryEnabledOnly: true })`
   - Fetches dates from `availableDates` collection where `dayWiseCategoryEnabled: true`

3. **Display Date Selection Grid**
   - Each date becomes a column in a table (lines 279-316)
   - Food items are rows
   - Checkboxes allow item selection per date

4. **Select Items for Dates**
   - Admin clicks checkboxes to associate items with dates
   - State updates: `CategoryDayWiseItem[]`
   - Format: `[{ day: "2025-01-06", items: ["itemId1", "itemId2"] }]`

5. **Save Changes**
   - Click "Save Changes" button
   - Triggers `handleSave()` function (line 216)
   - **DELETE** existing mappings for category
   - **POST** new mappings based on current state

### 2. How Dates Are Validated and Stored

#### Date Validation

**Source:** `/opt/imports/CXGP03/src/app/api/admin/available-dates/route.ts`

```typescript
function validateDateFormat(date: string): boolean {
  const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if (!regex.test(date)) {
    return false;
  }

  // Additional validation to ensure it's a valid date
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
}
```

**Validation Rules:**
- Must match pattern: `YYYY-MM-DD`
- Must be a valid calendar date
- Examples:
  - ✅ Valid: "2025-01-06", "2025-12-31"
  - ❌ Invalid: "2025-13-01", "2025-01-32", "01-06-2025"

#### Date Storage

**In `categoryfoodmapping` collection:**
```json
{
  "day": "2025-01-06",  // Stored as string, not Date object
  "mappingType": "DAY_WISE"
}
```

**Why String?**
- Enables efficient exact match queries
- Simplifies date comparison and grouping
- Maintains consistency with `availableDates` collection
- Supports lexicographic sorting (YYYY-MM-DD sorts chronologically)

### 3. Relationship Between Collections

#### Collection: `availableDates`

**Purpose:** Manages which dates are available for ordering and which category types are enabled

**Schema:**
```typescript
interface AvailableDate {
  _id?: ObjectId;
  date: string;                      // YYYY-MM-DD format
  flatCategoryEnabled: boolean;      // Enable FLAT category listing
  dayWiseCategoryEnabled: boolean;   // Enable DAY_WISE category listing
  createdAt?: Date;
  updatedAt?: Date;
}
```

**Example:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "date": "2025-01-06",
  "flatCategoryEnabled": true,
  "dayWiseCategoryEnabled": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

#### Collection: `categoryfoodmapping`

**Purpose:** Stores food item to category relationships with date specificity for DAY_WISE type

**Relationship:**
- `availableDates.date` corresponds to `categoryfoodmapping.day` (for DAY_WISE mappings)
- Admin must first enable a date in `availableDates` with `dayWiseCategoryEnabled: true`
- Then food items can be assigned to that date in `categoryfoodmapping`

#### Collection: `foodcategories`

**Purpose:** Category metadata including listing type

**Schema:**
```typescript
interface FoodCategory {
  _id?: ObjectId;
  name: string;
  listingType: 'flat' | 'day-wise';  // Determines which mappings to use
  // ... other fields
}
```

#### Collection: `fooditems`

**Purpose:** Food item details

**Relationship:**
- `categoryfoodmapping.foodItemId` references `fooditems._id`
- No category array stored in fooditems (deprecated approach)

### 4. Exact Date Format Used

**Format:** `YYYY-MM-DD`

**Examples:**
- "2025-01-06" (January 6, 2025)
- "2025-12-31" (December 31, 2025)

**Implementation Details:**

1. **Admin UI - DayWiseItemSelector (lines 98-109):**
   ```typescript
   const allDateLabels = useMemo(() => {
     return availableDates
       .sort((a, b) => a.date.localeCompare(b.date))
       .map(date => ({
         label: formatDateLabel(date.date),      // "January 6, 2025"
         shortLabel: formatDateShort(date.date), // "Jan 6"
         displayLabel: formatDateWithDay(date.date), // "Mon, Jan 6"
         date: date.date,                        // "2025-01-06"
         enabled: date.dayWiseCategoryEnabled
       }));
   }, [availableDates]);
   ```

2. **State Storage (line 120-124):**
   ```typescript
   const initialDayWiseItems: CategoryDayWiseItem[] = allDateLabels.map(dateInfo => ({
     day: dateInfo.date,  // Store YYYY-MM-DD format
     items: []
   }));
   ```

3. **API Payload (line 243-259):**
   ```typescript
   const mappings: Array<{
     foodItemId: string;
     categoryId: string;
     day: string;  // YYYY-MM-DD format
     sequence: number;
   }> = [];

   for (const dayItem of dayWiseItems) {
     for (let sequence = 0; sequence < dayItem.items.length; sequence++) {
       mappings.push({
         foodItemId: dayItem.items[sequence],
         categoryId: categoryId,
         day: dayItem.day,  // Passed directly as YYYY-MM-DD
         sequence,
       });
     }
   }
   ```

---

## Date Format and Validation

### Validation Logic

**Location:** `/opt/imports/CXGP03/src/app/api/admin/available-dates/route.ts` (lines 50-59)

```typescript
function validateDateFormat(date: string): boolean {
  // Regex: YYYY-MM-DD format
  // - YYYY: 4 digits
  // - MM: 01-12
  // - DD: 01-31
  const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

  if (!regex.test(date)) {
    return false;
  }

  // Additional validation to ensure it's a valid date
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
}
```

### Format Utility Functions

**Location:** `/opt/imports/CXGP03/src/utils/days.ts`

**Key Functions Used:**

1. **formatDateLabel(date: string): string**
   - Input: "2025-01-06"
   - Output: "January 6, 2025"
   - Used for tooltips and display

2. **formatDateShort(date: string): string**
   - Input: "2025-01-06"
   - Output: "Jan 6"
   - Used for compact display

3. **formatDateWithDay(date: string): string**
   - Input: "2025-01-06"
   - Output: "Mon, Jan 6"
   - Used for column headers

4. **isDateString(value: string): boolean**
   - Checks if string matches YYYY-MM-DD format
   - Used to detect legacy vs new format

5. **isDayName(value: string): boolean**
   - Checks if string is a day name (e.g., "Monday", "Tuesday")
   - Used for migration detection

### Legacy vs Current Format

**Legacy Format (Deprecated):**
- Day names: "Monday", "Tuesday", etc.
- Used in early versions of the feature

**Current Format:**
- Date strings: "2025-01-06", "2025-01-07", etc.
- Implemented for production use

**Migration Logic (DayWiseItemSelector lines 112-153):**
```typescript
// Check if existing data uses old day-name format
const hasLegacyDayFormat = useMemo(() => {
  return value.length > 0 && value.some(item => isDayName(item.day));
}, [value]);

// Migrate legacy day-name format to date format
if (hasLegacyDayFormat && allDateLabels.length > 0) {
  const dateBasedItems: CategoryDayWiseItem[] = allDateLabels.map(dateInfo => ({
    day: dateInfo.date,  // New format: YYYY-MM-DD
    items: []
  }));

  // Try to map legacy day names to dates
  value.forEach(legacyItem => {
    if (isDayName(legacyItem.day)) {
      const dayOfWeek = legacyItem.day.toLowerCase();
      allDateLabels.forEach((dateInfo, index) => {
        const dateObj = new Date(dateInfo.date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        if (dayName === dayOfWeek) {
          // Merge items from legacy day to corresponding date
          dateBasedItems[index].items = [
            ...new Set([...dateBasedItems[index].items, ...legacyItem.items])
          ];
        }
      });
    }
  });

  onChange(dateBasedItems);
}
```

---

## Code Examples

### Example 1: Creating Day-Wise Mappings

```typescript
import { db } from '@/lib/db';
import { ObjectId } from 'mongodb';

async function createDayWiseMappings(
  categoryId: string,
  dayWiseItems: Array<{ day: string; items: string[] }>
) {
  const mappings: Array<{
    foodItemId: ObjectId;
    categoryId: ObjectId;
    day: string;
    sequence: number;
    mappingType: 'DAY_WISE';
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  // Transform dayWiseItems into individual mapping documents
  for (const dayItem of dayWiseItems) {
    for (let sequence = 0; sequence < dayItem.items.length; sequence++) {
      mappings.push({
        foodItemId: new ObjectId(dayItem.items[sequence]),
        categoryId: new ObjectId(categoryId),
        day: dayItem.day,  // YYYY-MM-DD format
        sequence,
        mappingType: 'DAY_WISE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // Bulk insert
  const result = await db.createMany('categoryfoodmapping', mappings);

  return result;
}

// Usage
const mappings = await createDayWiseMappings('category123', [
  { day: '2025-01-06', items: ['item1', 'item2'] },
  { day: '2025-01-07', items: ['item3', 'item4'] }
]);
```

### Example 2: Fetching Day-Wise Mappings for a Category

```typescript
async function getDayWiseMappingsForCategory(categoryId: string) {
  const result = await db.read('categoryfoodmapping', {
    categoryId: new ObjectId(categoryId),
    mappingType: 'DAY_WISE'
  }, {
    sort: { day: 1, sequence: 1 }
  });

  if (!result.success || !result.data) {
    return [];
  }

  // Group by day
  const groupedByDay: Record<string, string[]> = {};

  result.data.forEach(mapping => {
    if (!groupedByDay[mapping.day]) {
      groupedByDay[mapping.day] = [];
    }
    groupedByDay[mapping.day].push(mapping.foodItemId.toString());
  });

  // Transform to CategoryDayWiseItem format
  return Object.entries(groupedByDay).map(([day, items]) => ({
    day,
    items
  }));
}

// Usage
const dayWiseItems = await getDayWiseMappingsForCategory('category123');
// Result: [{ day: '2025-01-06', items: ['item1', 'item2'] }, ...]
```

### Example 3: Fetching Food Items for a Specific Date

```typescript
async function getFoodItemsForDate(categoryId: string, date: string) {
  const mappings = await db.read('categoryfoodmapping', {
    categoryId: new ObjectId(categoryId),
    mappingType: 'DAY_WISE',
    day: date  // YYYY-MM-DD format
  }, {
    sort: { sequence: 1 }
  });

  if (!mappings.success || !mappings.data) {
    return [];
  }

  // Get food item IDs
  const foodItemIds = mappings.data.map(m => m.foodItemId);

  // Fetch food items
  const foodItems = await db.read('fooditems', {
    _id: { $in: foodItemIds }
  });

  return foodItems.data || [];
}

// Usage
const items = await getFoodItemsForDate('category123', '2025-01-06');
```

### Example 4: Checking if Date is Available

```typescript
async function isDateAvailableForDayWise(date: string): Promise<boolean> {
  const result = await db.readOne('availableDates', {
    date: date,  // YYYY-MM-DD format
    dayWiseCategoryEnabled: true
  });

  return result.success && result.data !== null;
}

// Usage
const isAvailable = await isDateAvailableForDayWise('2025-01-06');
```

### Example 5: Complete API Integration

```typescript
// Admin Panel: Save day-wise items
async function saveDayWiseItems(
  categoryId: string,
  dayWiseItems: Array<{ day: string; items: string[] }>,
  token: string
) {
  try {
    // Step 1: Delete existing mappings
    const deleteResponse = await fetch(
      `/api/admin/category-food-mapping/daywise?categoryId=${categoryId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!deleteResponse.ok) {
      throw new Error('Failed to clear existing mappings');
    }

    // Step 2: Prepare new mappings
    const mappings: Array<{
      foodItemId: string;
      categoryId: string;
      day: string;
      sequence: number;
    }> = [];

    for (const dayItem of dayWiseItems) {
      for (let sequence = 0; sequence < dayItem.items.length; sequence++) {
        mappings.push({
          foodItemId: dayItem.items[sequence],
          categoryId: categoryId,
          day: dayItem.day,
          sequence
        });
      }
    }

    // Step 3: Create new mappings
    if (mappings.length > 0) {
      const createResponse = await fetch(
        '/api/admin/category-food-mapping/daywise',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ mappings })
        }
      );

      if (!createResponse.ok) {
        throw new Error('Failed to create new mappings');
      }

      const result = await createResponse.json();
      return result;
    }

    return { success: true, message: 'No items to save' };
  } catch (error) {
    console.error('Error saving day-wise items:', error);
    throw error;
  }
}
```

---

## Troubleshooting Guide

### Issue 1: Day-Wise Items Not Appearing

**Symptoms:**
- Admin saves items successfully
- User-facing app shows no items for the date

**Possible Causes:**
1. Date format mismatch
2. Category not set to 'day-wise' listing type
3. Date not enabled in `availableDates` collection

**Debug Steps:**
```bash
# 1. Check category listing type
db.foodcategories.findOne({ _id: ObjectId("categoryId") })
# Expected: { listingType: "day-wise" }

# 2. Check if date is available
db.availableDates.findOne({ date: "2025-01-06" })
# Expected: { dayWiseCategoryEnabled: true }

# 3. Check if mappings exist
db.categoryfoodmapping.find({
  categoryId: ObjectId("categoryId"),
  mappingType: "DAY_WISE",
  day: "2025-01-06"
})
# Expected: Array of mapping documents

# 4. Check date format in mappings
db.categoryfoodmapping.find({
  categoryId: ObjectId("categoryId"),
  mappingType: "DAY_WISE"
}).pretty()
# Verify: "day" field should be "2025-01-06" (string)
```

### Issue 2: Wrong Date Format

**Symptoms:**
- Items saved but not retrieved
- Query returns empty results

**Solution:**
Ensure date is in YYYY-MM-DD format:

```typescript
// ❌ Wrong
const day = "Jan 6, 2025";
const day = "06-01-2025";
const day = "2025/01/06";
const day = "Monday";

// ✅ Correct
const day = "2025-01-06";

// Validation
function isValidDateFormat(date: string): boolean {
  const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  return regex.test(date) && !isNaN(new Date(date).getTime());
}
```

### Issue 3: Duplicate Mappings

**Symptoms:**
- Same item appears multiple times
- Save operation fails with duplicate error

**Solution:**
API automatically checks for duplicates. Ensure:
1. Delete existing mappings before creating new ones
2. Use the exact same workflow as admin panel (DELETE → POST)

```typescript
// Correct workflow
await deleteExistingMappings(categoryId);
await createNewMappings(mappings);
```

### Issue 4: Sequence Order Wrong

**Symptoms:**
- Items appear in wrong order
- Sequence numbers not sequential

**Solution:**
```typescript
// When creating mappings, ensure proper sequence assignment
const mappings: Array<{
  foodItemId: string;
  categoryId: string;
  day: string;
  sequence: number;
}> = [];

for (const dayItem of dayWiseItems) {
  // Assign sequence based on array index
  for (let sequence = 0; sequence < dayItem.items.length; sequence++) {
    mappings.push({
      foodItemId: dayItem.items[sequence],
      categoryId: categoryId,
      day: dayItem.day,
      sequence,  // 0, 1, 2, 3, ...
    });
  }
}

// When querying, sort by sequence
db.categoryfoodmapping.find({
  categoryId: ObjectId("..."),
  mappingType: "DAY_WISE",
  day: "2025-01-06"
}).sort({ sequence: 1 })
```

### Issue 5: Mixed Legacy and Current Format

**Symptoms:**
- Some items use day names ("Monday")
- Some items use dates ("2025-01-06")
- Inconsistent behavior

**Solution:**
Run migration to convert all to date format:

```typescript
// Check for legacy format
const hasLegacyFormat = await db.categoryfoodmapping.findOne({
  mappingType: "DAY_WISE",
  day: { $regex: /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i }
});

if (hasLegacyFormat) {
  console.warn('Legacy day-name format detected. Migration required.');

  // Use admin panel's built-in migration
  // Or manually update documents
}
```

---

## Key Takeaways for Implementation

1. **Date Format is Critical:** Always use YYYY-MM-DD format (e.g., "2025-01-06")
2. **Delete Before Create:** Admin pattern is DELETE existing mappings, then POST new ones
3. **Mapping Type Discriminator:** Always set `mappingType: 'DAY_WISE'`
4. **Day Field Required:** DAY_WISE mappings must include `day` field
5. **Sequence Matters:** Items are ordered by `sequence` field (0-based index)
6. **Date Availability:** Check `availableDates` collection to ensure date is enabled
7. **Category Type:** Category must have `listingType: 'day-wise'`

---

## Related Files

### Admin Panel (CXGP03)
- `/opt/imports/CXGP03/src/app/admin/food-category/[categoryId]/items/page.tsx`
- `/opt/imports/CXGP03/src/app/admin/food-category/components/DayWiseItemSelector.tsx`
- `/opt/imports/CXGP03/src/app/api/admin/category-food-mapping/daywise/route.ts`
- `/opt/imports/CXGP03/src/app/api/admin/available-dates/route.ts`

### Type Definitions
- `/opt/imports/CXGP03/src/types/order.ts`

### Utilities
- `/opt/imports/CXGP03/src/utils/days.ts`
- `/opt/imports/CXGP03/src/lib/helpers/categoryFoodMappingHelpers.ts`

### Migrations
- `/opt/imports/CXGP03/src/lib/migrations/category-food-mapping-discriminated.ts`
- `/opt/imports/CXGP03/src/lib/migrations/README-DISCRIMINATED-SCHEMA.md`

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-06 | Initial documentation created from CXGP03 analysis |

---

**End of Document**
