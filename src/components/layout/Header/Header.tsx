'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useScrollDetection } from '@/hooks/useScrollDetection';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Switch,
  FormControlLabel,
  Badge,
  Button,
  Typography,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Container,
} from '@mui/material';
import {
  IconShoppingCart,
  IconBell,
  IconUser,
  IconMenu2,
  IconX,
  IconLeaf,
} from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useHeader } from '@/contexts/HeaderContext';
import ProfilePopup from './ProfilePopup';

interface HeaderProps {
  notificationCount?: number;
}

export default function Header({
  notificationCount = 0,
}: HeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isScrolled, scrollY, scrollDirection } = useScrollDetection(10);
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { openLoginDialog, openCartPreview, vegOnly, setVegOnly } = useHeader();

  const handleVegToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setVegOnly(checked);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      {/* Placeholder div to maintain header height for fixed positioning */}
      <Box
        sx={{
          height: { xs: 64, md: 72 },
          minHeight: { xs: '64px', md: '72px' },
          width: '100%',
        }}
      />
      <AppBar
        position="fixed"
        elevation={0}
        className={`main-header ${isScrolled ? 'scrolled' : ''}`}
        sx={{
          backgroundColor: isScrolled
            ? 'rgba(255, 255, 255, 0.95)'
            : '#ffffff',
          backdropFilter: isScrolled ? 'blur(10px)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(10px)' : 'none', // Safari support
          boxShadow: isScrolled
            ? '0 4px 20px rgba(0, 0, 0, 0.08)'
            : '0 2px 8px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderBottom: isScrolled
            ? `1px solid ${theme.palette.divider}`
            : '1px solid transparent',
          zIndex: theme.zIndex.appBar,
          // Ensure proper stacking context and position reliability
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          // Add will-change for better performance
          willChange: 'background-color, backdrop-filter, box-shadow',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            disableGutters
            sx={{
              height: { xs: 64, md: 72 },
              minHeight: { xs: '64px !important', md: '72px !important' },
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: { xs: 2, sm: 0 },
            }}
          >
            {/* Logo Section */}
            <Box
              onClick={() => router.push('/')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.02)',
                },
              }}
            >
              <Image
                src="/images/logo.png"
                alt="NikFoods Logo"
                width={160}
                height={60}
                priority
                style={{
                  width: 'auto',
                  height: isScrolled ? '45px' : '50px',
                  transition: 'height 0.3s ease',
                  maxWidth: isMobile ? '120px' : '160px',
                }}
              />
            </Box>

            {/* Desktop Actions */}
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Veg Only Toggle */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1,
                    borderRadius: '12px',
                    backgroundColor: vegOnly
                      ? 'rgba(76, 175, 80, 0.08)'
                      : 'rgba(0, 0, 0, 0.04)',
                    border: vegOnly
                      ? `1px solid ${theme.palette.success.light}`
                      : '1px solid transparent',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <IconLeaf
                    size={20}
                    color={vegOnly ? theme.palette.success.main : theme.palette.text.secondary}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={vegOnly}
                        onChange={handleVegToggle}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: theme.palette.success.main,
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: theme.palette.success.main,
                          },
                        }}
                      />
                    }
                    label={
                      <Typography
                        variant="body2"
                        sx={{
                          color: vegOnly
                            ? theme.palette.success.dark
                            : theme.palette.text.primary,
                          fontWeight: 600,
                          fontSize: '0.875rem',
                        }}
                      >
                        I am Vegetarian
                      </Typography>
                    }
                    sx={{ margin: 0 }}
                  />
                </Box>

                {/* Notification Bell */}
                <IconButton
                  sx={{
                    color: theme.palette.text.primary,
                    width: 44,
                    height: 44,
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(248, 156, 53, 0.12)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Badge
                    badgeContent={notificationCount}
                    color="error"
                    sx={{
                      '& .MuiBadge-badge': {
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      },
                    }}
                  >
                    <IconBell size={22} />
                  </Badge>
                </IconButton>

                {/* Shopping Cart */}
                <IconButton
                  onClick={openCartPreview}
                  sx={{
                    color: theme.palette.text.primary,
                    width: 44,
                    height: 44,
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(248, 156, 53, 0.12)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Badge
                    badgeContent={itemCount}
                    color="primary"
                    sx={{
                      '& .MuiBadge-badge': {
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      },
                    }}
                  >
                    <IconShoppingCart size={22} />
                  </Badge>
                </IconButton>

                {/* Login Button or Profile Popup */}
                {user ? (
                  <ProfilePopup />
                ) : (
                  <Button
                    variant="contained"
                    onClick={openLoginDialog}
                    startIcon={<IconUser size={18} />}
                    sx={{
                      backgroundColor: theme.palette.primary.main,
                      color: '#fff',
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 3,
                      py: 1.25,
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(248, 156, 53, 0.25)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(248, 156, 53, 0.35)',
                      },
                    }}
                  >
                    Login / Signup
                  </Button>
                )}
              </Box>
            )}

            {/* Mobile Actions */}
            {isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Cart Icon */}
                <IconButton
                  onClick={openCartPreview}
                  sx={{
                    color: theme.palette.text.primary,
                    width: 44,
                    height: 44,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(248, 156, 53, 0.12)',
                    },
                  }}
                >
                  <Badge
                    badgeContent={itemCount}
                    color="primary"
                    sx={{
                      '& .MuiBadge-badge': {
                        fontWeight: 600,
                        fontSize: '0.65rem',
                      },
                    }}
                  >
                    <IconShoppingCart size={22} />
                  </Badge>
                </IconButton>

                {/* Mobile Vegetarian Toggle */}
                <Box
                  sx={{
                    display: { xs: 'flex', md: 'none' },
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: '8px',
                    backgroundColor: vegOnly
                      ? 'rgba(76, 175, 80, 0.12)'
                      : 'rgba(0, 0, 0, 0.04)',
                    border: vegOnly
                      ? `1px solid ${theme.palette.success.main}`
                      : '1px solid transparent',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: vegOnly
                        ? 'rgba(76, 175, 80, 0.2)'
                        : 'rgba(248, 156, 53, 0.12)',
                    },
                  }}
                  onClick={() => setVegOnly(!vegOnly)}
                  role="switch"
                  aria-checked={vegOnly}
                  aria-label="Toggle vegetarian filter"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setVegOnly(!vegOnly);
                    }
                  }}
                >
                  <IconLeaf
                    size={18}
                    color={vegOnly ? theme.palette.success.main : theme.palette.text.secondary}
                  />
                </Box>

                {/* User Icon or Menu Button */}
                {user ? (
                  <ProfilePopup />
                ) : (
                  <IconButton
                    onClick={toggleMobileMenu}
                    sx={{
                      color: theme.palette.text.primary,
                      width: 44,
                      height: 44,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(248, 156, 53, 0.12)',
                      },
                    }}
                  >
                    <IconMenu2 size={24} />
                  </IconButton>
                )}
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Menu Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={toggleMobileMenu}
        sx={{
          '& .MuiDrawer-paper': {
            width: '85%',
            maxWidth: 320,
            backgroundColor: '#fff',
            // Ensure drawer appears above header
            zIndex: theme.zIndex.drawer,
          },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Drawer Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2.5,
              borderBottom: `1px solid ${theme.palette.divider}`,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.light}10 100%)`,
            }}
          >
            <Typography variant="h6" fontWeight={700}>
              Menu
            </Typography>
            <IconButton onClick={toggleMobileMenu} size="small">
              <IconX size={24} />
            </IconButton>
          </Box>

          {/* Drawer Content */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <List sx={{ p: 2 }}>
              {/* Login Item */}
              <ListItem disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => {
                    openLoginDialog();
                    toggleMobileMenu();
                  }}
                  sx={{
                    borderRadius: '12px',
                    py: 1.5,
                    backgroundColor: theme.palette.primary.main,
                    color: '#fff',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    },
                  }}
                >
                  <IconUser size={20} style={{ marginRight: 12 }} />
                  <ListItemText
                    primary="Login / Signup"
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                </ListItemButton>
              </ListItem>

              {/* Vegetarian Toggle - Enhanced Prominence */}
              <ListItem disablePadding sx={{ mb: 1 }}>
                <Box
                  sx={{
                    width: '100%',
                    borderRadius: '12px',
                    py: 1.5,
                    px: 2,
                    backgroundColor: vegOnly
                      ? 'rgba(76, 175, 80, 0.12)'
                      : 'rgba(0, 0, 0, 0.04)',
                    border: vegOnly
                      ? `1px solid ${theme.palette.success.main}`
                      : '1px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: vegOnly
                        ? 'rgba(76, 175, 80, 0.2)'
                        : 'rgba(0, 0, 0, 0.08)',
                    },
                  }}
                  onClick={() => setVegOnly(!vegOnly)}
                  role="switch"
                  aria-checked={vegOnly}
                  aria-label="Toggle vegetarian filter"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setVegOnly(!vegOnly);
                    }
                  }}
                >
                  <IconLeaf
                    size={22}
                    style={{ marginRight: 12, flexShrink: 0 }}
                    color={vegOnly ? theme.palette.success.main : theme.palette.text.secondary}
                  />
                  <Typography
                    variant="body1"
                    sx={{
                      color: vegOnly
                        ? theme.palette.success.dark
                        : theme.palette.text.primary,
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      flex: 1,
                    }}
                  >
                    I am Vegetarian
                  </Typography>
                  <Box
                    sx={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: vegOnly
                        ? theme.palette.success.main
                        : theme.palette.grey[300],
                      position: 'relative',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 2,
                        left: vegOnly ? 22 : 2,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }}
                    />
                  </Box>
                </Box>
              </ListItem>

              <Divider sx={{ my: 2 }} />

              {/* Notifications */}
              <ListItem disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  sx={{
                    borderRadius: '12px',
                    py: 1.5,
                  }}
                >
                  <IconBell size={20} style={{ marginRight: 12 }} />
                  <ListItemText primary="Notifications" />
                  {notificationCount > 0 && (
                    <Badge
                      badgeContent={notificationCount}
                      color="error"
                      sx={{ ml: 1 }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            </List>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
