# API Date Format Standardization

## Overview

This document describes the standardized approach to date formatting in API responses across the application. The dual-format pattern ensures both machine-readable ISO 8601 compliance and user-friendly display formats.

## Date Format Pattern

### Dual Field Approach

All API endpoints that return date information should provide **both** of the following fields:

1. **`date`** (or similarly named field like `dateString`)
   - Format: `YYYY-MM-DD` (ISO 8601 standard)
   - Purpose: Machine-readable canonical format
   - Use cases:
     - Data processing
     - Filtering and sorting
     - API interactions
     - Date comparisons
     - Database queries
   - Example: `"2024-01-15"`

2. **`formattedDate`** (or similarly named field)
   - Format: Human-readable locale-specific format
   - Purpose: UI display convenience
   - Use cases:
     - Direct display in UI components
     - User-facing text
     - Reduces client-side formatting logic
   - Example: `"Monday, January 15, 2024"` or `"Friday (Jan 15)"`

## Rationale

### Why Two Fields?

1. **API Best Practices**: Follows industry standards of providing both machine-readable and human-readable formats
2. **Performance**: Reduces client-side JavaScript processing for date display
3. **Consistency**: Ensures uniform date formatting across all clients (web, mobile, etc.)
4. **ISO 8601 Compliance**: Maintains international standard for data exchange
5. **UX Enhancement**: Provides ready-to-use formatted strings for UI components

### Benefits

- **Frontend Efficiency**: No need to format dates on the client side
- **Data Integrity**: ISO 8601 format is unambiguous and sortable
- **Timezone Consistency**: Server-side formatting ensures consistent timezone handling (PST)
- **Reduced Code**: Less JavaScript code needed in frontend components
- **Better Testing**: Server-side formatting is easier to test and validate

## Implementation Examples

### Example 1: Food Items Day-wise API

**Endpoint**: `GET /api/food-items-day-wise`

**Response Structure**:
```json
{
  "data": {
    "categoryId": "65a1b2c3d4e5f6789abcdef0",
    "categoryListingType": "day-wise",
    "date": "2024-01-15",              // ISO 8601 - Use for data processing
    "formattedDate": "Monday, January 15, 2024",  // Use for UI display
    "foodItems": [...]
  },
  "message": "success"
}
```

**Implementation**:
```typescript
// Line 532-536 in route.ts
date: date,  // Canonical API date format (ISO 8601: YYYY-MM-DD)
formattedDate: formatDateString(date),  // Human-readable date format for UI display
```

### Example 2: Available Dates API

**Endpoint**: `GET /api/available-dates`

**Response Structure**:
```json
{
  "success": true,
  "dates": [
    {
      "id": "2024-01-15",
      "date": "2024-01-15",              // ISO 8601 format
      "formattedDate": "Friday (Jan 15)", // Human-readable format
      "fullDate": "Friday, January 15, 2024",
      "flatCategoryEnabled": true,
      "dayWiseCategoryEnabled": true,
      "isToday": false,
      "isPast": false,
      "isPastCutoff": false
    }
  ]
}
```

**Implementation**:
- See `/src/lib/server/availableDates.ts` lines 249-259

### Example 3: Food Items by Category API

**Endpoint**: `GET /api/food-items-by-category`

**Response Structure** (for day-wise categories):
```json
{
  "data": {
    "_id": "65a1b2c3d4e5f6789abcdef0",
    "name": "Daily Specials",
    "listingType": "day-wise",
    "dayWiseItems": {
      "2024-01-15": [...],  // ISO 8601 date as key
      "2024-01-16": [...]
    }
  },
  "message": "success"
}
```

**Note**: This endpoint uses ISO 8601 dates as object keys, which is inherently machine-readable. Frontend components can format these keys for display if needed.

## Validation Rules

### Date Field Validation

All API endpoints must:

1. **Accept dates in YYYY-MM-DD format** (ISO 8601)
2. **Validate date format using regex**:
   ```typescript
   const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
   ```

3. **Return date field in YYYY-MM-DD format** (no transformations)

4. **Document the dual format pattern** in JSDoc comments

### FormattedDate Field Validation

1. **Use PST timezone consistently** (via `PST_TIMEZONE` constant)
2. **Use locale 'en-US'** for consistency
3. **Include relevant date components**:
   - Weekday (long format: "Monday")
   - Month (long or short format: "January" or "Jan")
   - Day (numeric: "15")
   - Year (numeric: "2024") - optional for short-term dates

4. **Handle errors gracefully**:
   ```typescript
   try {
     return dateObj.toLocaleDateString('en-US', options);
   } catch (error) {
     console.warn(`Failed to format date: ${dateString}`, error);
     return dateString; // Fallback to ISO format
   }
   ```

## Coding Standards

### Required Documentation

All functions that format dates must include comprehensive JSDoc comments:

