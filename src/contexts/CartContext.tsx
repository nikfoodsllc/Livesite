'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import {
  Cart,
  CartDay,
  CartItem,
  AddToCartRequest,
  UpdateCartItemRequest,
  CartSummary,
  DayType,
} from '@/types/cart';
import {
  calculateCartSubtotal,
  calculateItemCount,
  calculateTotalPrice,
  calculateCartClubbing,
  DEFAULT_MIN_CART_VALUE,
  calculateDayTotal,
  TAX_RATE,
} from '@/lib/cartLogic';
import { fetchZipcodeConfig } from '@/lib/clientUtils';
import { ZipcodeConfig } from '@/types/zipcode';
import { IAddress } from '@/types/auth';
import * as localCart from '@/lib/localStorageCart';
import { LocalCartDay, LocalCartItem } from '@/types/localCart';
import {
  invalidateZipcodeCache
} from '@/lib/zipcodeCache';
import { useApiClient } from '@/hooks/useApiClient';

interface CartContextType {
  cart: Cart | null;
  summary: CartSummary | null;
  isLoading: boolean;
  error: string | null;
  itemCount: number;
  selectedAddressId: string | undefined;
  setSelectedAddressId: (addressId: string | undefined) => void;
  selectedZipcode: string | undefined;
  zipcodeConfig: ZipcodeConfig | null;
  minOrderValue: number | undefined;
  fetchCart: () => Promise<void>;
  addToCart: (item: AddToCartRequest) => Promise<void>;
  updateCartItem: (update: UpdateCartItemRequest) => Promise<void>;
  removeCartItem: (itemId: string) => Promise<void>;
  updateAddress: (addressId: string) => Promise<void>;
  updateZipcode: (zipcode: string, preserveAddressId?: boolean) => Promise<void>;
  clearError: () => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * Convert localStorage cart to Cart type
 */
async function convertLocalCartToCart(
  zipcodeConfig?: ZipcodeConfig | null,
  selectedAddress?: Cart['selectedAddress']
): Promise<Cart | null> {
  console.log('[CartContext] convertLocalCartToCart called');

  const days = await localCart.getAllDays();

  console.log('[CartContext] getAllDays returned:', days);

  if (days.length === 0) {
    console.log('[CartContext] No days in cart, returning null');
    return null;
  }

  // Use zipcode config values or defaults
  const minCartValue = zipcodeConfig?.minCartValue || DEFAULT_MIN_CART_VALUE;
  const deliveryFee = zipcodeConfig?.deliveryFee;

  // Convert localStorage days to CartDay format
  const cartDays: CartDay[] = days.map((localDay: LocalCartDay) => {
    console.log('[CartContext] Processing localDay:', localDay);
    const items: CartItem[] = Object.values(localDay.items).map((localItem: LocalCartItem) => {
      console.log('[CartContext] Processing localItem:', localItem);
      return {
        _id: `${localItem.foodItemId}-${localDay.day}`,
        foodItem: localItem.foodItem,
        quantity: localItem.quantity,
        day: localDay.day,
        date: localDay.date,
        selectedSpiceLevel: localItem.selectedSpiceLevel,
        selectedPortion: localItem.selectedPortion,
        selectedPortionPrice: localItem.selectedPortionPrice,
        isEcoFriendlyContainer: localItem.isEcoFriendlyContainer,
        ecoContainerCharge: localItem.ecoContainerCharge,
        comboSelections: localItem.comboSelections,
        notes: localItem.notes,
        price: localItem.unitPrice,
        subtotal: localItem.totalPrice,
        totalPrice: localItem.totalPrice,
      };
    });

    console.log('[CartContext] Converted items for day:', localDay.day, items);

    // Generate formatted date for display (includes day name in Title Case)
    const [year, month, day] = localDay.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      _id: `local-${localDay.day}`,
      day: localDay.day,
      date: localDay.date,
      formattedDate,
      items,
      subtotal: calculateDayTotal(items),
      dayTotal: calculateDayTotal(items),
      meetsMinimum: false, // Will be calculated later
    };
  });

  console.log('[CartContext] Converted cartDays:', cartDays);

  // Calculate cart clubbing with dynamic min cart value
  const clubbingResult = calculateCartClubbing(cartDays, minCartValue);

