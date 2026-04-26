'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Checkbox,
  FormControlLabel,
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Image from 'next/image';
import { FoodItem } from '@/types/food';
import { DayType, SpiceLevel } from '@/types/cart';
import { CartCustomizations } from '@/types/localCart';
import VegIndicator from '@/components/common/VegIndicator';
import * as localCart from '@/lib/localStorageCart';
import { generateAvailableDatesFromAPI, DayOption } from '@/lib/dayAvailabilityClient';
import { IconX, IconMinus, IconPlus } from '@tabler/icons-react';
import PortionSelector from './PortionSelector';
import SpiceLevelSelector from './SpiceLevelSelector';
import ComboSectionComponent from './ComboSectionComponent';
import { useNotifications, showSuccessNotification, showErrorNotification } from '@/components/common/NotificationSystem';

// Define types for the category display structure (matching main page)
interface CategoryDisplay {
  _id: string;
  name: string;
  description: string;
  url: string;
  listingType: 'flat' | 'day-wise';
  foodItems: FoodItem[];
  dayWiseItems: { [dayName: string]: FoodItem[] } | null;
  dayGroups: Array<{
    day: string;
    displayName: string;
    foodItems: FoodItem[];
  }>;
}

interface FoodDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  foodItem: FoodItem | null;
  currentQuantity?: number;
  selectedDay?: DayType | string;
  selectedDate?: string;
  onAddToCart?: (item: FoodItem, quantity: number, customizations: CartCustomizations, day: DayType | string, date: string) => void;
  onOpenDaySelection?: (customizations: CartCustomizations) => void;
  refreshCart?: () => void;
  foodItemsByCategory?: CategoryDisplay[];
  dayGroup?: any; // Add dayGroup to receive the correct day context from the parent
  availableDates?: DayOption[];
}

