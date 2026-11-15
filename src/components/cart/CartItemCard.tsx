'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Image from 'next/image';
import { IconTrash, IconPlus, IconMinus, IconX } from '@tabler/icons-react';
import VegIndicator from '@/components/common/VegIndicator';
import { CartItem } from '@/types/cart';
import { useCart } from '@/contexts/CartContext';
import { stockLeftFor } from '@/lib/localStorageCart';
import type { FoodItem } from '@/types/food';
import { formatSpiceLevel } from '@/utils/formatters';
import { comboQuantityText } from '@/lib/comboQuantity';
import { comboSpiceText } from '@/lib/comboSpiceText';

interface CartItemCardProps {
  item: CartItem;
}

export default function CartItemCard({ item }: CartItemCardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { updateCartItem, removeCartItem } = useCart();

  const [loadingAction, setLoadingAction] = useState<'increment' | 'decrement' | 'remove' | null>(
    null
  );

  const handleIncrement = async () => {
    try {
      setLoadingAction('increment');
      await updateCartItem({
        cartItemId: item._id,
        quantity: item.quantity + 1,
      });
    } catch (error) {
      console.error('Error incrementing quantity:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDecrement = async () => {
    // on the last unit the minus removes the item (it shows a trash icon then)
    if (item.quantity <= 1) {
      await handleRemove();
      return;
    }

    try {
      setLoadingAction('decrement');
      await updateCartItem({
        cartItemId: item._id,
        quantity: item.quantity - 1,
      });
    } catch (error) {
      console.error('Error decrementing quantity:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemove = async () => {
    try {
      setLoadingAction('remove');
      await removeCartItem(item._id);
    } catch (error) {
      console.error('Error removing item:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  // Use stored prices directly (already calculated correctly when item was added)
  const unitPrice = item.price; // Unit price with all customizations included
  const totalPrice = item.totalPrice; // Total price (unitPrice × quantity)

  // For display purposes only - showing customization charges
  const portionPrice = item.selectedPortionPrice || 0;
  const ecoCharge = item.isEcoFriendlyContainer ? (item.ecoContainerCharge || 0) : 0;

  return (
    <Card
      sx={{
        mb: 1.5,
        borderRadius: '20px',
        backgroundColor: '#FFFEFB',
        boxShadow: '0 1px 2px rgba(60, 35, 10, 0.05), 0 12px 24px -16px rgba(60, 35, 10, 0.22)',
        border: '1px solid rgba(60, 35, 10, 0.07)',
      }}
    >
      <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
        <Box sx={{ display: 'flex', gap: isMobile ? 1.5 : 2 }}>
          {/* Food Image */}
          <Box
            sx={{
              width: isMobile ? 76 : 92,
              height: isMobile ? 76 : 92,
              flexShrink: 0,
              borderRadius: '14px',
              overflow: 'hidden',
              backgroundColor: '#f5f5f5',
              position: 'relative',
            }}
          >
            <Image
              src={item.foodItem.url || '/placeholder-food.png'}
              alt={item.foodItem.name}
              width={isMobile ? 76 : 92}
              height={isMobile ? 76 : 92}
              style={{
                objectFit: 'cover',
                width: '100%',
                height: '100%',
              }}
            />
            {/* Veg Indicator */}
            <Box sx={{ position: 'absolute', top: 6, left: 6 }}>
              <VegIndicator isVeg={item.foodItem.veg} size={16} />
            </Box>
          </Box>

          {/* Item Details */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Name, and a one-tap remove for the whole line once there is more than one (at 1 the stepper's trash does it) */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  fontSize: isMobile ? '0.95rem' : '1rem',
                  lineHeight: 1.3,
                  color: '#1F1712',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {item.foodItem.name}
              </Typography>
              {item.quantity > 1 && (
                <IconButton
                  onClick={handleRemove}
                  disabled={loadingAction !== null}
                  aria-label={`Remove all ${item.foodItem.name}`}
                  size="small"
                  sx={{
                    flexShrink: 0,
                    mt: -0.5,
                    mr: -0.5,
                    width: 30,
                    height: 30,
                    color: '#8B8378',
                    transition: 'background-color 300ms ease, color 300ms ease, transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
                    '&:hover': { backgroundColor: '#F7F0E3', color: '#A12A14' },
                    '&:active': { transform: 'scale(0.9)' },
                  }}
                >
                  {loadingAction === 'remove' ? <CircularProgress size={16} sx={{ color: '#8B8378' }} /> : <IconX size={17} stroke={1.8} />}
                </IconButton>
              )}
            </Box>

            {/* Customizations */}
            {(item.selectedPortion ||
              item.selectedSpiceLevel ||
              item.isEcoFriendlyContainer ||
              (item.selectedCustomizations && item.selectedCustomizations.length > 0)) && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {/* Portion */}
                {item.selectedPortion && (
                  <Chip
                    label={`${item.selectedPortion}${portionPrice > 0 ? ` (+$${(portionPrice || 0).toFixed(2)})` : ''}`}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.7188rem',
                      fontWeight: 600,
                      backgroundColor: '#FBF1DA',
                      color: '#6B4A12',
                      border: '1px solid #EBD9B4',
                    }}
                  />
                )}

                {/* Spice Level */}
                {item.foodItem.hasSpiceLevel && item.selectedSpiceLevel && (
                  <Chip
                    label={`🌶️ ${formatSpiceLevel(item.selectedSpiceLevel)}`}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.7188rem',
                      fontWeight: 600,
                      backgroundColor: '#FDE7E2',
                      color: '#A12A14',
                      border: '1px solid #F8CFC6',
                    }}
                  />
                )}

                {/* Eco-Friendly Container */}
                {item.isEcoFriendlyContainer && (
                  <Chip
                    label={`♻️ Eco${ecoCharge > 0 ? ` (+$${(ecoCharge || 0).toFixed(2)})` : ''}`}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.7188rem',
                      fontWeight: 600,
                      backgroundColor: '#E2F4E7',
                      color: '#126B2C',
                      border: '1px solid #C8E6C9',
                    }}
                  />
                )}

                {/* Other Customizations */}
                {item.selectedCustomizations?.map((custom, index) => (
                  <Chip
                    key={index}
                    label={`${custom.optionName}${custom.price && custom.price > 0 ? ` (+$${custom.price.toFixed(2)})` : ''}`}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.7188rem',
                      backgroundColor: '#F3F4F6',
                      color: theme.palette.text.primary,
                      border: '1px solid #E5E7EB',
                    }}
                  />
                ))}
              </Box>
            )}

            {/* Combo Selections */}
            {item.comboSelections && Object.keys(item.comboSelections).length > 0 && item.foodItem.sections && (
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {Object.entries(item.comboSelections).map(([sectionId, itemIds]) => {
                    const section = item.foodItem.sections?.find((s) => s._id === sectionId);
                    if (!section) return null;

                    // Handle both string (single) and array (multi) selections
                    const selectedIds = Array.isArray(itemIds) ? itemIds : [itemIds];

                    return selectedIds.map((itemId) => {
                      const selectedItem = section.selectedItems.find((si) => si._id === itemId);
                      if (!selectedItem) return null;

                      const itemPrice = selectedItem.price && selectedItem.price > 0 ? ` (+$${selectedItem.price.toFixed(2)})` : '';
                      const portionText = (selectedItem.portion ? ` (${selectedItem.portion})` : '') + comboQuantityText(selectedItem.quantity);

                      return (
                        <Typography
                          key={`${sectionId}-${itemId}`}
                          variant="caption"
                          sx={{
                            color: '#1F1712',
                            fontSize: '0.75rem',
                            lineHeight: 1.4,
                          }}
                        >
                          <Box component="span" sx={{ color: '#8B8378' }}>{section.title}: </Box><strong>{selectedItem.item.name}{portionText}</strong>{comboSpiceText(item.comboSelections, section, selectedItem)}{itemPrice}
                        </Typography>
                      );
                    });
                  })}
                </Box>
              </Box>
            )}

            {/* Price and Quantity Controls */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {/* Price */}
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    fontSize: isMobile ? '1rem' : '1.1rem',
                    color: theme.palette.primary.main,
                  }}
                >
                  ${(totalPrice || 0).toFixed(2)}
                </Typography>
                {item.quantity > 1 && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontSize: '0.7rem',
                    }}
                  >
                    ${(unitPrice || 0).toFixed(2)} × {item.quantity}
                  </Typography>
                )}
              </Box>

              {/* Quantity Controls */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  backgroundColor: '#F7F0E3',
                  border: '1px solid #E4D6BC',
                  borderRadius: 999,
                  px: 0.5,
                  height: 38,
                }}
              >
                <IconButton
                  onClick={handleDecrement}
                  disabled={loadingAction !== null}
                  aria-label={item.quantity <= 1 ? `Remove ${item.foodItem.name}` : 'Remove one'}
                  size="small"
                  sx={{
                    color: theme.palette.primary.main,
                    p: 0.5,
                    '&:hover': {
                      backgroundColor: 'rgba(184, 137, 59, 0.1)',
                    },
                    '&:disabled': {
                      color: theme.palette.grey[400],
                    },
                  }}
                >
                  {loadingAction === 'decrement' || loadingAction === 'remove' ? (
                    <CircularProgress size={18} sx={{ color: theme.palette.primary.main }} />
                  ) : item.quantity <= 1 ? (
                    <IconTrash size={18} />
                  ) : (
                    <IconMinus size={18} />
                  )}
                </IconButton>

                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: '1rem',
                    minWidth: 28,
                    textAlign: 'center',
                    color: theme.palette.text.primary,
                  }}
                >
                  {item.quantity}
                </Typography>

                <IconButton
                  onClick={handleIncrement}
                  disabled={loadingAction !== null || stockLeftFor(item.foodItem as unknown as FoodItem, item.selectedPortion) === 0}
                  aria-label="Add one more"
                  size="small"
                  sx={{
                    color: theme.palette.primary.main,
                    p: 0.5,
                    '&:hover': {
                      backgroundColor: 'rgba(184, 137, 59, 0.1)',
                    },
                    '&:disabled': {
                      color: theme.palette.grey[400],
                    },
                  }}
                >
                  {loadingAction === 'increment' ? (
                    <CircularProgress size={18} sx={{ color: theme.palette.primary.main }} />
                  ) : (
                    <IconPlus size={18} />
                  )}
                </IconButton>
              </Box>
            </Box>

            {/* Notes */}
            {item.notes && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 1,
                  p: 1,
                  backgroundColor: '#F9FAFB',
                  borderRadius: 1,
                  color: theme.palette.text.secondary,
                  fontSize: '0.75rem',
                  fontStyle: 'italic',
                }}
              >
                Instructions: {item.notes}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
