'use client';

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
import { IconX, IconInfoCircle } from '@tabler/icons-react';
import { Order } from '@/types/order';
import { formatCurrency } from '@/lib/orderHelpers';

interface UpdateItemDialogProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
}

export default function UpdateItemDialog({ open, order, onClose }: UpdateItemDialogProps) {
  if (!order) return null;

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
        <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
          Update Order Items
        </Typography>
        <IconButton onClick={onClose} size="small">
          <IconX size={20} />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ px: 3, py: 3 }}>
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

        {/* Info Alert */}
        <Alert
          severity="info"
          icon={<IconInfoCircle size={20} />}
          sx={{ mb: 3 }}
        >
          You can update items for confirmed orders by contacting our support team.
        </Alert>

        {/* Current Order Items */}
        <Typography
          sx={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#111827',
            mb: 2,
          }}
        >
          Current Order Items
        </Typography>

        {order.items.map((dayOrder, dayIndex) => (
          <Box
            key={dayIndex}
            sx={{
              mb: 2.5,
              pb: 2.5,
              borderBottom: dayIndex < order.items.length - 1 ? '1px solid #E5E7EB' : 'none',
            }}
          >
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#6B7280',
                mb: 1.5,
              }}
            >
              {dayOrder.day}&apos;s Items
            </Typography>

            {dayOrder.items.map((item, itemIndex) => (
              <Box
                key={itemIndex}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                  backgroundColor: '#F9FAFB',
                  borderRadius: '6px',
                  p: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {/* Veg Indicator */}
                  <Box
                    sx={{
                      width: '16px',
                      height: '16px',
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
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#0A9750',
                      }}
                    />
                  </Box>

                  <Typography sx={{ fontSize: '14px', color: '#374151' }}>
                    {item.quantity} × {item.food.name}
                  </Typography>
                </Box>

                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                  {formatCurrency(item.price * item.quantity, order.currency)}
                </Typography>
              </Box>
            ))}
          </Box>
        ))}

        {/* Contact Support Info */}
        <Box
          sx={{
            backgroundColor: '#FFF7ED',
            borderRadius: '8px',
            p: 2,
            mt: 3,
          }}
        >
          <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827', mb: 1 }}>
            Need to make changes?
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#6B7280', mb: 1.5 }}>
            Please contact our support team to update your order items. We&apos;re here to help!
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: '13px', color: '#374151' }}>
              <strong>Phone:</strong> 1-800-NIKFOODS
            </Typography>
            <Typography sx={{ fontSize: '13px', color: '#374151' }}>
              <strong>Email:</strong> support@nikfoods.com
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E5E7EB' }}>
        <Button
          onClick={onClose}
          variant="contained"
          fullWidth
          sx={{
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
          }}
        >
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
}
