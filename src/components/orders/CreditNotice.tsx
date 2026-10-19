import { Box, Typography } from '@mui/material';
import { IconCoin } from '@tabler/icons-react';
import { Order } from '@/types/order';
import { formatCurrency } from '@/lib/orderHelpers';
import { cardTotalOf, toCents } from '@/lib/storeCredit';

const dayText = (value: Date | string) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' });

/** True when store credit paid for the whole order (no card payment). */
export const paidByCreditOnly = (order: Pick<Order, 'totalPaid' | 'storeCreditUsed' | 'storeCreditState'>): boolean =>
  (order.storeCreditUsed ?? 0) > 0 && order.storeCreditState !== 'released' && toCents(order.storeCreditUsed ?? 0) >= toCents(order.totalPaid);

/** The order was paid with store credit (whole or in part). */
export const usedCredit = (order: Pick<Order, 'storeCreditUsed' | 'storeCreditState'>): boolean => (order.storeCreditUsed ?? 0) > 0 && order.storeCreditState !== 'released';

/** Green tiles on an order: paid with store credit, and store credit added for the order (what, and how much). */
export default function CreditNotice({ order, showUsed = true }: { order: Order; showUsed?: boolean }) {
  const issued = order.creditsIssued ?? [];
  const used = showUsed && usedCredit(order);
  if (!used && issued.length === 0) return null;

  const tile = (key: string, title: string, amount: string, lines: Array<{ text: string; amount: number }>, note?: string) => (
    <Box key={key} role="note" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', p: { xs: 1.5, sm: 2 }, mb: 1.5 }}>
      <Box aria-hidden sx={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <IconCoin size={18} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#14532D' }}>{title}</Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#14532D', whiteSpace: 'nowrap' }}>{amount}</Typography>
        </Box>
        {note && <Typography sx={{ fontSize: '13px', color: '#14532D', fontStyle: 'italic', mt: 0.5, overflowWrap: 'anywhere' }}>{note}</Typography>}
        {lines.map((l, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 0.25 }}>
            <Typography sx={{ fontSize: '13px', color: '#166534', minWidth: 0, overflowWrap: 'anywhere' }}>{l.text}</Typography>
            <Typography sx={{ fontSize: '13px', color: '#166534', whiteSpace: 'nowrap' }}>{formatCurrency(l.amount, order.currency)}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box>
      {used &&
        tile(
          'used',
          paidByCreditOnly(order) ? 'Paid with store credit' : 'Store credit used',
          formatCurrency(order.storeCreditUsed ?? 0, order.currency),
          paidByCreditOnly(order) ? [] : [{ text: 'Paid by card', amount: cardTotalOf(order) }]
        )}
      {issued.map((c, i) =>
        tile(
          `issued-${i}`,
          `Store credit added · ${dayText(c.at)}`,
          `+${formatCurrency(c.amount, order.currency)}`,
          [
            ...c.items.map((it) => ({ text: it.quantity > 1 ? `${it.name} × ${it.quantity}` : it.name, amount: it.amount })),
            ...(c.fee ? [{ text: 'Platform Fee', amount: c.fee }] : []),
            ...(c.tip ? [{ text: 'Tip', amount: c.tip }] : []),
          ],
          c.note
        )
      )}
    </Box>
  );
}
