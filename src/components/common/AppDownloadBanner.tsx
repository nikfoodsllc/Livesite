'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, IconButton } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { usePathname } from 'next/navigation';
import { APP_STORE_URL } from '@/lib/appStore';
import { DEFAULT_POPUP_HIDE_DAYS, type PublicPopup } from '@/lib/banners';

const DISMISSED_KEY = 'popupBannerDismissed';
// the payment screens stay free of anything that could pull a customer away
const HIDDEN_ON = ['/checkout', '/pay'];

// shown until an admin adds a popup in the admin (Banners > Popup Banners)
const BUILT_IN: PublicPopup = { id: 'built-in', imageUrl: '/images/app-popup.png', linkType: 'url', url: APP_STORE_URL, hideDays: DEFAULT_POPUP_HIDE_DAYS };

// a new or changed picture counts as a new popup, so customers who closed the old one see it
const keyOf = (p: PublicPopup) => `${p.id}|${p.imageUrl}`;

function recentlyClosed(p: PublicPopup): boolean {
  try {
    const saved = JSON.parse(localStorage.getItem(DISMISSED_KEY) || 'null') as { key?: string; at?: number } | null;
    return Boolean(saved && saved.key === keyOf(p) && Number(saved.at) > 0 && Date.now() - Number(saved.at) < p.hideDays * 86400000);
  } catch {
    return false;
  }
}

/** The pop-up that opens with the site, on every browser and phone. The admin sets the picture; the X hides it for the days the admin chose. */
export default function AppDownloadBanner() {
  const pathname = usePathname() || '/';
  const [popup, setPopup] = useState<PublicPopup | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/popup-banner');
        const j = await r.json();
        if (cancelled || !j?.success) return;
        const p: PublicPopup | null = j.managed ? (j.data as PublicPopup | null) : BUILT_IN;
        if (p && !recentlyClosed(p)) setPopup(p);
      } catch {
        // no pop-up this time
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!popup || HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify({ key: keyOf(popup), at: Date.now() }));
    } catch {
      // the pop-up just comes back next visit
    }
    setPopup(null);
  };

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={popup.imageUrl} alt="NikFoods" style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12 }} />
  );

  return (
    <Dialog
      open
      onClose={dismiss}
      aria-label="NikFoods"
      slotProps={{ paper: { sx: { m: 2, width: '100%', maxWidth: { xs: 520, md: 780 }, borderRadius: 3, overflow: 'visible', position: 'relative', bgcolor: 'transparent', boxShadow: 'none' } } }}
    >
      <IconButton onClick={dismiss} aria-label="Close" size="small" sx={{ position: 'absolute', top: -12, right: -12, zIndex: 1, bgcolor: '#fff', color: '#17120d', boxShadow: 2, '&:hover': { bgcolor: '#f3f3f3' } }}>
        <IconX size={20} />
      </IconButton>
      {popup.linkType === 'url' && popup.url ? (
        <a href={popup.url} target="_blank" rel="noopener" onClick={dismiss} style={{ display: 'block', lineHeight: 0 }}>
          {image}
        </a>
      ) : (
        <div style={{ lineHeight: 0 }}>{image}</div>
      )}
    </Dialog>
  );
}
