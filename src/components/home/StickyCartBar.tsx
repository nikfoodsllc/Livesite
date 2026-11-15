'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { IconShoppingBag, IconArrowRight } from '@tabler/icons-react';
import { useCart } from '@/contexts/CartContext';
import { useHeader } from '@/contexts/HeaderContext';

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * A pill pinned, centred, to the bottom of the menu once something is in the cart: how many items, the subtotal, and one tap to the cart.
 * It rises in when the cart stops being empty and gives a small bump each time the count changes. On a phone it keeps room on both
 * sides so the chat bubble on the right stays clear.
 */
export default function StickyCartBar() {
  const { itemCount, summary } = useCart();
  const { openCartPreview } = useHeader();
  const count = itemCount || 0;
  const [bump, setBump] = useState(0);
  const prev = useRef(count);

  useEffect(() => {
    if (prev.current !== count && count > 0) setBump((n) => n + 1);
    prev.current = count;
  }, [count]);

  const visible = count > 0;
  const subtotal = summary?.subtotal;

  return (
    <Box
      aria-hidden={!visible}
      sx={{
        position: 'fixed',
        zIndex: 1200, // above the page, below dialogs
        // centred; on a phone it keeps the same room on both sides (the chat bubble sits on the right)
        left: '50%',
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        width: { xs: 'calc(100% - 156px)', sm: 'min(calc(100% - 152px), 460px)' },
        minWidth: { xs: 184, sm: 300 },
        transform: visible ? 'translate(-50%, 0)' : 'translate(-50%, 140%)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: `transform 700ms ${EASE}, opacity 400ms ${EASE}`,
        '@keyframes cartBump': { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.045)' }, '100%': { transform: 'scale(1)' } },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none', '& *': { animation: 'none !important' } },
      }}
    >
      <Box
        key={bump}
        component="button"
        type="button"
        tabIndex={visible ? 0 : -1}
        onClick={openCartPreview}
        aria-label={`View cart, ${count} ${count === 1 ? 'item' : 'items'}`}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, sm: 1.5 },
          p: '6px',
          pl: { xs: 2, sm: 1 },
          border: 0,
          borderRadius: 999,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          color: '#FBF1DA',
          background: 'linear-gradient(135deg, #2B1F14 0%, #14100C 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,236,196,0.16), 0 0 0 1px rgba(201,162,75,0.4), 0 22px 36px -14px rgba(20,10,0,0.6)',
          animation: bump ? `cartBump 520ms ${EASE}` : 'none',
          transition: `transform 400ms ${EASE}`,
          '&:hover .cartGo': { transform: 'translateX(3px)' },
          '&:active': { transform: 'scale(0.985)' },
          '&:focus-visible': { outline: '2px solid #C9A24B', outlineOffset: 3 },
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'relative',
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: { xs: 'none', sm: 'grid' },
            placeItems: 'center',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #E9C878 0%, #C9A24B 100%)',
            color: '#2B1F14',
          }}
        >
          <IconShoppingBag size={20} stroke={1.75} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', sm: 'left' } }}>
          <Typography sx={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
            {count} {count === 1 ? 'item' : 'items'}
            {typeof subtotal === 'number' && subtotal > 0 && (
              <Box component="span" sx={{ ml: 1, color: '#E9C878', fontVariantNumeric: 'tabular-nums' }}>
                ${subtotal.toFixed(2)}
              </Box>
            )}
          </Typography>
        </Box>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, pr: { sm: 1.75 }, fontSize: 14.5, fontWeight: 600 }}>
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>View cart</Box>
          <Box
            className="cartGo"
            component="span"
            sx={{
              display: 'inline-grid',
              placeItems: 'center',
              width: { xs: 40, sm: 'auto' },
              height: { xs: 40, sm: 'auto' },
              borderRadius: '50%',
              background: { xs: 'linear-gradient(135deg, #E9C878 0%, #C9A24B 100%)', sm: 'none' },
              color: { xs: '#2B1F14', sm: 'inherit' },
              transition: `transform 400ms ${EASE}`,
            }}
          >
            <IconArrowRight size={18} stroke={1.75} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