  // The deliveryMessages array now has messages indexed by day position
  // Days that meet minimum have undefined at their index
  const updatedDays = cartDays.map((day, index) => ({
    ...day,
    deliveryMessage: clubbingResult.deliveryMessages[index] || undefined,
    meetsMinimum: clubbingResult.clubbedDays[index]?.meetsMinimum || false,
  }));

  // Calculate totals with dynamic delivery fee
  const subtotal = calculateCartSubtotal(updatedDays);
  const priceBreakdown = calculateTotalPrice(subtotal, 0, deliveryFee);
  const count = calculateItemCount(updatedDays);

  const result = {
    _id: 'local-cart',
    userId: 'guest',
    days: updatedDays,
    selectedAddress, // Include selected address
    subtotal: priceBreakdown.subtotal,
    tax: priceBreakdown.tax,
    deliveryFee: priceBreakdown.deliveryFee,
    platformFee: priceBreakdown.platformFee,
    totalAmount: priceBreakdown.total,
    itemCount: count,
    canCheckout: clubbingResult.canCheckout,
  };

  console.log('[CartContext] Final converted cart:', result);

  return result;
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { authenticatedFetch } = useApiClient();
  const [cart, setCart] = useState<Cart | null>(null);
  const [summary, setSummary] = useState<CartSummary | null>(null);
  // True until first load finishes so pages (e.g. checkout) don't treat "cart not yet hydrated" as empty.
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>();
  const [selectedZipcode, setSelectedZipcode] = useState<string | undefined>();
  const [zipcodeConfig, setZipcodeConfig] = useState<ZipcodeConfig | null>(null);
  const [selectedAddressObject, setSelectedAddressObject] = useState<Cart['selectedAddress'] | undefined>();

  // Use refs to avoid re-creating fetchCart when zipcodeConfig or selectedAddressObject change
  // This breaks the infinite re-render cycle
  const zipcodeConfigRef = useRef(zipcodeConfig);
  const selectedAddressObjectRef = useRef(selectedAddressObject);

  // Keep refs in sync with state
  useEffect(() => {
    zipcodeConfigRef.current = zipcodeConfig;
  }, [zipcodeConfig]);

  useEffect(() => {
    selectedAddressObjectRef.current = selectedAddressObject;
  }, [selectedAddressObject]);

