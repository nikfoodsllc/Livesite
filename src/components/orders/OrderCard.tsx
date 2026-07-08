import { Box, Typography, Button } from '@mui/material';
import { Order } from '@/types/order';
import {
  formatOrderDate,
  formatCurrency,
  canTrackOrder,
  canReorder,
  canReview,
  canUpdateOrder,
} from '@/lib/orderHelpers';
import StatusBadge from './StatusBadge';
import OrderDaySection from './OrderDaySection';

interface OrderCardProps {
  order: Order;
  onViewDetails: (order: Order) => void;
  onTrackOrder?: (order: Order) => void;
  onReorder?: (order: Order) => void;
  onAddReview?: (order: Order) => void;
  onUpdateItem?: (order: Order) => void;
}

export default function OrderCard({
  order,
  onViewDetails,
  onTrackOrder,
  onReorder,
  onAddReview,
  onUpdateItem,
}: OrderCardProps) {
  const showTrackOrder = canTrackOrder(order.status);
  const showReorder = canReorder(order.status);
  const showAddReview = canReview(order.status, order.hasReview);
  const showUpdateItem = canUpdateOrder(order.status);

  return (
    <Box
      sx={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        p: { xs: 2, sm: 3 },
        mb: 2,
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 2.5,
          pb: 2,
          borderBottom: '1px solid #F3F4F6',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
        }}
      >
        {/* Left Side - Order Info */}
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontSize: { xs: '16px', sm: '18px' },
              fontWeight: 700,
              color: '#111827',
              mb: 0.5,
            }}
          >
            #{order.orderId}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '12px', sm: '14px' },
              color: '#6B7280',
            }}
          >
            {formatOrderDate(order.createdAt!)}
          </Typography>
        </Box>

        {/* Right Side - Status & Update Button */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            alignSelf: { xs: 'flex-start', sm: 'auto' },
          }}
        >
          <StatusBadge status={order.status} paymentStatus={order.paymentStatus} />
          {showUpdateItem && onUpdateItem && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => onUpdateItem(order)}
              sx={{
                borderColor: '#FF9F0D',
                color: '#FF9F0D',
                fontSize: { xs: '12px', sm: '13px' },
                fontWeight: 600,
                textTransform: 'none',
                px: 2,
                height: '32px',
                '&:hover': {
                  borderColor: '#E88F0C',
                  backgroundColor: '#FFF7ED',
                },
              }}
            >
              Update Item
            </Button>
          )}
        </Box>
      </Box>

      {/* Day-wise Items Section */}
      <Box sx={{ mb: 2.5 }}>
        {order.items.map((dayOrder, index) => (
          <OrderDaySection
            key={index}
            dayOrder={dayOrder}
            orderStatus={order.status}
            currency={order.currency}
          />
        ))}
      </Box>

      {/* Footer Section */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          pt: 2,
          borderTop: '1px solid #F3F4F6',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          {/* Track Order Button - for active orders */}
          {showTrackOrder && onTrackOrder && (
            <Button
              variant="contained"
              onClick={() => onTrackOrder(order)}
              sx={{
                backgroundColor: '#FF9F0D',
                color: '#FFFFFF',
                fontSize: { xs: '13px', sm: '14px' },
                fontWeight: 600,
                textTransform: 'none',
                px: { xs: 2.5, sm: 3 },
                height: { xs: '36px', sm: '40px' },
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: '#E88F0C',
                },
              }}
            >
              Track Order
            </Button>
          )}

          {/* Reorder Button - for delivered orders */}
          {showReorder && onReorder && (
            <Button
              variant="contained"
              onClick={() => onReorder(order)}
              sx={{
                backgroundColor: '#FF9F0D',
                color: '#FFFFFF',
                fontSize: { xs: '13px', sm: '14px' },
                fontWeight: 600,
                textTransform: 'none',
                px: { xs: 2.5, sm: 3 },
                height: { xs: '36px', sm: '40px' },
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: '#E88F0C',
                },
              }}
            >
              Reorder
            </Button>
          )}

          {/* Details Button - always visible */}
          <Button
            variant="outlined"
            onClick={() => onViewDetails(order)}
            sx={{
              borderColor: '#FF9F0D',
              color: '#FF9F0D',
              fontSize: { xs: '13px', sm: '14px' },
              fontWeight: 600,
              textTransform: 'none',
              px: { xs: 2.5, sm: 3 },
              height: { xs: '36px', sm: '40px' },
              borderRadius: '8px',
              '&:hover': {
                borderColor: '#E88F0C',
                backgroundColor: '#FFF7ED',
              },
            }}
          >
            Details
          </Button>

          {/* Add Review Button - for delivered orders without review */}
          {showAddReview && onAddReview && (
            <Button
              variant="outlined"
              onClick={() => onAddReview(order)}
              sx={{
                borderColor: '#FF9F0D',
                color: '#FF9F0D',
                fontSize: { xs: '13px', sm: '14px' },
                fontWeight: 600,
                textTransform: 'none',
                px: { xs: 2.5, sm: 3 },
                height: { xs: '36px', sm: '40px' },
                borderRadius: '8px',
                '&:hover': {
                  borderColor: '#E88F0C',
                  backgroundColor: '#FFF7ED',
                },
              }}
            >
              Add Review
            </Button>
          )}
        </Box>

        {/* Total Paid */}
        <Typography
          sx={{
            fontSize: { xs: '18px', sm: '20px' },
            fontWeight: 700,
            color: '#111827',
            alignSelf: { xs: 'flex-end', sm: 'auto' },
          }}
        >
          Total Paid: {formatCurrency(order.totalPaid, order.currency)}
        </Typography>
      </Box>
    </Box>
  );
}
