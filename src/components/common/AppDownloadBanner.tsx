'use client';

import React, { useEffect, useState } from 'react';
import { Box, Button, IconButton, Typography } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { usePathname } from 'next/navigation';
import { APP_STORE_URL } from '@/lib/appStore';

const DISMISSED_KEY = 'appBannerDismissedAt';
const HIDE_DAYS = 30;
// the payment screens stay free of anything that could pull a customer away
const HIDDEN_ON = ['/checkout', '/pay'];

const isIos = (): boolean =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return at > 0 && Date.now() - at < HIDE_DAYS * 86400000;
  } catch {
    return false;
  }
}

/** A slim "get the app" bar under the header for iPhone and iPad visitors; the X hides it for 30 days. */
export default function AppDownloadBanner() {
  const pathname = usePathname() || '/';
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(isIos() && !recentlyDismissed());
  }, []);

  if (!show || HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // the bar just comes back next visit
    }
    setShow(false);
  };

  return (
    <Box
      role="region"
      aria-label="NikFoods app"
      sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, py: 1, bgcolor: '#FFF7EC', borderBottom: '1px solid #F3DFC4' }}
    >
      <IconButton onClick={dismiss} aria-label="Close" size="small" sx={{ color: 'text.secondary', mr: -0.25 }}>
        <IconX size={18} />
      </IconButton>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/app-icon.png" alt="" width={40} height={40} style={{ borderRadius: 9, flexShrink: 0 }} />
      <Typography sx={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Get the NikFoods app</Typography>
      <Button component="a" href={APP_STORE_URL} variant="contained" size="small" disableElevation sx={{ borderRadius: 99, px: 2.25, fontWeight: 700, textTransform: 'none', flexShrink: 0 }}>
        Get
      </Button>
    </Box>
  );
}
