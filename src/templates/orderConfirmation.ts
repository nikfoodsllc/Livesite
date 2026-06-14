import { Order, OrderDay, OrderDayItem } from '@/types/order';
import { PST_TIMEZONE } from '@/lib/timezone';

function hasValue(value: string | undefined | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function optionalDetailRow(label: string, value: string | undefined | null): string {
  if (!hasValue(value)) return '';
  return `
    <tr>
      <td style="padding: 8px 0; color: #6B7280; font-size: 14px; width: 40%; font-weight: 600;">${label}</td>
      <td style="padding: 8px 0; color: #1A1106; font-size: 15px;">${value.trim()}</td>
    </tr>
  `;
}

function optionalPriceRow(
  label: string,
  amount: number,
  currency: string,
  formatCurrency: (amount: number, currency?: string) => string
): string {
  if (amount <= 0) return '';
  return `
    <tr>
      <td style="padding: 8px 0; color: #1A1106; font-size: 15px; width: 40%;">${label}</td>
      <td style="padding: 8px 0; color: #1A1106; font-size: 15px; text-align: right; font-weight: 600;">${formatCurrency(amount, currency)}</td>
    </tr>
  `;
}

function renderComboToppings(item: OrderDayItem): string {
  if (!item.comboSelections || !item.food.sections) return '';

  const toppingLines = item.food.sections
    .flatMap((section) => {
      const selectedItemIds = item.comboSelections?.[section._id];
      if (!selectedItemIds?.length) return [];

      return selectedItemIds
        .map((selectedItemId) => {
          const selectedItem = section.selectedItems.find((si) => si._id === selectedItemId);
          if (!selectedItem) return '';
          return `<p style="margin: 0; color: #6B7280; font-size: 12px; padding-left: 10px;">${selectedItem.item.name}</p>`;
        })
        .filter(Boolean);
    })
    .join('');

  if (!toppingLines) return '';

  return `
    <p style="margin: 8px 0 4px 0; color: #6B7280; font-size: 13px;">
      Special toppings
    </p>
    ${toppingLines}
  `;
}

function formatItemName(item: OrderDayItem): string {
  if (item.food.spiceLevel?.length && hasValue(item.spiceLevel)) {
    return `${item.food.name} (spice: ${item.spiceLevel.trim()})`;
  }
  return item.food.name;
}

/**
 * Get order confirmation email HTML template
 */
export function getOrderConfirmationEmailTemplate(order: Order): string {
  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    if (typeof date === 'string') {
      const [year, month, day] = date.split('-').map(Number);
      const d = new Date(Date.UTC(year, month - 1, day, 20));
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: PST_TIMEZONE
      });
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: PST_TIMEZONE
    });
  };

  // Calculate tips and service fees
  const tipsAndServiceFees = order.platformFee + order.tip;
  const logoUrl =
    process.env.EMAIL_LOGO_URL ||
    'https://res.cloudinary.com/dz30kdodd/image/upload/v1780207579/nikfoods/qwcozcqazeb8cuna8j2q.png';
  const deliveryInstructions = (order.deliveryMessages ?? []).filter(hasValue);
  const cityPostalCode = [order.address.city, order.address.zipCode].filter(hasValue).join(', ');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - ${order.orderId}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f5f5f5; line-height: 1.6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">

              <!-- Logo -->
              <tr>
                <td style="padding: 32px 40px 0 40px; text-align: left;">
                  <img
                    src="${logoUrl}"
                    alt="Nikfoods"
                    width="120"
                    style="display: block; border: 0; outline: none; text-decoration: none;"
                  />
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 24px 40px 20px 40px;">
                  <h2 style="margin: 0 0 30px 0; color: #1A1106; font-size: 20px; font-weight: 700;">
                    We just got your Order ${order.orderId}.
                  </h2>

                  <!-- Customer Details -->
                  <h3 style="margin: 0 0 15px 0; color: #1A1106; font-size: 16px; font-weight: 700; text-transform: uppercase;">
                    Customer Details:
                  </h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                    ${optionalDetailRow('Name', order.customerInfo.name)}
                    ${optionalDetailRow('Phone', order.customerInfo.phone)}
                    ${optionalDetailRow('Email', order.customerInfo.email)}
                  </table>

                  <!-- Order Details - Grouped by Day -->
                  <h3 style="margin: 0 0 15px 0; color: #1A1106; font-size: 16px; font-weight: 700; text-transform: uppercase;">
                    Order Details
                  </h3>

                  ${order.items.map((day: OrderDay, dayIndex: number) => `
                    <!-- Day Header -->
                    <div style="margin: ${dayIndex > 0 ? '30px' : '0'} 0 15px 0; padding: 10px 0; border-top: ${dayIndex > 0 ? '2px solid #E5E7EB' : 'none'};">
                      <h4 style="margin: 0; color: #1A1106; font-size: 15px; font-weight: 700;">
                        ${day.day}
                      </h4>
                      <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 13px;">
                        Deliver on ${formatDate(day.actualDeliveryDate || day.deliveryDate)}
                      </p>
                    </div>

                    ${day.items.map((item: OrderDayItem, itemIndex: number) => `
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
                        <tr>
                          <td style="padding: 0; vertical-align: top;">
                            <!-- Left: Item Details -->
                            <div style="margin-bottom: 8px;">
                              <p style="margin: 0 0 8px 0; color: #1A1106; font-size: 15px; font-weight: 600;">
                                ${formatItemName(item)}
                              </p>
                              ${hasValue(item.selectedPortion) ? `
                                <p style="margin: 0 0 4px 0; color: #6B7280; font-size: 13px;">
                                  ${item.selectedPortion.trim()}
                                </p>
                              ` : ''}
                              ${renderComboToppings(item)}
                              ${hasValue(item.notes) ? `
                                <p style="margin: 8px 0 0 0; color: #059669; font-size: 12px; font-style: italic;">
                                  ${item.notes.trim()}
                                </p>
                              ` : ''}
                            </div>
                          </td>
                          <td style="padding: 0; vertical-align: top; text-align: right; white-space: nowrap;">
                            <!-- Right: Quantity and Price -->
                            <p style="margin: 0; color: #1A1106; font-size: 15px; font-weight: 600;">
                              x${item.quantity} ${formatCurrency(item.price * item.quantity, order.currency)}
                            </p>
                          </td>
                        </tr>
                      </table>
                    `).join('')}
                  `).join('')}

                  <!-- Price Summary -->
                  <h3 style="margin: 30px 0 15px 0; color: #1A1106; font-size: 16px; font-weight: 700; text-transform: uppercase;">
                    Price Summary
                  </h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 8px 0; color: #1A1106; font-size: 15px; width: 40%;">Subtotal</td>
                      <td style="padding: 8px 0; color: #1A1106; font-size: 15px; text-align: right; font-weight: 600;">${formatCurrency(order.subtotal, order.currency)}</td>
                    </tr>
                    ${optionalPriceRow('Tips, service fees', tipsAndServiceFees, order.currency, formatCurrency)}
                    ${optionalPriceRow('Delivery', order.deliveryFee, order.currency, formatCurrency)}
                    ${order.discount && order.discount.amount > 0 ? `
                    <tr>
                      <td style="padding: 8px 0; color: #1A1106; font-size: 15px; width: 40%;">Discount${hasValue(order.discount.code) ? ` (${order.discount.code.trim()})` : ''}</td>
                      <td style="padding: 8px 0; color: #1A1106; font-size: 15px; text-align: right; font-weight: 600;">-${formatCurrency(order.discount.amount, order.currency)}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="padding: 8px 0; color: #1A1106; font-size: 15px; width: 40%;">Tax (10.3%)</td>
                      <td style="padding: 8px 0; color: #1A1106; font-size: 15px; text-align: right; font-weight: 600;">${formatCurrency(order.taxes, order.currency)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0 0 0; border-top: 2px solid #E5E7EB; color: #1A1106; font-size: 16px; width: 40%; font-weight: 700;">Total</td>
                      <td style="padding: 12px 0 0 0; border-top: 2px solid #E5E7EB; color: #1A1106; font-size: 16px; text-align: right; font-weight: 700;">${formatCurrency(order.totalPaid, order.currency)}</td>
                    </tr>
                  </table>

                  <!-- Delivery Details -->
                  <h3 style="margin: 0 0 15px 0; color: #1A1106; font-size: 16px; font-weight: 700; text-transform: uppercase;">
                    Delivery Details:
                  </h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                    ${optionalDetailRow('Customer Name', order.customerInfo.name)}
                    ${optionalDetailRow('Address', order.address.street)}
                    ${optionalDetailRow('Apartment', order.address.apartment)}
                    ${optionalDetailRow('Delivery Instruction', order.address.floor)}
                    ${optionalDetailRow('Gate Code', order.address.entrance)}
                    ${optionalDetailRow('Landmark', order.address.landmark)}
                    ${optionalDetailRow('City, Postal Code', cityPostalCode || undefined)}
                  </table>

                  ${deliveryInstructions.length > 0 ? `
                  <h3 style="margin: 0 0 15px 0; color: #1A1106; font-size: 16px; font-weight: 700; text-transform: uppercase;">
                    Delivery Notes:
                  </h3>
                  <ul style="margin: 0 0 30px 0; padding-left: 20px; color: #1A1106; font-size: 14px; line-height: 1.8;">
                    ${deliveryInstructions.map((message) => `<li>${message.trim()}</li>`).join('')}
                  </ul>
                  ` : ''}

                </td>
              </tr>

              <!-- Track Your Order -->
              <tr>
                <td style="padding: 30px 40px; background-color: #F0F9FF; border-top: 1px solid #E5E7EB;">
                  <h3 style="margin: 0 0 15px 0; color: #1A1106; font-size: 16px; font-weight: 700;">
                    Track your order
                  </h3>
                  <ul style="margin: 0; padding-left: 20px; color: #1A1106; font-size: 14px; line-height: 1.8;">
                    <li>On the delivery day, we share tracking details via email/text in the morning, including a live tracking link.</li>
                    <li>You'll also receive a confirmation email/text once the order is delivered, with a photo of the drop-off location.</li>
                  </ul>
                </td>
              </tr>

              <!-- How Delivery Works -->
              <tr>
                <td style="padding: 30px 40px; background-color: #FFF4E4; border-top: 1px solid #E5E7EB;">
                  <h3 style="margin: 0 0 15px 0; color: #996B00; font-size: 16px; font-weight: 700;">
                    How delivery works
                  </h3>
                  <ul style="margin: 0; padding-left: 20px; color: #996B00; font-size: 14px; line-height: 1.8;">
                    <li>We review your order against the weekly menu.</li>
                    <li>Delivery happens once the minimum order value for the selected day is met.</li>
                    <li>If not, your order is combined with the next delivery day.</li>
                    <li>For offices, condos, or apartments orders are delivered to the concierge, front desk, or mailroom.</li>
                  </ul>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    © ${new Date().getFullYear()} NikFoods. All rights reserved.
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

