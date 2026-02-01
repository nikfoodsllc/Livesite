'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  CircularProgress,
} from '@mui/material';
import { IconX, IconCheck } from '@tabler/icons-react';
import { Order } from '@/types/order';
import { formatDeliveryDate } from '@/lib/orderHelpers';
import { useApiClient } from '@/hooks/useApiClient';
import { PST_TIMEZONE } from '@/lib/timezone';

interface TrackingStep {
  status: string;
  label: string;
  timestamp?: string;
  completed: boolean;
  active: boolean;
}

interface TrackOrderDialogProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
}

export default function TrackOrderDialog({ open, order, onClose }: TrackOrderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<TrackingStep[]>([]);
  const [estimatedDelivery, setEstimatedDelivery] = useState<string | null>(null);
  const { authenticatedFetch } = useApiClient();

  const fetchTrackingData = useCallback(async () => {
    if (!order) return;

    setLoading(true);
    try {
      const response = await authenticatedFetch(`/api/orders/${order.orderId}/track`);

      if (!response.ok) {
        throw new Error('Failed to fetch tracking data');
      }

      const result = await response.json();
      if (result.success) {
        setTimeline(result.data.timeline || []);
        setEstimatedDelivery(result.data.estimatedDelivery);
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      setTimeline([]);
      setEstimatedDelivery(null);
    } finally {
      setLoading(false);
    }
  }, [order, authenticatedFetch]);

  useEffect(() => {
    if (open && order) {
      fetchTrackingData();
    }
  }, [open, order, fetchTrackingData]);

  if (!order) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          maxHeight: '90vh',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
          Track Order #{order.orderId}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <IconX size={20} />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ px: 3, py: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#FF9F0D' }} />
          </Box>
        ) : (
          <>
            {/* Estimated Delivery */}
            {estimatedDelivery && (
              <Box
                sx={{
                  backgroundColor: '#FFF7ED',
                  borderRadius: '8px',
                  p: 2,
                  mb: 3,
                }}
              >
                <Typography sx={{ fontSize: '14px', color: '#6B7280', mb: 0.5 }}>
                  Estimated Delivery
                </Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#FF9F0D' }}>
                  {formatDeliveryDate(estimatedDelivery)}
                </Typography>
              </Box>
            )}

            {/* Tracking Timeline */}
            <Box sx={{ position: 'relative', pl: 4 }}>
              {timeline && timeline.length > 0 ? (
                timeline.map((step, index) => {
                  const isLast = index === timeline.length - 1;

                  return (
                    <Box key={index} sx={{ position: 'relative', pb: isLast ? 0 : 3 }}>
                      {/* Connector Line */}
                      {!isLast && (
                        <Box
                          sx={{
                            position: 'absolute',
                            left: '-20px',
                            top: '32px',
                            width: '2px',
                            height: 'calc(100% - 16px)',
                            backgroundColor: step.completed ? '#FF9F0D' : '#E5E7EB',
                          }}
                        />
                      )}

                      {/* Step Indicator */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: '-28px',
                          top: 0,
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: step.completed
                            ? '#FF9F0D'
                            : step.active
                            ? '#FFF7ED'
                            : '#F3F4F6',
                          border: step.active ? '3px solid #FF9F0D' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {step.completed && !step.active && (
                          <IconCheck size={12} color="#FFFFFF" strokeWidth={3} />
                        )}
                      </Box>

                      {/* Step Content */}
                      <Box>
                        <Typography
                          sx={{
                            fontSize: '15px',
                            fontWeight: step.active ? 600 : 500,
                            color: step.active ? '#111827' : step.completed ? '#374151' : '#9CA3AF',
                          }}
                        >
                          {step.label}
                        </Typography>
                        {step.timestamp && (
                          <Typography
                            sx={{
                              fontSize: '13px',
                              color: '#6B7280',
                              mt: 0.5,
                            }}
                          >
                            {new Date(step.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                              timeZone: PST_TIMEZONE,
                            })}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })
              ) : (
                <Typography sx={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', py: 2 }}>
                  No tracking information available
                </Typography>
              )}
            </Box>
          </>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E5E7EB' }}>
        <Button
          onClick={onClose}
          variant="contained"
          fullWidth
          sx={{
            backgroundColor: '#FF9F0D',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: 600,
            textTransform: 'none',
            height: '48px',
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: '#E88F0C',
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
