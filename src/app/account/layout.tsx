'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Container, Typography, useTheme, useMediaQuery } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useHeader } from '@/contexts/HeaderContext';
import AccountNavigation from '@/components/account/AccountNavigation';

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isLoading } = useAuth();

  const { openLoginDialog } = useHeader();
  const wasLoggedIn = useRef(false);
  const prompted = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      wasLoggedIn.current = true;
    } else if (wasLoggedIn.current) {
      // logged out while on an account page: back to the home page
      router.push('/');
    } else if (!prompted.current) {
      // opened while signed out (e.g. the "View my order" button in an email): ask them to log in,
      // once, then they stay on this page and see their orders
      prompted.current = true;
      openLoginDialog();
    }
  }, [user, isLoading, router, openLoginDialog]);

  // Nothing to show while checking auth
  if (isLoading) {
    return null;
  }

  if (!user) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, px: 3, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Please log in to see your account</Typography>
        <Button variant="contained" onClick={openLoginDialog} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 4 }}>
          Log in
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#F9F9F9' }}>
      {/* Account Content */}
      <Box
        sx={{
          backgroundColor: '#F9F9F9',
          minHeight: '100vh',
          pt: 4,
          pb: 6,
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              flexDirection: isMobile ? 'column' : 'row',
            }}
          >
            {/* Navigation */}
            {!isMobile && <AccountNavigation />}

            {/* Main Content */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
              }}
            >
              {isMobile && <AccountNavigation />}
              {children}
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
