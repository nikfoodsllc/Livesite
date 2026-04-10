'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Interface for header state management
interface HeaderContextType {
  // Dialog states
  isLoginDialogOpen: boolean;
  isSignupDialogOpen: boolean;
  isForgotPasswordDialogOpen: boolean;
  isCartPreviewOpen: boolean;

  // Dialog action handlers
  openLoginDialog: () => void;
  closeLoginDialog: () => void;
  openSignupDialog: () => void;
  closeSignupDialog: () => void;
  openForgotPasswordDialog: () => void;
  closeForgotPasswordDialog: () => void;
  openCartPreview: () => void;
  closeCartPreview: () => void;

  // Navigation handlers
  navigateToCart: () => void;
  navigateToCheckout: () => void;
  navigateToProfile: () => void;
  navigateToOrders: () => void;
  navigateToAddresses: () => void;

  // Vegetarian filter state
  vegOnly: boolean;
  setVegOnly: (value: boolean) => void;
}

// Create context with undefined as default value
const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

// Header Provider component
export const HeaderProvider = ({ children }: { children: ReactNode }) => {
  // Dialog states
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isSignupDialogOpen, setIsSignupDialogOpen] = useState(false);
  const [isForgotPasswordDialogOpen, setIsForgotPasswordDialogOpen] = useState(false);
  const [isCartPreviewOpen, setIsCartPreviewOpen] = useState(false);

  // Vegetarian filter state
  const [vegOnly, setVegOnly] = useState<boolean>(false);

  // Login dialog handlers
  const openLoginDialog = () => setIsLoginDialogOpen(true);
  const closeLoginDialog = () => setIsLoginDialogOpen(false);

  // Signup dialog handlers
  const openSignupDialog = () => setIsSignupDialogOpen(true);
  const closeSignupDialog = () => setIsSignupDialogOpen(false);

  // Forgot password dialog handlers
  const openForgotPasswordDialog = () => setIsForgotPasswordDialogOpen(true);
  const closeForgotPasswordDialog = () => setIsForgotPasswordDialogOpen(false);

  // Cart preview handlers
  const openCartPreview = () => setIsCartPreviewOpen(true);
  const closeCartPreview = () => setIsCartPreviewOpen(false);

  // Navigation handlers
  const navigateToCart = () => {
    window.location.href = '/cart';
  };

  const navigateToCheckout = () => {
    window.location.href = '/checkout';
  };

  const navigateToProfile = () => {
    window.location.href = '/account/profile';
  };

  const navigateToOrders = () => {
    window.location.href = '/account/orders';
  };

  const navigateToAddresses = () => {
    window.location.href = '/account/addresses';
  };

  // Context value object
  const contextValue: HeaderContextType = {
    // Dialog states
    isLoginDialogOpen,
    isSignupDialogOpen,
    isForgotPasswordDialogOpen,
    isCartPreviewOpen,

    // Dialog action handlers
    openLoginDialog,
    closeLoginDialog,
    openSignupDialog,
    closeSignupDialog,
    openForgotPasswordDialog,
    closeForgotPasswordDialog,
    openCartPreview,
    closeCartPreview,

    // Navigation handlers
    navigateToCart,
    navigateToCheckout,
    navigateToProfile,
    navigateToOrders,
    navigateToAddresses,

    // Vegetarian filter state
    vegOnly,
    setVegOnly,
  };

  return (
    <HeaderContext.Provider value={contextValue}>
      {children}
    </HeaderContext.Provider>
  );
};

// Custom hook to use header context
export const useHeader = () => {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
};