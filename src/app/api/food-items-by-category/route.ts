import { NextRequest } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { ObjectId as MongoObjectId, Document } from 'mongodb';

// Category types based on admin schema
type CategoryListingType = 'flat' | 'day-wise';

/**
 * ============================================================================
 * MIGRATION FROM DAY-OF-WEEK TO DATE-SPECIFIC SYSTEM
 * ============================================================================
 *
 * This file has been updated to use date-specific logic instead of day-of-week logic.
 *
 * OLD SYSTEM (Day-of-Week):
 * - Used 'availableDays' collection with day names (Monday, Tuesday, etc.)
 * - Filtered by 'enabled: true' field
 * - categoryfoodmapping.day field contained day names like "monday", "tuesday"
 * - Response grouped items by day name
 *
 * NEW SYSTEM (Date-Specific):
 * - Uses 'availableDates' collection with date strings (YYYY-MM-DD format)
 * - Filters by 'dayWiseCategoryEnabled: true' field for day-wise categories
 * - categoryfoodmapping.day field contains date strings like "2024-01-15"
 * - Response groups items by date string
 *
 * KEY CHANGES:
 * 1. getEnabledDates() now queries availableDates instead of availableDays
 * 2. dayWiseItems uses date strings as keys instead of day names
 * 3. Filtering logic checks dayWiseCategoryEnabled for date-based enabled status
 * 4. All date operations are timezone-aware (PST)
 *
 * BENEFITS:
 * - Supports specific calendar dates instead of recurring weekly patterns
 * - Allows different availability for different dates (e.g., holidays)
 * - More flexible for scheduling and menu planning
 * - Consistent with the new date-based availability system
 */

interface CategoryDayWiseItem {
  day: string; // Now contains date strings (YYYY-MM-DD) instead of day names
  items: string[];
}

// Category food mapping types
interface CategoryFoodMapping {
  _id: any;
  categoryId: any;
  foodItemId: any;
  mappingType: 'FLAT' | 'DAY_WISE';
  day?: string; // Contains date strings (YYYY-MM-DD) for DAY_WISE mappings in the new system
  sequence?: number;
}

interface Query {
  available: boolean;
  veg?: boolean;
  isDraft?: boolean | { $ne: boolean };
  _id?: { $in: MongoObjectId[] };
}



interface CartItem {
  _id: MongoObjectId;
  food: MongoObjectId;
  quantity: number;
  selectedPortion: string;
  selectedPortionPrice: number;
  selectedSpiceLevel: string;
  useEcoContainer: boolean;
  selectedComboItems: Record<string, unknown>;
  totalPrice: number;
  day: MongoObjectId;
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
              // Enhanced logging with more context
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
            // Enhanced error handling with specific error types
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const itemId = selectedItem.item?.toString() || 'unknown';

            // Check if it's an ObjectId construction error
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

