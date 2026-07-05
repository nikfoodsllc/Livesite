'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import { IconShoppingCart, IconLock } from '@tabler/icons-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHeader } from '@/contexts/HeaderContext';
import { useApiClient } from '@/hooks/useApiClient';
import ContactInfoSection, { ContactInfoSectionRef } from '@/components/checkout/ContactInfoSection';
import PaymentMethodSection from '@/components/checkout/PaymentMethodSection';
import CheckoutPaymentDetails, {
  CheckoutPaymentDetailsHandle,
} from '@/components/checkout/CheckoutPaymentDetails';
import TipSection from '@/components/checkout/TipSection';
import DeliveryAddressDisplay from '@/components/checkout/DeliveryAddressDisplay';
import AddressSelectionDialog from '@/components/checkout/AddressSelectionDialog';
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary';
import { PaymentMethod } from '@/types/order';
import { Cart } from '@/types/cart';
import { IAddress } from '@/types/auth';
import { ZipcodeConfig } from '@/types/zipcode';
import * as localCart from '@/lib/localStorageCart';
import { calculateDeliveryDates, type DayDeliveryInfo } from '@/lib/deliveryCalculator';
import { DEFAULT_MIN_CART_VALUE } from '@/lib/cartLogic';

/**
 * Interface for error summary items
 */
interface ErrorSummary {
  field: string;
  message: string;
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

const stripeAppearance: StripeElementsOptions['appearance'] = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#FF9F0D',
  },
};

/**
 * Checkout details (address, contact, tip) before Stripe Payment Element step
 */
interface CheckoutFormContentProps {
  cart: Cart;
  name: string;
  email: string;
  phone: string;
  paymentMethod: PaymentMethod;
  tipPercentage: number;
  errors: {
    name?: string;
    email?: string;
    phone?: string;
  };
  userAddresses: IAddress[];
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPhoneError: (error: string | null) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onTipChange: (percentage: number) => void;
  onPlaceOrder: () => Promise<void>;
  onOpenAddressDialog: () => void;
  contactInfoRef: React.RefObject<ContactInfoSectionRef | null>;
  addressesLoading?: boolean;
  showAddressDialog?: boolean;
  onAddressSelect?: (addressId: string) => Promise<void>;
  onCloseAddressDialog?: () => void;
  isAuthenticated: boolean;
  onLoginClick: () => void;
  onSignupClick: () => void;
  zipcodeConfig: ZipcodeConfig | null;
  paymentClientSecret: string | null;
  pendingOrderId: string | null;
  isInitializingPayment: boolean;
  paymentFormRef: React.RefObject<CheckoutPaymentDetailsHandle | null>;
  onPaymentSuccess: (orderId: string) => Promise<void>;
  onPaymentError: (message: string) => void;
  isPaymentSubmitting: boolean;
  onPaymentSubmittingChange: (value: boolean) => void;
  cardDetailsComplete: boolean;
  onCardDetailsChange: (complete: boolean) => void;
}

