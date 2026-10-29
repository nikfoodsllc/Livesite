'use client';

import React, { Suspense } from 'react';
import { Box, Container, Typography, Paper, Button, CircularProgress } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconAlertCircle, IconHome, IconRefresh } from '@tabler/icons-react';

function FailurePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'An unexpected error occurred during checkout';

  return (
    <Box sx={{ bgcolor: '#FAFAFA', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        {/* Error Header */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 3,
            textAlign: 'center',
            border: '1px solid #EDEDED',
            bgcolor: '#fff',
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: '#dc2626',
              mb: 2,
            }}
          >
            <IconAlertCircle size={48} color="#fff" />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#dc2626' }}>
            Payment Failed
          </Typography>
          <Typography variant="body1" sx={{ color: '#666', mb: 2 }}>
            We encountered an issue while processing your order
          </Typography>
        </Paper>

        {/* Error Details */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #EDEDED' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            What went wrong?
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
            {error}
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Don&apos;t worry - please retry your payment or try a different card. If the issue persists, contact your bank.
          </Typography>
        </Paper>

        {/* Help Section */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #EDEDED', bgcolor: '#F7F0E3' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Need Help?
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
            • Make sure your card details are correct
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
            • Check if you have sufficient balance
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
            • Try a different payment method
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
            • Contact your bank if the issue persists
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
            • Try refreshing the page and attempting payment again
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            • Clear your browser cache if issues persist
          </Typography>
        </Paper>

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mt: 3,
          }}
        >
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<IconRefresh size={20} />}
            onClick={() => router.push('/checkout')}
            sx={{
              bgcolor: '#1F1712',
              color: '#F6D58E',
              py: 1.5,
              '&:hover': {
                bgcolor: '#3A2A14',
              },
            }}
          >
            Try Again
          </Button>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<IconHome size={20} />}
            onClick={() => router.push('/')}
            sx={{
              borderColor: '#B8893B',
              color: '#8A6420',
              py: 1.5,
              '&:hover': {
                borderColor: '#B8893B',
                bgcolor: 'rgba(184, 137, 59, 0.05)',
              },
            }}
          >
            Back to Home
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

export default function FailurePage() {
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
          <CircularProgress sx={{ color: '#8A6420' }} />
        </Box>
      }
    >
      <FailurePageContent />
    </Suspense>
  );
}
