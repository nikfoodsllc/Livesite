'use client';

import React from 'react';
import { Box, Typography, Paper, Divider, Button, Chip } from '@mui/material';
import {
  IconCircleCheck,
  IconMapPin,
  IconCalendar,
  IconCreditCard,
  IconCash,
  IconHome,
  IconReceipt,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { Order } from '@/types/order';
import { ComboSection, SelectedComboItem } from '@/types/food';
import { formatDeliveryDate } from '@/lib/orderHelpers';

interface OrderConfirmationProps {
  order: Order;
}

export default function OrderConfirmation({ order }: OrderConfirmationProps) {
  const router = useRouter();

  return (
    <Box>
      {/* Success Header */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 3,
          textAlign: 'center',
          border: '1px solid #EDEDED',
          bgcolor: '#fff',
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: '#28a745',
            mb: 2,
          }}
        >
          <IconCircleCheck size={48} color="#fff" />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {order.paymentMethod === 'Cash on Delivery'
            ? 'Order Confirmed!'
            : 'Payment Successful!'}
        </Typography>
        <Typography variant="body1" sx={{ color: '#666', mb: 2 }}>
          Thank you for your order.
        </Typography>
        <Typography variant="h6" sx={{ color: '#FF9F0D', fontWeight: 600 }}>
          Order ID: #{order.orderId}
        </Typography>
      </Paper>

      {/* Order Details */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #EDEDED' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Order Details
        </Typography>

        {/* Day-wise items */}
        {order.items.map((dayOrder, index) => {
          return (
            <Box key={index} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <IconCalendar size={20} style={{ color: '#28a745' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
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
                    fontSize: '0.75rem',
                    height: '24px',
                    borderRadius: '6px',
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: '#666', pl: 3, display: 'block' }}>
                Minimum order value: ${order.minOrderValue.toFixed(2)}
              </Typography>
              {dayOrder.items.map((item, itemIndex) => (
                <Box key={itemIndex} sx={{ pl: 3, py: 0.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    {item.food.name} x {item.quantity}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    ${item.price.toFixed(2)}
                  </Typography>
                </Box>

                {/* Combo Selections */}
                {item.comboSelections && Object.keys(item.comboSelections).length > 0 && item.food.sections && (
                  <Box sx={{ mt: 0.5, pl: 1 }}>
                    {Object.entries(item.comboSelections).map(([sectionId, itemIds]) => {
                      const section = item.food.sections?.find((s) => s._id === sectionId) as unknown as ComboSection | undefined;
                      if (!section) return null;

                      return (
                        <React.Fragment key={sectionId}>
                          {itemIds.map((itemId) => {
                            const selectedItem = section.selectedItems?.find((si) => si._id === itemId) as SelectedComboItem | undefined;
                            if (!selectedItem) return null;

                            const portionText = selectedItem.portion ? ` (${selectedItem.portion})` : '';

                            return (
                              <Typography
                                key={itemId}
                                variant="caption"
                                sx={{
                                  color: '#999',
                                  fontSize: '0.7rem',
                                  display: 'block',
                                }}
                              >
                                • {section.title}: {selectedItem.item.name}{portionText}
                              </Typography>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </Box>
                )}

                {/* Other Customizations */}
                {(item.portions || (item.food.spiceLevel && item.spiceLevel)) && (
                  <Box sx={{ mt: 0.5, pl: 1 }}>
                    {item.portions && (
                      <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem', display: 'block' }}>
                        • Portions: {item.portions}
                      </Typography>
                    )}
                    {item.food.spiceLevel && item.spiceLevel && (
                      <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem', display: 'block' }}>
                        • Spice: {item.spiceLevel}
                      </Typography>
                    )}
                  </Box>
                )}
                </Box>
              ))}
            </Box>
          );
        })}

        <Divider sx={{ my: 2 }} />

        {/* Price breakdown */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Subtotal</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              ${order.subtotal.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Platform Fee</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              ${order.platformFee.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Delivery Fee</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#28a745' }}>
              Free
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Tax</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              ${order.taxes.toFixed(2)}
            </Typography>
          </Box>
          {order.tip > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Tip</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                ${order.tip.toFixed(2)}
              </Typography>
            </Box>
          )}
          {order.discount && order.discount.amount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#28a745' }}>
                Discount ({order.discount.code})
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, color: '#28a745' }}
              >
                -${order.discount.amount.toFixed(2)}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Total {order.paymentMethod === 'Cash on Delivery' ? 'to Pay' : 'Paid'}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#FF9F0D' }}>
            ${order.totalPaid.toFixed(2)}
          </Typography>
        </Box>
      </Paper>

      {/* Delivery Address */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #EDEDED' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '8px',
              bgcolor: '#FFF5E6',
              color: '#FF9F0D',
              flexShrink: 0,
            }}
          >
            <IconMapPin size={24} style={{ marginTop: '8px' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Delivery Address
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              {order.address.street}
            </Typography>
            {order.address.apartment && (
              <Typography variant="body2" sx={{ color: '#666' }}>
                {order.address.apartment}
              </Typography>
            )}
            {order.address.floor && (
              <Typography variant="body2" sx={{ color: '#666' }}>
                Floor {order.address.floor}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: '#666' }}>
              {order.address.city}, {order.address.state}{' '}
              {order.address.zipCode}
            </Typography>
            {order.address.landmark && (
              <Typography variant="body2" sx={{ color: '#666' }}>
                Landmark: {order.address.landmark}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Payment Method */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #EDEDED' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '8px',
              bgcolor: '#FFF5E6',
              color: '#FF9F0D',
              flexShrink: 0,
            }}
          >
            {order.paymentMethod === 'Cash on Delivery' ? (
              <IconCash size={24} style={{ marginTop: '8px' }} />
            ) : (
              <IconCreditCard size={24} style={{ marginTop: '8px' }} />
            )}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Payment Method
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              {order.paymentMethod}
            </Typography>
            {order.paymentMethod === 'Cash on Delivery' && (
              <Typography
                variant="body2"
                sx={{ color: '#FF9500', mt: 1, fontWeight: 500 }}
              >
                Please keep ${order.totalPaid.toFixed(2)} ready for the delivery
                person
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mt: 3,
        }}
      >
        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={<IconHome size={20} />}
          onClick={() => router.push('/')}
          sx={{
            bgcolor: '#FF9F0D',
            color: '#fff',
            py: 1.5,
            '&:hover': {
              bgcolor: '#e68f0c',
            },
          }}
        >
          Back to Home
        </Button>
        <Button
          fullWidth
          variant="outlined"
          size="large"
          startIcon={<IconReceipt size={20} />}
          onClick={() => router.push('/account/orders')}
          sx={{
            borderColor: '#FF9F0D',
            color: '#FF9F0D',
            py: 1.5,
            '&:hover': {
              borderColor: '#FF9F0D',
              bgcolor: 'rgba(255, 159, 13, 0.05)',
            },
          }}
        >
          View My Orders
        </Button>
      </Box>
    </Box>
  );
}
