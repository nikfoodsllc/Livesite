import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import ThemeProvider from "./providers/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { HeaderProvider } from "@/contexts/HeaderContext";
import Header from "@/components/layout/Header/Header";
import DialogsProvider from "@/components/providers/DialogsProvider";
import { NotificationProvider } from "@/components/common/NotificationSystem";
import CrispChat from "@/components/CrispChat";
import TimezoneWarningBanner from "@/components/common/TimezoneWarningBanner";
import FirstTimeAddressPrompt from "@/components/layout/FirstTimeAddressPrompt";
import StockLimitNotice from "@/components/common/StockLimitNotice";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { isTestSite } from "@/lib/siteUrl";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL, jsonLdString, websiteJsonLd } from "@/lib/seo";

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
  variable: "--font-inter",
});

// Metadata configuration for Next.js (search results, sharing cards, canonical address)
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} - Indian Food Delivery`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  // the test site and preview builds must never be listed by search engines
  ...(isTestSite() ? { robots: { index: false, follow: false } } : {}),
  icons: "/favicon.ico?v=2",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} - Indian Food Delivery`,
    description: SITE_TAGLINE,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME} - Indian Food Delivery`, description: SITE_TAGLINE },
  // Safari on iPhone shows Apple's own "Open / Get" strip for the NikFoods app
  other: { "apple-itunes-app": "app-id=6767141830" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={`font-inter ${playfair.variable}`}>
        <AuthProvider>
          <CartProvider>
            <HeaderProvider>
              <ThemeProvider>
                <NotificationProvider>
                  <Header />
                  <TimezoneWarningBanner />
                  <FirstTimeAddressPrompt />
                  <StockLimitNotice />
                  <DialogsProvider>
                    {children}
                  </DialogsProvider>
                </NotificationProvider>
              </ThemeProvider>
            </HeaderProvider>
          </CartProvider>
        </AuthProvider>
        <CrispChat />
        <GoogleAnalytics />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(websiteJsonLd()) }} />
      </body>
    </html>
  );
}