export default function FoodDetailsDialog({
  open,
  onClose,
  foodItem,
  currentQuantity = 0,
  selectedDay = '',
  selectedDate = '',
  onAddToCart,
  onOpenDaySelection,
  refreshCart,
  foodItemsByCategory = [],
  dayGroup,
  availableDates = [],
}: FoodDetailsDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showNotification } = useNotifications();

  const [quantity, setQuantity] = useState(currentQuantity);
  const [selectedPortion, setSelectedPortion] = useState(0);
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState('');
  const [useEcoContainer, setUseEcoContainer] = useState(false);

  const [comboSelections, setComboSelections] = useState<Record<string, string[]>>({});

  // Sync quantity with cart when dialog opens or currentQuantity changes
  useEffect(() => {
    if (quantity !== currentQuantity) {
      // Use setTimeout to avoid synchronous setState in useEffect
      setTimeout(() => {
        setQuantity(currentQuantity);
      }, 0);
    }
  }, [currentQuantity, foodItem?._id, quantity]);

  // When dialog opens: load customizations from cart for existing line items, or reset for new adds
  useEffect(() => {
    if (!open || !foodItem) return;

    if (currentQuantity > 0 && dayGroup) {
      const dayName = dayGroup.day as DayType;
      const cartItem = localCart.getFirstLineForFoodOnDay(dayName, foodItem._id);

      if (cartItem) {
        if (cartItem.comboSelections) {
          setComboSelections(cartItem.comboSelections);
        }
        if (foodItem.hasSpiceLevel) {
          setSelectedSpiceLevel(cartItem.selectedSpiceLevel ? String(cartItem.selectedSpiceLevel) : '');
        } else {
          setSelectedSpiceLevel('');
        }
        if (typeof cartItem.isEcoFriendlyContainer === 'boolean') {
          setUseEcoContainer(cartItem.isEcoFriendlyContainer);
        }
        if (cartItem.selectedPortion && foodItem.portions?.length) {
          const idx = foodItem.portions.indexOf(cartItem.selectedPortion);
          setSelectedPortion(idx >= 0 ? idx : 0);
        } else {
          setSelectedPortion(0);
        }
        return;
      }
    }

    setSelectedPortion(0);
    setSelectedSpiceLevel('');
    setUseEcoContainer(false);
  }, [open, foodItem, currentQuantity, dayGroup]);

  // Re-initialize combo selections when foodItem changes (for new items)
  useEffect(() => {
    if (foodItem && currentQuantity === 0) {
      console.log('[FoodDetailsDialog] Initializing combo defaults for new item:', foodItem.name);
      // This is a new item, reset combo selections to initial defaults
      const defaults: Record<string, string[]> = {};
      if (foodItem.sections && Array.isArray(foodItem.sections)) {
        foodItem.sections.forEach((section) => {
          // Defensive check for section validity
          if (section && section._id && section.selectedItems && Array.isArray(section.selectedItems)) {
            // Count items with isDefault=true
            const defaultItems = section.selectedItems.filter(item => item.isDefault);
            console.log(`[FoodDetailsDialog] Section "${section.title}": Found ${defaultItems.length} default items out of ${section.selectedItems.length}`);

            // Determine if this section uses checkboxes (multi-select) or radio buttons (single-select)
            const useCheckboxes = !section.isRequired || (section.maxSelection !== undefined && section.maxSelection > 1);

            if (useCheckboxes) {
              // Multi-select: use array
              if (defaultItems.length > 0) {
                defaults[section._id] = defaultItems.map(item => item._id);
                console.log(`[FoodDetailsDialog] Selected ${defaultItems.length} default items:`, defaultItems.map(i => `${i.item.name} (${i._id})`));
              } else if (section.isRequired && section.minSelection && section.minSelection > 0) {
                // Required multi-select: select minimum number of items
                defaults[section._id] = section.selectedItems.slice(0, section.minSelection).map(item => item._id);
                console.log(`[FoodDetailsDialog] No defaults, selected first ${section.minSelection} items (required multi-select)`);
              } else {
                // Optional multi-select: start with empty array
                defaults[section._id] = [];
                console.log(`[FoodDetailsDialog] No defaults, starting empty (optional multi-select)`);
              }
            } else {
              // Single-select: use array with single element
              if (defaultItems.length === 1 && defaultItems[0]._id) {
                // Exactly one default: select it
                defaults[section._id] = [defaultItems[0]._id];
                console.log(`[FoodDetailsDialog] Selected single default: ${defaultItems[0].item.name} (${defaultItems[0]._id})`);
              } else if (defaultItems.length > 1) {
                // Multiple defaults: select the first one
                if (defaultItems[0]._id) {
                  defaults[section._id] = [defaultItems[0]._id];
                  console.log(`[FoodDetailsDialog] Multiple defaults found, selected first: ${defaultItems[0].item.name} (${defaultItems[0]._id})`);
                }
              } else if (section.selectedItems.length === 1 && section.selectedItems[0]._id) {
                // No defaults: auto-select single item section
                defaults[section._id] = [section.selectedItems[0]._id];
                console.log(`[FoodDetailsDialog] No defaults, auto-selected single item: ${section.selectedItems[0].item.name} (${section.selectedItems[0]._id})`);
              } else if (section.selectedItems.length > 0 && section.selectedItems[0]._id) {
                // No defaults and multiple items: select the first item
                defaults[section._id] = [section.selectedItems[0]._id];
                console.log(`[FoodDetailsDialog] No defaults, selected first item: ${section.selectedItems[0].item.name} (${section.selectedItems[0]._id})`);
              }
            }
          }
        });
      }
      console.log('[FoodDetailsDialog] Final combo selections initialized:', defaults);
      setComboSelections(defaults);
    }
  }, [foodItem, currentQuantity]);

  // Helper function to find which category a food item belongs to and its listing type
  const getCategoryForItem = (foodItemId: string): { category: CategoryDisplay | null; dayGroup?: any } => {
    if (!foodItemsByCategory || foodItemsByCategory.length === 0) {
      return { category: null };
    }

    for (const category of foodItemsByCategory) {
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

  const handleComboSelection = (sectionId: string, itemIds: string | string[]) => {
    // Defensive checks for invalid inputs
    if (!sectionId) {
      console.warn('[FoodDetailsDialog] Invalid combo selection:', { sectionId, itemIds });
      return;
    }

    setComboSelections(prev => {
      // Ensure prev state is valid
      const currentSelections = prev || {};
      // Always ensure itemIds is an array
      const normalizedItemIds = Array.isArray(itemIds) ? itemIds : [itemIds];
      return {
        ...currentSelections,
        [sectionId]: normalizedItemIds,
      };
    });
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (!foodItem) return;

    if (foodItem.hasSpiceLevel && !selectedSpiceLevel.trim() && newQuantity > 0) {
      showErrorNotification(
        showNotification,
        'Please select a spice level before updating the cart.',
        'Spice level required'
      );
      return;
    }

    setQuantity(newQuantity);

    // If we have a dayGroup context, check if item exists for that specific day
    if (dayGroup) {
      const dayName = dayGroup.day as DayType;
      const existingLine = localCart.getFirstLineForFoodOnDay(dayName, foodItem._id);

      if (existingLine && newQuantity > 0) {
        localCart.updateQuantity(dayName, existingLine.lineId, newQuantity);
        refreshCart?.();

        const action = newQuantity > currentQuantity ? 'increased' : 'decreased';
        showSuccessNotification(
          showNotification,
          `${foodItem.name} quantity ${action} to ${newQuantity} for ${dayName}`,
          'Cart Updated'
        );
      } else if (newQuantity === 0 && existingLine) {
        localCart.removeItem(dayName, existingLine.lineId);
        refreshCart?.();

        showSuccessNotification(
          showNotification,
          `${foodItem.name} has been removed from your cart`,
          'Item Removed'
        );
      } else if (!existingLine && newQuantity > 0) {
        // Item doesn't exist in cart for this day, but user wants to add it
        // This can happen when user clicks "+" on an item that exists for another day
        const customizations: CartCustomizations = {
          selectedPortion: foodItem.portions?.[selectedPortion] || '',
          selectedPortionPrice: foodItem.portions?.[selectedPortion] ? foodItem.portionPrices?.[selectedPortion] : undefined,
          selectedSpiceLevel: selectedSpiceLevel as SpiceLevel,
          isEcoFriendlyContainer: useEcoContainer,
          ecoContainerCharge: useEcoContainer ? foodItem.ecoContainerCharge : undefined,
          comboSelections,
        };

        // Add item directly to cart for this day (not via onAddToCart callback to avoid re-fetching dates)
        localCart.addItem(dayName, dayGroup.date, foodItem, newQuantity, customizations);
        refreshCart?.();

        showSuccessNotification(
          showNotification,
          `${foodItem.name} has been added to your cart for ${dayName}`,
          'Added to Cart'
        );
      }
      // If newQuantity === 0 and item doesn't exist, do nothing (already at 0)
    } else {
      // Fallback to old behavior for flat categories (no dayGroup)
      const existingDays = localCart.findDaysWithItem(foodItem._id);

      if (existingDays.length > 0 && newQuantity > 0) {
        const firstDay = existingDays[0];
        const line = localCart.getFirstLineForFoodOnDay(firstDay.day, foodItem._id);
        if (line) {
          localCart.updateQuantity(firstDay.day, line.lineId, newQuantity);
          refreshCart?.();
        } else {
          const customizations: CartCustomizations = {
            selectedPortion: foodItem.portions?.[selectedPortion] || '',
            selectedPortionPrice: foodItem.portions?.[selectedPortion] ? foodItem.portionPrices?.[selectedPortion] : undefined,
            selectedSpiceLevel: selectedSpiceLevel as SpiceLevel,
            isEcoFriendlyContainer: useEcoContainer,
            ecoContainerCharge: useEcoContainer ? foodItem.ecoContainerCharge : undefined,
            comboSelections,
          };
          onAddToCart?.(foodItem, newQuantity, customizations, firstDay.day, firstDay.date);
        }

        const action = newQuantity > currentQuantity ? 'increased' : 'decreased';
        showSuccessNotification(
          showNotification,
          `${foodItem.name} quantity ${action} to ${newQuantity} for ${firstDay.day}`,
          'Cart Updated'
        );
      } else if (newQuantity === 0 && existingDays.length > 0) {
        existingDays.forEach(({ day }) => {
          localCart.removeAllLinesForFood(day, foodItem._id);
        });
        refreshCart?.();

        showSuccessNotification(
          showNotification,
          `${foodItem.name} has been removed from your cart`,
          'Item Removed'
        );
      }
    }
  };

  // Handle auto-add for day-wise categories
  const handleAddToDayWiseCategory = async (foodItem: FoodItem, dayGroup: any, customizations: CartCustomizations) => {
    console.log('[FoodDetailsDialog] handleAddToDayWiseCategory called with:', {
      foodItemId: foodItem._id,
      foodItemName: foodItem.name,
      dayGroup,
      customizations
    });

    // Fetch all available dates and find the matching date option for this date
    // IMPORTANT: Search by date string (YYYY-MM-DD) not by day type to avoid date shifting
    const availableDates = await generateAvailableDatesFromAPI(false); // Only enabled dates
    const dayOption = availableDates.find(d => d.date === dayGroup.date);

    // Use dayOption.day (from API) instead of dayGroup.day (calculated incorrectly)
    const dayName = dayOption?.day || dayGroup.day;
    const dayType = dayName as DayType;

    if (!dayOption || !dayOption.enabled) {
      // Day is not available, show error message
      showErrorNotification(
        showNotification,
        `${dayName} is not available for ordering. Please choose a different item.`,
        'Day Unavailable'
      );
      return;
    }

    try {
      console.log('[FoodDetailsDialog] Calling onAddToCart with:', {
        foodItem,
        quantity: 1,
        customizations,
        dayType,
        date: dayOption?.date || ''
      });

      // Add item to cart for the designated day
      onAddToCart?.(
        foodItem,
        1, // Default quantity of 1
        customizations,
        dayType,
        dayOption?.date || ''
      );

      // Show success message with formatted date
      showSuccessNotification(
        showNotification,
        `${foodItem.name} has been added to your cart for ${dayOption.formattedDate}`,
        'Added to Cart'
      );

      // Close dialog
      onClose();
    } catch (error) {
      console.error('Error adding item to cart:', error);
      showErrorNotification(
        showNotification,
        'Failed to add item to cart. Please try again.',
        'Error'
      );
    }
  };

  const handleAddToCart = () => {
    if (!foodItem) return;

    // Ensure combo selections are initialized (defensive check)
    let finalComboSelections = comboSelections;
    if (foodItem.hasCombo && foodItem.sections && Object.keys(comboSelections).length === 0) {
      // Initialize defaults if not already set
      const defaults: Record<string, string[]> = {};
      foodItem.sections.forEach((section) => {
        // Count items with isDefault=true
        const defaultItems = section.selectedItems.filter(item => item.isDefault);

        // Determine if this section uses checkboxes (multi-select) or radio buttons (single-select)
        const useCheckboxes = !section.isRequired || (section.maxSelection !== undefined && section.maxSelection > 1);

        if (useCheckboxes) {
          // Multi-select: use array
          if (defaultItems.length > 0) {
            defaults[section._id] = defaultItems.map(item => item._id);
          } else if (section.isRequired && section.minSelection && section.minSelection > 0) {
            // Required multi-select: select minimum number of items
            defaults[section._id] = section.selectedItems.slice(0, section.minSelection).map(item => item._id);
          } else {
            // Optional multi-select: start with empty array
            defaults[section._id] = [];
          }
        } else {
          // Single-select: use array with single element
          if (defaultItems.length === 1 && defaultItems[0]._id) {
            // Exactly one default: select it
            defaults[section._id] = [defaultItems[0]._id];
          } else if (defaultItems.length > 1) {
            // Multiple defaults: select the first one
            if (defaultItems[0]._id) {
              defaults[section._id] = [defaultItems[0]._id];
            }
          } else if (section.selectedItems.length === 1 && section.selectedItems[0]._id) {
            // No defaults: auto-select single item section
            defaults[section._id] = [section.selectedItems[0]._id];
          } else if (section.selectedItems.length > 0 && section.selectedItems[0]._id) {
            // No defaults and multiple items: select the first item
            defaults[section._id] = [section.selectedItems[0]._id];
          }
        }
      });
      finalComboSelections = defaults;
    }

    if (foodItem.hasSpiceLevel && !selectedSpiceLevel.trim()) {
      showErrorNotification(
        showNotification,
        'Please select a spice level before adding this item to your cart.',
        'Spice level required'
      );
      return;
    }

    // Validate combo selections for all sections
    if (foodItem.hasCombo && foodItem.sections) {
      for (const section of foodItem.sections) {
        const selection = finalComboSelections[section._id];
        const selectedCount = Array.isArray(selection) ? selection.length : (selection ? 1 : 0);

        // Check minimum selection
        if (section.minSelection && selectedCount < section.minSelection) {
          showErrorNotification(
            showNotification,
            `Please select at least ${section.minSelection} item(s) from ${section.title}`,
            'Selection Required'
          );
          return; // Early return to prevent adding to cart
        }

        // Check maximum selection
        if (section.maxSelection && selectedCount > section.maxSelection) {
          showErrorNotification(
            showNotification,
            `Please select no more than ${section.maxSelection} item(s) from ${section.title}`,
            'Too Many Selections'
          );
          return; // Early return to prevent adding to cart
        }
      }
    }

    // Use the dayGroup passed from props if available (from day-wise category section)
    // Otherwise, search for it in the categories (fallback for flat categories)
    let targetDayGroup = dayGroup;
    if (!targetDayGroup) {
      const { category, dayGroup: foundDayGroup } = getCategoryForItem(foodItem._id);
      targetDayGroup = foundDayGroup;
    }

    const customizations: CartCustomizations = {
      selectedPortion: foodItem.portions?.[selectedPortion] || '',
      selectedPortionPrice: foodItem.portions?.[selectedPortion] ? foodItem.portionPrices?.[selectedPortion] : undefined,
      selectedSpiceLevel: selectedSpiceLevel as SpiceLevel,
      isEcoFriendlyContainer: useEcoContainer,
      ecoContainerCharge: useEcoContainer ? foodItem.ecoContainerCharge : undefined,
      comboSelections: finalComboSelections,
    };

    console.log('[FoodDetailsDialog] Created customizations:', {
      customizations,
      selectedPortionIndex: selectedPortion,
      portions: foodItem.portions,
      portionPrices: foodItem.portionPrices
    });

    if (targetDayGroup) {
      // For day-wise categories, auto-add to the designated day
      handleAddToDayWiseCategory(foodItem, targetDayGroup, customizations);
    } else {
      // For flat categories or when no dayGroup is found, show day selection popup
      // The popup will handle adding the item with the customizations
      onOpenDaySelection?.(customizations);
      onClose();
    }
  };

  const handleClose = () => {
    setQuantity(currentQuantity);
    setSelectedPortion(0);
    setSelectedSpiceLevel('');
    setUseEcoContainer(false);
    setComboSelections({});
    onClose();
  };

  if (!foodItem) return null;

  const spiceRequiredIncomplete = Boolean(foodItem.hasSpiceLevel && !selectedSpiceLevel.trim());

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          width: isMobile ? '100%' : '700px',
          maxWidth: '100vw',
          maxHeight: '85vh',
          borderRadius: isMobile ? 0 : 2,
          m: 0,
        },
      }}
    >
      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Close Button */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            top: 20,
            right: 16,
            zIndex: 10,
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            '&:hover': {
              backgroundColor: '#f3f4f6',
            },
          }}
        >
          <IconX size={20} />
        </IconButton>

        {/* Food Image */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: { xs: 120, sm: 140 },
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <Image
            src={foodItem.url}
            alt={foodItem.name}
            fill
            style={{
              objectFit: 'cover',
            }}
          />
        </Box>

        {/* Scrollable Content */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            pt: 1.25,
            px: { xs: 2, sm: 5.25 },
            pb: 10,
          }}
        >
          {/* Title and Price */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
            <VegIndicator isVeg={foodItem.veg} size={18} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5, fontSize: '1.25rem' }}>
                {foodItem.name}
              </Typography>
              {foodItem.price != null && (
                <Typography variant="h6" sx={{ color: '#f89c35', fontWeight: 600, fontSize: '1.125rem' }}>
                  {foodItem.portions && foodItem.portions.length > 0 ? 'Starting at ' : ''}
                  {`$${foodItem.price.toFixed(2)}`}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Description */}
          {foodItem.description && (
            <Typography
              variant="body1"
              sx={{ color: '#374151', mb: 2.5, mt: 1, lineHeight: 1.6 }}
            >
              {foodItem.description}
            </Typography>
          )}

          {/* Portion Selector */}
          {foodItem.portions && foodItem.portionPrices && (
            <PortionSelector
              portions={foodItem.portions}
              portionPrices={foodItem.portionPrices}
              selectedPortion={selectedPortion}
              onPortionChange={setSelectedPortion}
            />
          )}

          {/* Spice Level Selector */}
          {foodItem.hasSpiceLevel && (
            <SpiceLevelSelector
              spiceLevels={foodItem.spiceLevel}
              selectedSpiceLevel={selectedSpiceLevel}
              onSpiceLevelChange={setSelectedSpiceLevel}
            />
          )}

          {/* Eco-Friendly Container */}
          {foodItem.isEcoFriendlyContainer && (
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={useEcoContainer}
                    onChange={(e) => setUseEcoContainer(e.target.checked)}
                    sx={{
                      color: '#d1d5db',
                      '&.Mui-checked': {
                        color: '#f89c35',
                      },
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>Use Eco-Friendly Container</Typography>
                    {foodItem.ecoContainerCharge && (
                      <Typography sx={{ color: '#f89c35', fontWeight: 600 }}>
                        +${foodItem.ecoContainerCharge.toFixed(2)}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </Box>
          )}

          {/* Combo Sections */}
          {foodItem.hasCombo && foodItem.sections && foodItem.sections.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Customize Your Combo
              </Typography>
              {foodItem.sections.map((section) => {
                // Ensure selectedValue is always a string, never undefined/null
                const selectedValue = comboSelections?.[section._id] || '';
                return (
                  <ComboSectionComponent
                    key={section._id}
                    section={section}
                    selectedValue={selectedValue}
                    onSelect={handleComboSelection}
                  />
                );
              })}
            </Box>
          )}
        </Box>

        {/* Bottom Bar */}
        <Box
          sx={{
            flexShrink: 0,
            backgroundColor: 'white',
            borderTop: '1px solid #F0F0F0',
            pt: 1.5,
            px: { xs: 2, sm: 5.25 },
            pb: 2,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 2,
            boxShadow: '0 -2px 4px rgba(0,0,0,0.05)',
          }}
        >
          {quantity === 0 ? (
            <Button
              variant="contained"
              onClick={handleAddToCart}
              disabled={spiceRequiredIncomplete}
              sx={{
                backgroundColor: '#f89c35',
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: '#e08929',
                },
                '&.Mui-disabled': {
                  backgroundColor: '#e5e7eb',
                  color: '#9ca3af',
                },
              }}
            >
              Add to Cart
            </Button>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                backgroundColor: '#f89c35',
                borderRadius: 2,
                px: 2,
                py: 1,
              }}
            >
              <IconButton
                onClick={() => handleQuantityChange(Math.max(0, quantity - 1))}
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                <IconMinus size={20} />
              </IconButton>
              <Typography
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  minWidth: '40px',
                  textAlign: 'center',
                }}
              >
                {quantity}
              </Typography>
              <IconButton
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={spiceRequiredIncomplete}
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                  '&.Mui-disabled': {
                    color: 'rgba(255,255,255,0.4)',
                  },
                }}
              >
                <IconPlus size={20} />
              </IconButton>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
