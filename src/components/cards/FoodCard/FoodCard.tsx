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

  const badgeCount = inCartCount ?? quantity;

  return (
    <Card
      sx={{
        width: '100%',
        maxWidth: isMobile ? 190 : 230,
        borderRadius: '18px',
        backgroundColor: '#FFFEFB',
        border: '1px solid rgba(60, 35, 10, 0.08)',
        boxShadow: '0 1px 2px rgba(60, 35, 10, 0.05), 0 14px 28px -14px rgba(60, 35, 10, 0.2)',
        cursor: onClick && available ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease',
        opacity: available ? 1 : 0.75,
        '& .food-photo img': { transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)' },
        '&:hover': onClick && available
          ? {
            transform: 'translateY(-3px)',
            boxShadow: '0 2px 4px rgba(60, 35, 10, 0.06), 0 22px 36px -16px rgba(60, 35, 10, 0.3)',
            '& .food-photo img': { transform: 'scale(1.05)' },
          }
          : {},
        '&:active': onClick && available ? { transform: 'scale(0.985)' } : {},
      }}
      onClick={available ? onClick : undefined}
    >
      {/* Photo */}
      <Box
        className="food-photo"
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #F4EBDD 0%, #EADFCB 100%)',
        }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 600px) 50vw, 230px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <Typography
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(60, 35, 10, 0.35)',
              fontSize: '0.75rem',
            }}
          >
            No Image
          </Typography>
        )}

        {/* soft fade so the chips stay readable on any photo */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'linear-gradient(180deg, rgba(20, 10, 0, 0.16) 0%, rgba(20, 10, 0, 0) 32%)',
          }}
        />

        {/* Item type chip (combo / sizes) */}
        {itemType && itemType !== 'simple' && (
          <Tooltip
            title={itemType === 'combo' ? 'Combo Item' : 'Portions Available'}
            arrow
            placement="top"
          >
            <Box
              sx={{
                position: 'absolute',
                top: 10,
                left: 10,
                px: 1,
                py: 0.25,
                borderRadius: 999,
                backgroundColor: 'rgba(255, 252, 245, 0.82)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                color: '#3A2A14',
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                lineHeight: 1.5,
                zIndex: 2,
                userSelect: 'none',
              }}
            >
              {itemType === 'combo' ? 'Combo' : 'Sizes'}
            </Box>
          </Tooltip>
        )}

        {/* Cart indicator - shown when the item is in the cart */}
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
                backgroundColor: '#1F1712',
                borderRadius: 999,
                minWidth: 32,
                height: 32,
                px: 1,
                gap: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(20, 10, 0, 0.35)',
                transition: 'transform 0.2s ease, background-color 0.2s ease',
                '&:hover': { backgroundColor: theme.palette.primary.dark, transform: 'scale(1.08)' },
              }}
            >
              <IconShoppingCart size={16} color="#F6D58E" />
              <Typography
                component="span"
                aria-label={`${badgeCount} in cart`}
                sx={{ color: '#F6D58E', fontWeight: 700, fontSize: '0.8125rem', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
              >
                {badgeCount}
              </Typography>
            </Box>
          </Tooltip>
        )}

        {/* Veg / Non-veg mark */}
        {veg !== undefined && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              width: 18,
              height: 18,
              borderRadius: '4px',
              backgroundColor: '#FFFEFB',
              border: `1.5px solid ${veg ? '#2E8B4F' : '#C0392B'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(20, 10, 0, 0.2)',
              zIndex: 2,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: veg ? '#2E8B4F' : '#C0392B',
              }}
            />
          </Box>
        )}

        {/* Out of Stock Overlay */}
        {!available && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(31, 23, 18, 0.62)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3,
            }}
          >
            <Typography
              sx={{
                color: '#ffffff',
                fontSize: isMobile ? '0.6875rem' : '0.75rem',
                fontWeight: 600,
                textAlign: 'center',
                lineHeight: 1.3,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
              }}
            >
              OUT OF
              <br />
              STOCK
            </Typography>
          </Box>
        )}
      </Box>

      <CardContent
        sx={{
          pt: 1.5,
          pb: 1.5,
          px: isMobile ? 1.25 : 1.75,
          textAlign: 'left',
          '&:last-child': { pb: 1.5 },
        }}
      >
        {/* Food Name */}
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            fontSize: isMobile ? '0.8125rem' : '0.9rem',
            lineHeight: 1.3,
            letterSpacing: '-0.005em',
            mb: 0.75,
            color: '#1F1712',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: isMobile ? 34 : 38,
            textWrap: 'balance',
          }}
        >
          {name}
        </Typography>

        {/* Price + stepper */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontWeight: 600,
              fontSize: isMobile ? '1rem' : '1.125rem',
              color: theme.palette.primary.dark,
              fontVariantNumeric: 'lining-nums tabular-nums',
              lineHeight: 1,
            }}
          >
            {price != null ? `$${price.toFixed(2)}` : 'Price not available'}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              flex: '1 1 auto',
              // Add button and stepper restyled for this card only
              '& .MuiButton-root': {
                minWidth: isMobile ? 58 : 66,
                height: 30,
                borderRadius: 999,
                backgroundColor: '#1F1712',
                color: '#F6D58E',
                fontWeight: 600,
                fontSize: '0.8125rem',
                letterSpacing: '0.02em',
                px: 1.75,
                transition: 'background-color 0.2s ease, transform 0.15s ease',
                '&:hover': { backgroundColor: '#3A2A14' },
                '&:active': { transform: 'scale(0.96)' },
                '&:disabled': { backgroundColor: '#E6DED1', color: '#9A8F80' },
              },
              '& .MuiBox-root': {
                height: 30,
                borderRadius: 999,
                backgroundColor: '#F7F0E3',
                borderColor: '#E4D6BC',
              },
              '& .MuiIconButton-root': { color: '#1F1712' },
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
              size="small"
              disabled={!available}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