function CheckoutFormContent({
  cart,
  name,
  email,
  phone,
  paymentMethod,
  tipPercentage,
  errors,
  userAddresses,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onPhoneError,
  onPaymentMethodChange,
  onTipChange,
  onPlaceOrder,
  onOpenAddressDialog,
  contactInfoRef,
  addressesLoading,
  showAddressDialog,
  onAddressSelect,
  onCloseAddressDialog,
  isAuthenticated,
  onLoginClick,
  onSignupClick,
  zipcodeConfig,
  paymentClientSecret,
  pendingOrderId,
  isInitializingPayment,
  paymentFormRef,
  onPaymentSuccess,
  onPaymentError,
  isPaymentSubmitting,
  onPaymentSubmittingChange,
  cardDetailsComplete,
  onCardDetailsChange

}: CheckoutFormContentProps) {
  const calculateTotals = () => {
    const subtotal = cart.subtotal;
    const platformFee = cart.platformFee;
    const deliveryFee = cart.deliveryFee;
    const tax = cart.tax;
    const tip = (subtotal * tipPercentage) / 100;
    const discount = cart.appliedCoupon?.discountAmount || 0;
    const total = subtotal + platformFee + deliveryFee + tax + tip - discount;

    return {
      subtotal,
      platformFee,
      deliveryFee,
      tax,
      tip,
      discount,
      total,
    };
  };

  const totals = calculateTotals();

  // Calculate delivery dates
  console.log('=== DELIVERY DATE CALCULATION START ===');
  console.log('Cart days:', cart.days);
  console.log('Number of cart days:', cart.days.length);
  console.log('Cart days details:', cart.days.map(d => ({
    date: d.date,
    day: d.day,
    dayTotal: d.dayTotal,
    itemsCount: d.items.length
  })));

  const deliveryCalculation = calculateDeliveryDates(cart.days, zipcodeConfig?.minCartValue || DEFAULT_MIN_CART_VALUE);
  console.log('Raw delivery calculation result:', deliveryCalculation);

  const deliveryCalculations: DayDeliveryInfo[] = deliveryCalculation.deliveryDays;
  console.log('Delivery calculations array:', deliveryCalculations);
  console.log('Number of delivery calculations:', deliveryCalculations.length);
  console.log('=== DELIVERY DATE CALCULATION END ===');

  const handlePlaceOrderClick = async () => {
    try {
      await onPlaceOrder();
    } catch {
      // Validation and API errors are already shown in the UI
    }
  };

  const isBusy = isInitializingPayment || isPaymentSubmitting;
  const canShowPaymentDetails = paymentMethod === 'Credit Card';

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 400px' },
        gap: 3,
      }}
    >
      {/* Left column - Forms */}
      <Box>
        {/* Delivery Address */}
        <DeliveryAddressDisplay
          address={cart.selectedAddress}
          onChangeAddress={onOpenAddressDialog}
          addresses={userAddresses}
          isAuthenticated={isAuthenticated}
          onLoginClick={onLoginClick}
          onSignupClick={onSignupClick}
        />

        {/* Contact Information */}
        <ContactInfoSection
          ref={contactInfoRef}
          name={name}
          email={email}
          phone={phone}
          onNameChange={onNameChange}
          onEmailChange={onEmailChange}
          onPhoneChange={onPhoneChange}
          onPhoneError={onPhoneError}
          errors={errors}
        />

        {/* Payment Method */}
        {/* <PaymentMethodSection
          selectedMethod={paymentMethod}
          onMethodChange={onPaymentMethodChange}
        /> */}

        {/* Stripe payment details — inline below payment method */}
        {canShowPaymentDetails && (
          <>
            {isInitializingPayment && !paymentClientSecret && (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  border: '1px solid #EDEDED',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <CircularProgress size={22} sx={{ color: '#FF9F0D' }} />
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Loading payment options…
                </Typography>
              </Paper>
            )}
            {paymentClientSecret && (
              <Elements
                stripe={stripePromise}
                key={paymentClientSecret}
                options={{
                  clientSecret: paymentClientSecret,
                  appearance: stripeAppearance,
                }}
              >
                <CheckoutPaymentDetails
                  ref={paymentFormRef}
                  orderId={pendingOrderId}
                  clientSecret={paymentClientSecret}
                  name={name}
                  email={email}
                  phone={phone}
                  onPaymentSuccess={onPaymentSuccess}
                  onPaymentError={onPaymentError}
                  isSubmitting={isPaymentSubmitting}
                  onSubmittingChange={onPaymentSubmittingChange}
                  onCardDetailsChange={onCardDetailsChange}
                />
              </Elements>
            )}
          </>
        )}

        {/* Tip Section */}
        <TipSection
          selectedTipPercentage={tipPercentage}
          onTipChange={onTipChange}
          subtotal={totals.subtotal}
        />

        {/* Place Order Button (Mobile) */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3 }}>
          {!isBusy && !cart.canCheckout && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              Minimum order value required. Add more items to proceed.
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handlePlaceOrderClick}
            disabled={
              isBusy ||
              !cart.canCheckout ||
              (paymentMethod === 'Credit Card' && !cardDetailsComplete)
            }
            startIcon={
              isBusy ? (
                <CircularProgress size={20} sx={{ color: '#fff' }} />
              ) : (
                <IconShoppingCart size={20} />
              )
            }
            sx={{
              bgcolor: '#FF9F0D',
              color: '#fff',
              py: 1.5,
              fontSize: '16px',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#e68f0c',
              },
              '&:disabled': {
                bgcolor: '#ccc',
                color: '#666',
              },
            }}
          >
            {isPaymentSubmitting
              ? 'Processing…'
              : isInitializingPayment
                ? 'Preparing payment…'
                : `Pay $${totals.total.toFixed(2)}`}
          </Button>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              mt: 1,
            }}
          >
            <IconLock size={14} style={{ color: '#666' }} />
            <Typography variant="caption" sx={{ color: '#666' }}>
              Secure checkout
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Right column - Order Summary */}
      <Box>
        <CheckoutOrderSummary
          cartDays={cart.days}
          subtotal={totals.subtotal}
          platformFee={totals.platformFee}
          deliveryFee={totals.deliveryFee}
          tax={totals.tax}
          tip={totals.tip}
          discount={totals.discount}
          total={totals.total}
          deliveryCalculations={deliveryCalculations}
          discountCode={cart.appliedCoupon?.code}
        />

        {/* Place Order Button (Desktop) */}
        {!isBusy && !cart.canCheckout && (
          <Alert severity="warning" sx={{ display: { xs: 'none', md: 'block' }, mb: 1.5 }}>
            Minimum order value required. Add more items to proceed.
          </Alert>
        )}

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handlePlaceOrderClick}
          disabled={
            isBusy ||
            !cart.canCheckout ||
            (paymentMethod === 'Credit Card' && !cardDetailsComplete)
          }
          startIcon={
            isBusy ? (
              <CircularProgress size={20} sx={{ color: '#fff' }} />
            ) : (
              <IconShoppingCart size={20} />
            )
          }
          sx={{
            display: { xs: 'none', md: 'block' },
            mt: 2,
            bgcolor: '#FF9F0D',
            color: '#fff',
            py: 1.5,
            fontSize: '16px',
            fontWeight: 600,
            '&:hover': {
              bgcolor: '#e68f0c',
            },
            '&:disabled': {
              bgcolor: '#ccc',
              color: '#666',
            },
          }}
        >
          {isPaymentSubmitting
            ? 'Processing…'
            : isInitializingPayment
              ? 'Preparing payment…'
              : `Pay $${totals.total.toFixed(2)}`}
        </Button>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            mt: 1,
          }}
        >
          <IconLock size={14} style={{ color: '#666' }} />
          <Typography variant="caption" sx={{ color: '#666' }}>
            Secure checkout
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, isLoading: cartLoading, refreshCart, updateAddress, zipcodeConfig, selectedAddressId } = useCart();
  const { user, isLoading: authLoading } = useAuth();
  const { openLoginDialog, closeLoginDialog, openSignupDialog, closeSignupDialog, openForgotPasswordDialog, closeForgotPasswordDialog } = useHeader();
  const { authenticatedFetch } = useApiClient();

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit Card');
  const [tipPercentage, setTipPercentage] = useState(5);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [error, setError] = useState('');

  // Address dialog states
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [userAddresses, setUserAddresses] = useState<IAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);

  // Form validation errors
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
  }>({});

  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);

  // Validation error summary shown when Place Order is clicked
  const [validationErrors, setValidationErrors] = useState<ErrorSummary[]>([]);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Form container ref for scroll behavior
  const formContainerRef = useRef<HTMLDivElement>(null);
  const contactInfoRef = useRef<ContactInfoSectionRef>(null);
  const paymentFormRef = useRef<CheckoutPaymentDetailsHandle>(null);

  const [cardDetailsComplete, setCardDetailsComplete] = useState(false);

  // Error summary for displaying all validation errors
  const getErrorSummary = useCallback((): ErrorSummary[] => {
    const summary: ErrorSummary[] = [];

    if (errors.name) {
      summary.push({ field: 'name', message: errors.name });
    }
    if (errors.email) {
      summary.push({ field: 'email', message: errors.email });
    }
    if (errors.phone) {
      summary.push({ field: 'phone', message: errors.phone });
    }

    return summary;
  }, [errors]);

  // Check if address is complete (not zipcode-derived)
  const isAddressComplete = useCallback((address: any): boolean => {
    if (!address) return false;

    // Check if address ID starts with 'zipcode-' (indicates incomplete address)
    const isZipcodeAddress = address._id?.startsWith('zipcode-');

    // Check if addressLine1 contains placeholder values
    const hasPlaceholderAddress = address.addressLine1 === 'Delivery Area' ||
      address.addressLine1 === 'Delivery Area:';

    // Address is complete if it's not a zipcode address AND doesn't have placeholder
    return !isZipcodeAddress && !hasPlaceholderAddress;
  }, []);

  // Collect all validation errors when Place Order is clicked
  const collectAllValidationErrors = useCallback((): ErrorSummary[] => {
    const allErrors: ErrorSummary[] = [];

    // Check for delivery address
    if (!cart?.selectedAddress) {
      allErrors.push({
        field: 'Delivery Address',
        message: 'Please select a delivery address to complete your order'
      });
    } else if (!isAddressComplete(cart.selectedAddress)) {
      // Address exists but is incomplete (zipcode-derived or placeholder)
      allErrors.push({
        field: 'Delivery Address',
        message: 'Please provide your complete delivery address including street address to complete your order'
      });
    }

    // Check if cart can checkout
    if (cart && !cart.canCheckout) {
      allErrors.push({
        field: 'Cart Requirements',
        message: 'Your cart does not meet the minimum order requirements. Please check the delivery messages.'
      });
    }

    // Check form fields
    if (errors.name) {
      allErrors.push({ field: 'name', message: errors.name });
    }
    if (errors.email) {
      allErrors.push({ field: 'email', message: errors.email });
    }
    if (errors.phone) {
      allErrors.push({ field: 'phone', message: errors.phone });
    }

    return allErrors;
  }, [cart, errors, isAddressComplete]);

  // Scroll to first error and show detailed error summary
  const handleValidationError = useCallback(() => {
    const errorSummary = getErrorSummary();

    if (errorSummary.length > 0) {
      // Scroll to form container first
      if (formContainerRef.current) {
        formContainerRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }

      // Scroll to first error field using ContactInfoSection ref
      setTimeout(() => {
        if (contactInfoRef.current) {
          contactInfoRef.current.scrollToFirstError();
        }
      }, 300); // Small delay to ensure form is in view
    }
  }, [getErrorSummary]);

  // Auto-scroll to first error when validation errors change
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      handleValidationError();
    }
  }, [errors, handleValidationError]);

  // Check authentication and show login dialog if not authenticated
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in useEffect
    setTimeout(() => {
      if (!authLoading && !user) {
        openLoginDialog();
      }
    }, 0);
  }, [authLoading, user, openLoginDialog]);

  // Pre-fill form with user data
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in useEffect
    setTimeout(() => {
      if (user) {
        setName(user.name || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
      }
    }, 0);
  }, [user]);
