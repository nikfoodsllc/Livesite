'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import LoginDialog from '@/components/dialogs/LoginDialog';
import SignupDialog from '@/components/dialogs/SignupDialog';
import ForgotPasswordDialog from '@/components/dialogs/ForgotPasswordDialog';
import CartPreviewSidebar from '@/components/cart/CartPreviewSidebar';
import { useHeader } from '@/contexts/HeaderContext';

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