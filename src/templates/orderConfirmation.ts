import { Order, OrderDay, OrderDayItem } from '@/types/order';
import { PST_TIMEZONE } from '@/lib/timezone';

/**
 * Get order confirmation email HTML template
 */
export function getOrderConfirmationEmailTemplate(order: Order): string {
  const formatDate = (date: Date | string) => {
    // Handle string dates by creating at noon PST to avoid boundary issues
    // This matches the approach in orderHelpers.ts to ensure consistency
    if (typeof date === 'string') {
      // Parse YYYY-MM-DD format
      const [year, month, day] = date.split('-').map(Number);
      // Create date at noon PST (20:00 UTC) to avoid DST boundary issues
      const d = new Date(Date.UTC(year, month - 1, day, 20));
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: PST_TIMEZONE
      });
    }

    // Handle Date objects - format with PST timezone
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: PST_TIMEZONE
    });
  };

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatPhone = (phone: string) => {
    // Basic phone formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatAddress = (address: Order['address']) => {
    const parts = [address.street];
    if (address.apartment) parts.push(`Apt ${address.apartment}`);
    if (address.floor) parts.push(`Floor ${address.floor}`);
    parts.push(`${address.city}, ${address.state} ${address.zipCode}`);
    if (address.landmark) parts.push(`Landmark: ${address.landmark}`);
    return parts.join(', ');
  };

  const getDeliveryStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'confirmed': return '#4CAF50';
      case 'preparing': return '#2196F3';
      case 'ready': return '#FF9800';
      case 'out_for_delivery': return '#9C27B0';
      case 'delivered': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#666666';
    }
  };

  const getPaymentStatusText = (status: Order['paymentStatus']) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'unpaid': return 'Pending';
      case 'failed': return 'Failed';
      case 'refunded': return 'Refunded';
      default: return status;
    }
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - ${order.orderId}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);">

              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #FF9F0D 0%, #FF6B35 100%); padding: 40px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">NikFoods</h1>
                  <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">Order Confirmation</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px 0; color: #1A1106; font-size: 24px; font-weight: 700;">
                    Thank you for your order, ${order.customerInfo.name}! 🎉
                  </h2>

                  <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                    Your order has been ${order.status === 'confirmed' ? 'confirmed' : 'received'} and is being processed.
                    You'll receive your delicious Indian food according to your selected delivery schedule.
                  </p>

                  <!-- Order ID Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                    <tr>
                      <td align="center">
                        <div style="display: inline-block; background: linear-gradient(135deg, #FFF9F2 0%, #FFE8CC 100%); border: 3px solid #FF9F0D; border-radius: 12px; padding: 24px 48px;">
                          <p style="margin: 0; color: #999999; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Order Number</p>
                          <p style="margin: 8px 0 0 0; color: #FF9F0D; font-size: 28px; font-weight: 800; letter-spacing: 2px; font-family: 'Courier New', monospace;">${order.orderId}</p>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Order Status -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #F0F9FF; border-left: 4px solid #2196F3; border-radius: 8px;">
                    <tr>
                      <td style="padding: 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="50%">
                              <p style="margin: 0 0 8px 0; color: #1A1106; font-size: 14px; font-weight: 600;">
                                Order Status
                              </p>
                              <p style="margin: 0; color: ${getDeliveryStatusColor(order.status)}; font-size: 18px; font-weight: 700; text-transform: capitalize;">
                                ${order.status.replace('_', ' ')}
                              </p>
                            </td>
                            <td width="50%" align="right">
                              <p style="margin: 0 0 8px 0; color: #1A1106; font-size: 14px; font-weight: 600;">
                                Payment Status
                              </p>
                              <p style="margin: 0; color: #1A1106; font-size: 18px; font-weight: 700;">
                                ${getPaymentStatusText(order.paymentStatus)}
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Delivery Schedule & Items -->
                  <h3 style="margin: 30px 0 20px 0; color: #1A1106; font-size: 20px; font-weight: 700;">Delivery Schedule & Items</h3>

                  ${order.items.map((day: OrderDay) => `
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
                      <tr>
                        <td style="background-color: #F9FAFB; padding: 16px 20px; border-bottom: 1px solid #E5E7EB;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td>
                                <h4 style="margin: 0; color: #1A1106; font-size: 18px; font-weight: 700;">${day.day}</h4>
                                <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 14px;">
                                  ${formatDate(day.actualDeliveryDate || day.deliveryDate)}
                                </p>
                              </td>
                              <td align="right" style="color: #1A1106; font-size: 18px; font-weight: 700;">
                                ${formatCurrency(day.dayTotal, order.currency)}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0;">
                          ${day.items.map((item: OrderDayItem, itemIndex: number) => `
                            <table width="100%" cellpadding="0" cellspacing="0" style="${itemIndex < day.items.length - 1 ? 'border-bottom: 1px solid #F3F4F6;' : ''}">
                              <tr>
                                <td style="padding: 16px 20px;">
                                  <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                      <td>
                                        <p style="margin: 0 0 4px 0; color: #1A1106; font-size: 16px; font-weight: 600;">
                                          ${item.quantity} × ${item.food.name}
                                        </p>
                                        ${item.selectedPortion || item.spiceLevel || item.isEcoFriendlyContainer ? `
                                          <p style="margin: 0 0 4px 0; color: #6B7280; font-size: 13px;">
                                            ${item.selectedPortion ? `Portion: ${item.selectedPortion}` : ''}
                                            ${item.selectedPortion && (item.spiceLevel || item.isEcoFriendlyContainer) ? ' | ' : ''}
                                            ${item.spiceLevel ? `Spice: ${item.spiceLevel}` : ''}
                                            ${(item.selectedPortion || item.spiceLevel) && item.isEcoFriendlyContainer ? ' | ' : ''}
                                            ${item.isEcoFriendlyContainer ? '♻️ Eco-Friendly Container' : ''}
                                          </p>
                                        ` : ''}
                                        ${item.comboSelections && item.food.sections && Object.keys(item.comboSelections).length > 0 ? `
                                          <div style="margin: 4px 0;">
                                            ${item.food.sections.map(section => {
                                              const selectedItemIds = item.comboSelections?.[section._id];
                                              if (!selectedItemIds || selectedItemIds.length === 0) return '';
                                              return selectedItemIds.map(selectedItemId => {
                                                const selectedItem = section.selectedItems.find(si => si._id === selectedItemId);
                                                if (!selectedItem) return '';
                                                return `<p style="margin: 0 0 2px 0; color: #6B7280; font-size: 12px;">• ${section.title}: ${selectedItem.item.name}${selectedItem.price > 0 ? ` (+${formatCurrency(selectedItem.price, order.currency)})` : ''}</p>`;
                                              }).join('');
                                            }).join('')}
                                          </div>
                                        ` : ''}
                                        ${item.notes ? `<p style="margin: 4px 0 0 0; color: #059669; font-size: 12px; font-style: italic;"><em>Note: ${item.notes}</em></p>` : ''}
                                      </td>
                                      <td align="right" style="color: #1A1106; font-size: 16px; font-weight: 600;">
                                        ${item.quantity} × ${formatCurrency(item.price, order.currency)}
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          `).join('')}
                        </td>
                      </tr>
                    </table>
                  `).join('')}

                  <!-- Delivery Address -->
                  <h3 style="margin: 30px 0 20px 0; color: #1A1106; font-size: 20px; font-weight: 700;">Delivery Address</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #FFF4E4; border-left: 4px solid #FFB82E; border-radius: 8px;">
                    <tr>
                      <td style="padding: 20px;">
                        <p style="margin: 0; color: #996B00; font-size: 16px; line-height: 1.5;">
                          ${formatAddress(order.address)}
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Payment Summary -->
                  <h3 style="margin: 30px 0 20px 0; color: #1A1106; font-size: 20px; font-weight: 700;">Payment Summary</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border: 1px solid #E5E7EB; border-radius: 12px;">
                    <tr>
                      <td style="padding: 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Subtotal</td>
                            <td align="right" style="padding: 8px 0; color: #1A1106; font-size: 14px; font-weight: 600;">
                              ${formatCurrency(order.subtotal, order.currency)}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Platform Fee</td>
                            <td align="right" style="padding: 8px 0; color: #1A1106; font-size: 14px; font-weight: 600;">
                              ${formatCurrency(order.platformFee, order.currency)}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Delivery Fee</td>
                            <td align="right" style="padding: 8px 0; color: #059669; font-size: 14px; font-weight: 600;">
                              FREE
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Taxes</td>
                            <td align="right" style="padding: 8px 0; color: #1A1106; font-size: 14px; font-weight: 600;">
                              ${formatCurrency(order.taxes, order.currency)}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Tip</td>
                            <td align="right" style="padding: 8px 0; color: #1A1106; font-size: 14px; font-weight: 600;">
                              ${formatCurrency(order.tip, order.currency)}
                            </td>
                          </tr>
                          ${order.discount ? `
                            <tr>
                              <td style="padding: 8px 0; color: #059669; font-size: 14px;">Discount (${order.discount.code})</td>
                              <td align="right" style="padding: 8px 0; color: #059669; font-size: 14px; font-weight: 600;">
                                -${formatCurrency(order.discount.amount, order.currency)}
                              </td>
                            </tr>
                          ` : ''}
                          <tr>
                            <td style="padding: 12px 0 0 0; border-top: 2px solid #E5E7EB; color: #1A1106; font-size: 18px; font-weight: 700;">
                              Total Paid
                            </td>
                            <td align="right" style="padding: 12px 0 0 0; border-top: 2px solid #E5E7EB; color: #1A1106; font-size: 18px; font-weight: 700;">
                              ${formatCurrency(order.totalPaid, order.currency)}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Payment Method -->
                  <h3 style="margin: 30px 0 20px 0; color: #1A1106; font-size: 20px; font-weight: 700;">Payment Method</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #F0F9FF; border-left: 4px solid #2196F3; border-radius: 8px;">
                    <tr>
                      <td style="padding: 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="50%">
                              <p style="margin: 0; color: #1A1106; font-size: 16px; font-weight: 700;">
                                ${order.paymentMethod === 'Cash on Delivery' ? '💵 Cash on Delivery' : '💳 Credit Card'}
                              </p>
                              <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 14px;">
                                ${order.paymentStatus === 'paid' ? 'Payment Completed' :
                                  order.paymentMethod === 'Cash on Delivery' ? 'Pay on delivery' : 'Payment pending'}
                              </p>
                            </td>
                            <td width="50%" align="right">
                              <p style="margin: 0; color: #1A1106; font-size: 18px; font-weight: 700;">
                                ${formatCurrency(order.totalPaid, order.currency)}
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Contact Information -->
                  <h3 style="margin: 30px 0 20px 0; color: #1A1106; font-size: 20px; font-weight: 700;">Contact Information</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 20px; background-color: #F9FAFB; border-radius: 8px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="50%">
                              <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px;">Customer Name</p>
                              <p style="margin: 0; color: #1A1106; font-size: 16px; font-weight: 600;">${order.customerInfo.name}</p>
                            </td>
                            <td width="50%">
                              <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px;">Email</p>
                              <p style="margin: 0; color: #1A1106; font-size: 16px; font-weight: 600;">${order.customerInfo.email}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>


                  <!-- Support Information -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0; background-color: #F0F9FF; border-left: 4px solid #2196F3; border-radius: 8px;">
                    <tr>
                      <td style="padding: 20px;">
                        <p style="margin: 0 0 12px 0; color: #1A1106; font-size: 16px; font-weight: 600;">
                          Need Help?
                        </p>
                        <ul style="margin: 0; padding-left: 20px; color: #0066B2; font-size: 14px; line-height: 1.8;">
                          <li>Contact our support team at nikfoodsllc@gmail.com</li>
                          <li>Visit our website at www.nikfoods.com</li>
                          <li>Track your order status in real-time through our app</li>
                        </ul>
                      </td>
                    </tr>
                  </table>

                  <!-- Important Information -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0; background-color: #FFF4E4; border-left: 4px solid #FFB82E; border-radius: 8px;">
                    <tr>
                      <td style="padding: 20px;">
                        <p style="margin: 0 0 12px 0; color: #996B00; font-size: 16px; font-weight: 600;">
                          Important Information:
                        </p>
                        <ul style="margin: 0; padding-left: 20px; color: #996B00; font-size: 14px; line-height: 1.8;">
                          <li>Please have the exact amount ready for Cash on Delivery orders</li>
                          <li>Food is prepared fresh and delivered at optimal temperature</li>
                        </ul>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                    © ${new Date().getFullYear()} NikFoods. All rights reserved.
                  </p>
                  <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                    Authentic Indian food delivered to your doorstep
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 11px; line-height: 1.4;">
                    If you have any questions about your order, please don't hesitate to contact our customer support team.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}