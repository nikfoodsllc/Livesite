'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  IconUser,
  IconShoppingCart,
  IconHome,
  IconLogout,
} from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
  action?: () => void;
}

export default function AccountNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { logout } = useAuth();

  const navItems: NavItem[] = [
    {
      label: 'Profile',
      path: '/account/profile',
      icon: <IconUser size={20} />,
    },
    {
      label: 'Orders',
      path: '/account/orders',
      icon: <IconShoppingCart size={20} />,
    },
    {
      label: 'Addresses',
      path: '/account/addresses',
      icon: <IconHome size={20} />,
    },
    {
      label: 'Logout',
      path: '/logout',
      icon: <IconLogout size={20} />,
      action: () => {
        logout();
        router.push('/');
      },
    },
  ];

  const handleNavigation = (item: NavItem) => {
    if (item.action) {
      item.action();
    } else {
      router.push(item.path);
    }
  };

  const currentIndex = navItems.findIndex((item) => pathname === item.path);

  // Mobile horizontal tabs
  if (isMobile) {
    return (
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: '#fff',
          position: 'sticky',
          top: 72,
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Tabs
          value={currentIndex >= 0 ? currentIndex : 0}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: 56,
              textTransform: 'none',
              fontSize: '14px',
              fontWeight: 500,
              color: theme.palette.text.secondary,
              '&.Mui-selected': {
                color: theme.palette.primary.main,
                fontWeight: 600,
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: theme.palette.primary.main,
              height: 3,
            },
          }}
        >
          {navItems.map((item) => (
            <Tab
              key={item.path}
              label={item.label}
              icon={item.icon}
              iconPosition="start"
              onClick={() => handleNavigation(item)}
              sx={{
                '& .MuiTab-iconWrapper': {
                  mr: 1,
                },
              }}
            />
          ))}
        </Tabs>
      </Box>
    );
  }

  // Desktop sidebar
  return (
    <Box
      sx={{
        width: 280,
        backgroundColor: '#fff',
        borderRadius: '16px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        p: 2,
        height: 'fit-content',
        position: 'sticky',
        top: 96,
      }}
    >
      <List sx={{ p: 0 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const isLogout = item.label === 'Logout';

          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item)}
                sx={{
                  borderRadius: '12px',
                  py: 1.5,
                  px: 2,
                  backgroundColor: isActive
                    ? 'rgba(255, 159, 13, 0.1)'
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: isLogout
                      ? 'rgba(211, 47, 47, 0.08)'
                      : 'rgba(255, 159, 13, 0.08)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isLogout
                      ? theme.palette.error.main
                      : isActive
                      ? theme.palette.primary.main
                      : theme.palette.text.secondary,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '15px',
                    fontWeight: isActive ? 600 : 500,
                    color: isLogout
                      ? theme.palette.error.main
                      : isActive
                      ? theme.palette.primary.main
                      : theme.palette.text.primary,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}
