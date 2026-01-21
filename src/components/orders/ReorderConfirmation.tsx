'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Alert,
} from '@mui/material';
import { IconX, IconShoppingCart } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { Order } from '@/types/order';
import { formatCurrency } from '@/lib/orderHelpers';
import { useApiClient } from '@/hooks/useApiClient';

interface ReorderConfirmationProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
}

export default function ReorderConfirmation({ open, order, onClose }: ReorderConfirmationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { authenticatedFetch } = useApiClient();

  const handleReorder = async () => {
    if (!order) return;

    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch(`/api/orders/${order.orderId}/reorder`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reorder');
      }

      const result = await response.json();

      if (result.success) {
        // Store reorder data in session storage for the cart page to pick up
        sessionStorage.setItem('reorderData', JSON.stringify(result.data));

        // Navigate to cart page
        router.push('/cart');
        onClose();
      }
    } catch (err) {
      console.error('Error reordering:', err);
      setError(err instanceof Error ? err.message : 'Failed to reorder');
    } finally {
      setLoading(false);
    }
  };

  const getTotalItemCount = () => {
    if (!order) return 0;
    return order.items.reduce(
      (total, day) => total + day.items.reduce((dayTotal, item) => dayTotal + item.quantity, 0),
      0
    );
  };

  if (!order) return null;

  const totalItems = getTotalItemCount();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconShoppingCart size={24} color="#FF9F0D" />
          <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            Reorder Confirmation
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" disabled={loading}>
          <IconX size={20} />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ px: 3, py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Order Info */}
        <Box
          sx={{
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
            p: 2,
            mb: 3,
          }}
        >
          <Typography sx={{ fontSize: '14px', color: '#6B7280', mb: 0.5 }}>
            Order ID
          </Typography>
          <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
            #{order.orderId}
          </Typography>
        </Box>

        {/* Confirmation Message */}
        <Typography sx={{ fontSize: '15px', color: '#374151', mb: 3 }}>
          You are about to add <strong>{totalItems} item{totalItems !== 1 ? 's' : ''}</strong> from
          this order to your cart.
        </Typography>

        {/* Items Preview */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#111827',
              mb: 1.5,
            }}
          >
            Items to be added:
          </Typography>

          <Box sx={{ maxHeight: '200px', overflowY: 'auto', pr: 1 }}>
            {order.items.map((dayOrder, dayIndex) => (
              <Box key={dayIndex} sx={{ mb: 2 }}>
                <Typography
                  sx={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#6B7280',
                    mb: 1,
                  }}
                >
                  {dayOrder.day}
                </Typography>

                {dayOrder.items.map((item, itemIndex) => (
                  <Box
                    key={itemIndex}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      p: 1.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {/* Veg Indicator */}
                      <Box
                        sx={{
                          width: '14px',
                          height: '14px',
                          border: '2px solid #0A9750',
                          borderRadius: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Box
                          sx={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: '#0A9750',
                          }}
                        />
                      </Box>

                      <Typography sx={{ fontSize: '13px', color: '#374151' }}>
                        {item.quantity} × {item.food.name}
                      </Typography>
                    </Box>

                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      {formatCurrency(item.price * item.quantity, order.currency)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Note */}
        <Alert severity="info" sx={{ fontSize: '13px' }}>
          You&apos;ll be able to modify quantities and delivery dates in your cart.
        </Alert>
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E5E7EB', gap: 1.5 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
          sx={{
            flex: 1,
            borderColor: '#E5E7EB',
            color: '#6B7280',
            fontSize: '16px',
            fontWeight: 600,
            textTransform: 'none',
            height: '48px',
            borderRadius: '8px',
            '&:hover': {
              borderColor: '#D1D5DB',
              backgroundColor: '#F9FAFB',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleReorder}
          variant="contained"
          disabled={loading}
          sx={{
            flex: 1,
            backgroundColor: '#FF9F0D',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: 600,
            textTransform: 'none',
            height: '48px',
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: '#E88F0C',
            },
            '&:disabled': {
              backgroundColor: '#E5E7EB',
              color: '#9CA3AF',
            },
          }}
        >
          {loading ? 'Adding to Cart...' : 'Add to Cart'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
