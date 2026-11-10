import Script from 'next/script';
import { GA_ID } from '@/lib/analytics';

/** Loads Google Analytics 4 when NEXT_PUBLIC_GA_MEASUREMENT_ID is set; renders nothing otherwise. Page views follow route changes by themselves. */
export default function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
