'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  InputBase,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { IconMapPin, IconArrowRight } from '@tabler/icons-react';

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { IAddress } from '@/types/auth';

interface DeliveryLocationBarProps {
  className?: string;
  showMinOrderValue?: boolean;
}

export default function DeliveryLocationBar({
  className = '',
  showMinOrderValue = true,
}: DeliveryLocationBarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const {
    selectedAddressId,
    minOrderValue,
    updateAddress,
    updateZipcode,
  } = useCart();

  const [addresses, setAddresses] = useState<IAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  // empty on the server and on the first browser paint (so both match), then the saved zip code is filled in
  const [zipcodeInput, setZipcodeInput] = useState('');
  useEffect(() => {
    const saved = localStorage.getItem('selectedZipcode');
    if (saved) setZipcodeInput(saved);
  }, []);
  const [isValidatingZipcode, setIsValidatingZipcode] = useState(false);
  const [zipcodeError, setZipcodeError] = useState('');
  const hasAutoSelectedRef = useRef(false);

  // the card rises in the first time it scrolls into view (transform + opacity only)
  const cardRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const fetchAddresses = useCallback(async () => {
    if (!user) return;

    setIsLoadingAddresses(true);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        return;
      }

      const response = await fetch('/api/address', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (data.success) {
        const addressList = Array.isArray(data.data?.items) ? data.data.items : [];
        setAddresses(addressList);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [user]);

  const handleAddressSelect = useCallback((addressId: string) => {
    const selectedAddress = addresses.find((addr) => addr._id?.toString() === addressId);
    if (!selectedAddress) return;

    setZipcodeInput(selectedAddress.postal_code);
    setZipcodeError('');
    void updateAddress(addressId).catch((err) => {
      console.error('Error updating delivery address:', err);
    });
  }, [addresses, updateAddress]);

  // Load saved addresses for logged-in users
  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user, fetchAddresses]);

  // Auto-select stored address, default, or first — and sync cart/checkout state
  useEffect(() => {
    if (!user || addresses.length === 0 || hasAutoSelectedRef.current) return;

    const storedId = localStorage.getItem('selectedAddressId') || selectedAddressId;
    const defaultAddress = addresses.find((address) => address.isDefault === true);
    const addressToSelect =
      (storedId ? addresses.find((a) => a._id?.toString() === storedId) : undefined) ||
      defaultAddress ||
      addresses[0];

    const addressId = addressToSelect?._id?.toString();
    if (!addressId) return;

    hasAutoSelectedRef.current = true;
    void updateAddress(addressId).catch((err) => {
      console.error('Error auto-selecting delivery address:', err);
    });
  }, [user, addresses, selectedAddressId, updateAddress]);

  const validateZipcode = (value: string): boolean => {
    const zipcodeRegex = /^\d{5}(-\d{4})?$/;
    return zipcodeRegex.test(value);
  };

  const handleZipcodeSubmit = async () => {
    const trimmedZipcode = zipcodeInput.trim();

    if (!trimmedZipcode) {
      setZipcodeError('Please enter a zipcode');
      return;
    }

    if (!validateZipcode(trimmedZipcode)) {
      setZipcodeError('Invalid zipcode format');
      return;
    }

    setIsValidatingZipcode(true);
    setZipcodeError('');

    try {
      const response = await fetch(`/api/zipcode-config?zipcode=${encodeURIComponent(trimmedZipcode)}`);

      if (!response.ok) {
        // Handle API error responses
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'This zipcode is not serviceable');
      }

      const data = await response.json();

      if (data.success && data.data) {
        await updateZipcode(trimmedZipcode);
        // Zipcode and cart will be automatically updated by CartContext
        // then draw the customer down to the menu (after the page has settled with the new zip)
        window.setTimeout(() => {
          const target = document.getElementById('menu-sections') ?? document.getElementById('menu-search');
          if (!target) return;
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const header = (document.querySelector('header') as HTMLElement | null)?.offsetHeight ?? 0;
          const top = target.getBoundingClientRect().top + window.scrollY - header - 8;
          window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
        }, 350);
      } else {
        // Handle zipcode rejection from API
        const errorMessage = data.message || data.error || 'This zipcode is not serviceable';
        setZipcodeError(errorMessage);
      }
    } catch (err) {
      console.error('Error setting zipcode:', err);
      // Display user-friendly error message
      const errorMessage = err instanceof Error ? err.message : 'This zipcode is not serviceable';
      setZipcodeError(errorMessage);
    } finally {
      setIsValidatingZipcode(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleZipcodeSubmit();
    }
  };

  const hasSavedAddresses = !!user && addresses.length > 0;

  // One card for every state: title + helper on the left, the control in the middle, the minimum
  // order as a small pill. Same wording as before, just laid out consistently.
  const title = hasSavedAddresses ? 'Delivery address' : 'Delivery location';
  const helper = hasSavedAddresses
    ? 'Select your delivery address'
    : 'To get best delivery experience, provide your zip code';

  const fieldBorder = {
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(184, 137, 59, 0.4)', transition: `border-color 400ms ${EASE}` },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B8893B' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#B8893B', borderWidth: 1 },
  };

  // One pill: the zip box and its Set button live together; the button is a dark island flush with the pill's end
  const zipcodeControl = (
    <Box sx={{ width: '100%', maxWidth: { md: 380 } }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: 52,
          pl: 2.25,
          pr: '5px',
          borderRadius: 999,
          bgcolor: '#fff',
          border: `1px solid ${zipcodeError ? '#C0392B' : 'rgba(184, 137, 59, 0.4)'}`,
          boxShadow: 'inset 0 1px 2px rgba(60, 35, 10, 0.05)',
          transition: `border-color 400ms ${EASE}, box-shadow 400ms ${EASE}`,
          '&:focus-within': { borderColor: zipcodeError ? '#C0392B' : '#B8893B', boxShadow: '0 0 0 4px rgba(184, 137, 59, 0.16)' },
        }}
        onClick={(e) => {
          // a tap anywhere in the pill (not on the Set button) puts the cursor in the zip box
          if (!(e.target as HTMLElement).closest('button')) document.getElementById('delivery-zipcode')?.focus();
        }}
      >
        <InputBase
          id="delivery-zipcode"
          fullWidth
          placeholder="Enter zipcode"
          value={zipcodeInput}
          onChange={(e) => {
            setZipcodeInput(e.target.value);
            setZipcodeError('');
          }}
          onKeyDown={handleKeyPress}
          disabled={isValidatingZipcode}
          error={!!zipcodeError}
          inputProps={{ inputMode: 'numeric', 'aria-label': 'Delivery zipcode', 'aria-invalid': !!zipcodeError, style: { fontSize: '1rem' } }}
          sx={{ alignSelf: 'stretch', color: '#1F1712', '& .MuiInputBase-input': { height: '100%', py: 0 }, '& input::placeholder': { color: '#8C7E6C', opacity: 1 } }}
        />
        <Box
          component="button"
          type="button"
          onClick={handleZipcodeSubmit}
          disabled={isValidatingZipcode || !zipcodeInput.trim()}
          sx={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            height: 42,
            px: 2.5,
            border: 0,
            borderRadius: 999,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 14.5,
            fontWeight: 600,
            color: '#FBF1DA',
            background: 'linear-gradient(135deg, #2B1F14 0%, #14100C 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,236,196,0.16)',
            transition: `transform 400ms ${EASE}, opacity 300ms ${EASE}, background 300ms ${EASE}`,
            '&:hover:not(:disabled)': { '& .setArrow': { transform: 'translateX(3px)' } },
            '&:active:not(:disabled)': { transform: 'scale(0.97)' },
            '&:disabled': { cursor: 'default', background: '#ECE6DA', color: '#A39682', boxShadow: 'none' },
            ...(!isValidatingZipcode && /^\d{5}(-\d{4})?$/.test(zipcodeInput.trim()) ? { animation: 'setReady 1.8s ease-out infinite' } : {}),
            '&:focus-visible': { outline: '2px solid #C9A24B', outlineOffset: 2 },
          }}
        >
          {isValidatingZipcode ? (
            <CircularProgress size={16} sx={{ color: '#FBF1DA' }} />
          ) : (
            <>
              Set
              <Box className="setArrow" component="span" sx={{ display: 'inline-flex', transition: `transform 400ms ${EASE}` }}>
                <IconArrowRight size={16} stroke={1.75} />
              </Box>
            </>
          )}
        </Box>
      </Box>
      {zipcodeError && (
        <Typography role="alert" sx={{ mt: 0.75, ml: 2, fontSize: '0.78rem', color: '#C0392B' }}>
          {zipcodeError}
        </Typography>
      )}
    </Box>
  );

  const addressControl = (
    <FormControl fullWidth sx={{ maxWidth: { md: 560 } }}>
      <Select
        value={selectedAddressId || ''}
        onChange={(e) => handleAddressSelect(e.target.value as string)}
        displayEmpty
        inputProps={{ 'aria-label': 'Delivery address' }}
        sx={{ bgcolor: '#fff', borderRadius: 999, height: 52, pl: 0.75, boxShadow: 'inset 0 1px 2px rgba(60, 35, 10, 0.05)', ...fieldBorder }}
        MenuProps={{ slotProps: { paper: { sx: { borderRadius: 3, mt: 0.75, border: '1px solid rgba(184,137,59,0.3)', boxShadow: '0 18px 36px -16px rgba(60,35,10,0.35)' } } } }}
      >
        <MenuItem value="" disabled>
          Select delivery address
        </MenuItem>
        {addresses.map((address) => {
          const addressId = address._id?.toString() || '';
          return (
            <MenuItem key={addressId} value={addressId}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {address.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#666', display: 'block', whiteSpace: 'normal' }}>
                  {address.street_address}, {address.city} {address.postal_code}
                </Typography>
              </Box>
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );

  return (
    <Box
      ref={cardRef}
      className={className}
      sx={{
        width: '100%',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'none' : 'translateY(22px)',
        transition: `opacity 900ms ${EASE}, transform 900ms ${EASE}`,
        '@keyframes locPing': { '0%': { opacity: 0.55, transform: 'scale(1)' }, '80%,100%': { opacity: 0, transform: 'scale(1.9)' } },
        '@keyframes locBob': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-2.5px)' } },
        '@keyframes setReady': { '0%,100%': { boxShadow: 'inset 0 1px 0 rgba(255,236,196,0.16), 0 0 0 0 rgba(226,188,106,0.55)' }, '60%': { boxShadow: 'inset 0 1px 0 rgba(255,236,196,0.16), 0 0 0 9px rgba(226,188,106,0)' } },
        '@media (prefers-reduced-motion: reduce)': { opacity: 1, transform: 'none', transition: 'none', '& *, & *::before': { animation: 'none !important' } },
        // outer shell: a tinted tray with a hairline gold edge; the card below sits inside it
        p: '5px',
        borderRadius: { xs: '30px', md: '34px' },
        background: 'linear-gradient(145deg, rgba(226,188,106,0.35) 0%, rgba(184,137,59,0.12) 50%, rgba(226,188,106,0.3) 100%)',
        boxShadow: '0 22px 40px -22px rgba(60, 35, 10, 0.4)',
      }}
    >
      <Box
        sx={{
          bgcolor: '#FFFEFB',
          boxShadow: 'inset 0 1px 0 #fff, 0 1px 2px rgba(60, 35, 10, 0.06)',
          borderRadius: { xs: '25px', md: '29px' },
          p: { xs: 1.75, sm: 2.25 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr auto', md: 'auto minmax(0, 1fr) auto' },
          gridTemplateAreas: {
            xs: '"label" "control" "pill"',
            sm: '"label pill" "control control"',
            md: '"label control pill"',
          },
          alignItems: 'center',
          columnGap: { xs: 1.5, md: 3 },
          rowGap: 1.5,
        }}
      >
        {/* Title + helper */}
        <Box sx={{ gridArea: 'label', display: 'flex', alignItems: 'center', gap: 1.5, minWidth: { md: 250 } }}>
          <Box
            aria-hidden
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2B1F14 0%, #14100C 100%)',
              boxShadow: '0 0 0 3px rgba(226,188,106,0.35), inset 0 1px 0 rgba(255,236,196,0.2)',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1.5px solid rgba(201,162,75,0.7)',
                animation: 'locPing 2.8s cubic-bezier(0.2, 0.6, 0.3, 1) 1s infinite',
                pointerEvents: 'none',
              },
              '& svg': { animation: 'locBob 3.2s ease-in-out infinite' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconMapPin size={22} color="#F6D58E" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontFamily: 'var(--font-display), Georgia, serif', fontWeight: 600, fontSize: '1.15rem', letterSpacing: '0.005em', color: '#1F1712', lineHeight: 1.25 }}>
              {title}
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: 'block', color: '#666', lineHeight: 1.35, textWrap: 'balance' }}
            >
              {helper}
            </Typography>
          </Box>
        </Box>

        {/* Control: address dropdown when the user has saved addresses, zipcode box otherwise */}
        <Box
          sx={{
            gridArea: 'control',
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: { md: 'center' },
          }}
        >
          {user && isLoadingAddresses ? (
            <CircularProgress size={20} sx={{ color: '#8A6420' }} />
          ) : hasSavedAddresses ? (
            addressControl
          ) : (
            zipcodeControl
          )}
        </Box>

        {/* Minimum order value (shown even before it is known, so the layout does not jump) */}
        {showMinOrderValue && (
          <Box
            sx={{
              gridArea: 'pill',
              justifySelf: { xs: 'start', sm: 'end' },
              bgcolor: 'rgba(246,227,180,0.35)',
              border: '1px solid rgba(184, 137, 59, 0.3)',
              borderRadius: 999,
              px: 1.75,
              py: 0.6,
            }}
          >
            <Typography
              component="span"
              sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' }, color: '#666', fontWeight: 500 }}
            >
              Min. daily order{' '}
              {minOrderValue && minOrderValue > 0 ? (
                <Box component="span" sx={{ color: '#1F1F1F', fontWeight: 700 }}>
                  ${minOrderValue.toFixed(2)}
                </Box>
              ) : (
                <Box component="span" sx={{ color: '#9A9A9A', fontStyle: 'italic' }}>
                  {hasSavedAddresses ? 'select an address' : 'waiting for zip'}
                </Box>
              )}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
