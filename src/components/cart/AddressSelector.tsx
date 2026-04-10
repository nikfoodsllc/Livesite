'use client';

import React from 'react';
import { Paper, Typography, Alert } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import SavedAddressList from './SavedAddressList';
import ZipcodeEntry from './ZipcodeEntry';

interface AddressSelectorProps {
  onAddressSelect: (addressId: string) => Promise<void>;
  onZipcodeChange: (zipcode: string) => Promise<void>;
  selectedAddressId?: string;
  selectedZipcode?: string;
}

export default function AddressSelector({
  onAddressSelect,
  onZipcodeChange,
  selectedAddressId,
  selectedZipcode,
}: AddressSelectorProps) {
  const { user } = useAuth();

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid #EDEDED', mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Delivery Address
      </Typography>

      {user ? (
        <>
          {/* Authenticated users - only saved addresses */}
          <SavedAddressList
            onAddressSelect={onAddressSelect}
            selectedAddressId={selectedAddressId}
          />
        </>
      ) : (
        <>
          {/* Guest user - only zipcode entry */}
          <Alert severity="info" sx={{ mb: 2 }}>
            Enter your delivery zipcode to see pricing and availability.
          </Alert>
          <ZipcodeEntry
            onZipcodeChange={onZipcodeChange}
            selectedZipcode={selectedZipcode}
          />
        </>
      )}
    </Paper>
  );
}
