'use client';

import React, { useState, useCallback } from 'react';
import {
  TextField,
  Autocomplete,
  CircularProgress,
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import { IconMapPin } from '@tabler/icons-react';
import { PlacePrediction, PlaceDetails } from '@/types/places';

interface AddressSearchProps {
  onAddressSelect: (placeDetails: PlaceDetails) => void;
  disabled?: boolean;
}

export default function AddressSearch({ onAddressSelect, disabled }: AddressSearchProps) {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Debounced search function
  const handleInputChange = useCallback(
    (event: React.SyntheticEvent, value: string) => {
      setInputValue(value);

      // Clear previous timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Don't search if less than 3 characters
      if (value.trim().length < 3) {
        setOptions([]);
        return;
      }

      // Set new timeout for debounced search
      const timeout = setTimeout(async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/places?input=${encodeURIComponent(value)}`);
          const data = await response.json();

          if (response.ok && data.data?.data?.predictions) {
            setOptions(data.data.data.predictions);
          } else {
            setOptions([]);
          }
        } catch (error) {
          console.error('Address search error:', error);
          setOptions([]);
        } finally {
          setLoading(false);
        }
      }, 300); // 300ms debounce

      setSearchTimeout(timeout);
    },
    [searchTimeout]
  );

  // Handle address selection
  const handleSelect = async (event: React.SyntheticEvent, value: PlacePrediction | null) => {
    if (!value) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/places/details?place_id=${encodeURIComponent(value.place_id)}`
      );
      const data = await response.json();

      if (response.ok && data.data) {
        onAddressSelect(data.data);
      } else {
        console.error('Failed to fetch place details:', data.error);
      }
    } catch (error) {
      console.error('Place details error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Autocomplete
      options={options}
      getOptionLabel={(option) => option.description}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleSelect}
      loading={loading}
      disabled={disabled}
      noOptionsText={
        inputValue.length < 3
          ? 'Type at least 3 characters'
          : 'No addresses found'
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search for a Washington address *"
          placeholder="Start typing your Washington address..."
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <IconMapPin
                size={20}
                color={theme.palette.primary.main}
                style={{ marginLeft: 8, marginRight: -4 }}
              />
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                borderWidth: '2px',
              },
            },
          }}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...otherProps } = props;
        return (
          <Box component="li" key={key} {...otherProps} sx={{ py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <IconMapPin
                size={18}
                color={theme.palette.text.secondary}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <Box>
                {option.structured_formatting ? (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {option.structured_formatting.main_text}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {option.structured_formatting.secondary_text}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2">{option.description}</Typography>
                )}
              </Box>
            </Box>
          </Box>
        );
      }}
      sx={{
        mb: 3,
      }}
    />
  );
}