```typescript
/**
 * Format date string to human-readable format
 *
 * PURPOSE: This function provides a UI-friendly date format for display purposes.
 * It is intentionally separate from the canonical 'date' field (YYYY-MM-DD) to follow
 * API best practices of providing both machine-readable and human-readable formats.
 *
 * WHY THIS EXISTS:
 * - Frontend components can directly display formattedDate without additional formatting logic
 * - Provides consistent date formatting across all clients
 * - Reduces client-side JavaScript processing for date display
 * - Maintains ISO 8601 standard in 'date' field for data processing
 *
 * @param dateString - Date string in YYYY-MM-DD format (ISO 8601)
 * @returns Formatted date string (e.g., "Monday, January 15, 2024") in PST timezone
 *
 * @example
 * formatDateString("2024-01-15") // Returns "Monday, January 15, 2024"
 */
function formatDateString(dateString: string): string {
  // Implementation...
}
```

### Response Object Documentation

API response builders must include inline comments explaining the dual format:

```typescript
return Response.json({
  data: {
    // Canonical API date format (ISO 8601: YYYY-MM-DD)
    // Use this for: data processing, filtering, API interactions, date comparisons
    date: date,

    // Human-readable date format for UI display
    // Use this for: direct display in UI components, user-facing text
    // Avoid using for: date comparisons, sorting, data processing
    formattedDate: formatDateString(date),

    // ... other fields
  }
});
```

## Frontend Usage Guidelines

### When to Use Each Field

**Use `date` (YYYY-MM-DD) for**:
- API calls (query parameters, request body)
- Date comparisons and sorting
- Local storage keys
- Database queries
- Date calculations (with proper parsing)

**Use `formattedDate` for**:
- Direct display in UI components
- User-facing text and labels
- Toast notifications and messages
- Confirmation dialogs

**Never use `formattedDate` for**:
- Date comparisons
- Sorting operations
- API requests
- Data processing

### Example Frontend Code

```typescript
// ✅ CORRECT: Use 'date' field for API calls
const response = await fetch(`/api/food-items-day-wise?categoryId=${catId}&date=${item.date}`);

// ✅ CORRECT: Use 'formattedDate' for display
<Text>{item.formattedDate}</Text>

// ❌ WRONG: Don't use formattedDate for API calls
const response = await fetch(`/api/food-items-day-wise?date=${item.formattedDate}`); // DON'T DO THIS

// ❌ WRONG: Don't use formattedDate for comparisons
if (item.formattedDate > otherItem.formattedDate) { ... } // DON'T DO THIS
```

## Timezone Handling

### PST Timezone Standard

All date operations use **Pacific Standard Time (PST)** timezone:

1. **Database Storage**: Dates stored as YYYY-MM-DD (timezone-agnostic)
2. **Server Processing**: Use `createPSTDate()` and `PST_TIMEZONE` constants
3. **Client Display**: Formatted dates include PST timezone context

### Timezone Utilities

Use the timezone utilities from `/src/lib/timezone.ts`:

- `createPSTDate(year, month, day, hours, minutes, seconds)` - Create PST date object
- `getPSTNow()` - Get current time in PST
- `getPSTDateString(date)` - Format date as YYYY-MM-DD in PST
- `PST_TIMEZONE` constant - Use in `toLocaleDateString()` calls

## Migration Checklist

When updating an API endpoint to follow this standard:

- [ ] Add `date` field in YYYY-MM-DD format (if not present)
- [ ] Add `formattedDate` field with human-readable format
- [ ] Add comprehensive JSDoc documentation
- [ ] Add inline comments in response builder
- [ ] Validate date format using regex
- [ ] Handle errors gracefully in formatting function
- [ ] Test with various date inputs
- [ ] Update API documentation
- [ ] Verify frontend uses correct field for each use case
- [ ] Add examples to this document

## Related Documents

- **Date Handling Convention**: `/docs/standards/date-handling-convention.md`
- **Timezone Utilities**: `/src/lib/timezone.ts`
- **Available Dates Implementation**: `/src/lib/server/availableDates.ts`

## Examples in Codebase

### Fully Documented Endpoints

1. **Food Items Day-wise API**
   - File: `/src/app/api/food-items-day-wise/route.ts`
   - Lines: 22-51 (API documentation), 238-256 (function documentation), 524-542 (response builder)
   - Status: ✅ Fully documented

2. **Available Dates API**
   - File: `/src/app/api/available-dates/route.ts`
   - File: `/src/lib/server/availableDates.ts`
   - Lines: 31-63 (interface documentation), 173-262 (implementation)
   - Status: ✅ Fully documented

3. **Food Items by Category API**
   - File: `/src/app/api/food-items-by-category/route.ts`
   - Lines: 242-280 (API documentation)
   - Status: ⚠️ Uses YYYY-MM-DD as object keys (no formattedDate needed for keys)

## Change Log

### 2025-01-07
- Added comprehensive documentation to `/src/app/api/food-items-day-wise/route.ts`
- Documented dual format pattern in API response structure
- Added detailed JSDoc comments to `formatDateString()` function
- Added inline comments in response builder explaining field usage
- Created this standardization document

## Questions or Issues?

If you have questions about this standard or need clarification on implementation:

1. Review the examples in this document
2. Check the fully documented endpoints listed above
3. Refer to the timezone utilities in `/src/lib/timezone.ts`
4. Consult the date handling convention document

---

**Standard Owner**: Backend Team
**Last Updated**: 2025-01-07
**Status**: Active Standard
