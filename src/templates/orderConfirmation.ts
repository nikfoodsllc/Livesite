import { Order, OrderDay, OrderDayItem } from '@/types/order';
import { PST_TIMEZONE } from '@/lib/timezone';

function hasValue(value: string | undefined | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function sectionLabel(title: string): string {
  return `
    <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
      ${title}
    </p>
  `;
}

function detailLine(label: string, value: string | undefined | null): string {
  if (!hasValue(value)) return '';
  return `
    <tr>
      <td style="padding: 3px 0; color: #6B7280; font-size: 12px; width: 42%; vertical-align: top;">${label}</td>
      <td style="padding: 3px 0 3px 8px; color: #1A1106; font-size: 13px; vertical-align: top;">${value.trim()}</td>
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
      <td style="padding: 4px 0; color: #374151; font-size: 13px;">${label}</td>
      <td style="padding: 4px 0; color: #1A1106; font-size: 13px; text-align: right; font-weight: 600;">${formatCurrency(amount, currency)}</td>
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
          return `<p style="margin: 0; color: #6B7280; font-size: 11px; padding-left: 8px;">${selectedItem.item.name}</p>`;
        })
        .filter(Boolean);
    })
    .join('');

  if (!toppingLines) return '';

  return `
    <p style="margin: 4px 0 2px 0; color: #6B7280; font-size: 12px;">Special toppings</p>
    ${toppingLines}
  `;
}

function formatItemName(item: OrderDayItem): string {
  if (item.food.spiceLevel?.length && hasValue(item.spiceLevel)) {
    return `${item.food.name} (spice: ${item.spiceLevel.trim()})`;
  }
  return item.food.name;
}

function renderOrderItemRow(
  item: OrderDayItem,
  currency: string,
  formatCurrency: (amount: number, currency?: string) => string
): string {
  return `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #F3F4F6; vertical-align: top;">
        <p style="margin: 0; color: #1A1106; font-size: 13px; font-weight: 600; line-height: 1.4;">
          ${formatItemName(item)}
        </p>
        ${hasValue(item.selectedPortion) ? `
          <p style="margin: 2px 0 0 0; color: #6B7280; font-size: 12px;">
            ${item.selectedPortion.trim()}
          </p>
        ` : ''}
        ${renderComboToppings(item)}
        ${hasValue(item.notes) ? `
          <p style="margin: 4px 0 0 0; color: #059669; font-size: 11px; font-style: italic;">
            ${item.notes.trim()}
          </p>
        ` : ''}
      </td>
      <td style="padding: 8px 6px; border-bottom: 1px solid #F3F4F6; vertical-align: top; text-align: center; color: #374151; font-size: 13px; white-space: nowrap; width: 36px;">
        x${item.quantity}
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid #F3F4F6; vertical-align: top; text-align: right; color: #1A1106; font-size: 13px; font-weight: 600; white-space: nowrap; width: 72px;">
        ${formatCurrency(item.price * item.quantity, currency)}
      </td>
    </tr>
  `;
}

function renderDayBlock(
  day: OrderDay,
  dayIndex: number,
  currency: string,
  formatCurrency: (amount: number, currency?: string) => string,
  formatDate: (date: Date | string) => string
): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: ${dayIndex > 0 ? '12px' : '0'}; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="padding: 10px 12px; background-color: #FFF9F2; border-bottom: 1px solid #E5E7EB;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align: middle;">
                <p style="margin: 0; color: #1A1106; font-size: 14px; font-weight: 700;">${day.day}</p>
              </td>
              <td style="vertical-align: middle; text-align: right;">
                <p style="margin: 0; color: #6B7280; font-size: 12px;">Deliver on ${formatDate(day.actualDeliveryDate || day.deliveryDate)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 12px 4px 12px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 6px 0 4px 0; color: #9CA3AF; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;">Item</td>
              <td style="padding: 6px 6px 4px 0; color: #9CA3AF; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; text-align: center; width: 36px;">Qty</td>
              <td style="padding: 6px 0 4px 0; color: #9CA3AF; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; text-align: right; width: 72px;">Price</td>
            </tr>
            ${day.items.map((item) => renderOrderItemRow(item, currency, formatCurrency)).join('')}
          </table>
        </td>
      </tr>
    </table>
  `;
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
        timeZone: PST_TIMEZONE,
      });
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: PST_TIMEZONE,
    });
  };

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
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5; line-height: 1.5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 24px 12px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">

              <!-- Header -->
              <tr>
                <td style="padding: 20px 24px 12px 24px; border-bottom: 1px solid #E5E7EB;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align: middle; width: 120px;">
                        <img
                          src="${logoUrl}"
                          alt="Nikfoods"
                          width="100"
                          style="display: block; border: 0; outline: none; text-decoration: none;"
                        />
                      </td>
                      <td style="vertical-align: middle; text-align: right;">
                        <p style="margin: 0 0 4px 0; color: #059669; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">
                          Order confirmed
                        </p>
                        <p style="margin: 0; color: #6B7280; font-size: 13px;">Total ${formatCurrency(order.totalPaid, order.currency)}</p>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 12px 0 0 0; color: #1A1106; font-size: 20px; font-weight: 700; line-height: 1.3;">
                    We just got your Order ${order.orderId}.
                  </p>
                </td>
              </tr>

              <!-- Customer + Delivery -->
              <tr>
                <td style="padding: 14px 24px; border-bottom: 1px solid #E5E7EB;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align: top; width: 50%; padding-right: 10px;">
                        ${sectionLabel('Customer Details:')}
                        <table width="100%" cellpadding="0" cellspacing="0">
                          ${detailLine('Name', order.customerInfo.name)}
                          ${detailLine('Phone', order.customerInfo.phone)}
                          ${detailLine('Email', order.customerInfo.email)}
                        </table>
                      </td>
                      <td style="vertical-align: top; width: 50%; padding-left: 10px; border-left: 1px solid #F3F4F6;">
                        ${sectionLabel('Delivery Details:')}
                        <table width="100%" cellpadding="0" cellspacing="0">
                          ${detailLine('Customer Name', order.customerInfo.name)}
                          ${detailLine('Address', order.address.street)}
                          ${detailLine('Apartment', order.address.apartment)}
                          ${detailLine('Delivery Instruction', order.address.floor)}
                          ${detailLine('Gate Code', order.address.entrance)}
                          ${detailLine('Landmark', order.address.landmark)}
                          ${detailLine('City, Postal Code', cityPostalCode || undefined)}
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Order items -->
              <tr>
                <td style="padding: 14px 24px;">
                  ${sectionLabel('Order Details')}
                  ${order.items.map((day, dayIndex) => renderDayBlock(day, dayIndex, order.currency, formatCurrency, formatDate)).join('')}

                  <!-- Price summary -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 14px; background-color: #FAFAFA; border: 1px solid #E5E7EB; border-radius: 8px;">
                    <tr>
                      <td style="padding: 12px 14px;">
                        ${sectionLabel('Price Summary')}
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 4px 0; color: #374151; font-size: 13px;">Subtotal</td>
                            <td style="padding: 4px 0; color: #1A1106; font-size: 13px; text-align: right; font-weight: 600;">${formatCurrency(order.subtotal, order.currency)}</td>
                          </tr>
                          ${optionalPriceRow('Tips, service fees', tipsAndServiceFees, order.currency, formatCurrency)}
                          ${optionalPriceRow('Delivery', order.deliveryFee, order.currency, formatCurrency)}
                          ${order.discount && order.discount.amount > 0 ? `
                          <tr>
                            <td style="padding: 4px 0; color: #374151; font-size: 13px;">Discount${hasValue(order.discount.code) ? ` (${order.discount.code.trim()})` : ''}</td>
                            <td style="padding: 4px 0; color: #1A1106; font-size: 13px; text-align: right; font-weight: 600;">-${formatCurrency(order.discount.amount, order.currency)}</td>
                          </tr>
                          ` : ''}
                          <tr>
                            <td style="padding: 4px 0; color: #374151; font-size: 13px;">Tax (10.3%)</td>
                            <td style="padding: 4px 0; color: #1A1106; font-size: 13px; text-align: right; font-weight: 600;">${formatCurrency(order.taxes, order.currency)}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0 0 0; border-top: 1px solid #D1D5DB; color: #1A1106; font-size: 14px; font-weight: 700;">Total</td>
                            <td style="padding: 8px 0 0 0; border-top: 1px solid #D1D5DB; color: #1A1106; font-size: 14px; text-align: right; font-weight: 700;">${formatCurrency(order.totalPaid, order.currency)}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  ${deliveryInstructions.length > 0 ? `
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 12px; background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px;">
                    <tr>
                      <td style="padding: 10px 12px;">
                        ${sectionLabel('Delivery Notes:')}
                        <ul style="margin: 0; padding-left: 16px; color: #92400E; font-size: 12px; line-height: 1.6;">
                          ${deliveryInstructions.map((message) => `<li style="margin: 0 0 4px 0;">${message.trim()}</li>`).join('')}
                        </ul>
                      </td>
                    </tr>
                  </table>
                  ` : ''}
                </td>
              </tr>

              <!-- Info columns -->
              <tr>
                <td style="padding: 0 24px 16px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align: top; width: 50%; padding-right: 8px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0F9FF; border-radius: 8px; border: 1px solid #BAE6FD; height: 100%;">
                          <tr>
                            <td style="padding: 12px;">
                              <p style="margin: 0 0 8px 0; color: #0C4A6E; font-size: 13px; font-weight: 700;">Track your order</p>
                              <ul style="margin: 0; padding-left: 16px; color: #075985; font-size: 12px; line-height: 1.55;">
                                <li style="margin-bottom: 6px;">On the delivery day, we share tracking details via email/text in the morning, including a live tracking link.</li>
                                <li>You'll also receive a confirmation email/text once the order is delivered, with a photo of the drop-off location.</li>
                              </ul>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td style="vertical-align: top; width: 50%; padding-left: 8px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF4E4; border-radius: 8px; border: 1px solid #FCD34D; height: 100%;">
                          <tr>
                            <td style="padding: 12px;">
                              <p style="margin: 0 0 8px 0; color: #92400E; font-size: 13px; font-weight: 700;">How delivery works</p>
                              <ul style="margin: 0; padding-left: 16px; color: #92400E; font-size: 12px; line-height: 1.55;">
                                <li style="margin-bottom: 6px;">We review your order against the weekly menu.</li>
                                <li style="margin-bottom: 6px;">Delivery happens once the minimum order value for the selected day is met.</li>
                                <li style="margin-bottom: 6px;">If not, your order is combined with the next delivery day.</li>
                                <li>For offices, condos, or apartments orders are delivered to the concierge, front desk, or mailroom.</li>
                              </ul>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9f9f9; padding: 14px 24px; text-align: center; border-top: 1px solid #eeeeee;">
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
