import { NextRequest } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { ObjectId as MongoObjectId, Document } from 'mongodb';

// Database interfaces for type safety

interface ComboSection {
  selectedItems?: Array<{
    item: { toString(): string };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Helper function to populate combo section item references
 * Converts item IDs to full item objects with name, description, etc.
 */
async function populateComboSections(sections: ComboSection[]): Promise<Array<Record<string, unknown>>> {
  if (!sections || sections.length === 0) {
    return [];
  }

  return Promise.all(
    sections.map(async (section) => {
      if (!section.selectedItems || section.selectedItems.length === 0) {
        return {
          ...section,
          selectedItems: [],
        };
      }

      const populatedItems = await Promise.all(
        section.selectedItems!.map(async (selectedItem: { item: { toString(): string }; [key: string]: unknown }) => {
          try {
            const itemId = selectedItem.item.toString();

            const itemResult = await db.readOne('fooditems', {
              _id: new MongoObjectId(itemId),
              isDraft: { $ne: true },
            });

            if (!itemResult.success || !itemResult.data) {
              return {
                ...selectedItem,
                item: {
                  _id: itemId,
                  name: 'Unknown Item',
                  description: '',
                  price: 0,
                  veg: false,
                  url: '',
                },
              };
            }

            const itemData = itemResult.data;

            return {
              ...selectedItem,
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
            console.error('Error populating combo item:', error);
            return {
              ...selectedItem,
              item: {
                _id: selectedItem.item.toString(),
                name: 'Error Loading Item',
                description: '',
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
        selectedItems: populatedItems,
      };
    })
  );
}

/**
 * GET /api/cart
 * Fetch user's cart with all items
 * Authentication required
 */
export async function GET(req: NextRequest) {
  try {
    // Extract and verify JWT token
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json(
        {
          message: 'Unauthorized - No token provided',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const verifyResult = jwtHandler.verifyToken(token);

    if (!verifyResult.success || !verifyResult.payload) {
      return Response.json(
        {
          message: 'Unauthorized - Invalid token',
          error: verifyResult.error,
        },
        { status: 401 }
      );
    }

    const userId = verifyResult.payload.userId;

    // Fetch user's cart
    const cartResult = await db.readOne('carts', {
      user: new MongoObjectId(userId),
    });

    if (!cartResult.success || !cartResult.data) {
      // Return empty cart if not found
      return Response.json(
        {
          data: {
            _id: null,
            user: userId,
            days: [],
            selectedAddress: null,
            appliedCoupon: null,
          },
          message: 'Cart is empty',
        },
        { status: 200 }
      );
    }

    const cart = cartResult.data;

    // Fetch cart days
    const cartDaysResult = await db.read('cartdays', {
      cart: new MongoObjectId(cart._id),
    }, {
      sort: { date: 1 },
    });

    if (!cartDaysResult.success) {
      return Response.json(
        {
          message: 'Failed to fetch cart days',
          error: cartDaysResult.error,
        },
        { status: 500 }
      );
    }

    const cartDays = cartDaysResult.data || [];

    // Fetch cart items for each day
    const daysWithItems = await Promise.all(
      cartDays.map(async (cartDay: Document) => {
        const cartItemsResult = await db.read('cartitems', {
          day: new MongoObjectId(cartDay._id),
        });

        const cartItems = cartItemsResult.success ? cartItemsResult.data || [] : [];

        // Populate food item details for each cart item
        const itemsWithFoodDetails = await Promise.all(
          cartItems.map(async (item: Document) => {
            const foodResult = await db.readOne('fooditems', {
              _id: new MongoObjectId(item.food),
              isDraft: { $ne: true },
            });

            const food = foodResult.success ? foodResult.data : null;

            // Populate combo sections if this is a combo item
            let populatedSections: ComboSection[] = [];
            if (food && food.hasCombo && food.sections && food.sections.length > 0) {
              populatedSections = await populateComboSections(food.sections);
            }

            return {
              _id: item._id.toString(),
              foodItem: food ? {
                _id: food._id.toString(),
                name: food.name,
                description: food.description || '',
                price: food.price,
                url: food.url || food.imageUrl || '',
                veg: food.veg,
                available: food.available,
                hasCombo: food.hasCombo || false,
                sections: populatedSections.length > 0 ? populatedSections : (food.sections || []),
              } : null,
              quantity: item.quantity,
              day: cartDay._id.toString(),
              cart: cart._id.toString(),
              user: userId,
              selectedPortion: item.selectedPortion,
              selectedPortionPrice: item.selectedPortionPrice,
              selectedSpiceLevel: item.selectedSpiceLevel,
              isEcoFriendlyContainer: item.useEcoContainer,
              ecoContainerCharge: item.ecoContainerCharge,
              comboSelections: item.selectedComboItems || item.comboSelections || {},
              totalPrice: item.totalPrice,
            };
          })
        );

        return {
          _id: cartDay._id.toString(),
          cart: cart._id.toString(),
          day: cartDay.day,
          date: cartDay.date,
          cart_value: cartDay.cart_value || 0,
          items: itemsWithFoodDetails.filter(item => item.foodItem !== null),
        };
      })
    );

    // Fetch selected address if exists
    let selectedAddress = null;
    if (cart.selectedAddress) {
      const addressResult = await db.readOne('addresses', {
        _id: new MongoObjectId(cart.selectedAddress),
      });
      selectedAddress = addressResult.success ? addressResult.data : null;
    }

    // Fetch applied coupon if exists
    let appliedCoupon = null;
    if (cart.appliedCoupon) {
      const couponResult = await db.readOne('coupons', {
        _id: new MongoObjectId(cart.appliedCoupon),
      });

      if (couponResult.success && couponResult.data) {
        appliedCoupon = {
          coupon: {
            _id: couponResult.data._id.toString(),
            code: couponResult.data.code,
            discountType: couponResult.data.discountType,
            discountValue: couponResult.data.discountValue,
          },
          discountAmount: cart.discountAmount || 0,
        };
      }
    }

    return Response.json(
      {
        data: {
          _id: cart._id.toString(),
          user: userId,
          days: daysWithItems.filter(day => day.items.length > 0),
          selectedAddress,
          appliedCoupon,
        },
        message: 'Cart fetched successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching cart:', error);
    return Response.json(
      {
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
