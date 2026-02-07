'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginDialog from '@/components/dialogs/LoginDialog';
import SignupDialog from '@/components/dialogs/SignupDialog';
import ForgotPasswordDialog from '@/components/dialogs/ForgotPasswordDialog';
import CartPreviewSidebar from '@/components/cart/CartPreviewSidebar';
import { useHeader } from '@/contexts/HeaderContext';
import { SESSION_EXPIRED_KEY, clearSessionExpiredFlag } from '@/hooks/useApiClient';

export default function DialogsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    isLoginDialogOpen,
    isSignupDialogOpen,
    isForgotPasswordDialogOpen,
    isCartPreviewOpen,
    closeLoginDialog,
    closeSignupDialog,
    closeForgotPasswordDialog,
    closeCartPreview,
    openSignupDialog,
    openLoginDialog,
    openForgotPasswordDialog,
  } = useHeader();

  // Check for session expired flag on mount and open login dialog if set
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(SESSION_EXPIRED_KEY) === 'true') {
      openLoginDialog();
      clearSessionExpiredFlag();
    }
  }, [openLoginDialog]);

  return (
    <>
      {children}

      {/* Login Dialog */}
      <LoginDialog
        open={isLoginDialogOpen}
        onClose={closeLoginDialog}
        onSwitchToSignup={() => {
          closeLoginDialog();
          openSignupDialog();
        }}
        onSwitchToForgotPassword={() => {
          closeLoginDialog();
          openForgotPasswordDialog();
        }}
      />

      {/* Signup Dialog */}
      <SignupDialog
        open={isSignupDialogOpen}
        onClose={closeSignupDialog}
        onSwitchToLogin={() => {
          closeSignupDialog();
          openLoginDialog();
        }}
      />

      {/* Forgot Password Dialog */}
      <ForgotPasswordDialog
        open={isForgotPasswordDialogOpen}
        onClose={closeForgotPasswordDialog}
        onSwitchToLogin={() => {
          closeForgotPasswordDialog();
          openLoginDialog();
        }}
      />

      {/* Cart Preview Sidebar */}
      <CartPreviewSidebar
        open={isCartPreviewOpen}
        onClose={closeCartPreview}
        onViewFullCart={() => {
          // Navigate to full cart page
          router.push('/cart');
        }}
        onCheckout={() => {
          // Navigate to checkout page
          router.push('/checkout');
        }}
      />
    </>
  );
}