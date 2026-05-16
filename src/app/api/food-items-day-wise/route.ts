import { NextRequest } from 'next/server';
import { db } from '@/lib/server/db';
import { ObjectId as MongoObjectId, Document } from 'mongodb';
import { PST_TIMEZONE, createPSTDate } from '@/lib/timezone';

/**
 * ============================================================================
 * DAY-WISE FOOD ITEMS API ENDPOINT
 * ============================================================================
 *
 * GET /api/food-items-day-wise
 * Fetch food items for a specific category and date
 *
 * This endpoint returns food items that have **DAY_WISE** category–food mappings for the given
 * `categoryId` and calendar `date`. It works for both **day-wise** and **flat** listing types on
 * the category (flat sub-categories often use DAY_WISE rows per date while the category stays "flat").
 *
 * Query Parameters:
 * - categoryId (required): The category ID to fetch items for
 * - date (required): Date string in YYYY-MM-DD format
 * - vegOnly (optional): Filter for vegetarian items only
 *
 * Response Structure:
 * {
 *   data: {
 *     categoryId: string,
 *     categoryListingType: 'day-wise',
 *     date: string,        // YYYY-MM-DD format (ISO 8601 - canonical, use for data processing)
 *     formattedDate: string, // Human-readable format (use for UI display only)
 *     foodItems: FoodItem[] // Array of food items for this date
 *   },
 *   message: 'success'
 * }
 *
 * Date Format Strategy:
 * - date: Returns YYYY-MM-DD (ISO 8601 standard format)
 *   - This is the canonical API format for dates
 *   - Machine-readable and sortable
 *   - Use this for data processing, filtering, and API interactions
 *   - Timezone-agnostic (represents the calendar date in PST)
 *
 * - formattedDate: Human-readable format like "Monday, January 15, 2024"
 *   - Provided for UI convenience to avoid client-side formatting
 *   - Uses PST timezone for consistency
 *   - Use this for display purposes only
 *   - Not intended for data processing or comparisons
 *
 * Error Responses:
 * - 400: Invalid categoryId format or Invalid date format
 * - 404: Category not found or No items found for date
 * - 500: Internal server error
 */

// Category food mapping types
interface CategoryFoodMapping {
  _id: any;
  categoryId: any;
  foodItemId: any;
  mappingType: 'FLAT' | 'DAY_WISE';
  day?: string; // Contains date strings (YYYY-MM-DD) for DAY_WISE mappings
  sequence?: number;
}

interface Query {
  available: boolean;
  veg?: boolean;
  isDraft?: boolean | { $ne: boolean };
  _id?: { $in: MongoObjectId[] };
}

/**
 * Helper function to populate combo section item references
 * Converts item IDs to full item objects with name, description, etc.
 */
