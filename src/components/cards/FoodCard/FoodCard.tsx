'use client';

import Image from 'next/image';
import { Card, CardContent, Box, Typography, useTheme, useMediaQuery, Tooltip } from '@mui/material';
import { IconShoppingCart } from '@tabler/icons-react';
import QuantitySelector from '../../forms/QuantitySelector';
import { useHeader } from '@/contexts/HeaderContext';

interface FoodCardProps {
  imageUrl: string;
  name: string;
  price?: number | null;
  /** Quantity for the +/- stepper (simple items). Ignored when alwaysShowAdd is true. */
  quantity?: number;
  /** Total units in cart for this item (all variants). Drives the cart badge when > 0. */
  inCartCount?: number;
  /** When true, always show an Add button so users can add another variant (combo/spice/portions). */
  alwaysShowAdd?: boolean;
  onAdd?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onClick?: () => void;
  isLoading?: {
    add?: boolean;
    increment?: boolean;
    decrement?: boolean;
  };
  itemType?: 'simple' | 'portions' | 'combo';
  veg?: boolean;
  available?: boolean;
}

export default function FoodCard({
  imageUrl,
  name,
  price,
  quantity = 0,
  inCartCount,
  alwaysShowAdd = false,
  onAdd,
  onIncrement,
  onDecrement,
  onClick,
  isLoading,
  itemType,
  veg,
  available = true,
}: FoodCardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { openCartPreview } = useHeader();

  const cardWidth = isMobile ? 160 : 180;
  const imageSize = isMobile ? 80 : 100;
  const badgeCount = inCartCount ?? quantity;

  return (
    <Card
      sx={{
        width: cardWidth,
        borderRadius: 3,
        boxShadow: '10px 10px 20px rgba(0, 0, 0, 0.1)',
        cursor: onClick && available ? 'pointer' : 'default',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        opacity: available ? 1 : 0.7,
        '&:hover': onClick && available
          ? {
            transform: 'translateY(-4px)',
            boxShadow: '10px 14px 24px rgba(0, 0, 0, 0.15)',
          }
          : {},
      }}
      onClick={available ? onClick : undefined}
    >
      {/* Shopping Cart Indicator - Show if item is in cart */}
      {badgeCount > 0 && (
        <Tooltip title="View in cart" arrow placement="top">
          <Box
            onClick={(e) => {
              e.stopPropagation();
              openCartPreview();
            }}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: theme.palette.primary.main,
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
                transform: 'scale(1.1)',
              },
            }}
          >
            <IconShoppingCart size={18} color="#ffffff" />
          </Box>
        </Tooltip>
      )}

      {/* Item Type Indicator - Show for combo and portion items */}
      {itemType && itemType !== 'simple' && (
        <Tooltip
          title={itemType === 'combo' ? 'Combo Item' : 'Portions Available'}
          arrow
          placement="top"
        >
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.08)',
              borderRadius: '50%',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'rgba(0, 0, 0, 0.5)',
                userSelect: 'none',
              }}
            >
              {itemType === 'combo' ? 'C' : 'P'}
            </Typography>
          </Box>
        </Tooltip>
      )}

      <CardContent
        sx={{
          pt: 1.5,
          pb: 1.5,
          px: 2,
          textAlign: 'center',
          '&:last-child': { pb: 1.5 },
        }}
      >
        {/* Circular Image */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 1.5,
            position: 'relative',
          }}
        >
          <Box
            sx={{
              width: imageSize,
              height: imageSize,
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              backgroundColor: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={name}
                width={imageSize}
                height={imageSize}
                style={{
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.disabled,
                  fontSize: '0.75rem',
                }}
              >
                No Image
              </Typography>
            )}
          </Box>

          {/* Veg/Non-Veg Indicator */}
          {veg !== undefined && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                right: `calc(50% - ${imageSize / 2}px - 4px)`,
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: veg ? '#4caf50' : '#f44336',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              }}
            />
          )}

          {/* Out of Stock Overlay */}
          {!available && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <Typography
                sx={{
                  color: '#ffffff',
                  fontSize: isMobile ? '0.625rem' : '0.75rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                OUT OF
                <br />
                STOCK
              </Typography>
            </Box>
          )}
        </Box>

        {/* Food Name */}
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            fontSize: isMobile ? '0.813rem' : '0.875rem',
            mb: 0.75,
            color: theme.palette.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: isMobile ? 36 : 40,
          }}
        >
          {name}
        </Typography>

        {/* Price */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            fontSize: isMobile ? '0.875rem' : '1rem',
            color: theme.palette.primary.main,
            mb: 1,
          }}
        >
          {price != null ? `$${price.toFixed(2)}` : 'Price not available'}
        </Typography>

        {/* Quantity Selector */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
          }}
          onClick={(e) => e.stopPropagation()} // Prevent card click when interacting with buttons
        >
          <QuantitySelector
            quantity={alwaysShowAdd ? 0 : quantity}
            alwaysShowAdd={alwaysShowAdd}
            onAdd={onAdd}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
            isLoading={isLoading}
            size={isMobile ? 'small' : 'medium'}
            disabled={!available}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