useEffect(() => {
  if (userAddresses.length === 0) return;

  const defaultAddress =
    userAddresses.find(addr => addr.isDefault) ||
    userAddresses[0];

  if (defaultAddress) {
    setName(defaultAddress.name || '');
    setEmail(defaultAddress.email || '');
    setPhone(defaultAddress.phone || '');
  }
}, [userAddresses]);
  // Redirect if cart is empty (but not after order completion)
  useEffect(() => {
    // Don't redirect if order was just completed - user is being redirected to success page
    if (orderCompleted) {
      return;
    }

    if (!cartLoading && (!cart || cart.days.length === 0)) {
      router.push('/cart');
    }
  }, [cart, cartLoading, router, orderCompleted]);

  // Fetch user addresses on mount
  useEffect(() => {
    const fetchUserAddresses = async () => {
      if (!user) return;

      setAddressesLoading(true);
      try {
        const response = await authenticatedFetch('/api/address');

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUserAddresses(data.data.items || []);
          }
        }
      } catch (error) {
        console.error('Error fetching user addresses:', error);
      } finally {
        setAddressesLoading(false);
      }
    };

    // Use setTimeout to avoid synchronous setState in useEffect
    setTimeout(fetchUserAddresses, 0);
  }, [user, authenticatedFetch]);

  useEffect(() => {

    if (userAddresses.length > 0 && !selectedAddressId) {

      const defaultAddress = userAddresses.find(
        addr => addr.isDefault === true
      );

      const addressToSelect = defaultAddress || userAddresses[0];

      if (addressToSelect?._id) {
        updateAddress(addressToSelect._id);
      }

    }

  }, [userAddresses, selectedAddressId, updateAddress]);


  // Address dialog handlers
  const handleOpenAddressDialog = () => {
    setShowAddressDialog(true);
  };

  const handleCloseAddressDialog = () => {
    setShowAddressDialog(false);
  };

  const handleAddressSelect = async (addressId: string) => {
    try {
      const selectedAddress = userAddresses.find(
  addr => addr._id === addressId
);

if (selectedAddress) {
  setName(selectedAddress.name || '');
  setEmail(selectedAddress.email || '');
  setPhone(selectedAddress.phone || '');
}
      await updateAddress(addressId);
      await refreshCart();
      setShowAddressDialog(false);
      setError('');
      // Clear validation errors when address is updated
      setShowValidationErrors(false);
      setValidationErrors([]);
    } catch (error) {
      console.error('Error updating address:', error);
      setError(error instanceof Error ? error.message : 'Failed to update address');
    }
  };

  // Fetch user addresses to refresh after adding new address
  const handleAddressRefresh = async () => {
    if (!user) return;

    setAddressesLoading(true);
    try {
      const response = await authenticatedFetch('/api/address');

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserAddresses(data.data.items || []);
        }
      }
    } catch (error) {
      console.error('Error fetching user addresses:', error);
    } finally {
      setAddressesLoading(false);
    }
  };

  // Handle phone validation errors from ContactInfoSection
  const handlePhoneError = (error: string | null) => {
    setErrors(prev => ({
      ...prev,
      phone: error || undefined,
    }));
  };

  // Clear validation errors when user starts fixing form fields
  const handleNameChange = (value: string) => {
    setName(value);
    if (showValidationErrors) {
      setShowValidationErrors(false);
      setValidationErrors([]);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (showValidationErrors) {
      setShowValidationErrors(false);
      setValidationErrors([]);
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (showValidationErrors) {
      setShowValidationErrors(false);
      setValidationErrors([]);
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(phone.replace(/[-()\s]/g, ''))) {
      newErrors.phone = 'Invalid phone number (10 digits required)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Poll order status to wait for webhook confirmation
  const pollOrderStatus = async (
    orderId: string,
    maxAttempts: number = 10
  ): Promise<void> => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

      const response = await authenticatedFetch(`/api/orders/${orderId}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.status === 'confirmed') {
          return; // Order confirmed
        }
      }
    }

    // If we reach here, order is still pending (webhook might be delayed)
    // We'll let the user proceed anyway
    console.warn('Order confirmation polling timed out, proceeding anyway');
  };

  const handlePaymentSuccess = async (orderId: string) => {
    await pollOrderStatus(orderId);
    setOrderCompleted(true);
    localCart.clearCart();
    await refreshCart();
    router.push(`/checkout/success?orderId=${orderId}`);
  };

  const handlePaymentError = (message: string) => {
    setError(message);
  };

  const canLoadPaymentIntent = useCallback((): boolean => {
    if (!cart?.canCheckout || cart.days.length === 0) return false;
    return paymentMethod === 'Credit Card';
  }, [cart, paymentMethod]);

  const initializePaymentIntent = useCallback(async (): Promise<boolean> => {
    if (!cart || cart.days.length === 0) {
      return false;
    }

    if (paymentMethod !== 'Credit Card') {
      return false;
    }

    setIsInitializingPayment(true);

    try {
      const response = await authenticatedFetch('/api/checkout/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          tipPercentage,
          currency: 'usd',
          paymentIntentId: paymentIntentId ?? undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to load payment options');
        return false;
      }

      const { clientSecret, paymentIntentId: intentId } = data.data;

      if (!clientSecret || !intentId) {
        setError('Missing payment session from server');
        return false;
      }

      setPaymentIntentId(intentId);
      setPaymentClientSecret(clientSecret);
      return true;
    } catch (err) {
      console.error('Payment intent error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payment options.');
      return false;
    } finally {
      setIsInitializingPayment(false);
    }
  }, [
    authenticatedFetch,
    cart,
    paymentIntentId,
    paymentMethod,
    tipPercentage,
  ]);

  const createPendingOrder = useCallback(async (): Promise<string | null> => {
    if (!cart || cart.days.length === 0) {
      setError('Your cart is empty');
      return null;
    }

    setIsInitializingPayment(true);

    try {
      const orderRequest = {
        cart,
        customerInfo: { name, email, phone },
        tipPercentage,
        paymentMethod,
        currency: 'usd',
        paymentIntentId: paymentIntentId ?? undefined,
      };

      const response = await authenticatedFetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderRequest),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error || 'Failed to create order';
        router.push(`/checkout/failure?error=${encodeURIComponent(errorMessage)}`);
        return null;
      }

      const { orderId, clientSecret } = data.data;

      if (!clientSecret || !orderId) {
        router.push(
          `/checkout/failure?error=${encodeURIComponent('Missing payment session from server')}`
        );
        return null;
      }

      setPendingOrderId(orderId);
      setPaymentClientSecret(clientSecret);
      return orderId;
    } catch (err) {
      console.error('Order creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create order. Please try again.');
      return null;
    } finally {
      setIsInitializingPayment(false);
    }
  }, [
    authenticatedFetch,
    cart,
    email,
    name,
    paymentIntentId,
    paymentMethod,
    phone,
    router,
    tipPercentage,
  ]);

  // Load Stripe payment options as soon as the cart is checkout-ready
  useEffect(() => {
    if (!canLoadPaymentIntent()) {
      setPaymentClientSecret(null);
      setPaymentIntentId(null);
      setPendingOrderId(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        if (cancelled || paymentClientSecret) return;
        await initializePaymentIntent();
      })();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canLoadPaymentIntent, initializePaymentIntent, paymentClientSecret]);

  // Refresh payment intent when tip or cart total changes
  const paymentAmountKey = `${tipPercentage}-${cart?.subtotal}-${cart?.platformFee}-${cart?.deliveryFee}-${cart?.tax}-${cart?.appliedCoupon?.discountAmount ?? 0}`;
  const paymentAmountKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!canLoadPaymentIntent() || !paymentClientSecret) return;

    if (paymentAmountKeyRef.current === null) {
      paymentAmountKeyRef.current = paymentAmountKey;
      return;
    }

    if (paymentAmountKeyRef.current === paymentAmountKey) return;

    paymentAmountKeyRef.current = paymentAmountKey;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        await initializePaymentIntent();
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    canLoadPaymentIntent,
    initializePaymentIntent,
    paymentAmountKey,
    paymentClientSecret,
  ]);

  const handlePlaceOrder = async (): Promise<void> => {
    setError('');
    setShowValidationErrors(false);
    setValidationErrors([]);

    if (!validateForm()) {
      const allErrors = collectAllValidationErrors();
      setValidationErrors(allErrors);
      setShowValidationErrors(true);
      setTimeout(() => {
        formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      handleValidationError();
      throw new Error('Form validation failed');
    }

    const allErrors = collectAllValidationErrors();
    if (allErrors.length > 0) {
      setValidationErrors(allErrors);
      setShowValidationErrors(true);

      if (
        allErrors.some(
          (e) =>
            e.field === 'Delivery Address' &&
            e.message.includes('complete delivery address')
        )
      ) {
        setShowAddressDialog(true);
      }

      setTimeout(() => {
        formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      throw new Error('Validation failed');
    }

    if (!cart || cart.days.length === 0) {
      setError('Your cart is empty');
      throw new Error('Cart is empty');
    }

    if (paymentMethod !== 'Credit Card') {
      setError('This payment flow supports card and digital wallets only.');
      throw new Error('Unsupported payment method');
    }

    let orderIdForPayment = pendingOrderId;

    if (!paymentClientSecret) {
      const ready = await initializePaymentIntent();
      if (!ready) throw new Error('Payment session not ready');
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (!orderIdForPayment) {
      orderIdForPayment = await createPendingOrder();
      if (!orderIdForPayment) throw new Error('Order not created');
    }

    if (!paymentFormRef.current) {
      setError('Payment form is still loading. Please wait a moment and try again.');
      throw new Error('Payment form not ready');
    }

    await paymentFormRef.current.confirmPayment(orderIdForPayment);
  };

  if (cartLoading || authLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress sx={{ color: '#FF9F0D' }} />
      </Box>
    );
  }

  if (!cart || cart.days.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress sx={{ color: '#FF9F0D' }} />
      </Box>
    ); // Will redirect
  }

  return (
    <Box sx={{ bgcolor: '#FAFAFA', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Checkout
          </Typography>
          <Typography variant="body1" sx={{ color: '#666' }}>
            Complete your order and get your delicious food delivered
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Validation Error Summary Banner - shown when Place Order is clicked */}
        {showValidationErrors && validationErrors.length > 0 && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            onClose={() => {
              setShowValidationErrors(false);
              setValidationErrors([]);
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Please fix the following issues before placing your order:
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              {validationErrors.map((error: ErrorSummary, index: number) => (
                <Box component="li" key={index} sx={{ mb: 0.5 }}>
                  <Typography variant="body2">
                    <Box component="span" sx={{ fontWeight: 600 }}>
                      {error.field.charAt(0).toUpperCase() + error.field.slice(1)}:
                    </Box>{' '}
                    {error.message}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Alert>
        )}

        {/* Checkout — single page with inline payment details */}
        <Box ref={formContainerRef}>
          <CheckoutFormContent
            cart={cart}
            name={name}
            email={email}
            phone={phone}
            paymentMethod={paymentMethod}
            tipPercentage={tipPercentage}
            errors={errors}
            userAddresses={userAddresses}
            addressesLoading={addressesLoading}
            showAddressDialog={showAddressDialog}
            onNameChange={handleNameChange}
            onEmailChange={handleEmailChange}
            onPhoneChange={handlePhoneChange}
            onPhoneError={handlePhoneError}
            onPaymentMethodChange={setPaymentMethod}
            onTipChange={setTipPercentage}
            onPlaceOrder={handlePlaceOrder}
            onOpenAddressDialog={handleOpenAddressDialog}
            onAddressSelect={handleAddressSelect}
            onCloseAddressDialog={handleCloseAddressDialog}
            contactInfoRef={contactInfoRef}
            isAuthenticated={!!user}
            onLoginClick={openLoginDialog}
            onSignupClick={openSignupDialog}
            zipcodeConfig={zipcodeConfig}
            paymentClientSecret={paymentClientSecret}
            pendingOrderId={pendingOrderId}
            isInitializingPayment={isInitializingPayment}
            paymentFormRef={paymentFormRef}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            isPaymentSubmitting={isPaymentSubmitting}
            onPaymentSubmittingChange={setIsPaymentSubmitting}
            cardDetailsComplete={cardDetailsComplete}
             onCardDetailsChange={setCardDetailsComplete}
          />
        </Box>
      </Container>

      {/* Address Selection Dialog */}
      <AddressSelectionDialog
        open={showAddressDialog}
        onClose={handleCloseAddressDialog}
        addresses={userAddresses}
        selectedAddressId={selectedAddressId}
        onConfirm={handleAddressSelect}
        isLoading={addressesLoading}
        authenticatedFetch={authenticatedFetch}
        userProfile={user ? {
          name: user.name,
          email: user.email,
          phone: user.phone,
        } : undefined}
        onAddressRefresh={handleAddressRefresh}
      />
    </Box>
  );
}
