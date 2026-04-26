'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Box, Container, Typography, IconButton, CircularProgress, Stack, Chip, Skeleton } from '@mui/material';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import Footer from '@/components/layout/Footer';
import DeliveryLocationBar from '@/components/layout/DeliveryLocationBar';
import HeroBanner from '@/components/banners/HeroBanner';
import CategoryCard from '@/components/cards/CategoryCard';
import FoodCard from '@/components/cards/FoodCard';
import FoodDetailsDialog from '@/components/dialogs/FoodDetailsDialog';
import DaySelectionPopup, { DaySelection } from '@/components/dialogs/DaySelectionPopup';
import { FoodCategory, FoodItem } from '@/types/food';
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
}

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
  const [categories, setCategories] = useState<Array<{
    _id: string;
    name: string;
    description: string;
    imageUrl: string;
    listingType: 'flat' | 'day-wise';
    sequence: number;
  }>>([]);
  const [categoryFoodItemsMap, setCategoryFoodItemsMap] = useState<Map<string, CategoryDisplay>>(new Map());
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);
  const [loadingCategoryItems, setLoadingCategoryItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [dayOptionsCache, setDayOptionsCache] = useState<Map<string, DayOption>>(new Map());
  const [availableDates, setAvailableDates] = useState<DayOption[]>([]);

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

  // Sequentially fetch food items for each category
  const fetchFoodItemsForCategories = async (categoriesList: typeof categories) => {
    setLoadingItems(true);
    const newMap = new Map<string, CategoryDisplay>();
    const newLoadingSet = new Set<string>();

    for (const category of categoriesList) {
      try {
        newLoadingSet.add(category._id);
        setLoadingCategoryItems(new Set(newLoadingSet));

        const listingType = category.listingType || 'flat';

        if (listingType === 'flat') {
          // Use existing API for flat categories
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
              dayGroups: [], // Will be populated in displayFoodItemsByCategory
            };
            newMap.set(category._id, categoryDisplay);
          } else {
            console.error(`Failed to fetch items for flat category ${category._id}:`, data.message);
          }
        } else {
          // For day-wise categories, fetch items for each available date
          const dayWiseItems: { [dateString: string]: FoodItem[] } = {};
          const categoryDisplay: CategoryDisplay = {
            _id: category._id,
            name: category.name,
            description: category.description || '',
            url: category.imageUrl || '',
            listingType: 'day-wise',
            foodItems: [],
            dayWiseItems: dayWiseItems,
            dayGroups: [], // Will be populated in displayFoodItemsByCategory
          };

          // Get enabled dates from availableDates cache
          const enabledDates = availableDates
            .filter(dateOption => dateOption.dayWiseCategoryEnabled)
            .map(dateOption => dateOption.date);

          // Fetch items for each enabled date
          for (const date of enabledDates) {
            try {
              const dayWiseData = await fetchDayWiseFoodItems(category._id, date);
              if (dayWiseData?.data && 'foodItems' in dayWiseData.data) {
                // Type guard to check if data has foodItems property
                const foodItems = (dayWiseData.data as any).foodItems as FoodItem[];
                if (Array.isArray(foodItems) && foodItems.length > 0) {
                  dayWiseItems[date] = foodItems;
                }
              }
            } catch (error) {
              console.error(`Error fetching day-wise items for date ${date}:`, error);
              // Continue with other dates even if one fails
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
    }

    setCategoryFoodItemsMap(newMap);
    setLoadingItems(false);
  };

  // Get food items by category map
  const foodItemsByCategory = useMemo(() => {
    return Array.from(categoryFoodItemsMap.values());
  }, [categoryFoodItemsMap]);


  // Transform data to organize categories based on their listing type
  // Apply vegOnly filtering client-side
  const displayFoodItemsByCategory = useMemo(() => {
    if (!foodItemsByCategory || foodItemsByCategory.length === 0) {
      return [];
    }

    // Filter categories based on selected category
    const filteredCategories = selectedCategory
      ? foodItemsByCategory.filter(category => category._id === selectedCategory)
      : foodItemsByCategory;

    // Process each category based on its listing type
    return filteredCategories.map(category => {
      const listingType = category.listingType || 'flat'; // Default to 'flat' if not specified

      if (listingType === 'flat') {
        // For flat categories, return all food items in a single group
        // Apply vegOnly filter client-side
        const filteredFoodItems = vegOnly
          ? (category.foodItems || []).filter(item => item.veg !== false)
          : (category.foodItems || []);

        return {
          ...category,
          listingType,
          foodItems: filteredFoodItems,
          dayGroups: [], // No day groups for flat categories
        };
      } else {
        // For day-wise categories, organize items by date string
        // dayWiseItems now uses date strings as keys (e.g., "2024-01-15")
        const dayWiseItems = category.dayWiseItems || {};
        const dayGroups = Object.entries(dayWiseItems)
          .filter(([dateString, items]) => items && items.length > 0) // Only include dates with items
          .map(([dateString, items]) => {
            // Filter items based on vegOnly
            const filteredItems = vegOnly
              ? items.filter(item => item.veg !== false)
              : items;

            // Find matching date option from availableDates to get formatted display name
            const dateOption = availableDates.find(d => d.date === dateString);

            // Extract day name from date for backward compatibility
            // Use createPSTDate to correctly handle PST/PDT timezone
            const [year, month, day] = dateString.split('-').map(Number);
            const dateObj = createPSTDate(year, month - 1, day);
            const dayName = getPSTWeekday(dateObj);

            return {
              date: dateString,
              formattedDate: dateOption?.formattedDate || dateString, // Use formatted date from API or fallback
              displayName: dateOption?.formattedDate || dateString, // Alias for formattedDate
              day: dayName, // Day name for backward compatibility
              foodItems: filteredItems,
            };
          })
          .filter(dayGroup => {
            // Filter out dates that are disabled/unavailable for day-wise categories
            // Find the matching date option for this date string
            const dateOption = availableDates.find(d => d.date === dayGroup.date);

            // Only include dates that:
            // 1. Have items after vegOnly filtering
            // 2. Have dayWiseCategoryEnabled: true (enabled for day-wise categories)
            return dayGroup.foodItems.length > 0 && dateOption && dateOption.dayWiseCategoryEnabled;
          })
          .sort((a, b) => {
            // Sort by calendar date (chronological order)
            return a.date.localeCompare(b.date);
          });

        return {
          ...category,
          listingType,
          foodItems: [], // No direct food items for day-wise categories
          dayGroups,
        };
      }
    });
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
    for (const category of displayFoodItemsByCategory) {
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
              const isLoadingCategory = loadingCategoryItems.has(category._id);
              const hasItems =
                category.listingType === 'flat'
                  ? category.foodItems.length > 0
                  : category.dayGroups.length > 0;

              return (
                <Box key={category._id} sx={{ mb: 8 }}>
                  {/* Category Header */}
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

                  {/* Show loading skeleton if category is loading */}
                  {isLoadingCategory ? (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'repeat(2, 1fr)',
                          sm: 'repeat(3, 1fr)',
                          md: 'repeat(4, 1fr)',
                          lg: 'repeat(5, 1fr)',
                        },
                        gap: 3,
                        justifyItems: 'center',
                      }}
                    >
                      {[...Array(5)].map((_, index) => (
                        <Box key={index} sx={{ width: '100%', maxWidth: 200 }}>
                          <Skeleton variant="rectangular" width={200} height={150} sx={{ mb: 1 }} />
                          <Skeleton variant="text" width={150} />
                          <Skeleton variant="text" width={100} />
                        </Box>
                      ))}
                    </Box>
                  ) : !hasItems ? (
                    /* Show message if no items in this category (after filtering) */
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        {vegOnly ? 'No vegetarian items available in this category' : 'No items available in this category'}
                      </Typography>
                    </Box>
                  ) : (
                    /* Render based on listing type */
                    category.listingType === 'flat' ? (
                      /* Flat category - single grid of all items */
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',
                            sm: 'repeat(3, 1fr)',
                            md: 'repeat(4, 1fr)',
                            lg: 'repeat(5, 1fr)',
                          },
                          gap: 3,
                          justifyItems: 'center',
                        }}
                      >
                        {category.foodItems.map((item: FoodItem) => {
                          // Determine item type for icon indicator
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
                    ) : (
                      /* Day-wise category - items grouped by date */
                      category.dayGroups.map((dayGroup: any) => (
                        <Box key={`${category._id}-${dayGroup.date}`} sx={{ mb: 4 }}>
                          {/* Date Header */}
                          <Box sx={{ mb: 2 }}>
                            <Chip
                              label={dayGroup.displayName}
                              sx={{
                                backgroundColor: 'primary.light',
                                color: 'white',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                py: 0.5,
                              }}
                            />
                          </Box>

                          {/* Food Items Grid for this Date */}
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: {
                                xs: 'repeat(2, 1fr)',
                                sm: 'repeat(3, 1fr)',
                                md: 'repeat(4, 1fr)',
                                lg: 'repeat(5, 1fr)',
                              },
                              gap: 3,
                              justifyItems: 'center',
                            }}
                          >
                            {dayGroup.foodItems.map((item: FoodItem) => {
                              // Determine item type for icon indicator
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
                        </Box>
                      ))
                    )
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