  /**
   * Fetches the current cart - from localStorage for all users
   */
  const fetchCart = useCallback(async (overrideZipcodeConfig?: ZipcodeConfig | null, overrideAddress?: Cart['selectedAddress']) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[CartContext] fetchCart called');

      // Load from localStorage for all users (both guest and authenticated)
      // Use override config if provided (to fix timing issues), otherwise use ref
      // Use override address if provided (to fix timing issues), otherwise use ref
      const configToUse = overrideZipcodeConfig !== undefined ? overrideZipcodeConfig : zipcodeConfigRef.current;
      const addressToUse = overrideAddress !== undefined ? overrideAddress : selectedAddressObjectRef.current;
      const localCartData = await convertLocalCartToCart(configToUse, addressToUse);

      console.log('[CartContext] convertLocalCartToCart returned:', localCartData);

      if (localCartData) {
        console.log('[CartContext] Setting cart state with:', localCartData);
        setCart(localCartData);
        setSummary({
          subtotal: localCartData.subtotal,
          tax: localCartData.tax,
          taxRate: TAX_RATE,
          deliveryFee: localCartData.deliveryFee,
          platformFee: localCartData.platformFee,
          discount: 0,
          total: localCartData.totalAmount,
          itemCount: localCartData.itemCount,
        });
        setItemCount(localCartData.itemCount);
      } else {
        setCart(null);
        setSummary(null);
        setItemCount(0);
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cart');
      setCart(null);
      setSummary(null);
      setItemCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array - function uses refs instead of state

  /**
   * Adds an item to the cart (localStorage-based)
   * Note: Direct localStorage manipulation is done via localStorageCart.ts
   * This method just refreshes the cart context
   */
  const addToCart = async () => {
    // Cart operations are handled via localStorage
    // Just refresh the cart to pick up changes
    await fetchCart();
  };

  /**
   * Updates a cart item (localStorage-based)
   */
  const updateCartItem = async (update: UpdateCartItemRequest) => {
    try {
      // Get current cart to find the item (use refs for accurate calculations)
      const currentCart = await convertLocalCartToCart(zipcodeConfigRef.current, selectedAddressObjectRef.current);
      if (!currentCart) return;

      // Find which day this item belongs to and get its foodItemId
      let itemDay: DayType | undefined;
      let foodItemId: string | undefined;

      for (const day of currentCart.days) {
        const item = day.items.find((i) => i._id === update.cartItemId);
        if (item) {
          itemDay = day.day;
          // Extract foodItemId from the unique ID (format: "foodItemId-day")
          foodItemId = item._id.split('-')[0];
          break;
        }
      }

      if (!itemDay || !foodItemId) {
        console.error('Item not found in cart for update');
        return;
      }

      // Update quantity in localStorage
      if (update.quantity !== undefined) {
        localCart.updateQuantity(itemDay, foodItemId, update.quantity);
      }

      // Refresh cart to pick up changes
      await fetchCart();
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  };

  /**
   * Removes an item from the cart (localStorage-based)
   */
  const removeCartItem = async (itemId: string) => {
    try {
      // Get current cart to find the item (use refs for accurate calculations)
      const currentCart = await convertLocalCartToCart(zipcodeConfigRef.current, selectedAddressObjectRef.current);
      if (!currentCart) return;

      // Find which day this item belongs to and get its foodItemId
      let itemDay: DayType | undefined;
      let foodItemId: string | undefined;

      for (const day of currentCart.days) {
        const item = day.items.find((i) => i._id === itemId);
        if (item) {
          itemDay = day.day;
          // Extract foodItemId from the unique ID (format: "foodItemId-day")
          foodItemId = item._id.split('-')[0];
          break;
        }
      }

      if (!itemDay || !foodItemId) {
        console.error('Item not found in cart for removal');
        return;
      }

      // Remove item from localStorage
      localCart.removeItem(itemDay, foodItemId);

      // Refresh cart to pick up changes
      await fetchCart();
    } catch (error) {
      console.error('Error removing cart item:', error);
      throw error;
    }
  };

  /**
   * Updates the selected delivery address
   * Fetches address details from API and updates zipcode config
   */
  const updateAddress = async (addressId: string) => {
    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors

      // Fetch addresses from API
      const response = await authenticatedFetch('/api/address', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load addresses');
      }

      const addresses: IAddress[] = data.data?.items || [];
      const selectedAddress = addresses.find((addr) => addr._id?.toString() === addressId);

      if (!selectedAddress) {
        throw new Error('Address not found');
      }

      // Update zipcode from address
      const zipcode = selectedAddress.postal_code;
      setSelectedAddressId(addressId);
      setSelectedZipcode(zipcode);

      // Convert IAddress to Cart.selectedAddress format
      const formattedAddress: Cart['selectedAddress'] = {
        _id: selectedAddress._id?.toString() || '',
        addressLine1: selectedAddress.street_address,
        addressLine2: [
          selectedAddress.apartment ? `Apt ${selectedAddress.apartment}` : '',
          selectedAddress.floor ? `Floor ${selectedAddress.floor}` : '',
        ]
          .filter(Boolean)
          .join(', ') || undefined,
        city: selectedAddress.city,
        state: selectedAddress.province || '',
        zipCode: selectedAddress.postal_code,
        landmark: selectedAddress.location_remark,
        isDefault: false, // Not available in IAddress schema
      };

      setSelectedAddressObject(formattedAddress);

      // Store in localStorage
      localStorage.setItem('selectedAddressId', addressId);
      localStorage.setItem('selectedZipcode', zipcode);
      localStorage.setItem('selectedAddressObject', JSON.stringify(formattedAddress));

      // Update state
      setSelectedZipcode(zipcode);
      setSelectedAddressObject(formattedAddress);

      // Update refs immediately to avoid stale data in fetchCart
      selectedAddressObjectRef.current = formattedAddress;

      // Fetch zipcode configuration
      const config = await fetchZipcodeConfig(zipcode);
      setZipcodeConfig(config);
      zipcodeConfigRef.current = config;

      // Refresh cart with new config and address (pass both directly to avoid timing issues)
      await fetchCart(config, formattedAddress);
    } catch (error) {
      console.error('Error updating address:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update address';
      setError(errorMessage);
      throw error; // Re-throw to allow calling code to handle the error
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Updates the selected zipcode (for guest users or manual entry)
   * Fetches zipcode configuration and recalculates cart
   * Creates a derived address object from zipcode for display purposes
   */
  const updateZipcode = async (zipcode: string, preserveAddressId?: boolean) => {
    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors

      // Invalidate old zipcode cache before fetching new one to ensure fresh data
      if (selectedZipcode && selectedZipcode !== zipcode) {
        invalidateZipcodeCache(selectedZipcode);
      }

      setSelectedZipcode(zipcode);

      // Clear selected address ID only if we're not preserving it
      // (i.e., for guest users or manual zipcode entry without address selection)
      if (!preserveAddressId) {
        setSelectedAddressId(undefined);
        localStorage.removeItem('selectedAddressId');
      }

      // Create a derived address object from zipcode for display
      // This ensures cart.selectedAddress is populated for guest users
      const derivedAddress: Cart['selectedAddress'] = {
        _id: `zipcode-${zipcode}`,
        addressLine1: 'Delivery Area',
        addressLine2: undefined,
        city: 'Zipcode Delivery',
        state: '',
        zipCode: zipcode,
        landmark: undefined,
        isDefault: false,
      };

      setSelectedAddressObject(derivedAddress);

      // Store in localStorage
      localStorage.setItem('selectedZipcode', zipcode);
      localStorage.setItem('selectedAddressObject', JSON.stringify(derivedAddress));

      // Update state
      setSelectedAddressObject(derivedAddress);

      // Update refs immediately to avoid stale data in fetchCart
      selectedAddressObjectRef.current = derivedAddress;

      // Fetch zipcode configuration
      const config = await fetchZipcodeConfig(zipcode);
      setZipcodeConfig(config);
      zipcodeConfigRef.current = config;

      // Refresh cart with new config and address (pass both directly to avoid timing issues)
      await fetchCart(config, derivedAddress);
    } catch (error) {
      console.error('Error updating zipcode:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update zipcode';
      setError(errorMessage);
      throw error; // Re-throw to allow calling code to handle the error
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clears the current error
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Refreshes the cart (alias for fetchCart)
   */
  const refreshCart = () => fetchCart();

  // Load selected address/zipcode from localStorage on mount
  // This effect runs once and prepares all location data before cart is fetched
  useEffect(() => {
    const loadLocationDataAndCart = async () => {
      const storedAddressId = localStorage.getItem('selectedAddressId');
      const storedZipcode = localStorage.getItem('selectedZipcode');
      const storedAddressObject = localStorage.getItem('selectedAddressObject');

      let loadedZipcodeConfig: ZipcodeConfig | null = null;
      let loadedAddressObject: Cart['selectedAddress'] | undefined = undefined;

      // Set address ID
      if (storedAddressId) {
        setSelectedAddressId(storedAddressId);
      }

      // Set zipcode
      if (storedZipcode) {
        setSelectedZipcode(storedZipcode);
      }

      // Parse and set address object
      if (storedAddressObject) {
        try {
          const parsedAddress = JSON.parse(storedAddressObject);
          loadedAddressObject = parsedAddress;
          setSelectedAddressObject(parsedAddress);
          // Update ref immediately to avoid stale data
          selectedAddressObjectRef.current = parsedAddress;
        } catch (error) {
          console.error('Error parsing stored address:', error);
          localStorage.removeItem('selectedAddressObject');
        }
      }

      // Fetch zipcode config if zipcode exists (for both authenticated and guest users)
      if (storedZipcode) {
        try {
          const config = await fetchZipcodeConfig(storedZipcode);
          loadedZipcodeConfig = config;
          setZipcodeConfig(config);
          // Update ref immediately to avoid stale data
          zipcodeConfigRef.current = config;
        } catch (error) {
          console.error('Error fetching zipcode config on mount:', error);
        }
      }

      // Now fetch cart with all location data loaded
      // Pass both the loaded config AND address to ensure cart has correct data
      await fetchCart(loadedZipcodeConfig, loadedAddressObject);
    };

    void loadLocationDataAndCart().catch((error) => {
      console.error('Error loading cart on mount:', error);
      setIsLoading(false);
    });
  }, []); // Run once on mount - empty deps since we're using direct function calls

  return (
    <CartContext.Provider
      value={{
        cart,
        summary,
        isLoading,
        error,
        itemCount,
        selectedAddressId,
        setSelectedAddressId,
        selectedZipcode,
        zipcodeConfig,
        minOrderValue: zipcodeConfig?.minCartValue,
        fetchCart,
        addToCart,
        updateCartItem,
        removeCartItem,
        updateAddress,
        updateZipcode,
        clearError,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
