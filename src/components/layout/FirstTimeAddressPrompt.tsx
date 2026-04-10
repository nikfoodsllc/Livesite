'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  useTheme,
  useMediaQuery,
  IconButton,
  Fade,
} from '@mui/material';
import { IconX, IconMapPin } from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import AddressDialog from '@/components/account/AddressDialog';
import { invalidateAddressCache } from '@/lib/zipcodeCache';
import { usePathname } from 'next/navigation';

interface Address {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  street_address: string;
  city: string;
  postal_code: string;
  apartment?: string;
  floor?: string;
  entrance?: string;
  isDefault?: boolean;
}

const LOCAL_STORAGE_KEY = 'hasDismissedAddressPrompt';

// Routes where the prompt should NOT be displayed
const EXCLUDED_ROUTES = [
  '/checkout',           // Checkout pages
  '/account/addresses',  // Address management page
];

// Helper function to check if current route should show the prompt
const shouldShowOnRoute = (pathname: string | null): boolean => {
  if (!pathname) return true;

  // Check if the current path starts with any excluded route
  return !EXCLUDED_ROUTES.some(route => pathname.startsWith(route));
};

export default function FirstTimeAddressPrompt() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { authenticatedFetch } = useApiClient();
  const pathname = usePathname();

  const [showPrompt, setShowPrompt] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false); // Internal state for delay logic

  // Fetch addresses function
  const fetchAddresses = useCallback(async () => {
    if (!user) return;

    setIsLoadingAddresses(true);
    try {
      const response = await authenticatedFetch('/api/address');
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setAddresses(data.data?.items || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [user, authenticatedFetch]);

  // Check localStorage for dismissed state on mount
  useEffect(() => {
    const hasDismissed = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (hasDismissed === 'true') {
      setShowPrompt(false);
    }
  }, []);

  // Check if prompt should be visible based on conditions
  useEffect(() => {
    const hasDismissed = localStorage.getItem(LOCAL_STORAGE_KEY) === 'true';
    const isRouteAllowed = shouldShowOnRoute(pathname);

    // Determine if prompt should be shown based on conditions
    const meetsConditions =
      user &&
      !user.isCompleted &&
      addresses.length === 0 &&
      !hasDismissed &&
      !isLoadingAddresses &&
      isRouteAllowed;

    setShouldShowPrompt(!!meetsConditions);
  }, [user, addresses, isLoadingAddresses, pathname]);

  // Add brief delay before showing prompt to avoid visual jumps and ensure smooth transition
  // This gives auth context time to fully update before rendering the prompt
  useEffect(() => {
    if (!shouldShowPrompt) {
      setShowPrompt(false);
      return;
    }

    // Delay showing the prompt by 300ms for smooth visual transition
    const delayTimer = setTimeout(() => {
      setShowPrompt(true);
      console.log('[AddressPrompt] Showing prompt to user:', {
        userId: user?.id,
        isCompleted: user?.isCompleted,
        addressCount: addresses.length,
        timestamp: new Date().toISOString(),
      });
    }, 300);

    return () => clearTimeout(delayTimer);
  }, [shouldShowPrompt, user, addresses]);

  // Fetch addresses when user changes
  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user, fetchAddresses]);

  // Handle dismiss action
  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
  };

  // Handle "Add Address" button click
  const handleAddAddressClick = () => {
    setShowAddressDialog(true);
  };

  // Handle address save
  const handleSaveAddress = async (addressData: Address) => {
    const response = await authenticatedFetch('/api/address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(addressData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create address');
    }

    // Invalidate address cache so next fetch gets fresh data
    invalidateAddressCache();

    // Refresh addresses - prompt will auto-hide when addresses.length > 0
    await fetchAddresses();

    setShowAddressDialog(false);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setShowAddressDialog(false);
  };

  // Don't render anything if prompt should not show
  if (!showPrompt) {
    return null;
  }

  return (
    <>
      <Fade in={showPrompt}>
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.primary.light}05 100%)`,
            borderBottom: `1px solid ${theme.palette.divider}`,
            py: 2,
            px: { xs: 2, sm: 3 },
          }}
        >
          <Box
            sx={{
              maxWidth: 'lg',
              mx: 'auto',
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
            }}
          >
            {/* Message Section */}
            <Box
              sx={{
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 2,
                flex: 1,
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: `${theme.palette.primary.main}15`,
                  flexShrink: 0,
                }}
              >
                <IconMapPin
                  size={20}
                  color={theme.palette.primary.main}
                  strokeWidth={2.5}
                />
              </Box>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant={isMobile ? 'body1' : 'h6'}
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    mb: 0.5,
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                  }}
                >
                  Add your delivery address to get started with your first order!
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  }}
                >
                  We need your address to deliver your favorite meals
                </Typography>
              </Box>
            </Box>

            {/* Actions Section */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexShrink: 0,
              }}
            >
              <Button
                variant="contained"
                onClick={handleAddAddressClick}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  px: { xs: 2, sm: 3 },
                  py: 1,
                  borderRadius: '12px',
                  backgroundColor: theme.palette.primary.main,
                  fontSize: { xs: '0.875rem', sm: '0.9rem' },
                  boxShadow: '0 2px 8px rgba(248, 156, 53, 0.25)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(248, 156, 53, 0.35)',
                  },
                }}
              >
                Add Address
              </Button>

              <IconButton
                onClick={handleDismiss}
                size="small"
                sx={{
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    backgroundColor: `${theme.palette.action.hover}50`,
                  },
                }}
                aria-label="Remind me later"
              >
                <IconX size={20} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Fade>

      {/* Address Dialog */}
      {user && (
        <AddressDialog
          open={showAddressDialog}
          onClose={handleDialogClose}
          onSave={handleSaveAddress}
          mode="add"
          userProfile={{
            name: user.name,
            email: user.email,
            phone: user.phone,
          }}
          existingAddressCount={0}
        />
      )}
    </>
  );
}
