'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { Box, Container, CircularProgress, Paper, Typography, Button, Alert } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconHome, IconRefresh, IconReceipt } from '@tabler/icons-react';
import OrderConfirmation from '@/components/checkout/OrderConfirmation';
import { Order } from '@/types/order';
import { useApiClient } from '@/hooks/useApiClient';

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { authenticatedFetch } = useApiClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in useEffect
    setTimeout(() => {
      if (!orderId) {
        setError('No order ID provided. Please check your order confirmation email or contact support.');
        setIsLoading(false);
        return;
      }

      // Validate orderId format
      if (typeof orderId !== 'string' || orderId.trim().length === 0) {
        setError('Invalid order ID format. Please check your order confirmation email or contact support.');
        setIsLoading(false);
        return;
      }

      // Fetch actual order details from API
      const fetchOrderDetails = async () => {
        try {
          setIsLoading(true);
          setError('');

        console.log(`[Success Page] Fetching order: ${orderId}`);

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        // Fetch order from API using authenticatedFetch
        const response = await authenticatedFetch(`/api/orders/${orderId}`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log(`[Success Page] Response status: ${response.status}`);

        // Handle different error scenarios
        // Note: 401 errors are automatically handled by useApiClient hook
        if (response.status === 403) {
          throw new Error('You do not have permission to view this order. Please check your account.');
        } else if (response.status === 404) {
          throw new Error('Order not found. Please verify the order ID or contact support.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again in a few minutes or contact support.');
        } else if (!response.ok) {
          const errorData = await response.json();
          console.error('[Success Page] Fetch error:', errorData);
          throw new Error(errorData.error || `Failed to fetch order (Status: ${response.status})`);
        }

        const data = await response.json();
        console.log('[Success Page] Order data received:', data.success);

        if (!data.success || !data.data) {
          throw new Error(data.error || 'Order not found or unavailable');
        }

        // Validate order data structure
        if (!data.data.orderId || !data.data.items || !Array.isArray(data.data.items)) {
          throw new Error('Invalid order data received. Please contact support.');
        }

        // Use setTimeout to avoid synchronous setState in useEffect
        setTimeout(() => {
          setOrder(data.data);
        }, 0);
      } catch (error) {
        console.error('Failed to fetch order details:', error);

        let errorMessage = 'Failed to load order details';
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMessage = 'Request timed out. Please check your internet connection and try again.';
          } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
          } else {
            errorMessage = error.message;
          }
        }

        // Use setTimeout to avoid synchronous setState in useEffect
        setTimeout(() => {
          setError(errorMessage);
        }, 0);
      } finally {
        // Use setTimeout to avoid synchronous setState in useEffect
        setTimeout(() => {
          setIsLoading(false);
        }, 0);
      }
    };

    fetchOrderDetails();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, router]);

  if (isLoading) {
    return (
      <Box sx={{ bgcolor: '#FAFAFA', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              textAlign: 'center',
            }}
          >
            <CircularProgress sx={{ color: '#FF9F0D', mb: 3 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#333' }}>
              Loading Your Order Details
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
              {orderId ? `Fetching details for order #${orderId}...` : 'Preparing your order confirmation...'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>
              This should only take a moment
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  if (error) {
    const isAuthError = error.toLowerCase().includes('authentication') || error.toLowerCase().includes('login');
    const isNetworkError = error.toLowerCase().includes('network') || error.toLowerCase().includes('timed out');
    const isOrderNotFoundError = error.toLowerCase().includes('order not found') || error.toLowerCase().includes('invalid order id');

    return (
      <Box sx={{ bgcolor: '#FAFAFA', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="md">
          <Alert
            severity={isAuthError ? "warning" : isNetworkError ? "info" : "error"}
            sx={{ mb: 3 }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              {isAuthError ? 'Authentication Required' : isNetworkError ? 'Connection Issue' : isOrderNotFoundError ? 'Order Not Found' : 'Unable to Load Order Details'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
            {orderId && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                Order ID: <strong>#{orderId}</strong>
              </Typography>
            )}
          </Alert>

          <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #EDEDED' }}>
            <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
              {isAuthError
                ? 'You need to be logged in to view your order details. Please log in and try again.'
                : isNetworkError
                ? 'There seems to be a network issue. Please check your internet connection and try again.'
                : isOrderNotFoundError
                ? 'We couldn\'t find this order in our system. Please verify the order ID from your confirmation email or check your orders page.'
                : 'Your order may have been placed successfully, but we\'re having trouble loading the details. Please check your orders page or contact support with the order ID above.'
              }
            </Typography>

            {!isAuthError && !isNetworkError && (
              <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                <strong>What you can do:</strong>
                <Box component="ul" sx={{ mt: 1, ml: 2 }}>
                  <Typography component="li" variant="body2">
                    Check your email for order confirmation
                  </Typography>
                  <Typography component="li" variant="body2">
                    Visit your orders page to see all recent orders
                  </Typography>
                  <Typography component="li" variant="body2">
                    Contact customer support with your order ID
                  </Typography>
                </Box>
              </Typography>
            )}

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                mt: 3,
              }}
            >
              {isAuthError ? (
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<IconHome size={20} />}
                  onClick={() => {
                    // Clear any invalid token and redirect to login
                    localStorage.removeItem('accessToken');
                    router.push('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
                  }}
                  sx={{
                    bgcolor: '#FF9F0D',
                    color: '#fff',
                    py: 1.5,
                    '&:hover': {
                      bgcolor: '#e68f0c',
                    },
                  }}
                >
                  Log In
                </Button>
              ) : (
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
                  Go to Home
                </Button>
              )}

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

              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<IconRefresh size={20} />}
                onClick={() => window.location.reload()}
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
                Retry
              </Button>
            </Box>
          </Paper>

          {/* Contact Support Section */}
          {orderId && (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #EDEDED' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Need Help?
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                If you continue to experience issues, please contact our customer support team with your order ID:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  bgcolor: '#f5f5f5',
                  p: 1,
                  borderRadius: 1,
                  textAlign: 'center',
                  fontWeight: 600,
                  color: '#FF9F0D'
                }}
              >
                #{orderId}
              </Typography>
            </Paper>
          )}
        </Container>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box sx={{ bgcolor: '#FAFAFA', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="md">
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid #EDEDED' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#333' }}>
              No Order Found
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
              We couldn&apos;t load your order details. This could happen if:
            </Typography>
            <Box component="ul" sx={{ textAlign: 'left', maxWidth: 400, mx: 'auto', mb: 3 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1, color: '#666' }}>
                Your session has expired
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1, color: '#666' }}>
                The order ID is invalid
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1, color: '#666' }}>
                You don&apos;t have permission to view this order
              </Typography>
              <Typography component="li" variant="body2" sx={{ color: '#666' }}>
                The order was very recently created and is still processing
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                justifyContent: 'center',
                mt: 3,
              }}
            >
              <Button
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
                Go to Home
              </Button>
              <Button
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
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#FAFAFA', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <OrderConfirmation order={order} />
      </Container>
    </Box>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
          }}
        >
          <CircularProgress sx={{ color: '#FF9F0D' }} />
        </Box>
      }
    >
      <SuccessPageContent />
    </Suspense>
  );
}
