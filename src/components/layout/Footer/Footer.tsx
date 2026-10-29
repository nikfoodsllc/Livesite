'use client';

import Image from 'next/image';
import { Box, Container, Typography, Link, IconButton } from '@mui/material';
import { IconArrowUp, IconBrandApple, IconBrandFacebook, IconBrandInstagram, IconLock } from '@tabler/icons-react';
import { APP_STORE_URL } from '@/lib/appStore';

const GOLD = '#D9B26A';
const CREAM = '#EADFCB';
const MUTED = '#A89A85';

const quickLinks = [
  { label: 'Home', href: '/' },
  { label: 'FAQs', href: '/faqs' },
];

const accountLinks = [
  { label: 'My Account', href: '/account' },
  { label: 'My Orders', href: '/account/orders' },
  { label: 'Addresses', href: '/account/addresses' },
];

const legalLinks = [
  { label: 'Terms', href: '/terms' },
  { label: 'Text Updates', href: '/sms' },
  { label: 'Privacy Policy', href: '/privacy' },
];

const linkSx = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 34,
  width: 'fit-content',
  color: CREAM,
  fontSize: '0.9375rem',
  textDecoration: 'none',
  transition: 'color 0.2s ease, transform 0.2s ease',
  '&:hover': { color: GOLD, transform: 'translateX(3px)' },
  '&:focus-visible': { outline: `2px solid ${GOLD}`, outlineOffset: 3, borderRadius: 4 },
} as const;

const headingSx = {
  fontFamily: 'var(--font-display), Georgia, serif',
  color: GOLD,
  fontWeight: 600,
  fontSize: '1.0625rem',
  letterSpacing: '0.01em',
  mb: 1.5,
  pb: 1.25,
  borderBottom: '1px solid rgba(217, 178, 106, 0.28)',
  width: 'fit-content',
  minWidth: 96,
} as const;

const socialSx = {
  width: 42,
  height: 42,
  color: GOLD,
  border: '1px solid rgba(217, 178, 106, 0.5)',
  transition: 'background-color 0.2s ease, color 0.2s ease, transform 0.2s ease',
  '&:hover': { backgroundColor: GOLD, color: '#1A110A', transform: 'translateY(-2px)' },
} as const;

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        position: 'relative',
        mt: 8,
        pt: { xs: 6, md: 8 },
        pb: 3,
        color: CREAM,
        background: 'radial-gradient(ellipse at 15% 0%, rgba(184, 137, 59, 0.16) 0%, rgba(184, 137, 59, 0) 55%), #1A110A',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, rgba(217, 178, 106, 0), rgba(217, 178, 106, 0.8), rgba(217, 178, 106, 0))',
        },
      }}
    >
      <IconButton
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        sx={{
          position: 'absolute',
          top: -22,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 44,
          height: 44,
          color: '#1A110A',
          backgroundColor: GOLD,
          boxShadow: '0 10px 22px -8px rgba(26, 17, 10, 0.55)',
          '&:hover': { backgroundColor: '#F6D58E' },
          '&:focus-visible': { outline: `2px solid ${CREAM}`, outlineOffset: 3 },
        }}
      >
        <IconArrowUp size={20} />
      </IconButton>
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: '1.6fr 1fr 1fr 1fr' },
            columnGap: { xs: 3, md: 6 },
            rowGap: { xs: 4, md: 0 },
            mb: { xs: 5, md: 7 },
          }}
        >
          {/* Brand */}
          <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, maxWidth: 360 }}>
            <Image
              src="/images/logo.png"
              alt="NikFoods Logo"
              width={170}
              height={60}
              style={{ width: 'auto', height: '54px', maxWidth: '170px', marginBottom: 14 }}
            />
            <Typography
              sx={{
                fontFamily: 'var(--font-display), Georgia, serif',
                fontStyle: 'italic',
                fontSize: { xs: '1.1875rem', md: '1.3125rem' },
                lineHeight: 1.45,
                color: CREAM,
                mb: 2.5,
                textWrap: 'balance',
              }}
            >
              Authentic Indian food delivered to your door.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              <IconButton aria-label="NikFoods on Facebook" href="https://facebook.com/nikfoodsllc" target="_blank" rel="noopener" sx={socialSx}>
                <IconBrandFacebook size={20} />
              </IconButton>
              <IconButton aria-label="NikFoods on Instagram" href="https://instagram.com/Nikfoods_IndianOrganic" target="_blank" rel="noopener" sx={socialSx}>
                <IconBrandInstagram size={20} />
              </IconButton>
            </Box>
            <Link
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener"
              aria-label="Get the NikFoods app on the App Store"
              sx={{
                mt: 2.5,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                height: 44,
                px: 2,
                borderRadius: 999,
                color: '#1A110A',
                backgroundColor: GOLD,
                fontWeight: 600,
                fontSize: '0.9375rem',
                textDecoration: 'none',
                transition: 'background-color 0.2s ease, transform 0.15s ease',
                '&:hover': { backgroundColor: '#F6D58E' },
                '&:active': { transform: 'scale(0.97)' },
                '&:focus-visible': { outline: `2px solid ${CREAM}`, outlineOffset: 3 },
              }}
            >
              <IconBrandApple size={20} />
              Get the app
            </Link>
          </Box>

          {/* Quick Links */}
          <Box component="nav" aria-label="Quick links">
            <Typography component="h2" sx={headingSx}>Quick Links</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {quickLinks.map((link) => (
                <Link key={link.label} href={link.href} sx={linkSx}>
                  {link.label}
                </Link>
              ))}
            </Box>
          </Box>

          {/* My Account */}
          <Box component="nav" aria-label="My account">
            <Typography component="h2" sx={headingSx}>My Account</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {accountLinks.map((link) => (
                <Link key={link.label} href={link.href} sx={linkSx}>
                  {link.label}
                </Link>
              ))}
            </Box>
          </Box>

          {/* Support */}
          <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
            <Typography component="h2" sx={headingSx}>Support</Typography>
            <Link
              href="mailto:support@nikfoods.com"
              sx={{ ...linkSx, color: GOLD, wordBreak: 'break-word', '&:hover': { color: '#F6D58E', transform: 'none', textDecoration: 'underline' } }}
            >
              support@nikfoods.com
            </Link>
          </Box>
        </Box>

        {/* Bottom bar */}
        <Box
          sx={{
            pt: 2.5,
            borderTop: '1px solid rgba(217, 178, 106, 0.22)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: { xs: 1, sm: 2 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', columnGap: 2, rowGap: 0.5 }}>
            <Typography sx={{ color: MUTED, fontSize: '0.8125rem' }}>
              © {currentYear} NikFoods. All rights reserved.
            </Typography>
            <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: MUTED, fontSize: '0.8125rem' }}>
              <IconLock size={14} aria-hidden /> Secure payments by Stripe
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', columnGap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
            {legalLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                sx={{ ...linkSx, color: MUTED, fontSize: '0.8125rem', minHeight: 32, '&:hover': { color: GOLD, transform: 'none' } }}
              >
                {l.label}
              </Link>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
