'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

interface CrispChatProps {
  websiteId?: string;
}

export default function CrispChat({ websiteId }: CrispChatProps) {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Prevent duplicate injection
    if (window.$crisp) {
      return;
    }

    // Validate environment variable
    const crispWebsiteId = websiteId || process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
    if (!crispWebsiteId) {
      console.warn('Crisp Website ID is not configured. Set NEXT_PUBLIC_CRISP_WEBSITE_ID environment variable.');
      return;
    }

    // Configure Crisp
    window.CRISP_WEBSITE_ID = crispWebsiteId;

    // Create Crisp script element
    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    script.defer = true;

    // Inject script into document
    document.head.appendChild(script);

    // Cleanup function (optional, removes script on unmount)
    return () => {
      // Note: We don't remove the script or $crisp object to allow Crisp
      // to persist across page navigations in Next.js
    };
  }, [websiteId]);

  // This component doesn't render anything visible
  return null;
}
