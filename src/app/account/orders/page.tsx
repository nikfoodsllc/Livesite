'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, IconButton } from '@mui/material';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import AccountPageHeader from '@/components/account/AccountPageHeader';
import OrderCard from '@/components/orders/OrderCard';
import OrderDetailsDialog from '@/components/orders/OrderDetailsDialog';
import TrackOrderDialog from '@/components/orders/TrackOrderDialog';
import AddReviewDialog from '@/components/orders/AddReviewDialog';
import UpdateItemDialog from '@/components/orders/UpdateItemDialog';
import ReorderConfirmation from '@/components/orders/ReorderConfirmation';
import { Order } from '@/types/order';
import { useApiClient } from '@/hooks/useApiClient';

interface OrdersResponse {
  items: Order[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function OrdersPage() {
  const { authenticatedFetch } = useApiClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Omit<OrdersResponse, 'items'> | null>(null);

  // Dialog states
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch(
        `/api/orders?page=${page}&status=all&limit=10`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const result = await response.json();

      if (result.success) {
        setOrders(result.data.items);
        setPagination({
          page: result.data.page,
          pageSize: result.data.pageSize,
          total: result.data.total,
          totalPages: result.data.totalPages,
          hasNextPage: result.data.hasNextPage,
          hasPrevPage: result.data.hasPrevPage,
        });
      } else {
        throw new Error(result.error || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [page, authenticatedFetch]);

  useEffect(() => {
    fetchOrders();
  }, [page, fetchOrders]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  };

  const handleTrackOrder = (order: Order) => {
    setSelectedOrder(order);
    setTrackDialogOpen(true);
  };

  const handleReorder = (order: Order) => {
    setSelectedOrder(order);
    setReorderDialogOpen(true);
  };

  const handleAddReview = (order: Order) => {
    setSelectedOrder(order);
    setReviewDialogOpen(true);
  };

  const handleUpdateItem = (order: Order) => {
    setSelectedOrder(order);
    setUpdateDialogOpen(true);
  };

  const handleReviewSubmitted = () => {
    // Refresh orders to update the hasReview flag
    fetchOrders();
  };

  return (
    <Box>
      {/* Page Header */}
      <AccountPageHeader />

      {/* Loading State */}
      {loading && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 8,
          }}
        >
          <CircularProgress sx={{ color: '#FF9F0D' }} />
        </Box>
      )}

      {/* Error State */}
      {error && !loading && (
        <Box
          sx={{
            backgroundColor: '#FEF2F2',
            borderRadius: '12px',
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: '16px', color: '#DC2626', fontWeight: 500 }}>
            {error}
          </Typography>
        </Box>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <Box
          sx={{
            backgroundColor: '#F9FAFB',
            borderRadius: '12px',
            p: 6,
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#111827',
              mb: 1,
            }}
          >
            No orders found
          </Typography>
          <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
            You haven&apos;t placed any orders yet.
          </Typography>
        </Box>
      )}

      {/* Orders List */}
      {!loading && !error && orders.length > 0 && (
        <>
          <Box sx={{ mb: 3 }}>
            {orders.map((order) => (
              <OrderCard
                key={order._id || order.orderId}
                order={order}
                onViewDetails={handleViewDetails}
                onTrackOrder={handleTrackOrder}
                onReorder={handleReorder}
                onAddReview={handleAddReview}
                onUpdateItem={handleUpdateItem}
              />
            ))}
          </Box>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 4,
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              {/* Page Info */}
              <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                Showing {(page - 1) * pagination.pageSize + 1} -{' '}
                {Math.min(page * pagination.pageSize, pagination.total)} of {pagination.total}{' '}
                orders
              </Typography>

              {/* Pagination Controls */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton
                  onClick={() => handlePageChange(page - 1)}
                  disabled={!pagination.hasPrevPage}
                  sx={{
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    width: '40px',
                    height: '40px',
                    '&:hover': {
                      backgroundColor: '#F9FAFB',
                    },
                    '&:disabled': {
                      opacity: 0.5,
                    },
                  }}
                >
                  <IconChevronLeft size={20} color="#374151" />
                </IconButton>

                <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                  Page {page} of {pagination.totalPages}
                </Typography>

                <IconButton
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!pagination.hasNextPage}
                  sx={{
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    width: '40px',
                    height: '40px',
                    '&:hover': {
                      backgroundColor: '#F9FAFB',
                    },
                    '&:disabled': {
                      opacity: 0.5,
                    },
                  }}
                >
                  <IconChevronRight size={20} color="#374151" />
                </IconButton>
              </Box>
            </Box>
          )}
        </>
      )}

      {/* Dialogs */}
      <OrderDetailsDialog
        open={detailsDialogOpen}
        order={selectedOrder}
        onClose={() => setDetailsDialogOpen(false)}
      />

      <TrackOrderDialog
        open={trackDialogOpen}
        order={selectedOrder}
        onClose={() => setTrackDialogOpen(false)}
      />

      <AddReviewDialog
        open={reviewDialogOpen}
        order={selectedOrder}
        onClose={() => setReviewDialogOpen(false)}
        onReviewSubmitted={handleReviewSubmitted}
      />

      <UpdateItemDialog
        open={updateDialogOpen}
        order={selectedOrder}
        onClose={() => setUpdateDialogOpen(false)}
      />

      <ReorderConfirmation
        open={reorderDialogOpen}
        order={selectedOrder}
        onClose={() => setReorderDialogOpen(false)}
      />
    </Box>
  );
}
