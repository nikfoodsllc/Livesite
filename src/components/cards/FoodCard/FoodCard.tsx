'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, Box, Typography, useTheme, useMediaQuery, Tooltip, CircularProgress } from '@mui/material';
import { IconShoppingCart, IconPlus, IconMinus, IconTrash } from '@tabler/icons-react';
import { useHeader } from '@/contexts/HeaderContext';
import AllergenRow from '@/components/common/AllergenRow';
import { flyToCart } from '@/lib/flyToCart';

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
  /** allergens the dish contains: a row of badges under the name */
  allergens?: string[];
  available?: boolean;
  /** nothing more of this item can go in the cart (its order limit is reached): the + button is off */
  atStockLimit?: boolean;
}

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/** true once the element has scrolled into view (and stays true); true at once for people who prefer reduced motion or browsers without IntersectionObserver */
function useRevealed<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px 80px 0px', threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
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
  allergens,
  available = true,
  atStockLimit = false,
}: FoodCardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { openCartPreview } = useHeader();

  const badgeCount = inCartCount ?? quantity;
  const [revealRef, revealed] = useRevealed<HTMLDivElement>();
  // simple items get a stepper on the photo once added; items with options keep a + (it opens their choices) and a cart badge
  const showStepper = !alwaysShowAdd && quantity > 0;
  const glass = {
    background: 'rgba(255, 252, 245, 0.92)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.7), 0 8px 18px -6px rgba(20, 10, 0, 0.45)',
    color: '#1F1712',
  } as const;
  const roundBtn = {
    width: 36,
    height: 36,
    border: 0,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    background: 'transparent',
    color: '#1F1712',
    padding: 0,
    transition: `transform 300ms ${EASE}, background 300ms ${EASE}`,
    '&:hover:not(:disabled)': { background: 'rgba(184,137,59,0.16)' },
    '&:active:not(:disabled)': { transform: 'scale(0.9)' },
    '&:disabled': { opacity: 0.35, cursor: 'default' },
    '&:focus-visible': { outline: '2px solid #C9A24B', outlineOffset: 1 },
  } as const;

  return (
    <Card
      ref={revealRef}
      sx={{
        width: '100%',
        maxWidth: isMobile ? 190 : 230,
        borderRadius: '22px',
        backgroundColor: '#FFFEFB',
        border: '1px solid rgba(60, 35, 10, 0.08)',
        boxShadow: '0 1px 2px rgba(60, 35, 10, 0.05), 0 14px 28px -14px rgba(60, 35, 10, 0.2)',
        cursor: onClick && available ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease',
        opacity: revealed ? (available ? 1 : 0.75) : 0,
        // rises into place the first time it scrolls into view; cards in one row follow each other (the grid sets --d)
        // (fill 'backwards' only, so once it has risen the hover lift is free to move the card again)
        animation: revealed ? `cardRise 850ms ${EASE} var(--d, 0ms) backwards` : 'none',
        '@keyframes cardRise': { from: { opacity: 0, transform: 'translateY(26px) scale(0.97)' }, to: { opacity: 1, transform: 'translateY(0) scale(1)' } },
        '@keyframes photoSettle': { from: { transform: 'scale(1.14)' }, to: { transform: 'scale(1)' } },
        '& .food-photo img': {
          transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
          animation: revealed ? `photoSettle 1300ms ${EASE} var(--d, 0ms) backwards` : 'none',
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: available ? 1 : 0.75, '& .food-photo img': { animation: 'none' } },
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
          aspectRatio: '1 / 1.04',
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

        {/* One badge group, top left: veg mark, then the item type */}
        {(veg !== undefined || (itemType && itemType !== 'simple')) && (
          <Box sx={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 0.75, zIndex: 2 }}>
            {veg !== undefined && (
              <Box
                role="img"
                aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '7px',
                  backgroundColor: 'rgba(255, 252, 245, 0.92)',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 4px 10px rgba(20, 10, 0, 0.22)',
                }}
              >
                <Box sx={{ width: 14, height: 14, borderRadius: '4px', border: `1.5px solid ${veg ? '#2E8B4F' : '#C0392B'}`, display: 'grid', placeItems: 'center' }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: veg ? '#2E8B4F' : '#C0392B' }} />
                </Box>
              </Box>
            )}
            {itemType && itemType !== 'simple' && (
              <Box
                sx={{
                  height: 22,
                  px: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 999,
                  backgroundColor: 'rgba(255, 252, 245, 0.92)',
                  boxShadow: '0 4px 10px rgba(20, 10, 0, 0.22)',
                  color: '#3A2A14',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  userSelect: 'none',
                }}
              >
                {itemType === 'combo' ? 'Combo' : 'Sizes'}
              </Box>
            )}
          </Box>
        )}

        {/* Cart indicator - shown when the item is in the cart */}
        {badgeCount > 0 && !showStepper && (
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

        {/* The add control floats on the photo: a round + , or a − n + pill once added */}
        {available && (
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{ position: 'absolute', right: 10, bottom: 10, zIndex: 2 }}
          >
            {showStepper ? (
              <Box
                sx={{
                  ...glass,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 999,
                  p: '2px',
                  animation: `cardPop 420ms ${EASE}`,
                  '@keyframes cardPop': { from: { transform: 'scale(0.86)', opacity: 0.4 }, to: { transform: 'scale(1)', opacity: 1 } },
                }}
              >
                <Box component="button" type="button" aria-label={quantity <= 1 ? `Remove ${name}` : `Remove one ${name}`} onClick={onDecrement} disabled={isLoading?.decrement} sx={roundBtn}>
                  {isLoading?.decrement ? <CircularProgress size={16} sx={{ color: '#1F1712' }} /> : quantity <= 1 ? <IconTrash size={17} stroke={1.8} /> : <IconMinus size={18} stroke={2} />}
                </Box>
                <Typography
                  aria-live="polite"
                  sx={{ minWidth: 22, textAlign: 'center', fontWeight: 700, fontSize: '0.9375rem', fontVariantNumeric: 'tabular-nums' }}
                >
                  {quantity}
                </Typography>
                <Box component="button" type="button" aria-label={`Add one more ${name}`} onClick={(e) => {
                  flyToCart(e.currentTarget, imageUrl);
                  onIncrement?.();
                }} disabled={isLoading?.increment || atStockLimit} sx={roundBtn}>
                  {isLoading?.increment ? <CircularProgress size={16} sx={{ color: '#1F1712' }} /> : <IconPlus size={18} stroke={2} />}
                </Box>
              </Box>
            ) : (
              <Box
                component="button"
                type="button"
                aria-label={`Add ${name}`}
                onClick={(e) => {
                  if (!alwaysShowAdd) flyToCart(e.currentTarget, imageUrl);
                  onAdd?.();
                }}
                disabled={isLoading?.add}
                sx={{
                  ...roundBtn,
                  ...glass,
                  width: 40,
                  height: 40,
                  '&:hover:not(:disabled)': { background: '#fff', transform: 'scale(1.08)' },
                }}
              >
                {isLoading?.add ? <CircularProgress size={18} sx={{ color: '#1F1712' }} /> : <IconPlus size={22} stroke={2} />}
              </Box>
            )}
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

        {/* Allergens (only when the dish has some) */}
        {allergens && allergens.length > 0 && (
          <Box sx={{ mb: 0.75 }}>
            <AllergenRow allergens={allergens} size={isMobile ? 16 : 17} gap={0.5} />
          </Box>
        )}

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
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontWeight: 700,
              fontSize: isMobile ? '0.9375rem' : '1.0625rem',
              color: theme.palette.primary.dark,
              fontVariantNumeric: 'lining-nums tabular-nums',
              lineHeight: 1,
            }}
          >
            {price != null ? `$${price.toFixed(2)}` : 'Price not available'}
          </Typography>

        </Box>
      </CardContent>
    </Card>
  );
}
