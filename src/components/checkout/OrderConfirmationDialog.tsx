'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import {
  IconCircleCheck,
  IconMapPin,
  IconCalendar,
  IconCreditCard,
  IconCash,
  IconHome,
  IconReceipt,
  IconX,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { Order } from '@/types/order';
import { ComboSection, SelectedComboItem } from '@/types/food';
import { formatCurrency } from '@/lib/orderHelpers';
import { formatDeliveryDate } from '@/lib/orderHelpers';

interface OrderConfirmationDialogProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
}

export default function OrderConfirmationDialog({
  open,
  order,
  onClose,
}: OrderConfirmationDialogProps) {
  const router = useRouter();

  const handleGoToHome = () => {
    onClose();
    router.push('/');
  };

  const handleViewOrderHistory = () => {
    onClose();
    router.push('/account/orders');
  };

  if (!order) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          maxHeight: '90vh',
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
          <IconCircleCheck size={28} color="#28a745" />
          <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            {order.paymentMethod === 'Cash on Delivery'
              ? 'Order Confirmed!'
              : 'Payment Successful!'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <IconX size={20} />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ px: 3, py: 3 }}>
        {/* Success Message with Order ID */}
        <Box
          sx={{
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
            p: 2,
            mb: 3,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: '14px', color: '#6B7280', mb: 0.5 }}>
            Thank you for your order. 
          </Typography>
          <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#FF9F0D', mt: 1 }}>
            Order ID: #{order.orderId}
          </Typography>
        </Box>

        {/* Order Details Section */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#111827',
              mb: 2,
            }}
          >
            Order Details
          </Typography>

          {/* Day-wise items with scrollable area */}
          <Box
            sx={{
              maxHeight: '250px',
              overflowY: 'auto',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              p: 2,
            }}
          >
            {order.items.map((dayOrder, dayIndex) => (
              <Box key={dayIndex} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <IconCalendar size={18} style={{ color: '#FF9F0D' }} />
                  <Typography
                    sx={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#6B7280',
                    }}
                  >
                    {dayOrder.day}&apos;s Item
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pl: 3 }}>
                  <Chip
                    label={`Delivery on ${formatDeliveryDate(dayOrder.actualDeliveryDate || dayOrder.deliveryDate)}`}
                    size="small"
                    sx={{
                      backgroundColor: '#FFF5E6',
                      color: '#FF9F0D',
                      fontWeight: 500,
                      fontSize: '0.7rem',
                      height: '22px',
                      borderRadius: '6px',
                    }}
                  />
                </Box>

                {dayOrder.items.map((item, itemIndex) => (
                  <Box
                    key={itemIndex}
                    sx={{
                      pl: 3,
                      py: 0.5,
                      mb: 1,
                    }}
                  >
                    {/* Item Header */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography
                        sx={{ fontSize: '13px', color: '#374151' }}
                      >
                        {item.food.name} x {item.quantity}
                      </Typography>
                      <Typography
                        sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}
                      >
                        {formatCurrency(item.price * item.quantity, order.currency)}
                      </Typography>
                    </Box>

                    {/* Combo Selections */}
                    {item.comboSelections &&
                      Object.keys(item.comboSelections).length > 0 &&
                      item.food.sections && (
                        <Box sx={{ mt: 0.5, pl: 1 }}>
                          {Object.entries(item.comboSelections).map(
                            ([sectionId, itemIds]) => {
                              const section = item.food.sections?.find(
                                (s) => s._id === sectionId
                              ) as unknown as ComboSection | undefined;
                              if (!section) return null;

                              return (
                                <React.Fragment key={sectionId}>
                                  {itemIds.map((itemId) => {
                                    const selectedItem = section.selectedItems?.find(
                                      (si) => si._id === itemId
                                    ) as SelectedComboItem | undefined;
                                    if (!selectedItem) return null;

                                    const portionText = selectedItem.portion
                                      ? ` (${selectedItem.portion})`
                                      : '';

                                    return (
                                      <Typography
                                        key={itemId}
                                        sx={{
                                          fontSize: '11px',
                                          color: '#9CA3AF',
                                          display: 'block',
                                        }}
                                      >
                                        • {section.title}:{' '}
                                        {selectedItem.item.name}
                                        {portionText}
                                      </Typography>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            }
                          )}
                        </Box>
                      )}

                    {/* Other Customizations */}
                    {(item.portions ||
                      (item.food.spiceLevel && item.spiceLevel)) && (
                      <Box sx={{ mt: 0.5, pl: 1 }}>
                        {item.portions && (
                          <Typography
                            sx={{
                              fontSize: '11px',
                              color: '#9CA3AF',
                              display: 'block',
                            }}
                          >
                            • Portions: {item.portions}
                          </Typography>
                        )}
                        {item.food.spiceLevel && item.spiceLevel && (
                          <Typography
                            sx={{
                              fontSize: '11px',
                              color: '#9CA3AF',
                              display: 'block',
                            }}
                          >
                            • Spice: {item.spiceLevel}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Pricing Breakdown */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#111827',
              mb: 2,
            }}
          >
            Pricing Details
          </Typography>

          <Box
            sx={{
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              p: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                  Subtotal
                </Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                  {formatCurrency(order.subtotal, order.currency)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                  Platform Fee
                </Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                  {formatCurrency(order.platformFee, order.currency)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                  Delivery Fee
                </Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#28a745' }}>
                  Free
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                  Tax
                </Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                  {formatCurrency(order.taxes, order.currency)}
                </Typography>
              </Box>
              {order.tip > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                    Tip
                  </Typography>
                  <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                    {formatCurrency(order.tip, order.currency)}
                  </Typography>
                </Box>
              )}
              {order.discount && order.discount.amount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '14px', color: '#28a745' }}>
                    Discount ({order.discount.code})
                  </Typography>
                  <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#28a745' }}>
                    -{formatCurrency(order.discount.amount, order.currency)}
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                Total {order.paymentMethod === 'Cash on Delivery' ? 'to Pay' : 'Paid'}
              </Typography>
              <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#FF9F0D' }}>
                {formatCurrency(order.totalPaid, order.currency)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Delivery Address */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#111827',
              mb: 2,
            }}
          >
            Delivery Address
          </Typography>

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              p: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '8px',
                backgroundColor: '#FFF5E6',
                color: '#FF9F0D',
                flexShrink: 0,
              }}
            >
              <IconMapPin size={20} style={{ marginTop: '8px' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>
                {order.address.street}
              </Typography>
              {order.address.apartment && (
                <Typography sx={{ fontSize: '14px', color: '#374151' }}>
                  {order.address.apartment}
                </Typography>
              )}
              <Typography sx={{ fontSize: '14px', color: '#374151' }}>
                {order.address.city}, {order.address.state} {order.address.zipCode}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Payment Method */}
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#111827',
              mb: 2,
            }}
          >
            Payment Method
          </Typography>

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              p: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '8px',
                backgroundColor: '#FFF5E6',
                color: '#FF9F0D',
                flexShrink: 0,
              }}
            >
              {order.paymentMethod === 'Cash on Delivery' ? (
                <IconCash size={20} style={{ marginTop: '8px' }} />
              ) : (
                <IconCreditCard size={20} style={{ marginTop: '8px' }} />
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>
                {order.paymentMethod}
              </Typography>
              {order.paymentMethod === 'Cash on Delivery' && (
                <Typography sx={{ fontSize: '13px', color: '#FF9500', mt: 0.5, fontWeight: 500 }}>
                  Please keep {formatCurrency(order.totalPaid, order.currency)} ready for the delivery person
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      {/* Footer - Action Buttons */}
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E5E7EB', gap: 1.5 }}>
        <Button
          onClick={handleGoToHome}
          variant="contained"
          startIcon={<IconHome size={18} />}
          sx={{
            flex: 1,
            backgroundColor: '#FF9F0D',
            color: '#FFFFFF',
            fontSize: '15px',
            fontWeight: 600,
            textTransform: 'none',
            height: '48px',
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: '#E88F0C',
            },
          }}
        >
          Go to Home
        </Button>
        <Button
          onClick={handleViewOrderHistory}
          variant="outlined"
          startIcon={<IconReceipt size={18} />}
          sx={{
            flex: 1,
            borderColor: '#E5E7EB',
            color: '#6B7280',
            fontSize: '15px',
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
          Order History
        </Button>
      </DialogActions>
    </Dialog>
  );
}
