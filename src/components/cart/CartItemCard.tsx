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
import { IconTrash, IconPlus, IconMinus, IconLeaf } from '@tabler/icons-react';
import VegIndicator from '@/components/common/VegIndicator';
import { CartItem } from '@/types/cart';
import { useCart } from '@/contexts/CartContext';
import { formatSpiceLevel } from '@/utils/formatters';

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
    if (item.quantity <= 1) return;

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
        mb: 2,
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #f0f0f0',
        transition: 'box-shadow 0.2s',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        },
      }}
    >
      <CardContent sx={{ p: isMobile ? 2 : 2.5, '&:last-child': { pb: isMobile ? 2 : 2.5 } }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Food Image */}
          <Box
            sx={{
              width: isMobile ? 80 : 100,
              height: isMobile ? 80 : 100,
              flexShrink: 0,
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: '#f5f5f5',
              position: 'relative',
            }}
          >
            <Image
              src={item.foodItem.url || '/placeholder-food.png'}
              alt={item.foodItem.name}
              width={isMobile ? 80 : 100}
              height={isMobile ? 80 : 100}
              style={{
                objectFit: 'cover',
              }}
            />
            {/* Veg Indicator */}
            <Box sx={{ position: 'absolute', top: 6, left: 6 }}>
              <VegIndicator isVeg={item.foodItem.veg} size={16} />
            </Box>
          </Box>

          {/* Item Details */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Name and Delete Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  fontSize: isMobile ? '0.95rem' : '1rem',
                  color: theme.palette.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {item.foodItem.name}
              </Typography>
              <IconButton
                onClick={handleRemove}
                disabled={loadingAction === 'remove'}
                size="small"
                sx={{
                  color: theme.palette.error.main,
                  flexShrink: 0,
                  '&:hover': {
                    backgroundColor: 'rgba(244, 67, 54, 0.08)',
                  },
                }}
              >
                {loadingAction === 'remove' ? (
                  <CircularProgress size={20} color="error" />
                ) : (
                  <IconTrash size={20} />
                )}
              </IconButton>
            </Box>

            {/* Description */}
            {item.foodItem.description && (
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: '0.85rem',
                  mb: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {item.foodItem.description}
              </Typography>
            )}

            {/* Customizations */}
            {(item.selectedPortion ||
              item.selectedSpiceLevel ||
              item.isEcoFriendlyContainer ||
              (item.selectedCustomizations && item.selectedCustomizations.length > 0)) && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                {/* Portion */}
                {item.selectedPortion && (
                  <Chip
                    label={`${item.selectedPortion}${portionPrice > 0 ? ` (+$${(portionPrice || 0).toFixed(2)})` : ''}`}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.75rem',
                      backgroundColor: '#FFF4E4',
                      color: theme.palette.text.primary,
                      border: '1px solid #FFE4B5',
                    }}
                  />
                )}

                {/* Spice Level */}
                {item.foodItem.hasSpiceLevel && item.selectedSpiceLevel && (
                  <Chip
                    label={`Spice: ${formatSpiceLevel(item.selectedSpiceLevel)}`}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.75rem',
                      backgroundColor: '#FFE4E4',
                      color: theme.palette.text.primary,
                      border: '1px solid #FFCCCB',
                    }}
                  />
                )}

                {/* Eco-Friendly Container */}
                {item.isEcoFriendlyContainer && (
                  <Chip
                    icon={<IconLeaf size={14} />}
                    label={`Eco-Friendly${ecoCharge > 0 ? ` (+$${(ecoCharge || 0).toFixed(2)})` : ''}`}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.75rem',
                      backgroundColor: '#E8F5E9',
                      color: '#2e7d32',
                      border: '1px solid #C8E6C9',
                      '& .MuiChip-icon': {
                        color: '#2e7d32',
                      },
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
                      height: 24,
                      fontSize: '0.75rem',
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
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontWeight: 600,
                    display: 'block',
                    mb: 0.5,
                  }}
                >
                  Combo Selections:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {Object.entries(item.comboSelections).map(([sectionId, itemIds]) => {
                    const section = item.foodItem.sections?.find((s) => s._id === sectionId);
                    if (!section) return null;

                    // Handle both string (single) and array (multi) selections
                    const selectedIds = Array.isArray(itemIds) ? itemIds : [itemIds];

                    return selectedIds.map((itemId) => {
                      const selectedItem = section.selectedItems.find((si) => si._id === itemId);
                      if (!selectedItem) return null;

                      const itemPrice = selectedItem.price && selectedItem.price > 0 ? ` (+$${selectedItem.price.toFixed(2)})` : '';
                      const portionText = selectedItem.portion ? ` (${selectedItem.portion})` : '';

                      return (
                        <Typography
                          key={`${sectionId}-${itemId}`}
                          variant="caption"
                          sx={{
                            color: theme.palette.text.primary,
                            fontSize: '0.75rem',
                            pl: 1,
                          }}
                        >
                          • <strong>{section.title}:</strong> {selectedItem.item.name}{portionText}{itemPrice}
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
                  backgroundColor: '#FFF4E4',
                  border: '1px solid #E0CAB6',
                  borderRadius: 1,
                  px: 0.5,
                  height: 36,
                }}
              >
                <IconButton
                  onClick={handleDecrement}
                  disabled={loadingAction !== null || item.quantity <= 1}
                  size="small"
                  sx={{
                    color: theme.palette.primary.main,
                    p: 0.5,
                    '&:hover': {
                      backgroundColor: 'rgba(248, 156, 53, 0.1)',
                    },
                    '&:disabled': {
                      color: theme.palette.grey[400],
                    },
                  }}
                >
                  {loadingAction === 'decrement' ? (
                    <CircularProgress size={18} sx={{ color: theme.palette.primary.main }} />
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
                  disabled={loadingAction !== null}
                  size="small"
                  sx={{
                    color: theme.palette.primary.main,
                    p: 0.5,
                    '&:hover': {
                      backgroundColor: 'rgba(248, 156, 53, 0.1)',
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
                Note: {item.notes}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
