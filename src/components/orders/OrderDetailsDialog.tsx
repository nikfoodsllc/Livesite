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
} from '@mui/material';
import { IconX, IconMapPin, IconHome } from '@tabler/icons-react';
import { Order } from '@/types/order';
import { formatOrderDate, formatDeliveryDate, formatCurrency } from '@/lib/orderHelpers';
import StatusBadge from './StatusBadge';

interface OrderDetailsDialogProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
}

export default function OrderDetailsDialog({ open, order, onClose }: OrderDetailsDialogProps) {
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            Order #{order.orderId}
          </Typography>
          <StatusBadge status={order.status} size="medium" />
        </Box>
        <IconButton onClick={onClose} size="small">
          <IconX size={20} />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ px: 3, py: 3 }}>
        {/* Order Date */}
        <Typography sx={{ fontSize: '14px', color: '#6B7280', mb: 3 }}>
          Placed on {formatOrderDate(order.createdAt!)}
        </Typography>

        {/* Store & Address Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
            <IconHome size={20} color="#6B7280" style={{ marginTop: '2px' }} />
            <Box>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827', mb: 0.5 }}>
                Nikfoods
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                San Francisco
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <IconMapPin size={20} color="#6B7280" style={{ marginTop: '2px' }} />
            <Box>
              <Typography sx={{ fontSize: '14px', color: '#374151' }}>
                {order.address.street}
                {order.address.apartment && `, ${order.address.apartment}`}
                {order.address.floor && `, Floor ${order.address.floor}`}
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#374151' }}>
                {order.address.city}, {order.address.state} {order.address.zipCode}
              </Typography>
              {order.address.landmark && (
                <Typography sx={{ fontSize: '13px', color: '#6B7280', mt: 0.5 }}>
                  Landmark: {order.address.landmark}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Order Items by Day */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827', mb: 2 }}>
            Order Items
          </Typography>

          {order.items.map((dayOrder, dayIndex) => (
            <Box key={dayIndex} sx={{ mb: 3 }}>
              {/* Day Header */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1.5,
                  pb: 1,
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                  {dayOrder.day}&apos;s Item
                </Typography>
                <Typography
                  sx={{
                    fontSize: '13px',
                    color: '#FF9F0D',
                    fontWeight: 500,
                  }}
                >
                  {formatDeliveryDate(dayOrder.actualDeliveryDate || dayOrder.deliveryDate)}
                </Typography>
              </Box>

              {/* Items Table */}
              <Box sx={{ mb: 2 }}>
                {dayOrder.items.map((item, itemIndex) => (
                  <Box
                    key={itemIndex}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1 }}>
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
                          mt: 0.25,
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

                      {/* Item Details */}
                      <Box>
                        <Typography sx={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>
                          {item.quantity} × {item.food.name}
                        </Typography>

                        {/* Portion, Spice Level, Eco Container */}
                        {(item.selectedPortion || item.spiceLevel || item.isEcoFriendlyContainer) && (
                          <Typography sx={{ fontSize: '12px', color: '#6B7280', mt: 0.25 }}>
                            {item.selectedPortion && `${item.selectedPortion}`}
                            {item.selectedPortion && item.spiceLevel && ' • '}
                            {item.spiceLevel || (item.food.spiceLevel && item.spiceLevel)}
                            {(item.selectedPortion || item.spiceLevel) && item.isEcoFriendlyContainer && ' • '}
                            {item.isEcoFriendlyContainer && '♻️ Eco-Friendly Container'}
                          </Typography>
                        )}

                        {/* Combo Selections */}
                        {item.comboSelections && item.food.sections && Object.keys(item.comboSelections).length > 0 && (
                          <Box sx={{ mt: 0.5 }}>
                            {item.food.sections.map((section) => {
                              const selectedItemId = item.comboSelections?.[section._id];
                              if (!selectedItemId) return null;

                              const selectedItem = section.selectedItems.find(
                                (si) => si._id === selectedItemId
                              );

                              if (!selectedItem) return null;

                              return (
                                <Typography
                                  key={section._id}
                                  sx={{ fontSize: '11px', color: '#6B7280', display: 'block', lineHeight: 1.4 }}
                                >
                                  {section.title}: {selectedItem.item.name}
                                  {selectedItem.price > 0 && ` (+${formatCurrency(selectedItem.price, order.currency)})`}
                                </Typography>
                              );
                            })}
                          </Box>
                        )}

                        {/* Notes */}
                        {item.notes && (
                          <Typography sx={{ fontSize: '11px', color: '#059669', mt: 0.5, fontStyle: 'italic' }}>
                            Note: {item.notes}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Item Price */}
                    <Typography
                      sx={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#111827',
                        ml: 2,
                        flexShrink: 0,
                      }}
                    >
                      {formatCurrency(item.price * item.quantity, order.currency)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Day Subtotal */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  pt: 1,
                  borderTop: '1px solid #F3F4F6',
                }}
              >
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                  Day Subtotal
                </Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                  {formatCurrency(dayOrder.dayTotal, order.currency)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Order Summary */}
        <Box>
          <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827', mb: 2 }}>
            Order Summary
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '14px', color: '#374151' }}>Item Total</Typography>
              <Typography sx={{ fontSize: '14px', color: '#374151' }}>
                {formatCurrency(order.subtotal, order.currency)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '14px', color: '#374151' }}>Platform Fee</Typography>
              <Typography sx={{ fontSize: '14px', color: '#374151' }}>
                {formatCurrency(order.platformFee, order.currency)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '14px', color: '#374151' }}>
                Delivery Partner Fee
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#28a745', fontWeight: 500 }}>
                Free
              </Typography>
            </Box>

            {order.tip > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '14px', color: '#374151' }}>Tip</Typography>
                <Typography sx={{ fontSize: '14px', color: '#374151' }}>
                  {formatCurrency(order.tip, order.currency)}
                </Typography>
              </Box>
            )}

            {order.discount && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '14px', color: '#0A9750' }}>
                  Discount ({order.discount.code})
                </Typography>
                <Typography sx={{ fontSize: '14px', color: '#0A9750' }}>
                  -{formatCurrency(order.discount.amount, order.currency)}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '14px', color: '#374151' }}>Taxes</Typography>
              <Typography sx={{ fontSize: '14px', color: '#374151' }}>
                {formatCurrency(order.taxes, order.currency)}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Total */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>
              Total
            </Typography>
            <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>
              {formatCurrency(order.totalPaid, order.currency)}
            </Typography>
          </Box>

          {/* Payment Method */}
          <Typography sx={{ fontSize: '13px', color: '#6B7280' }}>
            Paid via {order.paymentMethod}
          </Typography>
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
