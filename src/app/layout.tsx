import { Inter } from "next/font/google";
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

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
  variable: "--font-inter",
});

// Metadata configuration for Next.js
export const metadata = {
  title: "NikFoods - Indian Food Delivery",
  description: "Order delicious Indian food for delivery across United States",
  icons: "/favicon.ico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-inter">
        <AuthProvider>
          <CartProvider>
            <HeaderProvider>
              <ThemeProvider>
                <NotificationProvider>
                  <Header />
                  <TimezoneWarningBanner />
                  <FirstTimeAddressPrompt />
                  <DialogsProvider>
                    {children}
                  </DialogsProvider>
                </NotificationProvider>
              </ThemeProvider>
            </HeaderProvider>
          </CartProvider>
        </AuthProvider>
        <CrispChat />
      </body>
    </html>
  );
}
