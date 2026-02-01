'use client';

import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';
import { CartDay } from '@/types/cart';
import { formatSpiceLevel } from '@/utils/formatters';
import { type DayDeliveryInfo } from '@/lib/deliveryCalculator';
import DeliveryDateBadge from './DeliveryDateBadge';

interface CheckoutOrderSummaryProps {
  cartDays: CartDay[];
  subtotal: number;
  platformFee: number;
  deliveryFee: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
  deliveryCalculations?: DayDeliveryInfo[];
  discountCode?: string;
}

export default function CheckoutOrderSummary({
  cartDays,
  subtotal,
  platformFee,
  deliveryFee,
  tax,
  tip,
  discount,
  total,
  deliveryCalculations = [],
  discountCode,
}: CheckoutOrderSummaryProps) {
  // Create a map for quick lookup of delivery calculations by date
  const deliveryCalcMap = new Map<string, DayDeliveryInfo>();
  deliveryCalculations.forEach((calc) => {
    deliveryCalcMap.set(calc.originalDate, calc);
  });

  // Add diagnostic logging
  console.log('=== CHECKOUT ORDER SUMMARY ===');
  console.log('Delivery calculations received:', deliveryCalculations);
  console.log('Delivery calc map size:', deliveryCalcMap.size);
  console.log('Delivery calc map keys:', Array.from(deliveryCalcMap.keys()));
  console.log('Cart days received:', cartDays);
  console.log('Cart day dates:', cartDays.map(d => d.date));
  console.log('Matches found:', cartDays.map(d => deliveryCalcMap.has(d.date)));
  console.log('=== END CHECKOUT ORDER SUMMARY ===');

  return (
    <Box sx={{ position: 'sticky', top: 20 }}>
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #EDEDED' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Order Summary
        </Typography>

        {/* Day-wise breakdown */}
        <Box sx={{ mb: 2 }}>
          {cartDays.map((cartDay) => (
            <Box key={cartDay._id} sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 1,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: '#FF9F0D',
                  }}
                >
                  {/*
                    Display formatted date which already includes the day name (e.g., "Friday, Jan 15, 2026")
                    Only display the day field separately if formattedDate is not available
                  */}
                  {cartDay.formattedDate || cartDay.day}
                  {!cartDay.formattedDate && cartDay.date && (
                    <>
                      {' '}
                      ({cartDay.date})
                    </>
                  )}
                </Typography>
              </Box>

              {/* Delivery Date Badge */}
              {deliveryCalcMap.has(cartDay.date) && (
                <DeliveryDateBadge dayInfo={deliveryCalcMap.get(cartDay.date)!} />
              )}
              {cartDay.items.map((item) => (
                <Box key={item._id} sx={{ mb: 1, pl: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      {item.foodItem.name} x {item.quantity}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      ${item.totalPrice.toFixed(2)}
                    </Typography>
                  </Box>

                  {/* Combo Selections */}
                  {item.comboSelections && Object.keys(item.comboSelections).length > 0 && item.foodItem.sections && (
                    <Box sx={{ mt: 0.5, pl: 1 }}>
                      {Object.entries(item.comboSelections).map(([sectionId, itemIds]) => {
                        const section = item.foodItem.sections?.find((s) => s._id === sectionId);
                        if (!section) return null;

                        return (
                          <React.Fragment key={sectionId}>
                            {itemIds.map((itemId) => {
                              const selectedItem = section.selectedItems.find((si) => si._id === itemId);
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
                  {(item.selectedPortion || (item.foodItem.hasSpiceLevel && item.selectedSpiceLevel)) && (
                    <Box sx={{ mt: 0.5, pl: 1 }}>
                      {item.selectedPortion && (
                        <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem', display: 'block' }}>
                          • {item.selectedPortion}
                        </Typography>
                      )}
                      {item.foodItem.hasSpiceLevel && item.selectedSpiceLevel && (
                        <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem', display: 'block' }}>
                          • Spice: {formatSpiceLevel(item.selectedSpiceLevel)}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              ))}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  pt: 1,
                  pl: 1,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Day Total:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  ${cartDay.dayTotal.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Price breakdown */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Subtotal</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              ${subtotal.toFixed(2)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Platform Fee</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              ${platformFee.toFixed(2)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Delivery Fee</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#28a745' }}>
              Free
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Tax (10.2%)</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              ${tax.toFixed(2)}
            </Typography>
          </Box>

          {tip > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Tip</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                ${tip.toFixed(2)}
              </Typography>
            </Box>
          )}

          {discount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#28a745' }}>
                {discountCode ? `Discount (${discountCode})` : 'Discount'}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, color: '#28a745' }}
              >
                -${discount.toFixed(2)}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Total */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Total
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#FF9F0D' }}>
            ${total.toFixed(2)}
          </Typography>
        </Box>

        {/* Item count */}
        <Typography
          variant="body2"
          sx={{ mt: 2, color: '#666', textAlign: 'center' }}
        >
          {cartDays.reduce((sum, day) => sum + day.items.length, 0)} items in
          order
        </Typography>
      </Paper>
    </Box>
  );
}
