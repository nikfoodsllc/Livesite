'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import AccountPageHeader from '@/components/account/AccountPageHeader';
import AddressCard from '@/components/account/AddressCard';
import AddressDialog from '@/components/account/AddressDialog';
import DeleteAddressDialog from '@/components/account/DeleteAddressDialog';
import { useAuth } from '@/contexts/AuthContext';
import { invalidateAddressCache } from '@/lib/zipcodeCache';
import { useApiClient } from '@/hooks/useApiClient';

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

export default function AddressesPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const { authenticatedFetch } = useApiClient();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch addresses
  const fetchAddresses = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await authenticatedFetch('/api/address');

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch addresses');
      }

      setAddresses(data.data.items || []);
    } catch (err: unknown) {
      console.error('Fetch addresses error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load addresses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle add address
  const handleAddClick = () => {
    setSelectedAddress(null);
    setDialogMode('add');
    setDialogOpen(true);
  };

  // Handle edit address
  const handleEditClick = (address: Address) => {
    setSelectedAddress(address);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  // Handle save address
  const handleSaveAddress = async (addressData: Address) => {
    if (dialogMode === 'add') {
      // Create new address
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

      // Invalidate address cache (now a no-op, but kept for safety)
      invalidateAddressCache();

      // Use returned address data instead of refetching
      if (data.data) {
        setAddresses(prev => [...prev, data.data]);
      } else {
        // Fallback to refetch if address not returned
        await fetchAddresses();
      }
    } else {
      // Update existing address
      const response = await authenticatedFetch('/api/address', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...addressData,
          _id: selectedAddress?._id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update address');
      }

      // Invalidate address cache (now a no-op, but kept for safety)
      invalidateAddressCache();

      // Use returned address data instead of refetching
      if (data.data) {
        setAddresses(prev =>
          prev.map(addr => addr._id === data.data._id ? data.data : addr)
        );
      } else {
        // Fallback to refetch if address not returned
        await fetchAddresses();
      }
    }
  };

  // Handle delete address
  const handleDeleteClick = (addressId: string) => {
    setAddressToDelete(addressId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!addressToDelete) return;

    setIsDeleting(true);

    try {
      const response = await authenticatedFetch(`/api/address?id=${addressToDelete}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete address');
      }

      // Invalidate address cache (now a no-op, but kept for safety)
      invalidateAddressCache();

      // Remove from local state instead of refetching
      setAddresses(prev => prev.filter(addr => addr._id !== addressToDelete));
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
    } catch (err: unknown) {
      console.error('Delete address error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete address');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Box>
      {/* Page Header */}
      <AccountPageHeader />

      {/* Action Button */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mb: 3,
        }}
      >
        <Button
          variant="contained"
          startIcon={<IconPlus size={18} />}
          onClick={handleAddClick}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.25,
            borderRadius: '12px',
            backgroundColor: theme.palette.primary.main,
            boxShadow: '0 4px 12px rgba(255, 159, 13, 0.25)',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: '#E88F00',
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 20px rgba(255, 159, 13, 0.35)',
            },
            '&:active': {
              transform: 'scale(0.98)',
            },
          }}
        >
          Add Address
        </Button>
      </Box>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 8,
          }}
        >
          <CircularProgress size={40} />
        </Box>
      )}

      {/* Address List */}
      {!isLoading && addresses.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
            },
            gap: 3,
          }}
        >
          {addresses.map((address) => (
            <AddressCard
              key={address._id}
              address={address}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && addresses.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            backgroundColor: '#fff',
            borderRadius: '16px',
            border: '1px solid',
            borderColor: theme.palette.divider,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: theme.palette.text.secondary,
              mb: 1,
            }}
          >
            No addresses yet
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              mb: 3,
            }}
          >
            Add your first delivery address to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<IconPlus size={18} />}
            onClick={handleAddClick}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.25,
              borderRadius: '12px',
              backgroundColor: theme.palette.primary.main,
            }}
          >
            Add Address
          </Button>
        </Box>
      )}

      {/* Add/Edit Address Dialog */}
      <AddressDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveAddress}
        address={selectedAddress}
        mode={dialogMode}
        userProfile={user ? {
          name: user.name,
          email: user.email,
          phone: user.phone,
        } : undefined}
        existingAddressCount={dialogMode === 'add' ? addresses.length : 0}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteAddressDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </Box>
  );
}
