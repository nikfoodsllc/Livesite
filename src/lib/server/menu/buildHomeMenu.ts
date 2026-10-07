import { Document, ObjectId as MongoObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import {
  getAvailableDatesFromDatabase,
  generateAvailableDateOptions,
  getOrderableDayWiseDateStrings,
  type DateOption,
} from '@/lib/server/availableDates';
import {
  collectAllCategoryIds,
  fetchPublishedCategories,
  type MenuCategory,
} from '@/lib/server/menu/categories';
import { populateComboSections } from '@/lib/server/menu/comboSections';

interface CategoryFoodMapping {
  categoryId: MongoObjectId | { toString(): string };
  foodItemId: MongoObjectId | { toString(): string };
  mappingType?: 'FLAT' | 'DAY_WISE';
  day?: string;
  sequence?: number;
}

export interface HomeMenuCategoryItems {
  _id: string;
  name: string;
  description: string;
  url: string;
  listingType: 'flat' | 'day-wise';
  foodItems: Record<string, unknown>[];
  dayWiseItems: Record<string, Record<string, unknown>[]> | null;
}

export interface HomeMenuPayload {
  categories: MenuCategory[];
  categoryItems: Record<string, HomeMenuCategoryItems>;
  dates: DateOption[];
}

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

async function buildSubCategoryTagMap(
  parentCategoryIds: string[]
): Promise<Map<string, Map<string, { subCategoryIds: string[]; subCategoryNames: string[] }>>> {
  const tagMapByParent = new Map<
    string,
    Map<string, { subCategoryIds: string[]; subCategoryNames: string[] }>
  >();

  for (const parentId of parentCategoryIds) {
    const subCategoriesResult = await db.read(
      'foodcategories',
      {
        parentCategoryId: new MongoObjectId(parentId),
        isDraft: { $ne: true },
      },
      { sort: { sequence: 1 } }
    );

    if (!subCategoriesResult.success || !subCategoriesResult.data?.length) {
      continue;
    }

    const subs = subCategoriesResult.data as Array<{
      _id: { toString: () => string };
      name: string;
    }>;
    const subIds = subs.map((s) => new MongoObjectId(s._id.toString()));
    const subNameById = new Map(subs.map((s) => [s._id.toString(), s.name]));

    const flatMappingsResult = await db.read('categoryfoodmapping', {
      categoryId: { $in: subIds },
      $or: [{ mappingType: 'FLAT' }, { mappingType: { $exists: false } }],
    });

    const itemSubMap = new Map<string, { subCategoryIds: string[]; subCategoryNames: string[] }>();
    if (flatMappingsResult.success && flatMappingsResult.data) {
      for (const mapping of flatMappingsResult.data as Array<{
        foodItemId?: { toString: () => string };
        categoryId?: { toString: () => string };
      }>) {
        const foodItemId = mapping.foodItemId?.toString();
        const subId = mapping.categoryId?.toString();
        if (!foodItemId || !subId) continue;
        const existing = itemSubMap.get(foodItemId) ?? { subCategoryIds: [], subCategoryNames: [] };
        if (!existing.subCategoryIds.includes(subId)) {
          existing.subCategoryIds.push(subId);
          existing.subCategoryNames.push(subNameById.get(subId) ?? '');
        }
        itemSubMap.set(foodItemId, existing);
      }
    }

    tagMapByParent.set(parentId, itemSubMap);
  }

  return tagMapByParent;
}

function applySubCategoryTags(
  parentId: string,
  items: Array<Record<string, unknown>>,
  tagMapByParent: Map<
    string,
    Map<string, { subCategoryIds: string[]; subCategoryNames: string[] }>
  >
): void {
  const itemSubMap = tagMapByParent.get(parentId);
  if (!itemSubMap) return;

  for (const item of items) {
    const itemId = item._id as string;
    const tag = itemSubMap.get(itemId);
    if (tag) {
      item.subCategoryIds = tag.subCategoryIds;
      item.subCategoryNames = tag.subCategoryNames;
      item.subCategoryId = tag.subCategoryIds[0];
      item.subCategoryName = tag.subCategoryNames[0];
    }
  }
}

export async function buildHomeMenu(): Promise<HomeMenuPayload> {
  const categories = await fetchPublishedCategories();
  const categoryIds = collectAllCategoryIds(categories);
  const enabledDates = await getOrderableDayWiseDateStrings();
  const enabledDateSet = new Set(enabledDates);

  const dateDocuments = await getAvailableDatesFromDatabase(undefined, undefined, true);
  // A date belongs on the menu when ANY kind of item is switched on for it. (Filtering on flat alone left a day with only
  // Food Menu items switched on without a date entry: its heading showed the raw date and Add said "not available".)
  const dates = generateAvailableDateOptions(dateDocuments, true).filter(
    (date) => date.flatCategoryEnabled || date.dayWiseCategoryEnabled
  );

  if (categoryIds.length === 0) {
    return { categories, categoryItems: {}, dates };
  }

  const categoryObjectIds = categoryIds.map((id) => new MongoObjectId(id));

  const [categoriesResult, mappingsResult, weeklyMenuResult] = await Promise.all([
    db.read('foodcategories', {
      _id: { $in: categoryObjectIds },
      isDraft: { $ne: true },
    }),
    db.read(
      'categoryfoodmapping',
      { categoryId: { $in: categoryObjectIds } },
      { sort: { sequence: 1 } }
    ),
    db.readOne('weeklymenus', { active: true }),
  ]);

  const categoryMetaById = new Map<string, Document>();
  if (categoriesResult.success && categoriesResult.data) {
    for (const cat of categoriesResult.data) {
      categoryMetaById.set(cat._id.toString(), cat);
    }
  }

  const mappingsByCategory = new Map<string, CategoryFoodMapping[]>();
  const allFoodItemIds = new Set<string>();

  if (mappingsResult.success && mappingsResult.data) {
    for (const mapping of mappingsResult.data as CategoryFoodMapping[]) {
      const categoryId = mapping.categoryId?.toString?.() ?? String(mapping.categoryId);
      const foodItemId = mapping.foodItemId?.toString?.() ?? String(mapping.foodItemId);
      if (!categoryId || !foodItemId) continue;

      const list = mappingsByCategory.get(categoryId) ?? [];
      list.push(mapping);
      mappingsByCategory.set(categoryId, list);

      const mappingType = mapping.mappingType;
      if (mappingType === 'FLAT' || mappingType == null) {
        allFoodItemIds.add(foodItemId);
      } else if (mappingType === 'DAY_WISE') {
        const dateString = mapping.day;
        if (dateString && DATE_REGEX.test(dateString) && enabledDateSet.has(dateString)) {
          allFoodItemIds.add(foodItemId);
        }
      }
    }
  }

  const foodItems: Document[] = [];
  if (allFoodItemIds.size > 0) {
    const foodItemsResult = await db.read(
      'fooditems',
      {
        available: true,
        isDraft: { $ne: true },
        _id: { $in: Array.from(allFoodItemIds).map((id) => new MongoObjectId(id)) },
      },
      { sort: { sequence: 1 } }
    );
    if (foodItemsResult.success && foodItemsResult.data) {
      foodItems.push(...foodItemsResult.data);
    }
  }

  const foodById = new Map<string, Document>();
  for (const foodItem of foodItems) {
    foodById.set(foodItem._id.toString(), foodItem);
  }

  const weeklyMenu =
    weeklyMenuResult.success && weeklyMenuResult.data
      ? (weeklyMenuResult.data as Record<string, unknown>)
      : { allDays: [], tuesday: [], wednesday: [], thursday: [], friday: [] };

  const availabilityMap = new Map<string, string[]>();
  for (const dayOrDate of ['allDays', ...enabledDates]) {
    const dayItems = (weeklyMenu[dayOrDate] as unknown[]) || [];
    for (const itemId of dayItems) {
      const itemIdStr = String(itemId);
      if (!availabilityMap.has(itemIdStr)) {
        availabilityMap.set(itemIdStr, []);
      }
      availabilityMap.get(itemIdStr)!.push(dayOrDate);
    }
  }

  const parentIdsWithChildren = categories
    .filter((c) => (c.children?.length ?? 0) > 0)
    .map((c) => c._id);
  const tagMapByParent = await buildSubCategoryTagMap(parentIdsWithChildren);

  const categoryItems: Record<string, HomeMenuCategoryItems> = {};

  for (const categoryId of categoryIds) {
    const meta = categoryMetaById.get(categoryId);
    if (!meta) continue;

    const listingType = (meta.listingType || 'flat') as 'flat' | 'day-wise';
    const mappings = mappingsByCategory.get(categoryId) ?? [];

    const foodItemMap = new Map<string, Record<string, unknown>>();
    for (const foodItem of foodItems) {
      const foodItemIdStr = foodItem._id.toString();
      const isMapped = mappings.some(
        (m) => (m.foodItemId?.toString?.() ?? String(m.foodItemId)) === foodItemIdStr
      );
      if (!isMapped) continue;

      let populatedSections: Array<Record<string, unknown>> = [];
      if (foodItem.hasCombo && foodItem.sections && foodItem.sections.length > 0) {
        populatedSections = await populateComboSections(foodItem.sections, foodById);
      }

      foodItemMap.set(foodItemIdStr, {
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
        days: [],
        comboItems: foodItem.comboItems || [],
        sections: populatedSections.length > 0 ? populatedSections : foodItem.sections || [],
        subCategoryId: undefined,
        subCategoryName: undefined,
        subCategoryIds: [],
        subCategoryNames: [],
      });
    }

    const response: HomeMenuCategoryItems = {
      _id: categoryId,
      name: meta.name,
      description: meta.description || '',
      url: meta.url || meta.imageUrl || '',
      listingType,
      foodItems: [],
      dayWiseItems: null,
    };

    if (listingType === 'flat') {
      const flatItems: Record<string, unknown>[] = [];
      const added = new Set<string>();
      for (const mapping of mappings) {
        if (mapping.mappingType === 'FLAT' || mapping.mappingType == null) {
          const foodItemIdStr = mapping.foodItemId?.toString?.() ?? String(mapping.foodItemId);
          if (foodItemIdStr && !added.has(foodItemIdStr) && foodItemMap.has(foodItemIdStr)) {
            added.add(foodItemIdStr);
            flatItems.push(foodItemMap.get(foodItemIdStr)!);
          }
        }
      }
      response.foodItems = flatItems;
    } else {
      const dayWiseItems: Record<string, Record<string, unknown>[]> = {};
      for (const mapping of mappings) {
        if (mapping.mappingType !== 'DAY_WISE') continue;
        const dateString = mapping.day;
        const foodItemIdStr = mapping.foodItemId?.toString?.() ?? String(mapping.foodItemId);
        if (!dateString || !foodItemIdStr || !DATE_REGEX.test(dateString)) continue;
        if (!enabledDateSet.has(dateString)) continue;
        if (!foodItemMap.has(foodItemIdStr)) continue;

        if (!dayWiseItems[dateString]) {
          dayWiseItems[dateString] = [];
        }
        const alreadyOnDate = dayWiseItems[dateString].some((entry) => entry._id === foodItemIdStr);
        if (!alreadyOnDate) {
          dayWiseItems[dateString].push(foodItemMap.get(foodItemIdStr)!);
        }
      }

      const isParent = categories.some((c) => c._id === categoryId && (c.children?.length ?? 0) > 0);
      if (isParent) {
        applySubCategoryTags(categoryId, Object.values(dayWiseItems).flat(), tagMapByParent);
      }

      response.dayWiseItems = dayWiseItems;
    }

    categoryItems[categoryId] = response;
  }

  return { categories, categoryItems, dates };
}
