import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/seo';

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The picture shown when the site is shared (WhatsApp, iMessage, Facebook, Google): dark brand card, no outside fonts or files. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1E1409', color: '#F6D58E', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', width: 140, height: 8, background: '#F89C35', borderRadius: 4, marginBottom: 44 }} />
        <div style={{ display: 'flex', fontSize: 150, fontWeight: 800, letterSpacing: -4 }}>{SITE_NAME}</div>
        <div style={{ display: 'flex', fontSize: 44, color: '#E9DCC4', marginTop: 18 }}>{SITE_TAGLINE}</div>
      </div>
    ),
    size
  );
}