            // Log other errors with more detail
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
 * GET /api/food-items-by-category
 * Fetch food items for a specific category with support for different listing types
 * Optional authentication - enhanced with cart data if user is logged in
 *
 * Features:
 * - Accepts required categoryId query parameter
 * - Fetches category by ID to determine listingType (flat or day-wise)
 * - Fetches food items for that category using categoryfoodmapping collection
 * - For flat categories: returns foodItems array
 * - For day-wise categories: returns dayWiseItems object grouped by date string (YYYY-MM-DD format)
 * - Includes listingType in response root
 * - Filters by enabled dates from availableDates collection (dayWiseCategoryEnabled: true)
 *
 * DATE-SPECIFIC SYSTEM (NEW):
 * - Queries availableDates collection instead of availableDays
 * - Filters dates where dayWiseCategoryEnabled is true for day-wise categories
 * - Groups items by date string (e.g., "2024-01-15") instead of day names
 * - Supports specific calendar dates with flexible scheduling
 *
 * Query Parameters:
 * - categoryId: string (required) - The ID of the category to fetch items for
 * - vegOnly: "true" | "false" (optional) - Filter for vegetarian items only
 *
 * Response Structure:
 * {
 *   data: {
 *     _id: string,
 *     name: string,
 *     description: string,
 *     url: string,
 *     listingType: 'flat' | 'day-wise',
 *     foodItems: Array // For flat categories
 *     OR
 *     dayWiseItems: { [dateString]: Array } // For day-wise categories, e.g., { "2024-01-15": [...], "2024-01-16": [...] }
 *   },
 *   message: 'success'
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    const vegOnly = searchParams.get('vegOnly') === 'true';

    // Validate required categoryId parameter
    if (!categoryId) {
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
      return Response.json(
        {
          message: 'Invalid categoryId format',
          error: 'categoryId must be a valid ObjectId',
        },
        { status: 400 }
      );
    }

    // Optional authentication - try to get user ID from token
    let userId: string | null = null;
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const verifyResult = jwtHandler.verifyToken(token);
        if (verifyResult.success && verifyResult.payload) {
          userId = verifyResult.payload.userId;
        }
      }
    } catch {
      // Continue without authentication
      console.log('Optional auth failed, continuing as guest');
    }

    // Step 1: Fetch the category by ID to determine listingType
    const categoryResult = await db.readOne('foodcategories', {
      _id: new MongoObjectId(categoryId),
      isDraft: { $ne: true }
    });

    if (!categoryResult.success || !categoryResult.data) {
      return Response.json(
        {
          message: 'Category not found',
          error: 'No category exists with the provided categoryId',
        },
        { status: 404 }
      );
    }

    const category = categoryResult.data;
    const listingType: CategoryListingType = category.listingType || 'flat';

    // Step 2: Fetch enabled dates from availableDates collection
    // MIGRATION: Changed from availableDays (day names) to availableDates (date strings)
    const getEnabledDates = async (): Promise<string[]> => {
      try {
        console.log('Fetching enabled dates from availableDates collection...');

        // Query availableDates collection for dates where day-wise category is enabled
        // This replaces the old availableDays query that checked enabled: true
        const result = await db.read('availableDates', {
          dayWiseCategoryEnabled: true
        }, {
          sort: { date: 1 } // Sort chronologically by date
        });

        if (result.success && result.data && Array.isArray(result.data)) {
          const enabledDates = result.data
            .map((dateDoc: any) => {
              // Extract date string in YYYY-MM-DD format
              const dateString = typeof dateDoc.date === 'string' ? dateDoc.date.trim() : '';
              console.log(`Processing available date: "${dateString}"`);
              return dateString;
            })
            .filter((dateString: string) => {
              // Validate YYYY-MM-DD format
              const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
              return dateString && dateRegex.test(dateString);
            });

          console.log('Final enabled dates:', enabledDates);
          return enabledDates;
        }
      } catch (error) {
        console.warn('Failed to fetch enabled dates from availableDates collection:', error);
      }

      return [];
    };

    const enabledDates = await getEnabledDates();

    // Step 3: Fetch category food mappings for this specific category
    const categoryFoodMappingResult = await db.read('categoryfoodmapping', {
      categoryId: new MongoObjectId(categoryId)
    }, {
      sort: { sequence: 1 }
    });

    if (!categoryFoodMappingResult.success) {
      console.warn('Failed to fetch categoryfoodmapping data');
    }

    // Step 4: Build list of unique food item IDs from mappings
    const foodItemIds = new Set<string>();
    // MIGRATION: Map now uses date strings (YYYY-MM-DD) instead of day names
    const dayWiseMappingMap = new Map<string, string[]>(); // date string -> foodItemIds

    if (categoryFoodMappingResult.success && categoryFoodMappingResult.data) {
      for (const mapping of categoryFoodMappingResult.data as CategoryFoodMapping[]) {
        const foodItemIdStr = mapping.foodItemId?.toString();
        const mappingType = mapping.mappingType;

        if (!foodItemIdStr) {
          console.warn('Skipping invalid mapping record:', mapping);
          continue;
        }

        if (mappingType === 'FLAT' || mappingType == null) {
          // For flat listing, just collect all IDs (legacy rows may omit mappingType)
          foodItemIds.add(foodItemIdStr);
        } else if (mappingType === 'DAY_WISE') {
          // For day-wise listing, organize by date string
          // MIGRATION: mapping.day now contains date strings (YYYY-MM-DD) instead of day names
          const dateString = mapping.day;
          if (!dateString) {
            console.warn(`Skipping DAY_WISE mapping without day field`);
            continue;
          }

          // Validate date format (YYYY-MM-DD)
          const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
          if (!dateRegex.test(dateString)) {
            console.warn(`Skipping DAY_WISE mapping with invalid date format: ${dateString}`);
            continue;
          }

          if (!dayWiseMappingMap.has(dateString)) {
            dayWiseMappingMap.set(dateString, []);
          }
          dayWiseMappingMap.get(dateString)!.push(foodItemIdStr);
          foodItemIds.add(foodItemIdStr);
        }
      }
    }

    // Step 5: Fetch all food items that are mapped to this category
    const foodItemsList = Array.from(foodItemIds);
    const foodItems: Document[] = [];

    if (foodItemsList.length > 0) {
      // Build query for food items
      const query: Query = {
        available: true,
        isDraft: { $ne: true },
        _id: { $in: foodItemsList.map(id => new MongoObjectId(id)) }
      };

      // Add veg filter if requested
      if (vegOnly) {
        query.veg = true;
      }

      const foodItemsResult = await db.read('fooditems', query, {
        sort: { sequence: 1 },
      });

      if (foodItemsResult.success && foodItemsResult.data) {
        foodItems.push(...foodItemsResult.data);
      }
    }

    // Fetch active weekly menu for availability mapping
    // NOTE: weeklymenus collection still uses day names (allDays, tuesday, etc.)
    // This is kept for backward compatibility with the weekly menu system
    const weeklyMenuResult = await db.readOne('weeklymenus', { active: true });
    const weeklyMenu = weeklyMenuResult.success && weeklyMenuResult.data
      ? weeklyMenuResult.data
      : {
        allDays: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
      };

    // Build availability map - track which days each food item appears in
    // MIGRATION: We still use day names for weeklyMenu compatibility, but the response
    // will use date strings for day-wise categories
    const daysOfWeek = ['allDays', ...enabledDates];
    const availabilityMap = new Map<string, string[]>();

    daysOfWeek.forEach((dayOrDate) => {
      const dayItems = weeklyMenu[dayOrDate] || [];
      dayItems.forEach((itemId: MongoObjectId | string) => {
        const itemIdStr = itemId.toString();
        if (!availabilityMap.has(itemIdStr)) {
          availabilityMap.set(itemIdStr, []);
        }
        availabilityMap.get(itemIdStr)!.push(dayOrDate);
      });
    });

    // Fetch cart items if user is authenticated
    let cartItems: CartItem[] = [];
    if (userId) {
      const cartResult = await db.readOne('carts', {
        user: new MongoObjectId(userId),
      });

      if (cartResult.success && cartResult.data) {
        const cartDaysResult = await db.read('cartdays', {
          cart: new MongoObjectId(cartResult.data._id),
        });

        if (cartDaysResult.success && cartDaysResult.data) {
          // Fetch all cart items for these cart days
          const cartDayIds = cartDaysResult.data.map((day: Document) => new MongoObjectId(day._id));
          const cartItemsResult = await db.read('cartitems', {
            day: { $in: cartDayIds },
          });

          if (cartItemsResult.success && cartItemsResult.data) {
            cartItems = cartItemsResult.data as CartItem[];
          }
        }
      }
    }

    // Helper function to create food item object with all required data
    const createFoodItemObject = async (foodItem: Document, foodItemIdStr: string) => {
      // Populate combo sections if this is a combo item
      let populatedSections: Array<Record<string, unknown>> = [];
      if (foodItem.hasCombo && foodItem.sections && foodItem.sections.length > 0) {
        populatedSections = await populateComboSections(foodItem.sections);
      }

      // Find cart items for this food item
      const itemCartData = cartItems
        .filter((cartItem: CartItem) => cartItem.food.toString() === foodItemIdStr)
        .map((cartItem: CartItem) => ({
          _id: cartItem._id.toString(),
          quantity: cartItem.quantity,
          selectedPortion: cartItem.selectedPortion,
          selectedPortionPrice: cartItem.selectedPortionPrice,
          selectedSpiceLevel: cartItem.selectedSpiceLevel,
          useEcoContainer: cartItem.useEcoContainer,
          selectedComboItems: cartItem.selectedComboItems || {},
          totalPrice: cartItem.totalPrice,
          day: cartItem.day,
        }));

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
        availableWeekDays: availabilityMap.get(foodItemIdStr) || [],
        days: itemCartData,
        comboItems: foodItem.comboItems || [],
        sections: populatedSections.length > 0 ? populatedSections : (foodItem.sections || []),
      };
    };

    // Create a map of food items for quick lookup
    const foodItemMap = new Map<string, Record<string, unknown>>();
    for (const foodItem of foodItems) {
      const foodItemIdStr = foodItem._id.toString();
      foodItemMap.set(foodItemIdStr, await createFoodItemObject(foodItem, foodItemIdStr));
    }

    // Build response data based on listingType
    const responseData: Record<string, unknown> = {
      _id: category._id.toString(),
      name: category.name,
      description: category.description || '',
      url: category.url || category.imageUrl || '',
      listingType,
    };

    if (listingType === 'flat') {
      // Step 6a: For flat categories, return foodItems array (deduped by item id)
      const flatItems: Record<string, unknown>[] = [];
      const addedFlatItemIds = new Set<string>();

      // Get all FLAT mappings
      if (categoryFoodMappingResult.success && categoryFoodMappingResult.data) {
        for (const mapping of categoryFoodMappingResult.data as CategoryFoodMapping[]) {
          if (mapping.mappingType === 'FLAT' || mapping.mappingType == null) {
            const foodItemIdStr = mapping.foodItemId?.toString();
            if (
              foodItemIdStr &&
              !addedFlatItemIds.has(foodItemIdStr) &&
              foodItemMap.has(foodItemIdStr)
            ) {
              addedFlatItemIds.add(foodItemIdStr);
              flatItems.push(foodItemMap.get(foodItemIdStr)!);
            }
          }
        }
      }

      responseData.foodItems = flatItems;
    } else {
      // Step 6b: For day-wise categories, return dayWiseItems object
      // MIGRATION: dayWiseItems now uses date strings (YYYY-MM-DD) as keys instead of day names
      const dayWiseItems: Record<string, Record<string, unknown>[]> = {};

      // Process DAY_WISE mappings
      if (categoryFoodMappingResult.success && categoryFoodMappingResult.data) {
        for (const mapping of categoryFoodMappingResult.data as CategoryFoodMapping[]) {
          if (mapping.mappingType === 'DAY_WISE') {
            // MIGRATION: mapping.day now contains date strings (YYYY-MM-DD)
            const dateString = mapping.day;
            const foodItemIdStr = mapping.foodItemId?.toString();

            if (!dateString || !foodItemIdStr) {
              continue;
            }

            // Validate date format
            const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
            if (!dateRegex.test(dateString)) {
              console.warn(`Skipping DAY_WISE mapping with invalid date format: ${dateString}`);
              continue;
            }

            // Check if date is enabled (exact match with enabled dates from availableDates)
            // MIGRATION: Changed from case-insensitive day name comparison to exact date string match
            const isDateEnabled = enabledDates.includes(dateString);

            if (!isDateEnabled) {
              console.log(`Skipping disabled date: ${dateString}`);
              continue;
            }

            // Group items by date string (e.g., "2024-01-15")
            if (!dayWiseItems[dateString]) {
              dayWiseItems[dateString] = [];
            }

            const alreadyOnDate = dayWiseItems[dateString].some(
              (entry) => entry._id === foodItemIdStr
            );

            if (!alreadyOnDate && foodItemMap.has(foodItemIdStr)) {
              dayWiseItems[dateString].push(foodItemMap.get(foodItemIdStr)!);
            }
          }
        }
      }

      responseData.dayWiseItems = dayWiseItems;
    }

    return Response.json(
      {
        data: responseData,
        message: 'success',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching food items by category:', error);
    return Response.json(
      {
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
