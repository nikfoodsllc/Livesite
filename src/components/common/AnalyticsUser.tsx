'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { useAuth } from '@/contexts/AuthContext';
import { GA_ID, setAnalyticsUser, trackEvent, trackViewCart } from '@/lib/analytics';
import { getCartSummary } from '@/lib/localStorageCart';

/**
 * Everything Google Analytics needs from the whole site that no single screen owns. Renders nothing.
 * - who is signed in (our internal id only, never a name, email or phone number)
 * - the cart page was opened
 * - taps on phone, email and App Store links
 * - page errors (a short message, at most 5 per page load)
 * - page speed (Core Web Vitals)
 */
export default function AnalyticsUser() {
  const { user } = useAuth();
  const id = user?.id ?? null;
  const pathname = usePathname();

  useEffect(() => {
    setAnalyticsUser(id);
  }, [id]);

  useEffect(() => {
    if (pathname !== '/cart') return;
    try {
      const s = getCartSummary();
      trackViewCart(s.subtotal, s.itemCount);
    } catch {
      // cart unreadable: skip
    }
  }, [pathname]);

  useReportWebVitals((m) => {
    if (!GA_ID) return;
    trackEvent('web_vitals', { metric_name: m.name, metric_value: Math.round(m.name === 'CLS' ? m.value * 1000 : m.value), metric_rating: (m as { rating?: string }).rating ?? 'unknown', metric_id: m.id });
  });

  useEffect(() => {
    if (!GA_ID) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href') ?? '';
      if (href.startsWith('tel:')) trackEvent('contact_click', { method: 'phone' });
      else if (href.startsWith('mailto:')) trackEvent('contact_click', { method: 'email' });
      else if (href.includes('apps.apple.com')) trackEvent('app_download_click', { store: 'app_store' });
    };
    let errors = 0;
    const report = (description: string) => {
      if (errors >= 5) return;
      errors += 1;
      trackEvent('exception', { description: description.slice(0, 100), fatal: false });
    };
    const onError = (e: ErrorEvent) => report(e.message || 'error');
    const onRejection = (e: PromiseRejectionEvent) => report(String((e.reason as Error | undefined)?.message ?? e.reason ?? 'rejection'));
    document.addEventListener('click', onClick, true);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
