'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  useTheme,
} from '@mui/material';

interface DeleteAddressDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export default function DeleteAddressDialog({
  open,
  onClose,
  onConfirm,
  isLoading,
}: DeleteAddressDialogProps) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          p: 1,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontSize: '18px',
          pb: 1,
        }}
      >
        Delete Address
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          Are you sure you want to delete this address? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={isLoading}
          variant="outlined"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            borderRadius: '10px',
            borderColor: theme.palette.divider,
            color: theme.palette.text.secondary,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          variant="contained"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            borderRadius: '10px',
            backgroundColor: '#DC2626',
            '&:hover': {
              backgroundColor: '#B91C1C',
            },
          }}
        >
          {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
