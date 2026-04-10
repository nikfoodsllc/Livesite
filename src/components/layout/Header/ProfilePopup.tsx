'use client';

import React, { useState } from 'react';
import {
  IconButton,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
} from '@mui/material';
import {
  IconUser,
  IconShoppingCart,
  IconHome,
  IconLogout,
} from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function ProfilePopup() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (path: string) => {
    handleClose();
    router.push(path);
  };

  const handleLogout = () => {
    handleClose();
    logout();
    router.push('/');
  };

  const open = Boolean(anchorEl);
  const id = open ? 'profile-popover' : undefined;

  // Get first letter of name for avatar
  const avatarLetter = user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          width: 40,
          height: 40,
          border: '2px solid',
          borderColor: open ? 'primary.main' : 'grey.300',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'rgba(255, 159, 13, 0.05)',
          },
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: 'primary.main',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {avatarLetter}
        </Avatar>
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{
          mt: 1.5,
          '& .MuiPaper-root': {
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            border: '1px solid',
            borderColor: 'grey.200',
            minWidth: 240,
          },
        }}
      >
        <Box sx={{ p: 2.5, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'primary.main',
                fontSize: '18px',
                fontWeight: 600,
              }}
            >
              {avatarLetter}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  fontSize: '15px',
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.name || 'User'}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: '13px',
                }}
              >
                Manage account
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider />

        <List sx={{ py: 1 }}>
          <ListItem
            onClick={() => handleMenuItemClick('/account/profile')}
            sx={{
              cursor: 'pointer',
              px: 2.5,
              py: 1.25,
              '&:hover': {
                backgroundColor: 'rgba(255, 159, 13, 0.08)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <IconUser size={20} stroke={1.5} />
            </ListItemIcon>
            <ListItemText
              primary="Profile"
              primaryTypographyProps={{
                fontSize: '14px',
                fontWeight: 500,
              }}
            />
          </ListItem>

          <ListItem
            onClick={() => handleMenuItemClick('/account/orders')}
            sx={{
              cursor: 'pointer',
              px: 2.5,
              py: 1.25,
              '&:hover': {
                backgroundColor: 'rgba(255, 159, 13, 0.08)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <IconShoppingCart size={20} stroke={1.5} />
            </ListItemIcon>
            <ListItemText
              primary="Orders"
              primaryTypographyProps={{
                fontSize: '14px',
                fontWeight: 500,
              }}
            />
          </ListItem>

          <ListItem
            onClick={() => handleMenuItemClick('/account/addresses')}
            sx={{
              cursor: 'pointer',
              px: 2.5,
              py: 1.25,
              '&:hover': {
                backgroundColor: 'rgba(255, 159, 13, 0.08)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <IconHome size={20} stroke={1.5} />
            </ListItemIcon>
            <ListItemText
              primary="Address"
              primaryTypographyProps={{
                fontSize: '14px',
                fontWeight: 500,
              }}
            />
          </ListItem>

          <Divider sx={{ my: 1 }} />

          <ListItem
            onClick={handleLogout}
            sx={{
              cursor: 'pointer',
              px: 2.5,
              py: 1.25,
              '&:hover': {
                backgroundColor: 'rgba(211, 47, 47, 0.08)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <IconLogout size={20} stroke={1.5} color="#d32f2f" />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'error.main',
              }}
            />
          </ListItem>
        </List>
      </Popover>
    </>
  );
}
