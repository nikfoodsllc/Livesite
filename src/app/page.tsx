'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Box, Container, Typography, IconButton, CircularProgress, Skeleton, Tabs, Tab } from '@mui/material';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import Footer from '@/components/layout/Footer';
import DeliveryLocationBar from '@/components/layout/DeliveryLocationBar';
import HeroBanner from '@/components/banners/HeroBanner';
import CategoryCard from '@/components/cards/CategoryCard';
import FoodCard from '@/components/cards/FoodCard';
import FoodDetailsDialog from '@/components/dialogs/FoodDetailsDialog';
import DaySelectionPopup, { DaySelection } from '@/components/dialogs/DaySelectionPopup';
import { FoodItem } from '@/types/food';
import { DayType } from '@/types/cart';
import { CartCustomizations } from '@/types/localCart';

import * as localCart from '@/lib/localStorageCart';
import { isFoodCustomizable } from '@/lib/foodItemUtils';
import { useCart } from '@/contexts/CartContext';
import { useHeader } from '@/contexts/HeaderContext';
import { useAuth } from '@/contexts/AuthContext';
import { generateAvailableDatesFromAPI, DayOption } from '@/lib/dayAvailabilityClient';
import { useNotifications, showSuccessNotification, showErrorNotification } from '@/components/common/NotificationSystem';
import { PST_TIMEZONE, getPSTWeekday, createPSTDate } from '@/lib/timezone';
import MenuSubscriptionSection from '@/components/home/MenuSubscriptionSection';
import { colors } from '@/theme/colors';

// Define types for the new API response structure
interface CategoryDisplay {
  _id: string;
  name: string;
  description: string;
  url: string;
  listingType: 'flat' | 'day-wise';
  foodItems: FoodItem[];
  dayWiseItems: { [dateString: string]: FoodItem[] } | null; // Date strings as keys (YYYY-MM-DD)
  dayGroups: Array<{
    date: string; // Date string in YYYY-MM-DD format
    formattedDate: string; // Formatted date for display (e.g., "Monday, Jan 15")
    displayName: string; // Display name (alias for formattedDate)
    day?: string; // Optional day name for backward compatibility
    foodItems: FoodItem[];
  }>;
  /** One level of sub-categories shown under this parent on the home page */
  subCategories?: CategoryDisplay[];
}

const subCategoryHeadingBoxSx = {
  mb: 2,
  pl: 2,
  py: 1,
  borderLeft: '4px solid',
  borderColor: colors.primary,
  borderRadius: '0 10px 10px 0',
} as const;

const subCategoryTitleSx = {
  fontWeight: 600,
  color: colors.primaryDark,
  fontSize: { xs: '1.125rem', sm: '1.3rem', md: '1.45rem' },
  lineHeight: 1.35,
  letterSpacing: '-0.02em',
} as const;

const subCategoryTabsSx = {
  mt: 1,
  borderBottom: `2px solid ${colors.divider}`,
  '& .MuiTab-root': {
    textTransform: 'none' as const,
    minHeight: 52,
    fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.15rem' },
    fontWeight: 600,
    color: colors.textLight,
    '&.Mui-selected': {
      color: colors.primaryDark,
    },
  },
  '& .MuiTabs-indicator': {
    backgroundColor: colors.primary,
    height: 3,
  },
  '& .MuiTabs-scrollButtons': {
    flexShrink: 0,
    width: 40,
    transition: 'none',
  },
} as const;

// API response types
interface CategoriesResponse {
  data: {
    items: Array<{
      _id: string;
      name: string;
      description: string;
      imageUrl: string;
      listingType: 'flat' | 'day-wise';
      sequence: number;
      children?: Array<{
        _id: string;
        name: string;
        description: string;
        imageUrl: string;
        listingType: 'flat' | 'day-wise';
        sequence: number;
      }>;
    }>;
  };
  message: string;
}

interface FoodItemsByCategoryResponse {
  data: {
    _id: string;
    name: string;
    description: string;
    url: string;
    listingType: 'flat' | 'day-wise';
    foodItems?: FoodItem[];
    dayWiseItems?: { [dateString: string]: FoodItem[] }; // Date strings as keys (YYYY-MM-DD)
    // Additional fields from day-wise API
    categoryId?: string;
    categoryListingType?: 'day-wise';
    date?: string;
    formattedDate?: string;
  };
  message: string;
}

type CategoryListItem = CategoriesResponse['data']['items'][number];

function categoryHasDisplayItems(c: CategoryDisplay): boolean {
  if (c.listingType === 'flat') {
    return (c.foodItems?.length ?? 0) > 0;
  }
  return (c.dayGroups?.length ?? 0) > 0;
}

function categoryOrSubsHaveItems(c: CategoryDisplay): boolean {
  if (categoryHasDisplayItems(c)) return true;
  return (c.subCategories ?? []).some(categoryOrSubsHaveItems);
}

function flattenCategoriesWithSubs(categories: CategoryDisplay[]): CategoryDisplay[] {
  const out: CategoryDisplay[] = [];
  for (const c of categories) {
    out.push(c);
    for (const s of c.subCategories ?? []) {
      out.push(s);
    }
  }
  return out;
}

