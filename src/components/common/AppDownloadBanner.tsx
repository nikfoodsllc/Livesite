'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, IconButton } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { usePathname } from 'next/navigation';
import { APP_STORE_URL } from '@/lib/appStore';

const DISMISSED_KEY = 'appBannerDismissedAt';
const HIDE_DAYS = 30;
// the payment screens stay free of anything that could pull a customer away
const HIDDEN_ON = ['/checkout', '/pay'];

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return at > 0 && Date.now() - at < HIDE_DAYS * 86400000;
  } catch {
    return false;
  }
}

/** The "our app is on the App Store" pop-up when the site opens, on every browser and phone; the X hides it for 30 days. */
export default function AppDownloadBanner() {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!recentlyDismissed());
  }, []);

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // the pop-up just comes back next visit
    }
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onClose={dismiss}
      aria-label="NikFoods app"
      slotProps={{ paper: { sx: { m: 2, width: '100%', maxWidth: { xs: 520, md: 780 }, borderRadius: 3, overflow: 'visible', position: 'relative', bgcolor: '#17120d' } } }}
    >
      <IconButton onClick={dismiss} aria-label="Close" size="small" sx={{ position: 'absolute', top: -12, right: -12, zIndex: 1, bgcolor: '#fff', color: '#17120d', boxShadow: 2, '&:hover': { bgcolor: '#f3f3f3' } }}>
        <IconX size={20} />
      </IconButton>
      <a href={APP_STORE_URL} target="_blank" rel="noopener" onClick={dismiss} style={{ display: 'block', lineHeight: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/app-popup.png" alt="Our app is on the Apple Store. Download on the App Store" width={1200} height={600} style={{ width: '100%', height: 'auto', borderRadius: 12 }} />
      </a>
    </Dialog>
  );
}
