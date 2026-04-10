import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Rating,
  Alert,
} from '@mui/material';
import { IconX, IconStar } from '@tabler/icons-react';
import { Order } from '@/types/order';
import { useApiClient } from '@/hooks/useApiClient';

interface AddReviewDialogProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onReviewSubmitted: () => void;
}

export default function AddReviewDialog({
  open,
  order,
  onClose,
  onReviewSubmitted,
}: AddReviewDialogProps) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { authenticatedFetch } = useApiClient();

  const handleClose = () => {
    setRating(0);
    setComment('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!order || rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/orders/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.orderId,
          rating,
          comment: comment.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit review');
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onReviewSubmitted();
      }, 1500);
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
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
          Rate Your Order
        </Typography>
        <IconButton onClick={handleClose} size="small" disabled={submitting}>
          <IconX size={20} />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ px: 3, py: 3 }}>
        {success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Thank you for your review!
          </Alert>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Order Info */}
            <Box
              sx={{
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                p: 2,
                mb: 3,
              }}
            >
              <Typography sx={{ fontSize: '14px', color: '#6B7280', mb: 0.5 }}>
                Order ID
              </Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                #{order.orderId}
              </Typography>
            </Box>

            {/* Rating */}
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#111827',
                  mb: 1.5,
                }}
              >
                How was your experience? *
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                <Rating
                  value={rating}
                  onChange={(_, newValue) => {
                    setRating(newValue || 0);
                    setError(null);
                  }}
                  size="large"
                  icon={<IconStar size={32} fill="#FF9F0D" color="#FF9F0D" />}
                  emptyIcon={<IconStar size={32} color="#D1D5DB" />}
                  sx={{
                    '& .MuiRating-iconFilled': {
                      color: '#FF9F0D',
                    },
                    '& .MuiRating-iconHover': {
                      color: '#FF9F0D',
                    },
                  }}
                />
              </Box>
              <Typography
                sx={{
                  fontSize: '13px',
                  color: '#6B7280',
                  textAlign: 'center',
                }}
              >
                {rating === 0 && 'Select a rating'}
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </Typography>
            </Box>

            {/* Comment */}
            <Box>
              <Typography
                sx={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#111827',
                  mb: 1.5,
                }}
              >
                Add a comment (optional)
              </Typography>
              <TextField
                multiline
                rows={4}
                fullWidth
                placeholder="Tell us more about your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={submitting}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '14px',
                    '&:hover fieldset': {
                      borderColor: '#FF9F0D',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FF9F0D',
                    },
                  },
                }}
              />
            </Box>
          </>
        )}
      </DialogContent>

      {/* Footer */}
      {!success && (
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E5E7EB', gap: 1.5 }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            disabled={submitting}
            sx={{
              flex: 1,
              borderColor: '#E5E7EB',
              color: '#6B7280',
              fontSize: '16px',
              fontWeight: 600,
              textTransform: 'none',
              height: '48px',
              borderRadius: '8px',
              '&:hover': {
                borderColor: '#D1D5DB',
                backgroundColor: '#F9FAFB',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || rating === 0}
            sx={{
              flex: 1,
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
              '&:disabled': {
                backgroundColor: '#E5E7EB',
                color: '#9CA3AF',
              },
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
