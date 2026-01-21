'use client';

import Image from 'next/image';
import { Box, Container, Typography, Link, IconButton, Divider, useTheme } from '@mui/material';
import {
  IconBrandTwitter,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandYoutube,
} from '@tabler/icons-react';

const quickLinks = [
  { label: 'Home', href: '/' },
  { label: 'Menu', href: '/menu' },
  { label: 'About', href: '/about' },
  { label: 'Help', href: '/help' },
  { label: 'FAQs', href: '/faqs' },
];

const accountLinks = [
  { label: 'My Account', href: '/account' },
  { label: 'Orders', href: '/orders' },
  { label: 'Payment Methods', href: '/payment-methods' },
];

export default function Footer() {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#2A1A0C',
        color: '#E0E0E0',
        pt: 6,
        pb: 3,
        mt: 8,
      }}
    >
      <Container maxWidth="lg">
        {/* Main Footer Content */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 4,
            mb: 4,
          }}
        >
          {/* Logo & Social Media */}
          <Box>
            <Box sx={{ mb: 2 }}>
              <Image
                src="/images/logo.png"
                alt="NikFoods Logo"
                width={140}
                height={50}
                style={{
                  width: 'auto',
                  height: '45px',
                  maxWidth: '140px',
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.7 }}>
              Authentic Indian food delivered to your doorstep across the United States.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                href="https://twitter.com"
                target="_blank"
                sx={{
                  color: '#E0E0E0',
                  '&:hover': { color: theme.palette.primary.main },
                }}
              >
                <IconBrandTwitter size={20} />
              </IconButton>
              <IconButton
                href="https://facebook.com"
                target="_blank"
                sx={{
                  color: '#E0E0E0',
                  '&:hover': { color: theme.palette.primary.main },
                }}
              >
                <IconBrandFacebook size={20} />
              </IconButton>
              <IconButton
                href="https://instagram.com"
                target="_blank"
                sx={{
                  color: '#E0E0E0',
                  '&:hover': { color: theme.palette.primary.main },
                }}
              >
                <IconBrandInstagram size={20} />
              </IconButton>
              <IconButton
                href="https://youtube.com"
                target="_blank"
                sx={{
                  color: '#E0E0E0',
                  '&:hover': { color: theme.palette.primary.main },
                }}
              >
                <IconBrandYoutube size={20} />
              </IconButton>
            </Box>
          </Box>

          {/* Quick Links */}
          <Box>
            <Typography
              variant="h6"
              sx={{
                color: '#ffffff',
                fontWeight: 600,
                mb: 2,
                fontSize: '1rem',
              }}
            >
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {quickLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  underline="none"
                  sx={{
                    color: '#E0E0E0',
                    fontSize: '0.875rem',
                    '&:hover': {
                      color: theme.palette.primary.main,
                    },
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </Box>
          </Box>

          {/* Contact Us */}
          <Box>
            <Typography
              variant="h6"
              sx={{
                color: '#ffffff',
                fontWeight: 600,
                mb: 2,
                fontSize: '1rem',
              }}
            >
              Contact Us
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                Website:{' '}
                <Link
                  href="https://nikfoods.com"
                  sx={{
                    color: theme.palette.primary.main,
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  nikfoods.com
                </Link>
              </Typography>
              <Typography variant="body2">
                Phone:{' '}
                <Link
                  href="tel:+11234567890"
                  sx={{
                    color: theme.palette.primary.main,
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  +1 (123) 456-7890
                </Link>
              </Typography>
            </Box>
          </Box>

          {/* My Account */}
          <Box>
            <Typography
              variant="h6"
              sx={{
                color: '#ffffff',
                fontWeight: 600,
                mb: 2,
                fontSize: '1rem',
              }}
            >
              My Account
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {accountLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  underline="none"
                  sx={{
                    color: '#E0E0E0',
                    fontSize: '0.875rem',
                    '&:hover': {
                      color: theme.palette.primary.main,
                    },
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(224, 224, 224, 0.2)', mb: 3 }} />

        {/* Bottom Bar */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
            © {currentYear} NikFoods. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Link
              href="/privacy"
              underline="none"
              sx={{
                color: '#B0B0B0',
                fontSize: '0.875rem',
                '&:hover': {
                  color: theme.palette.primary.main,
                },
              }}
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              underline="none"
              sx={{
                color: '#B0B0B0',
                fontSize: '0.875rem',
                '&:hover': {
                  color: theme.palette.primary.main,
                },
              }}
            >
              Terms of Service
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