interface ComboSection {
  selectedItems?: Array<{
    item: { toString(): string };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

async function populateComboSections(sections: ComboSection[], sectionIndexStart: number = 0): Promise<Array<Record<string, unknown>>> {
  if (!sections || sections.length === 0) {
    return [];
  }

  return Promise.all(
    sections.map(async (section, sectionIdx) => {
      // Generate a stable ID for the section if it doesn't have one
      const sectionTitle = typeof section.title === 'string' ? section.title : 'section';
      const sectionId = section._id || `section-${sectionIndexStart + sectionIdx}-${sectionTitle.replace(/\s+/g, '-')}`;

      if (!section.selectedItems || section.selectedItems.length === 0) {
        return {
          ...section,
          _id: sectionId,
          selectedItems: [],
        };
      }

      const populatedItems = await Promise.all(
        section.selectedItems!.map(async (selectedItem: { item: { toString(): string };[key: string]: unknown }, itemIdx: number) => {
          try {
            // selectedItem.item is an ObjectId or string ID
            const itemId = selectedItem.item?.toString();

            // Validate itemId exists and is not empty
            if (!itemId || itemId.trim() === '') {
              console.warn(`Combo item has empty or null ID in section`);
              return {
                ...selectedItem,
                _id: selectedItem._id || `item-${itemIdx}-error`,
                item: {
                  _id: 'unknown',
                  name: 'Invalid Item ID',
                  description: 'Item ID is missing or invalid',
                  price: 0,
                  veg: false,
                  url: '',
                },
              };
            }

            // Validate ObjectId format before querying database
            if (!MongoObjectId.isValid(itemId)) {
              console.warn(`Invalid ObjectId format for combo item: ${itemId}`);
              return {
                ...selectedItem,
                _id: selectedItem._id || `item-${itemIdx}-invalid`,
                item: {
                  _id: itemId,
                  name: 'Invalid Item ID',
                  description: `Invalid ObjectId format: ${itemId}`,
                  price: 0,
                  veg: false,
                  url: '',
                },
              };
            }

            // Fetch the full food item data
            const itemResult = await db.readOne('fooditems', {
              _id: new MongoObjectId(itemId),
            });

            if (!itemResult.success || !itemResult.data) {
              console.warn(`Failed to populate combo item: ${itemId}. ${itemResult.error ? `Database error: ${itemResult.error}` : 'Item not found in database'}`);
              return {
                ...selectedItem,
                _id: selectedItem._id || `item-${itemIdx}-notfound`,
                item: {
                  _id: itemId,
                  name: 'Item Not Available',
                  description: `Item with ID ${itemId} is not available or has been removed`,
                  price: 0,
                  veg: false,
                  url: '',
                },
              };
            }

            const itemData = itemResult.data;

            // Replace the ID with the full item object and add _id for the selectedItem
            return {
              ...selectedItem,
              _id: selectedItem._id || `item-${itemIdx}-${itemData.name.replace(/\s+/g, '-')}`,
              item: {
                _id: itemId,
                name: itemData.name || 'Unknown Item',
                description: itemData.description || '',
                price: itemData.price || 0,
                veg: itemData.veg || false,
                url: itemData.url || itemData.imageUrl || '',
              },
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const itemId = selectedItem.item?.toString() || 'unknown';

            if (errorMessage.includes('ObjectId') || errorMessage.includes('BSON')) {
              console.warn(`Invalid ObjectId for combo item: ${itemId}. Error: ${errorMessage}`);
              return {
                ...selectedItem,
                _id: selectedItem._id || `item-${itemIdx}-error`,
                item: {
                  _id: itemId,
                  name: 'Invalid Item ID',
                  description: `Invalid ObjectId format: ${itemId}`,
                  price: 0,
                  veg: false,
                  url: '',
                },
              };
            }

            console.error(`Database error while populating combo item ${itemId}:`, {
              error: errorMessage,
              stack: error instanceof Error ? error.stack : undefined,
              itemId
            });

            return {
              ...selectedItem,
              _id: selectedItem._id || `item-${itemIdx}-catch-error`,
              item: {
                _id: itemId,
                name: 'Error Loading Item',
                description: `Failed to load item: ${errorMessage}`,
                price: 0,
                veg: false,
                url: '',
              },
            };
          }
        })
      );

      return {
        ...section,
        _id: sectionId,
        selectedItems: populatedItems,
      };
    })
  );
}

/**
 * Validate date format YYYY-MM-DD using regex
 * @param dateString - Date string to validate
 * @returns true if valid, false otherwise
 */
function isValidDateFormat(dateString: string): boolean {
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
  return dateRegex.test(dateString);
}

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
  try {
    // Parse YYYY-MM-DD format
    const [year, month, day] = dateString.split('-').map(Number);

    // Create date object (the dateString already represents a PST date)
    const dateObj = createPSTDate(year, month - 1, day, 0, 0, 0);

    // Format date without timezone conversion
    // Since dateString is already a PST date, we just format the calendar date directly
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    return dateObj.toLocaleDateString('en-US', options);
  } catch (error) {
    console.warn(`Failed to format date: ${dateString}`, error);
    return dateString;
  }
}

/**
 * GET handler for fetching day-wise food items
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    const date = searchParams.get('date');
    const vegOnly = searchParams.get('vegOnly') === 'true';

    // Validate required categoryId parameter
    if (!categoryId) {
      console.log('[food-items-day-wise] Missing categoryId parameter');
      return Response.json(
        {
          message: 'categoryId query parameter is required',
          error: 'Missing required parameter: categoryId',
        },
        { status: 400 }
      );
    }

    // Validate categoryId format
    if (!MongoObjectId.isValid(categoryId)) {
      console.log(`[food-items-day-wise] Invalid categoryId format: ${categoryId}`);
      return Response.json(
        {
          message: 'Invalid categoryId format',
          error: 'categoryId must be a valid ObjectId',
        },
        { status: 400 }
      );
    }

    // Validate required date parameter
    if (!date) {
      console.log('[food-items-day-wise] Missing date parameter');
      return Response.json(
        {
          message: 'date query parameter is required',
          error: 'Missing required parameter: date',
        },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!isValidDateFormat(date)) {
      console.log(`[food-items-day-wise] Invalid date format: ${date}`);
      return Response.json(
        {
          message: 'Invalid date format',
          error: 'date must be in YYYY-MM-DD format (e.g., 2024-01-15)',
        },
        { status: 400 }
      );
    }

    console.log(`[food-items-day-wise] Fetching items for categoryId: ${categoryId}, date: ${date}, vegOnly: ${vegOnly}`);

    // Step 1: Fetch the category by ID to verify it exists and get listingType
    const categoryResult = await db.readOne('foodcategories', {
      _id: new MongoObjectId(categoryId),
      isDraft: { $ne: true }
    });

    if (!categoryResult.success || !categoryResult.data) {
      console.log(`[food-items-day-wise] Category not found: ${categoryId}`);
      return Response.json(
        {
          message: 'Category not found',
          error: 'No category exists with the provided categoryId',
        },
        { status: 404 }
      );
    }

    const category = categoryResult.data;

    console.log(
      `[food-items-day-wise] Category found: ${category.name} (${category.listingType || 'flat'}) — DAY_WISE mappings for date`
    );

    // Step 2: Fetch category food mappings for this specific category, date, and mapping type
    const categoryFoodMappingResult = await db.read(
      'categoryfoodmapping',
      {
        categoryId: new MongoObjectId(categoryId),
        mappingType: 'DAY_WISE',
        day: date // Exact match for the date string
      },
      {
        sort: { sequence: 1 } // Sort by sequence field
      }
    );

    if (!categoryFoodMappingResult.success) {
      console.warn('[food-items-day-wise] Failed to fetch categoryfoodmapping data:', categoryFoodMappingResult.error);
      return Response.json(
        {
          message: 'Failed to fetch category food mappings',
          error: categoryFoodMappingResult.error,
        },
        { status: 500 }
      );
    }

    const mappings = categoryFoodMappingResult.data as CategoryFoodMapping[];

    if (!mappings || mappings.length === 0) {
      console.log(`[food-items-day-wise] No items found for categoryId: ${categoryId}, date: ${date}`);
      return Response.json(
        {
          message: 'No items found for this date',
          error: `No food items are mapped to category ${categoryId} for date ${date}`,
        },
        { status: 404 }
      );
    }

    console.log(`[food-items-day-wise] Found ${mappings.length} mappings for date: ${date}`);

    // Step 3: Extract food item IDs from mappings
    const foodItemIds = mappings
      .map(mapping => mapping.foodItemId?.toString())
      .filter(id => id); // Filter out any null/undefined IDs

    if (foodItemIds.length === 0) {
      console.log('[food-items-day-wise] No valid food item IDs found in mappings');
      return Response.json(
        {
          message: 'No valid items found',
          error: 'No valid food item IDs were found in the category mappings',
        },
        { status: 404 }
      );
    }

    // Step 4: Fetch food items from database
    const query: Query = {
      available: true,
      isDraft: { $ne: true },
      _id: { $in: foodItemIds.map(id => new MongoObjectId(id)) }
    };

    // Add veg filter if requested
    if (vegOnly) {
      query.veg = true;
    }

    console.log(`[food-items-day-wise] Fetching food items with query:`, query);

    const foodItemsResult = await db.read('fooditems', query, {
      sort: { sequence: 1 },
    });

    if (!foodItemsResult.success || !foodItemsResult.data) {
      console.warn('[food-items-day-wise] Failed to fetch food items:', foodItemsResult.error);
      return Response.json(
        {
          message: 'Failed to fetch food items',
          error: foodItemsResult.error || 'Unknown error',
        },
        { status: 500 }
      );
    }

    const foodItems = foodItemsResult.data;

    if (foodItems.length === 0) {
      console.log('[food-items-day-wise] No food items found matching criteria');
      return Response.json(
        {
          message: 'No items found',
          error: 'No food items match the specified criteria',
        },
        { status: 404 }
      );
    }

    console.log(`[food-items-day-wise] Found ${foodItems.length} food items`);

    // Align with food-items-by-category: weekly menu keys (day names and/or YYYY-MM-DD) per item
    let availabilityMap = new Map<string, string[]>();
    try {
      const enabledDatesResult = await db.read(
        'availableDates',
        { dayWiseCategoryEnabled: true },
        { sort: { date: 1 } }
      );
      const enabledDatesForAvailability: string[] = [];
      if (enabledDatesResult.success && enabledDatesResult.data && Array.isArray(enabledDatesResult.data)) {
        for (const dateDoc of enabledDatesResult.data as { date?: string }[]) {
          const ds = typeof dateDoc.date === 'string' ? dateDoc.date.trim() : '';
          if (/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(ds)) {
            enabledDatesForAvailability.push(ds);
          }
        }
      }

      const weeklyMenuResult = await db.readOne('weeklymenus', { active: true });
      const weeklyMenu =
        weeklyMenuResult.success && weeklyMenuResult.data
          ? (weeklyMenuResult.data as Record<string, unknown>)
          : { allDays: [], tuesday: [], wednesday: [], thursday: [], friday: [] };

      const daysOfWeek = ['allDays', ...enabledDatesForAvailability];
      availabilityMap = new Map<string, string[]>();
      for (const dayOrDate of daysOfWeek) {
        const dayItems = (weeklyMenu[dayOrDate] as unknown[]) || [];
        for (const itemId of dayItems) {
          const itemIdStr = String(itemId);
          if (!availabilityMap.has(itemIdStr)) {
            availabilityMap.set(itemIdStr, []);
          }
          availabilityMap.get(itemIdStr)!.push(dayOrDate);
        }
      }
    } catch (e) {
      console.warn('[food-items-day-wise] Could not build availability map:', e);
    }

    // Step 5: Transform food items to response format
    const transformedItems = await Promise.all(
      foodItems.map(async (foodItem: Document) => {
        const foodItemIdStr = foodItem._id.toString();

        // Populate combo sections if this is a combo item
        let populatedSections: Array<Record<string, unknown>> = [];
        if (foodItem.hasCombo && foodItem.sections && foodItem.sections.length > 0) {
          populatedSections = await populateComboSections(foodItem.sections);
        }

        return {
          _id: foodItemIdStr,
          name: foodItem.name,
          description: foodItem.description || '',
          short_description: foodItem.short_description || '',
          price: foodItem.price,
          veg: foodItem.veg,
          available: foodItem.available,
          url: foodItem.url || foodItem.imageUrl || '',
          public_id: foodItem.public_id || '',
          isEcoFriendlyContainer: foodItem.isEcoFriendlyContainer || false,
          hasSpiceLevel: foodItem.hasSpiceLevel || false,
          hasCombo: foodItem.hasCombo || false,
          portions: foodItem.portions || [],
          portionPrices: foodItem.portionPrices || [],
          spiceLevel: foodItem.spiceLevel || [],
          ecoContainerCharge: foodItem.ecoContainerCharge || 0,
          itemType: foodItem.itemType || 'single',
          comboItems: foodItem.comboItems || [],
          sections: populatedSections.length > 0 ? populatedSections : (foodItem.sections || []),
          availableWeekDays: availabilityMap.get(foodItemIdStr) || [],
        };
      })
    );

    // Step 6: Sort items according to the mapping sequence order
    // Create a map for quick lookup and then sort based on mapping order
    const itemMap = new Map(transformedItems.map(item => [item._id, item]));
    const sortedItems = mappings
      .map(mapping => mapping.foodItemId?.toString())
      .filter(id => id && itemMap.has(id))
      .map(id => itemMap.get(id!));

    // Remove duplicates (in case an item appears multiple times in mappings)
    const uniqueItems = Array.from(
      new Map(sortedItems.filter(item => item != null).map(item => [item._id, item])).values()
    );

    console.log(`[food-items-day-wise] Returning ${uniqueItems.length} unique items`);

    // Step 7: Build and return response
    return Response.json(
      {
        data: {
          categoryId: categoryId,
          categoryListingType: (category.listingType || 'flat') as 'flat' | 'day-wise',
          // Canonical API date format (ISO 8601: YYYY-MM-DD)
          // Use this for: data processing, filtering, API interactions, date comparisons
          date: date,
          // Human-readable date format for UI display
          // Use this for: direct display in UI components, user-facing text
          // Avoid using for: date comparisons, sorting, data processing
          formattedDate: formatDateString(date),
          foodItems: uniqueItems,
        },
        message: 'success',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[food-items-day-wise] Error fetching day-wise food items:', error);
    return Response.json(
      {
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
