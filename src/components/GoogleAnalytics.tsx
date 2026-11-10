import { GA_ID } from '@/lib/analytics';

/**
 * Google Analytics 4 when NEXT_PUBLIC_GA_MEASUREMENT_ID is set; renders nothing otherwise. Page views follow route changes by themselves.
 * Plain script tags (placed in the page's <head> by the layout), so the snippet is in the HTML itself: Google Search Console's
 * "Google Analytics" ownership check reads the raw page and looks for it there.
 */
export default function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`,
        }}
      />
    </>
  );
}
