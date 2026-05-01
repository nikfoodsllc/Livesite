'use client';

import React from 'react';
import { Box, Typography, Breadcrumbs, Link, useTheme, useMediaQuery } from '@mui/material';
import { IconChevronRight } from '@tabler/icons-react';
import { usePathname } from 'next/navigation';

export default function AccountPageHeader() {
  const theme = useTheme();
  const pathname = usePathname();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Get current section from pathname
  const getCurrentSection = () => {
    if (pathname?.includes('/profile')) return { title: 'My Profile', subtitle: 'Manage your personal information and login credentials' };
    if (pathname?.includes('/addresses')) return { title: 'My Addresses', subtitle: 'Manage your delivery addresses' };
    if (pathname?.includes('/orders')) return { title: 'My Orders', subtitle: 'View your order history and track deliveries' };
    return { title: 'My Account', subtitle: 'Manage your account settings' };
  };

  const { title } = getCurrentSection();

  return (
    <Box
      sx={{
        mb: 4,
        pb: 2,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Breadcrumbs */}
      {!isMobile && (
        <Breadcrumbs
          separator={<IconChevronRight size={16} stroke={2} color="#999" />}
          sx={{ mb: 0 }}
        >
          <Link
            href="/"
            underline="hover"
            sx={{
              color: '#666',
              fontSize: '14px',
              fontWeight: 500,
              '&:hover': {
                color: theme.palette.primary.main,
              },
              transition: 'color 0.2s ease',
            }}
          >
            Home
          </Link>
          <Typography
            sx={{
              color: theme.palette.primary.main,
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {title}
          </Typography>
        </Breadcrumbs>
      )}
    </Box>
  );
}