function applyCategoryDisplayFilters(
  category: CategoryDisplay,
  vegOnly: boolean,
  availableDates: DayOption[]
): CategoryDisplay {
  const subCategories = category.subCategories?.map((sub) =>
    applyCategoryDisplayFilters(sub, vegOnly, availableDates)
  );

  const listingType = category.listingType || 'flat';

  if (listingType === 'flat') {
    const filteredFoodItems = vegOnly
      ? (category.foodItems || []).filter((item) => item.veg !== false)
      : (category.foodItems || []);

    return {
      ...category,
      listingType,
      foodItems: filteredFoodItems,
      dayGroups: [],
      ...(subCategories && subCategories.length > 0 ? { subCategories } : {}),
    };
  }

  const dayWiseItems = category.dayWiseItems || {};
  const dayGroups = Object.entries(dayWiseItems)
    .filter(([, items]) => items && items.length > 0)
    .map(([dateString, items]) => {
      const filteredItems = vegOnly
        ? items.filter((item) => item.veg !== false)
        : items.slice();
      const forDay = filterFoodItemsForDate(filteredItems, dateString, availableDates);

      const dateOption = availableDates.find((d) => d.date === dateString);
      const [year, month, day] = dateString.split('-').map(Number);
      const dateObj = createPSTDate(year, month - 1, day);
      const dayName = getPSTWeekday(dateObj);

      return {
        date: dateString,
        formattedDate: dateOption?.formattedDate || dateString,
        displayName: dateOption?.formattedDate || dateString,
        day: dayName,
        foodItems: forDay,
      };
    })
    .filter((dayGroup) => {
      const dateOption = availableDates.find((d) => d.date === dayGroup.date);
      return (
        dayGroup.foodItems.length > 0 &&
        dateOption &&
        dateOption.dayWiseCategoryEnabled
      );
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    ...category,
    listingType,
    foodItems: [],
    dayGroups,
    ...(subCategories && subCategories.length > 0 ? { subCategories } : {}),
  };
}

/** Weekday label (e.g. Monday) for a calendar date in PST, preferring API day options when present. */
function resolveWeekdayLabelForDate(dateString: string, availableDates: DayOption[]): string {
  const opt = availableDates.find((d) => d.date === dateString);
  if (opt?.day) {
    return opt.day;
  }
  const [y, m, day] = dateString.split('-').map(Number);
  const dateObj = createPSTDate(y, m - 1, day);
  return getPSTWeekday(dateObj);
}

function foodItemAllowedOnDate(
  item: FoodItem,
  dateString: string,
  availableDates: DayOption[]
): boolean {
  if (item.available === false) {
    return false;
  }
  const allowed = item.availableWeekDays;
  if (!allowed || allowed.length === 0) {
    return true;
  }
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
  const weekday = resolveWeekdayLabelForDate(dateString, availableDates).trim().toLowerCase();

  return allowed.some((d) => {
    const raw = d.trim();
    if (!raw) {
      return false;
    }
    if (dateRegex.test(raw)) {
      return raw === dateString;
    }
    return raw.toLowerCase() === weekday;
  });
}

function filterFoodItemsForDate(
  items: FoodItem[],
  dateString: string,
  availableDates: DayOption[]
): FoodItem[] {
  return items.filter((item) => foodItemAllowedOnDate(item, dateString, availableDates));
}

function getItemsForSubOnDate(
  sub: CategoryDisplay,
  date: string,
  availableDates: DayOption[]
): FoodItem[] {
  if (sub.listingType === 'flat') {
    return filterFoodItemsForDate(sub.foodItems ?? [], date, availableDates);
  }
  const g = sub.dayGroups?.find((x) => x.date === date);
  return filterFoodItemsForDate(g?.foodItems ?? [], date, availableDates);
}

/** Dates to show for a day-wise parent that has sub-categories (union of parent + day-wise subs, with fallback). */
function collectSortedDatesForDayWiseParentWithSubs(
  category: CategoryDisplay,
  availableDates: DayOption[]
): string[] {
  const set = new Set<string>();
  for (const dg of category.dayGroups ?? []) {
    set.add(dg.date);
  }
  for (const sub of category.subCategories ?? []) {
    if (sub.listingType === 'day-wise') {
      for (const dg of sub.dayGroups ?? []) {
        set.add(dg.date);
      }
    }
  }
  if (set.size === 0) {
    for (const d of availableDates) {
      if (d.dayWiseCategoryEnabled) {
        set.add(d.date);
      }
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export default function Home() {

  // Context and state management
  const { refreshCart } = useCart();
  const { showNotification } = useNotifications();
  const { vegOnly, setVegOnly } = useHeader();
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loadingStates, setLoadingStates] = useState<{
    [key: string]: { add: boolean; increment: boolean; decrement: boolean };
  }>({});
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);
  const [daySelectionPopupOpen, setDaySelectionPopupOpen] = useState<boolean>(false);
  const [selectedFoodItemForDayPopup, setSelectedFoodItemForDayPopup] = useState<FoodItem | null>(null);
  const [pendingCustomizations, setPendingCustomizations] = useState<CartCustomizations | undefined>(undefined);

  // API data state
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [categoryFoodItemsMap, setCategoryFoodItemsMap] = useState<Map<string, CategoryDisplay>>(new Map());
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);
  const [loadingCategoryItems, setLoadingCategoryItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [dayOptionsCache, setDayOptionsCache] = useState<Map<string, DayOption>>(new Map());
  const [availableDates, setAvailableDates] = useState<DayOption[]>([]);
  /** For day-wise parents with sub-categories: selected sub tab per `${parentId}::${date}` */
  const [dayWiseSubTabByDay, setDayWiseSubTabByDay] = useState<Record<string, string>>({});
  /** Selected calendar day (YYYY-MM-DD) per category for horizontal day tabs */
  const [dayWiseSelectedDateByCategory, setDayWiseSelectedDateByCategory] = useState<
    Record<string, string>
  >({});

  // Fetch day options on mount and cache them
  useEffect(() => {
    const fetchDayOptions = async () => {
      try {
        // Fetch available dates from API (new date-based approach)
        const dates = await generateAvailableDatesFromAPI(false);
        const cache = new Map<string, DayOption>();

        // Cache each date option using the date string as key
        for (const dateOption of dates) {
          cache.set(dateOption.date, dateOption);
        }

        setAvailableDates(dates);
        setDayOptionsCache(cache);
      } catch (error) {
        console.error('Error fetching day options from API:', error);
        setAvailableDates([]);
        setDayOptionsCache(new Map());
      }
    };

    fetchDayOptions();
  }, []);

  // Helper function to get the correct price for display based on item type
  const getPriceForDisplay = (item: FoodItem): number | null => {
    // For portion items, use the first portion price if available
    if (item.portions && item.portions.length > 0 && item.portionPrices && item.portionPrices.length > 0) {
      return item.portionPrices[0];
    }
    // For simple and combo items, use the regular price
    return item.price || null;
  };


  // Fetch categories from API on mount (after available dates are loaded)
  useEffect(() => {
    // Only fetch categories when availableDates are loaded
    if (availableDates.length === 0) {
      return;
    }

    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        setError(null);

        const response = await fetch('/api/categories');
        const data: CategoriesResponse = await response.json();

        if (response.ok && data.data?.items) {
          setCategories(data.data.items);
          // Categories loaded, now fetch items for each category sequentially
          await fetchFoodItemsForCategories(data.data.items);
        } else {
          console.error('Failed to fetch categories:', data.message);
          setError('Failed to load categories');
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setError('Failed to load categories');
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [availableDates]); // Run when availableDates change

  // Fetch day-wise food items for a specific category and date
  const fetchDayWiseFoodItems = async (categoryId: string, date: string): Promise<FoodItemsByCategoryResponse | null> => {
    try {
      const response = await fetch(`/api/food-items-day-wise?categoryId=${categoryId}&date=${date}`);
      const data: FoodItemsByCategoryResponse = await response.json();

      if (response.ok && data.data) {
        return data;
      } else {
        // Handle 404 as a warning (no items for this date - this is expected)
        if (response.status === 404) {
          console.log(`No items found for categoryId ${categoryId}, date ${date}`);
        } else {
          console.warn(`Failed to fetch day-wise items for categoryId ${categoryId}, date ${date}:`, data.message);
          // Show error notification to user for non-404 errors
          if (response.status !== 404) {
            showErrorNotification(
              showNotification,
              `Failed to load items for ${date}. Please try again.`,
              'Loading Error'
            );
          }
        }
        return null;
      }
    } catch (error) {
      console.error(`Error fetching day-wise items for categoryId ${categoryId}, date ${date}:`, error);
      // Show error notification to user for network/server errors
      showErrorNotification(
        showNotification,
        `Network error loading items for ${date}. Please check your connection.`,
        'Network Error'
      );
      return null;
    }
  };

  // Sequentially fetch food items for each category (parents, then their sub-categories)
  const fetchFoodItemsForCategories = async (categoriesList: CategoryListItem[]) => {
    setLoadingItems(true);
    const newMap = new Map<string, CategoryDisplay>();
    const newLoadingSet = new Set<string>();

    const fetchOneCategory = async (
      category: {
        _id: string;
        name: string;
        description?: string;
        imageUrl?: string;
        listingType?: 'flat' | 'day-wise';
      },
      options: { usePerDateDayWiseMappings?: boolean } = {}
    ) => {
      const { usePerDateDayWiseMappings = false } = options;
      try {
        newLoadingSet.add(category._id);
        setLoadingCategoryItems(new Set(newLoadingSet));

        const listingType = category.listingType || 'flat';

        if (listingType === 'flat' && !usePerDateDayWiseMappings) {
          const response = await fetch(`/api/food-items-by-category?categoryId=${category._id}`);
          const data: FoodItemsByCategoryResponse = await response.json();

          if (response.ok && data.data) {
            const categoryDisplay: CategoryDisplay = {
              _id: data.data._id,
              name: data.data.name,
              description: data.data.description,
              url: data.data.url,
              listingType: data.data.listingType,
              foodItems: data.data.foodItems || [],
              dayWiseItems: data.data.dayWiseItems || null,
              dayGroups: [],
            };
            newMap.set(category._id, categoryDisplay);
          } else {
            console.error(`Failed to fetch items for flat category ${category._id}:`, data.message);
          }
        } else if (listingType === 'flat' && usePerDateDayWiseMappings) {
          // Flat sub under day-wise parent: only items with DAY_WISE mapping for each date (not all FLAT-tagged items)
          const dayWiseItems: { [dateString: string]: FoodItem[] } = {};
          const categoryDisplay: CategoryDisplay = {
            _id: category._id,
            name: category.name,
            description: category.description || '',
            url: category.imageUrl || '',
            listingType: 'day-wise',
            foodItems: [],
            dayWiseItems: dayWiseItems,
            dayGroups: [],
          };

          const enabledDates = availableDates
            .filter((dateOption) => dateOption.dayWiseCategoryEnabled)
            .map((dateOption) => dateOption.date);

          for (const date of enabledDates) {
            try {
              const dayWiseData = await fetchDayWiseFoodItems(category._id, date);
              if (dayWiseData?.data && 'foodItems' in dayWiseData.data) {
                const foodItems = (dayWiseData.data as { foodItems?: FoodItem[] }).foodItems;
                if (Array.isArray(foodItems) && foodItems.length > 0) {
                  dayWiseItems[date] = foodItems;
                }
              }
            } catch (error) {
              console.error(`Error fetching day-wise items for date ${date}:`, error);
            }
          }

          newMap.set(category._id, categoryDisplay);
        } else {
          const dayWiseItems: { [dateString: string]: FoodItem[] } = {};
          const categoryDisplay: CategoryDisplay = {
            _id: category._id,
            name: category.name,
            description: category.description || '',
            url: category.imageUrl || '',
            listingType: 'day-wise',
            foodItems: [],
            dayWiseItems: dayWiseItems,
            dayGroups: [],
          };

          const enabledDates = availableDates
            .filter((dateOption) => dateOption.dayWiseCategoryEnabled)
            .map((dateOption) => dateOption.date);

          for (const date of enabledDates) {
            try {
              const dayWiseData = await fetchDayWiseFoodItems(category._id, date);
              if (dayWiseData?.data && 'foodItems' in dayWiseData.data) {
                const foodItems = (dayWiseData.data as { foodItems?: FoodItem[] }).foodItems;
                if (Array.isArray(foodItems) && foodItems.length > 0) {
                  dayWiseItems[date] = foodItems;
                }
              }
            } catch (error) {
              console.error(`Error fetching day-wise items for date ${date}:`, error);
            }
          }

          newMap.set(category._id, categoryDisplay);
        }
      } catch (error) {
        console.error(`Error fetching items for category ${category._id}:`, error);
      } finally {
        newLoadingSet.delete(category._id);
        setLoadingCategoryItems(new Set(newLoadingSet));
      }
    };

    for (const category of categoriesList) {
      await fetchOneCategory(category);
      const children = category.children ?? [];
      for (const child of children) {
        const usePerDateDayWiseMappings =
          category.listingType === 'day-wise' && (child.listingType || 'flat') === 'flat';
        await fetchOneCategory(child, { usePerDateDayWiseMappings });
      }
    }

    for (const parent of categoriesList) {
      const parentEntry = newMap.get(parent._id);
      if (!parentEntry || !parent.children?.length) continue;
      const subCategories = parent.children
        .slice()
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
        .map((ch) => newMap.get(ch._id))
        .filter((x): x is CategoryDisplay => !!x);
      if (subCategories.length > 0) {
        parentEntry.subCategories = subCategories;
        newMap.set(parent._id, parentEntry);
      }
    }

    setCategoryFoodItemsMap(newMap);
    setLoadingItems(false);
  };

  // Get food items by category map
  const foodItemsByCategory = useMemo(() => {
    const list: CategoryDisplay[] = [];
    for (const cat of categories) {
      const row = categoryFoodItemsMap.get(cat._id);
      if (!row) continue;
      let merged: CategoryDisplay = { ...row };
      if (cat.children?.length) {
        const subCategories = cat.children
          .slice()
          .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
          .map((ch) => categoryFoodItemsMap.get(ch._id))
          .filter((x): x is CategoryDisplay => !!x);
        if (subCategories.length > 0) {
          merged = { ...merged, subCategories };
        }
      }
      list.push(merged);
    }
    return list;
  }, [categories, categoryFoodItemsMap]);


  // Transform data to organize categories based on their listing type
  // Apply vegOnly filtering client-side
  const displayFoodItemsByCategory = useMemo(() => {
    if (!foodItemsByCategory || foodItemsByCategory.length === 0) {
      return [];
    }

    const filteredCategories = selectedCategory
      ? foodItemsByCategory.filter((category) => category._id === selectedCategory)
      : foodItemsByCategory;

    return filteredCategories.map((category) =>
      applyCategoryDisplayFilters(category, vegOnly, availableDates)
    );
  }, [foodItemsByCategory, selectedCategory, vegOnly, availableDates]);

  // Get quantity for food item (sum across all dates, or specific date if provided)
  const getItemQuantity = (foodItemId: string, dateContext?: string | DayType): number => {
    if (dateContext) {
      // dateContext can be either:
      // 1. A date string (YYYY-MM-DD) from dayGroup.date
      // 2. A DayType (day name like 'Monday') for backward compatibility
      if (dateContext.includes('-')) {
        // It's a date string, find the corresponding day name
        const dateOption = availableDates.find(d => d.date === dateContext);
        if (dateOption?.day) {
          const dayType = dateOption.day as DayType;
          return localCart.getDayQuantity(dayType, foodItemId);
        }
        return 0;
      } else {
        // It's already a DayType (day name)
        return localCart.getDayQuantity(dateContext as DayType, foodItemId);
      }
    }

    // Sum across all available dates from cache
    // Convert date strings back to DayType for cart operations
    const dates = Array.from(dayOptionsCache.values());
    return dates.reduce((total, dateOption) => {
      if (!dateOption.day) return total;
      const dayType = dateOption.day as DayType;
      return total + localCart.getDayQuantity(dayType, foodItemId);
    }, 0);
  };

  // Helper function to find which category a food item belongs to and its listing type
  const getCategoryForItem = (foodItemId: string): { category: CategoryDisplay | null; dayGroup?: any } => {
    for (const category of flattenCategoriesWithSubs(displayFoodItemsByCategory)) {
      if (category.listingType === 'flat') {
        // For flat categories, check if the item is in the foodItems array
        const item = category.foodItems.find(item => item._id === foodItemId);
        if (item) {
          return { category };
        }
      } else if (category.listingType === 'day-wise') {
        // For day-wise categories, check each day group
        for (const dayGroup of category.dayGroups) {
          const item = dayGroup.foodItems.find(item => item._id === foodItemId);
          if (item) {
            return { category, dayGroup };
          }
        }
      }
    }
    return { category: null };
  };

  
  // Cart operations with simulated loading
  const simulateLoading = (foodItemId: string, action: 'add' | 'increment' | 'decrement') => {
    setLoadingStates((prev) => ({
      ...prev,
      [foodItemId]: {
        add: action === 'add',
        increment: action === 'increment',
        decrement: action === 'decrement',
      },
    }));

    setTimeout(() => {
      setLoadingStates((prev) => ({
        ...prev,
        [foodItemId]: { add: false, increment: false, decrement: false },
      }));
      // Refresh cart context after operation completes
      refreshCart();
    }, 500);
  };

  const handleAddToCart = (foodItemId: string, foodItem: FoodItem, dayGroup?: any) => {
    // Check if item has portions - if so, open FoodDetailsDialog to force portion selection
    if (foodItem.portions && foodItem.portions.length > 0) {
      handleOpenDialog(foodItem, dayGroup);
      return;
    }

    // Check if item has combo - if so, open FoodDetailsDialog to show combo customization options
    if (foodItem.hasCombo && foodItem.sections && foodItem.sections.length > 0) {
      handleOpenDialog(foodItem, dayGroup);
      return;
    }

    // Spice level must be chosen in the details dialog before adding to cart
    if (foodItem.hasSpiceLevel) {
      handleOpenDialog(foodItem, dayGroup);
      return;
    }

    // If dayGroup is provided, use it directly (day-wise category with correct day)
    if (dayGroup) {
      handleAddToDayWiseCategory(foodItem, dayGroup);
      return;
    }

    // Otherwise, find which category this item belongs to (flat category or fallback)
    const { category } = getCategoryForItem(foodItemId);

    if (!category) {
      // Item not found in any category, show default behavior (day selection popup)
      setSelectedFoodItemForDayPopup(foodItem);
      setDaySelectionPopupOpen(true);
      return;
    }

    if (category.listingType === 'flat') {
      // For flat categories, show day selection popup (current behavior)
      setSelectedFoodItemForDayPopup(foodItem);
      setDaySelectionPopupOpen(true);
    } else {
      // Fallback to day selection popup
      setSelectedFoodItemForDayPopup(foodItem);
      setDaySelectionPopupOpen(true);
    }
  };

  const handleIncrement = (foodItemId: string, foodItem: FoodItem, dayGroup?: any) => {
    // If dayGroup is provided, check if item already exists in cart for that specific date
    if (dayGroup) {
      const dateString = dayGroup.date;
      const dayName = dayGroup.day;
      const dateOption = availableDates.find(d => d.date === dateString);
      const dayNameForCart = dateOption?.day || dayName;

      if (dayNameForCart) {
        const dayType = dayNameForCart as DayType;
        const existingQuantity = localCart.getDayQuantity(dayType, foodItemId);

        // If item already exists in cart for this date, increment directly
        if (existingQuantity > 0) {
          handleIncrementForDayWiseCategory(foodItem, dayGroup);
          return;
        }
      }
    }

    // Check if item has portions - if so, open FoodDetailsDialog to force portion selection
    if (foodItem.portions && foodItem.portions.length > 0) {
      handleOpenDialog(foodItem, dayGroup);
      return;
    }

    // Check if item has combo - if so, open FoodDetailsDialog to show combo customization options
    if (foodItem.hasCombo && foodItem.sections && foodItem.sections.length > 0) {
      handleOpenDialog(foodItem, dayGroup);
      return;
    }

    if (foodItem.hasSpiceLevel) {
      handleOpenDialog(foodItem, dayGroup);
      return;
    }

    // If dayGroup is provided, use it directly (day-wise category with correct day)
    if (dayGroup) {
      handleIncrementForDayWiseCategory(foodItem, dayGroup);
      return;
    }

    // Otherwise, find which category this item belongs to (flat category or fallback)
    const { category } = getCategoryForItem(foodItemId);

    if (!category) {
      // Item not found in any category, show default behavior (day selection popup)
      setSelectedFoodItemForDayPopup(foodItem);
      setDaySelectionPopupOpen(true);
      return;
    }

    if (category.listingType === 'flat') {
      // For flat categories, show day selection popup (current behavior)
      setSelectedFoodItemForDayPopup(foodItem);
      setDaySelectionPopupOpen(true);
    } else {
      // Fallback to day selection popup
      setSelectedFoodItemForDayPopup(foodItem);
      setDaySelectionPopupOpen(true);
    }
  };

  const handleDecrement = (foodItemId: string, dayGroup?: any) => {
    if (dayGroup) {
      const dateString = dayGroup.date;
      const dayName = dayGroup.day;
      const dateOption = availableDates.find(d => d.date === dateString);
      const dayNameForCart = dateOption?.day || dayName;

      if (dayNameForCart) {
        const dayType = dayNameForCart as DayType;
        const dayQty = localCart.getDayQuantity(dayType, foodItemId);
        if (dayQty === 0) return;

        simulateLoading(foodItemId, 'decrement');
        setTimeout(() => {
          localCart.decrementOneUnitForFoodOnDay(dayType, foodItemId);
          refreshCart();
        }, 500);
        return;
      }
    }

    const currentQty = getItemQuantity(foodItemId);
    if (currentQty === 0) return;

    const dates = Array.from(dayOptionsCache.values());
    for (const dateOption of dates) {
      if (!dateOption.day) continue;
      const dayType = dateOption.day as DayType;
      const dayQty = localCart.getDayQuantity(dayType, foodItemId);
      if (dayQty > 0) {
        simulateLoading(foodItemId, 'decrement');
        setTimeout(() => {
          localCart.decrementOneUnitForFoodOnDay(dayType, foodItemId);
          refreshCart();
        }, 500);
        break;
      }
    }
  };

  // Handle auto-add for day-wise categories
  const handleAddToDayWiseCategory = async (foodItem: FoodItem, dayGroup: any) => {
    // dayGroup now contains date string and formatted display name
    const dateString = dayGroup.date;
    const displayName = dayGroup.displayName;
    const dayName = dayGroup.day;

    // Find the date option to check availability and get day name for cart
    const dateOption = availableDates.find(d => d.date === dateString);
    const dayNameForCart = dateOption?.day || dayName;

    if (!dayNameForCart || !dateOption) {
      // Date not found in available dates
      showErrorNotification(
        showNotification,
        `${displayName} is not available for ordering. Please choose a different item.`,
        'Date Unavailable'
      );
      return;
    }

    if (!dateOption.dayWiseCategoryEnabled) {
      // Date is not enabled for day-wise categories
      showErrorNotification(
        showNotification,
        `${displayName} is not available for ordering. Please choose a different item.`,
        'Date Unavailable'
      );
      return;
    }

    const dayType = dayNameForCart as DayType;

    try {
      // Add item to cart for the designated date
      simulateLoading(foodItem._id, 'add');

      setTimeout(() => {
        localCart.addItem(
          dayType,
          dateString, // Pass the date string for cart context
          foodItem,
          1, // Default quantity of 1
          {} // No customizations for quick add
        );

        // Show success message with formatted date
        showSuccessNotification(
          showNotification,
          `${foodItem.name} has been added to your cart for ${displayName}`,
          'Added to Cart'
        );

        // Refresh cart context
        refreshCart();
      }, 500);
    } catch (error) {
      console.error('Error adding item to cart:', error);
      showErrorNotification(
        showNotification,
        'Failed to add item to cart. Please try again.',
        'Error'
      );
    }
  };

  // Handle increment for day-wise categories
  const handleIncrementForDayWiseCategory = async (foodItem: FoodItem, dayGroup: any) => {
    // dayGroup now contains date string and formatted display name
    const dateString = dayGroup.date;
    const displayName = dayGroup.displayName;
    const dayName = dayGroup.day;

    // Find the date option to check availability and get day name for cart
    const dateOption = availableDates.find(d => d.date === dateString);
    const dayNameForCart = dateOption?.day || dayName;

    if (!dayNameForCart || !dateOption) {
      // Date not found in available dates
      showErrorNotification(
        showNotification,
        `${displayName} is not available for ordering. Please choose a different item.`,
        'Date Unavailable'
      );
      return;
    }

    if (!dateOption.dayWiseCategoryEnabled) {
      // Date is not enabled for day-wise categories
      showErrorNotification(
        showNotification,
        `${displayName} is not available for ordering. Please choose a different item.`,
        'Date Unavailable'
      );
      return;
    }

    const dayType = dayNameForCart as DayType;

    try {
      // Start loading state for increment
      simulateLoading(foodItem._id, 'increment');

      setTimeout(() => {
        // Check if item already exists in cart for this designated date
        const existingQuantity = localCart.getDayQuantity(dayType, foodItem._id);

        if (existingQuantity > 0) {
          const line = localCart.getFirstLineForFoodOnDay(dayType, foodItem._id);
          if (line) {
            localCart.updateQuantity(dayType, line.lineId, line.quantity + 1);
          } else {
            localCart.addItem(dayType, dateString, foodItem, 1, {});
          }
          showSuccessNotification(
            showNotification,
            `${foodItem.name} quantity increased to ${existingQuantity + 1} for ${displayName}`,
            'Cart Updated'
          );
        } else {
          // Item doesn't exist in designated date, add it there
          localCart.addItem(
            dayType,
            dateString, // Pass the date string for cart context
            foodItem,
            1, // Default quantity of 1
            {} // No customizations for quick add
          );
          showSuccessNotification(
            showNotification,
            `${foodItem.name} has been added to your cart for ${displayName}`,
            'Added to Cart'
          );
        }

        // Note: If the item exists on other dates, we keep those quantities unchanged
        // and only add/increment in the designated date for consistency

        // Refresh cart context is handled by simulateLoading
      }, 500);
    } catch (error) {
      console.error('Error incrementing item in cart:', error);
      showErrorNotification(
        showNotification,
        'Failed to increment item in cart. Please try again.',
        'Error'
      );
    }
  };

  // Dialog handlers
  const handleOpenDialog = (item: FoodItem, dayGroup?: any) => {
    setSelectedFoodItem(item);
    setDialogOpen(true);
    // Store the dayGroup context if provided from a day-wise section
    (item as any).__dayGroup = dayGroup;
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedFoodItem(null);
  };

  const handleAddToCartFromDialog = (
    item: FoodItem,
    quantity: number,
    customizations: CartCustomizations,
    day: DayType | string,
    date: string
  ) => {
    console.log('[page.tsx] handleAddToCartFromDialog called with:', {
      item,
      quantity,
      customizations,
      day,
      date
    });

    const dayKey = day as DayType;

    // Create a clean copy without __dayGroup or other non-serializable properties
    // This prevents circular reference errors when saving to localStorage
    const { __dayGroup, ...cleanItem } = item as any;

    console.log('[page.tsx] About to call localCart.addItem with:', {
      dayKey,
      date,
      item: cleanItem,
      quantity,
      customizations
    });

    if (quantity === 0) {
      localCart.removeAllLinesForFood(dayKey, cleanItem._id);
    } else {
      localCart.addItem(dayKey, date, cleanItem, quantity, customizations);
    }

    console.log('[page.tsx] After localCart.addItem, cart is:', localCart.getCart());

    // Refresh cart context
    refreshCart();
  };

  const handleOpenDaySelectionWithCustomizations = (customizations: CartCustomizations) => {
    if (!selectedFoodItem) return;

    // Save customizations and food item for day selection
    setPendingCustomizations(customizations);
    setSelectedFoodItemForDayPopup(selectedFoodItem);

    // Open day selection popup
    setDaySelectionPopupOpen(true);
  };

  const handleDaySelectionFromPopup = (selectedDays: DaySelection[], customizations?: CartCustomizations) => {
    if (!selectedFoodItemForDayPopup) return;

    // Use provided customizations or pending customizations or empty object
    const finalCustomizations = customizations || pendingCustomizations || {};

    // Add item to cart for each selected day with respective quantity
    selectedDays.forEach((selection) => {
      localCart.addItem(
        selection.day,
        selection.date,
        selectedFoodItemForDayPopup,
        selection.quantity,
        finalCustomizations
      );
    });

    // Refresh cart context
    refreshCart();

    // Close the popup and clear pending customizations
    setDaySelectionPopupOpen(false);
    setSelectedFoodItemForDayPopup(null);
    setPendingCustomizations(undefined);
  };

  // Cart preview handlers are now provided by header context

  // Handler for refreshing cart from dialog
  const handleRefreshCart = () => {
    refreshCart().catch(console.error);
  };

  // Category scroll
  const scrollCategories = (direction: 'left' | 'right') => {
    const container = document.getElementById('categories-container');
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const categoryGridSx = {
    display: 'grid',
    gridTemplateColumns: {
      xs: 'repeat(2, 1fr)',
      sm: 'repeat(3, 1fr)',
      md: 'repeat(4, 1fr)',
      lg: 'repeat(5, 1fr)',
    },
    gap: 3,
    justifyItems: 'center',
  } as const;

  const categorySkeletonGrid = (
    <Box sx={categoryGridSx}>
      {[...Array(5)].map((_, index) => (
        <Box key={index} sx={{ width: '100%', maxWidth: 200 }}>
          <Skeleton variant="rectangular" width={200} height={150} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={150} />
          <Skeleton variant="text" width={100} />
        </Box>
      ))}
    </Box>
  );

  const renderFlatCategoryGrid = (cat: CategoryDisplay) => (
    <Box sx={categoryGridSx}>
      {cat.foodItems.map((item: FoodItem) => {
        const itemType =
          item.hasCombo === true && item.sections && item.sections.length > 0
            ? 'combo'
            : item.portions && item.portions.length > 0
              ? 'portions'
              : 'simple';

        const customizable = isFoodCustomizable(item);
        const inCart = getItemQuantity(item._id);

        return (
          <FoodCard
            key={item._id}
            imageUrl={item.url}
            name={item.name}
            price={getPriceForDisplay(item)}
            quantity={customizable ? 0 : inCart}
            inCartCount={inCart}
            alwaysShowAdd={customizable}
            onAdd={() => handleAddToCart(item._id, item)}
            onIncrement={customizable ? undefined : () => handleIncrement(item._id, item)}
            onDecrement={customizable ? undefined : () => handleDecrement(item._id)}
            onClick={() => handleOpenDialog(item)}
            isLoading={loadingStates[item._id]}
            itemType={itemType}
            veg={item.veg}
            available={item.available}
          />
        );
      })}
    </Box>
  );

  const renderDayWiseFoodCardsGrid = (dayGroup: {
    date: string;
    displayName?: string;
    day?: string;
    foodItems: FoodItem[];
  }) => (
    <Box sx={categoryGridSx}>
      {dayGroup.foodItems.map((item: FoodItem) => {
        const itemType =
          item.hasCombo === true && item.sections && item.sections.length > 0
            ? 'combo'
            : item.portions && item.portions.length > 0
              ? 'portions'
              : 'simple';

        const customizable = isFoodCustomizable(item);
        const inCart = getItemQuantity(item._id, dayGroup.date);

        return (
          <FoodCard
            key={`${item._id}-${dayGroup.date}`}
            imageUrl={item.url}
            name={item.name}
            price={getPriceForDisplay(item)}
            quantity={customizable ? 0 : inCart}
            inCartCount={inCart}
            alwaysShowAdd={customizable}
            onAdd={() => handleAddToCart(item._id, item, dayGroup)}
            onIncrement={customizable ? undefined : () => handleIncrement(item._id, item, dayGroup)}
            onDecrement={customizable ? undefined : () => handleDecrement(item._id, dayGroup)}
            onClick={() => handleOpenDialog(item, dayGroup)}
            isLoading={loadingStates[item._id]}
            itemType={itemType}
            veg={item.veg}
            available={item.available}
          />
        );
      })}
    </Box>
  );

  const renderDayWiseCategorySections = (cat: CategoryDisplay) => {
    if (!cat.dayGroups.length) {
      return null;
    }
    const selectedDate =
      dayWiseSelectedDateByCategory[cat._id] &&
      cat.dayGroups.some((g) => g.date === dayWiseSelectedDateByCategory[cat._id])
        ? dayWiseSelectedDateByCategory[cat._id]!
        : cat.dayGroups[0].date;

    return (
      <Box>
        <Tabs
          value={selectedDate}
          onChange={(_, v) =>
            setDayWiseSelectedDateByCategory((prev) => ({ ...prev, [cat._id]: String(v) }))
          }
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ ...subCategoryTabsSx, mt: 0 }}
        >
          {cat.dayGroups.map((dg: CategoryDisplay['dayGroups'][number]) => (
            <Tab key={dg.date} value={dg.date} label={dg.displayName} />
          ))}
        </Tabs>
        {cat.dayGroups.map((dayGroup: CategoryDisplay['dayGroups'][number]) => (
          <Box
            key={dayGroup.date}
            role="tabpanel"
            hidden={selectedDate !== dayGroup.date}
            sx={{ pt: 2 }}
          >
            {renderDayWiseFoodCardsGrid(dayGroup)}
          </Box>
        ))}
      </Box>
    );
  };

  const renderDayWiseParentWithSubTabs = (category: CategoryDisplay) => {
    const subs = category.subCategories ?? [];
    if (subs.length === 0) {
      return null;
    }

    const dates = collectSortedDatesForDayWiseParentWithSubs(category, availableDates);
    if (dates.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No scheduled days for this category yet.
        </Typography>
      );
    }

    const selectedDate =
      dayWiseSelectedDateByCategory[category._id] &&
      dates.includes(dayWiseSelectedDateByCategory[category._id])
        ? dayWiseSelectedDateByCategory[category._id]!
        : dates[0];

    const tabKey = `${category._id}::${selectedDate}`;
    const selectedSubId = dayWiseSubTabByDay[tabKey] ?? subs[0]._id;
    const parentDg = category.dayGroups.find((g) => g.date === selectedDate);
    const dateOption = availableDates.find((d) => d.date === selectedDate);

    return (
      <Box>
        <Tabs
          value={selectedDate}
          onChange={(_, v) =>
            setDayWiseSelectedDateByCategory((prev) => ({
              ...prev,
              [category._id]: String(v),
            }))
          }
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ ...subCategoryTabsSx, mt: 0 }}
        >
          {dates.map((date) => {
            const pdg = category.dayGroups.find((g) => g.date === date);
            const dopt = availableDates.find((d) => d.date === date);
            const subLab = subs.map((s) => s.dayGroups?.find((g) => g.date === date)).find(Boolean);
            const label =
              pdg?.displayName ?? subLab?.displayName ?? dopt?.formattedDate ?? date;
            return <Tab key={date} value={date} label={label} />;
          })}
        </Tabs>

        <Box sx={{ pt: 2 }}>
          <Box sx={{ mb: 2 }}>
            {parentDg && parentDg.foodItems.length > 0 ? (
              renderDayWiseFoodCardsGrid(parentDg)
            ) : null}
          </Box>

          <Tabs
            value={selectedSubId}
            onChange={(_, v) =>
              setDayWiseSubTabByDay((prev) => ({ ...prev, [tabKey]: String(v) }))
            }
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={subCategoryTabsSx}
          >
            {subs.map((sub) => (
              <Tab key={sub._id} label={sub.name} value={sub._id} />
            ))}
          </Tabs>

          {subs.map((sub) => {
            const items = getItemsForSubOnDate(sub, selectedDate, availableDates);
            const subDayGroup = sub.dayGroups?.find((g) => g.date === selectedDate);
            const displayLabel =
              parentDg?.displayName ??
              subDayGroup?.displayName ??
              dateOption?.formattedDate ??
              selectedDate;
            const dayGroupForHandlers =
              subDayGroup ??
              ({
                date: selectedDate,
                displayName: displayLabel,
                day: parentDg?.day ?? dateOption?.day,
                foodItems: items,
              } as CategoryDisplay['dayGroups'][number]);

            return (
              <Box
                key={sub._id}
                role="tabpanel"
                hidden={selectedSubId !== sub._id}
                sx={{ pt: 2 }}
              >
                {items.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No items in this section for this date.
                  </Typography>
                ) : (
                  <Box sx={categoryGridSx}>
                    {items.map((item: FoodItem) => {
                      const itemType =
                        item.hasCombo === true && item.sections && item.sections.length > 0
                          ? 'combo'
                          : item.portions && item.portions.length > 0
                            ? 'portions'
                            : 'simple';
                      const customizable = isFoodCustomizable(item);
                      const inCart = getItemQuantity(item._id, dayGroupForHandlers.date);

                      return (
                        <FoodCard
                          key={`${item._id}-${selectedDate}-${sub._id}`}
                          imageUrl={item.url}
                          name={item.name}
                          price={getPriceForDisplay(item)}
                          quantity={customizable ? 0 : inCart}
                          inCartCount={inCart}
                          alwaysShowAdd={customizable}
                          onAdd={() => handleAddToCart(item._id, item, dayGroupForHandlers)}
                          onIncrement={
                            customizable
                              ? undefined
                              : () => handleIncrement(item._id, item, dayGroupForHandlers)
                          }
                          onDecrement={
                            customizable
                              ? undefined
                              : () => handleDecrement(item._id, dayGroupForHandlers)
                          }
                          onClick={() => handleOpenDialog(item, dayGroupForHandlers)}
                          isLoading={loadingStates[item._id]}
                          itemType={itemType}
                          veg={item.veg}
                          available={item.available}
                        />
                      );
                    })}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  // Loading state - show when categories are loading initially
  if (loadingCategories && categories.length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, py: 8 }}>
          <CircularProgress size={60} />
        </Box>
        <Footer />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, py: 8 }}>
          <Typography variant="h6" color="error">
            {error}
          </Typography>
        </Box>
        <Footer />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Main Content */}
      <Box component="main" sx={{ flex: 1 }}>

        {/* Hero Banner */}
        <HeroBanner />

        {/* Menu Subscription Section */}
        <MenuSubscriptionSection user={user} />

        {/* Delivery Location Bar */}
        <Container maxWidth="lg" sx={{ mt: { xs: 3, md: 1.5 }, mb: { xs: 2, md: 2.5 } }}>
          <DeliveryLocationBar />
        </Container>
  
        {/* Categories Section */}
        {categories.length > 0 && (
          <Container maxWidth="lg" sx={{ mt: { xs: 2, md: 3 }, mb: 6 }}>
            <Box sx={{ position: 'relative' }}>
              {/* Scroll Buttons - Desktop only */}
              <IconButton
                onClick={() => scrollCategories('left')}
                sx={{
                  position: 'absolute',
                  left: -20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'white',
                  boxShadow: 2,
                  zIndex: 2,
                  display: { xs: 'none', md: 'flex' },
                  '&:hover': { backgroundColor: 'white' },
                }}
              >
                <IconChevronLeft size={20} color="#374151" />
              </IconButton>

              <Box
                id="categories-container"
                sx={{
                  display: 'flex',
                  gap: 2,
                  overflowX: 'auto',
                  py: 2,
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                }}
              >
                {categories.map((category) => (
                  <CategoryCard
                    key={category._id}
                    imageUrl={category.imageUrl}
                    name={category.name}
                    listingType={category.listingType || 'flat'}
                    selected={selectedCategory === category._id}
                    onClick={() =>
                      setSelectedCategory(selectedCategory === category._id ? '' : category._id)
                    }
                  />
                ))}
              </Box>

              <IconButton
                onClick={() => scrollCategories('right')}
                sx={{
                  position: 'absolute',
                  right: -20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'white',
                  boxShadow: 2,
                  zIndex: 2,
                  display: { xs: 'none', md: 'flex' },
                  '&:hover': { backgroundColor: 'white' },
                }}
              >
                <IconChevronRight size={20} color="#374151" />
              </IconButton>
            </Box>
          </Container>
        )}

        {/* Food Items by Day and Category */}
        <Container maxWidth="lg" sx={{ mt: { xs: 2, md: 4 }, mb: 6 }}>
          {loadingItems && displayFoodItemsByCategory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress size={40} />
              <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
                Loading food items...
              </Typography>
            </Box>
          ) : displayFoodItemsByCategory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary">
                No items found matching your criteria
              </Typography>
            </Box>
          ) : (
            displayFoodItemsByCategory.map((category) => {
              const isLoadingCategory =
                loadingCategoryItems.has(category._id) ||
                (category.subCategories ?? []).some((s) => loadingCategoryItems.has(s._id));
              const hasContent = categoryOrSubsHaveItems(category);

              return (
                <Box key={category._id} sx={{ mb: 8 }}>
                  <Box
                    sx={{
                      borderLeft: '4px solid',
                      borderColor: 'primary.main',
                      pl: 2,
                      py: 1,
                      mt: { xs: 4, md: 6 },
                      mb: { xs: 3, md: 4 },
                    }}
                  >
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 600,
                        color: 'primary.main',
                        fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      {category.name}
                      {isLoadingCategory && <CircularProgress size={20} />}
                    </Typography>
                  </Box>

                  {isLoadingCategory ? (
                    categorySkeletonGrid
                  ) : !hasContent ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        {vegOnly
                          ? 'No vegetarian items available in this category'
                          : 'No items available in this category'}
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      {category.listingType === 'flat' &&
                        categoryHasDisplayItems(category) &&
                        renderFlatCategoryGrid(category)}
                      {category.listingType === 'day-wise' &&
                        (category.subCategories?.length ?? 0) > 0 &&
                        renderDayWiseParentWithSubTabs(category)}
                      {category.listingType === 'day-wise' &&
                        (category.subCategories?.length ?? 0) === 0 &&
                        categoryHasDisplayItems(category) &&
                        renderDayWiseCategorySections(category)}
                      {!(
                        category.listingType === 'day-wise' &&
                        (category.subCategories?.length ?? 0) > 0
                      ) &&
                        (category.subCategories ?? []).map((sub) => (
                        <Box key={sub._id} sx={{ mt: 4 }}>
                          <Box sx={subCategoryHeadingBoxSx}>
                            <Typography component="h3" sx={subCategoryTitleSx}>
                              {sub.name}
                              {loadingCategoryItems.has(sub._id) && (
                                <CircularProgress
                                  size={18}
                                  sx={{ ml: 1.5, verticalAlign: 'middle', color: colors.primary }}
                                />
                              )}
                            </Typography>
                          </Box>
                          {loadingCategoryItems.has(sub._id) ? (
                            categorySkeletonGrid
                          ) : sub.listingType === 'flat' ? (
                            renderFlatCategoryGrid(sub)
                          ) : (
                            renderDayWiseCategorySections(sub)
                          )}
                        </Box>
                      ))}
                    </>
                  )}
                </Box>
              );
            })
          )}
        </Container>
      </Box>

      {/* Footer */}
      <Footer />

      {/* Food Details Dialog */}
      <FoodDetailsDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        foodItem={selectedFoodItem}
        currentQuantity={
          selectedFoodItem
            ? isFoodCustomizable(selectedFoodItem)
              ? 0
              : getItemQuantity(selectedFoodItem._id, (selectedFoodItem as any).__dayGroup?.date)
            : 0
        }
        onAddToCart={handleAddToCartFromDialog}
        onOpenDaySelection={handleOpenDaySelectionWithCustomizations}
        refreshCart={handleRefreshCart}
        foodItemsByCategory={displayFoodItemsByCategory}
        dayGroup={selectedFoodItem ? (selectedFoodItem as any).__dayGroup : undefined}
        availableDates={availableDates}
      />

      {/* Day Selection Popup */}
      <DaySelectionPopup
        open={daySelectionPopupOpen}
        onClose={() => {
          setDaySelectionPopupOpen(false);
          setSelectedFoodItemForDayPopup(null);
          setPendingCustomizations(undefined);
        }}
        foodItem={selectedFoodItemForDayPopup}
        customizations={pendingCustomizations}
        onSelectDays={handleDaySelectionFromPopup}
      />
    </Box>
  );
}
