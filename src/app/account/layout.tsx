'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Container, useTheme, useMediaQuery } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
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

  // Redirect to home if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Show loading or nothing while checking auth
  if (isLoading || !user) {
    return null;
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
