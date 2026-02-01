'use client';

import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  Chip,
  useTheme,
} from '@mui/material';
import { IconMapPin, IconStar } from '@tabler/icons-react';

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

interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (addressId: string) => void;
}

export default function AddressCard({ address, onEdit, onDelete }: AddressCardProps) {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '12px',
        border: '1px solid #F0F0F0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      {/* Name Header with Default Badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: theme.palette.text.primary,
          }}
        >
          {address.name}
        </Typography>
        {address.isDefault && (
          <Chip
            icon={<IconStar size={14} />}
            label="Default"
            size="small"
            sx={{
              backgroundColor: theme.palette.primary.main + '20',
              color: theme.palette.primary.main,
              border: `1px solid ${theme.palette.primary.main}40`,
              fontWeight: 600,
              fontSize: '12px',
              '& .MuiChip-icon': {
                color: theme.palette.primary.main,
              },
            }}
          />
        )}
      </Box>

      {/* Address Section */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <IconMapPin
          size={20}
          color={theme.palette.primary.main}
          style={{ marginTop: 2, flexShrink: 0 }}
        />
        <Box>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.primary,
              lineHeight: 1.6,
            }}
          >
            {address.street_address}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              lineHeight: 1.6,
            }}
          >
            {address.city}, {address.postal_code}
          </Typography>
        </Box>
      </Box>

      {/* Additional Details as Chips */}
      {(address.apartment || address.floor || address.entrance) && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {address.apartment && (
            <Chip
              label={`Apt: ${address.apartment}`}
              size="small"
              sx={{
                backgroundColor: '#FFF5E6',
                color: theme.palette.primary.main,
                border: '1px solid #FFE5B4',
                fontWeight: 500,
                fontSize: '12px',
              }}
            />
          )}
          {address.floor && (
            <Chip
              label={`Floor: ${address.floor}`}
              size="small"
              sx={{
                backgroundColor: '#FFF5E6',
                color: theme.palette.primary.main,
                border: '1px solid #FFE5B4',
                fontWeight: 500,
                fontSize: '12px',
              }}
            />
          )}
          {address.entrance && (
            <Chip
              label={`Gate Code: ${address.entrance}`}
              size="small"
              sx={{
                backgroundColor: '#FFF5E6',
                color: theme.palette.primary.main,
                border: '1px solid #FFE5B4',
                fontWeight: 500,
                fontSize: '12px',
              }}
            />
          )}
        </Box>
      )}

      {/* Contact Info */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            display: 'block',
          }}
        >
          Email: {address.email}
        </Typography>
        {address.phone && (
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              display: 'block',
            }}
          >
            Phone: {address.phone}
          </Typography>
        )}
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => onEdit(address)}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 2.5,
            py: 0.75,
            borderRadius: '8px',
            borderColor: theme.palette.primary.main,
            color: theme.palette.primary.main,
            '&:hover': {
              borderColor: theme.palette.primary.dark,
              backgroundColor: 'rgba(255, 159, 13, 0.08)',
            },
          }}
        >
          Edit
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => address._id && onDelete(address._id)}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 2.5,
            py: 0.75,
            borderRadius: '8px',
            borderColor: '#DC2626',
            color: '#DC2626',
            '&:hover': {
              borderColor: '#B91C1C',
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
            },
          }}
        >
          Delete
        </Button>
      </Box>
    </Paper>
  );
}
