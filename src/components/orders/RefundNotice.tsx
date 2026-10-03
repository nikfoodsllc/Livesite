import { Box, Typography } from '@mui/material';
import { IconReceiptRefund } from '@tabler/icons-react';
import { Order } from '@/types/order';
import { formatCurrency } from '@/lib/orderHelpers';
import { getRefundedAmount, isFullyRefunded } from '@/lib/orderRefunds';

interface RefundNoticeProps {
  order: Order;
}

/** A small tile telling the customer about a refund (full or partial) on this order. */
export default function RefundNotice({ order }: RefundNoticeProps) {
  const refunded = getRefundedAmount(order);
  if (refunded <= 0) return null;

  const full = isFullyRefunded(order);
  const refundedOn = order.refundedAt
    ? new Date(order.refundedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'America/Los_Angeles',
      })
    : null;

  return (
    <Box
      role="note"
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        backgroundColor: '#F0F9FF',
        border: '1px solid #BAE6FD',
        borderRadius: '10px',
        p: { xs: 1.5, sm: 2 },
        mb: 2.5,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: '#E0F2FE',
          color: '#0369A1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <IconReceiptRefund size={18} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#0C4A6E' }}>
          {full ? 'Refunded' : 'Partially refunded'}
          {refundedOn ? ` · ${refundedOn}` : ''}
        </Typography>
        <Typography sx={{ fontSize: '13px', color: '#075985', mt: 0.25 }}>
          {full
            ? `Your full ${formatCurrency(order.totalPaid, order.currency)} was refunded to your original payment method.`
            : `${formatCurrency(refunded, order.currency)} of your ${formatCurrency(order.totalPaid, order.currency)} was refunded to your original payment method.`}
        </Typography>
      </Box>
    </Box>
  );
}
