'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import type { Stripe as StripeType, StripeElements } from '@stripe/stripe-js';
import { IconShoppingCart, IconLock } from '@tabler/icons-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHeader } from '@/contexts/HeaderContext';
import { useApiClient } from '@/hooks/useApiClient';
import ContactInfoSection, { ContactInfoSectionRef } from '@/components/checkout/ContactInfoSection';
import PaymentMethodSection from '@/components/checkout/PaymentMethodSection';
import StripePaymentForm from '@/components/checkout/StripePaymentForm';
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

interface ErrorSummary {
  field: string;
  message: string;
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

interface CheckoutFormContentProps {
  cart: Cart;
  name: string;
  email: string;
  phone: string;
  paymentMethod: PaymentMethod;
  tipPercentage: number;
  isProcessing: boolean;
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
  onPlaceOrder: (stripe: StripeType | null, elements: StripeElements | null) => Promise<void>;
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
  onPaymentValidationChange?: (isValid: boolean, isEmpty: boolean, error?: string) => void;
  isPaymentComplete: boolean;
  isPaymentEmpty?: boolean;
  paymentError?: string;
  applePayAvailable: boolean;
  onApplePayAvailable: (available: boolean) => void;
  pollOrderStatus: (orderId: string) => Promise<void>;
  setOrderCompleted: (v: boolean) => void;
  refreshCart: () => Promise<void>;
  router: any;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

function CheckoutFormContent({
  cart,
  name,
  email,
  phone,
  paymentMethod,
  tipPercentage,
  isProcessing,
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
  onPaymentValidationChange,
  isPaymentComplete,
  isPaymentEmpty,
  paymentError,
  applePayAvailable,
  onApplePayAvailable,
  pollOrderStatus,
  setOrderCompleted,
  refreshCart,
  router,
  authenticatedFetch,
}: CheckoutFormContentProps) {
  const stripe = useStripe();
  const elements = useElements();

  const calculateTotals = () => {
    const subtotal = cart.subtotal;
    const platformFee = cart.platformFee;
    const deliveryFee = cart.deliveryFee;
    const tax = cart.tax;
    const tip = (subtotal * tipPercentage) / 100;
    const discount = cart.appliedCoupon?.discountAmount || 0;
    const total = subtotal + platformFee + deliveryFee + tax + tip - discount;
    return { subtotal, platformFee, deliveryFee, tax, tip, discount, total };
  };

  const totals = calculateTotals();

  const deliveryCalculation = calculateDeliveryDates(
    cart.days,
    zipcodeConfig?.minCartValue || DEFAULT_MIN_CART_VALUE
  );
  const deliveryCalculations: DayDeliveryInfo[] = deliveryCalculation.deliveryDays;

  const handlePlaceOrderClick = async () => {
    await onPlaceOrder(stripe, elements);
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 400px' },
        gap: 3,
      }}
    >
      {/* Left column */}
      <Box>
        <DeliveryAddressDisplay
          address={cart.selectedAddress}
          onChangeAddress={onOpenAddressDialog}
          addresses={userAddresses}
          isAuthenticated={isAuthenticated}
          onLoginClick={onLoginClick}
          onSignupClick={onSignupClick}
        />

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

        <PaymentMethodSection
          selectedMethod={paymentMethod}
          onMethodChange={onPaymentMethodChange}
          applePayAvailable={applePayAvailable}
        />

        {/* Credit Card Form */}
        {paymentMethod === 'Credit Card' && (
          <StripePaymentForm
            show={true}
            onValidationChange={onPaymentValidationChange}
          />
        )}

        {/* Apple Pay Form */}
        {paymentMethod === 'Apple Pay' && (
          <StripePaymentForm
            show={false}
            showApplePay={true}
            amount={totals.total}
            onApplePayAvailable={onApplePayAvailable}
            onApplePayPaymentMethod={async (e) => {
              console.log('🍎 Apple Pay: paymentmethod event fired');
              console.log('🍎 Apple Pay: token in localStorage =', !!localStorage.getItem('accessToken'));
              console.log('🍎 Apple Pay: paymentMethod.id =', e.paymentMethod.id);
              try {
                const orderRequest = {
                  cart,
                  customerInfo: { name, email, phone },
                  tipPercentage,
                  paymentMethod: 'Apple Pay',
                  currency: 'usd',
                };
                console.log('🍎 Apple Pay: creating order...');
                const response = await authenticatedFetch('/api/orders/create', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(orderRequest),
                });
                const data = await response.json();
                console.log('🍎 Apple Pay: order create response', response.status, data);

                if (!response.ok || !data.success) {
                  console.error('🍎 Apple Pay: order creation failed', data.error);
                  e.complete('fail');
                  return;
                }

                const { orderId, clientSecret } = data.data;
                console.log('🍎 Apple Pay: orderId =', orderId);
                console.log('🍎 Apple Pay: clientSecret present =', !!clientSecret);

                console.log('🍎 Apple Pay: confirming payment...');
                const { error: stripeError, paymentIntent } = await stripe!.confirmCardPayment(
                  clientSecret,
                  { payment_method: e.paymentMethod.id },
                  { handleActions: false }
                );
                console.log('🍎 Apple Pay: confirmCardPayment result', { stripeError, status: paymentIntent?.status });

                if (stripeError && stripeError.code !== 'payment_intent_unexpected_state') {
                  console.error('🍎 Apple Pay: stripe error', stripeError);
                  e.complete('fail');
                  return;
                }

                // Complete Apple Pay sheet before any further actions
                e.complete('success');
                console.log('🍎 Apple Pay: e.complete(success) called');

                // Handle additional actions if needed
                if (paymentIntent?.status === 'requires_action' || paymentIntent?.status === 'requires_confirmation') {
                  console.log('🍎 Apple Pay: requires additional action, confirming again...');
                  const { error: actionError } = await stripe!.confirmCardPayment(clientSecret);
                  if (actionError) {
                    console.error('🍎 Apple Pay: action error', actionError);
                    return;
                  }
                }

                console.log('🍎 Apple Pay: polling order status...');
                await pollOrderStatus(orderId);
                setOrderCompleted(true);
                localCart.clearCart();
                await refreshCart();
                console.log('🍎 Apple Pay: redirecting to success page');
                router.push(`/checkout/success?orderId=${orderId}`);
              } catch (err) {
                console.error('🍎 Apple Pay: caught error', err);
                e.complete('fail');
              }
            }}
          />
        )}

        {/* Hidden Apple Pay detector - always rendered to check availability */}
        {paymentMethod !== 'Apple Pay' && (
          <StripePaymentForm
            show={false}
            showApplePay={true}
            amount={totals.total}
            onApplePayAvailable={onApplePayAvailable}
          />
        )}

        <TipSection
          selectedTipPercentage={tipPercentage}
          onTipChange={onTipChange}
          subtotal={totals.subtotal}
        />

        {/* Place Order Button (Mobile) */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3 }}>
          {!isProcessing && (
            <Box sx={{ mb: 1.5 }}>
              {!cart.canCheckout && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  Minimum order value required. Add more items to proceed.
                </Alert>
              )}
              {paymentMethod === 'Credit Card' && !isPaymentComplete && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  {isPaymentEmpty
                    ? 'Please enter your card details to proceed.'
                    : paymentError || 'Please complete your card details to proceed.'}
                </Alert>
              )}
            </Box>
          )}

          {paymentMethod !== 'Apple Pay' && (
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handlePlaceOrderClick}
              disabled={isProcessing || !cart.canCheckout || (paymentMethod === 'Credit Card' && !isPaymentComplete)}
              startIcon={
                isProcessing ? (
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
                '&:hover': { bgcolor: '#e68f0c' },
                '&:disabled': { bgcolor: '#ccc', color: '#666' },
              }}
            >
              {isProcessing ? 'Processing...' : `Place Order - $${totals.total.toFixed(2)}`}
            </Button>
          )}

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

        {!isProcessing && (
          <Box sx={{ display: { xs: 'none', md: 'block' }, mb: 1.5 }}>
            {!cart.canCheckout && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                Minimum order value required. Add more items to proceed.
              </Alert>
            )}
            {paymentMethod === 'Credit Card' && !isPaymentComplete && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                {isPaymentEmpty
                  ? 'Please enter your card details to proceed.'
                  : paymentError || 'Please complete your card details to proceed.'}
              </Alert>
            )}
          </Box>
        )}

        {paymentMethod !== 'Apple Pay' && (
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handlePlaceOrderClick}
            disabled={isProcessing || !cart.canCheckout || (paymentMethod === 'Credit Card' && !isPaymentComplete)}
            startIcon={
              isProcessing ? (
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
              '&:hover': { bgcolor: '#e68f0c' },
              '&:disabled': { bgcolor: '#ccc', color: '#666' },
            }}
          >
            {isProcessing ? 'Processing...' : `Place Order - $${totals.total.toFixed(2)}`}
          </Button>
        )}

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
  const { openLoginDialog, openSignupDialog } = useHeader();
  const { authenticatedFetch } = useApiClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit Card');
  const [tipPercentage, setTipPercentage] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [error, setError] = useState('');
  const [applePayAvailable, setApplePayAvailable] = useState(false);

  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [userAddresses, setUserAddresses] = useState<IAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
  }>({});

  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [isPaymentEmpty, setIsPaymentEmpty] = useState(true);
  const [paymentError, setPaymentError] = useState<string | undefined>();

  const [validationErrors, setValidationErrors] = useState<ErrorSummary[]>([]);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const formContainerRef = useRef<HTMLDivElement>(null);
  const contactInfoRef = useRef<ContactInfoSectionRef>(null);

  const getErrorSummary = useCallback((): ErrorSummary[] => {
    const summary: ErrorSummary[] = [];
    if (errors.name) summary.push({ field: 'name', message: errors.name });
    if (errors.email) summary.push({ field: 'email', message: errors.email });
    if (errors.phone) summary.push({ field: 'phone', message: errors.phone });
    return summary;
  }, [errors]);

  const isAddressComplete = useCallback((address: any): boolean => {
    if (!address) return false;
    const isZipcodeAddress = address._id?.startsWith('zipcode-');
    const hasPlaceholderAddress =
      address.addressLine1 === 'Delivery Area' ||
      address.addressLine1 === 'Delivery Area:';
    return !isZipcodeAddress && !hasPlaceholderAddress;
  }, []);

  const collectAllValidationErrors = useCallback((): ErrorSummary[] => {
    const allErrors: ErrorSummary[] = [];
    if (!cart?.selectedAddress) {
      allErrors.push({ field: 'Delivery Address', message: 'Please select a delivery address to complete your order' });
    } else if (!isAddressComplete(cart.selectedAddress)) {
      allErrors.push({ field: 'Delivery Address', message: 'Please provide your complete delivery address including street address to complete your order' });
    }
    if (cart && !cart.canCheckout) {
      allErrors.push({ field: 'Cart Requirements', message: 'Your cart does not meet the minimum order requirements. Please check the delivery messages.' });
    }
    if (errors.name) allErrors.push({ field: 'name', message: errors.name });
    if (errors.email) allErrors.push({ field: 'email', message: errors.email });
    if (errors.phone) allErrors.push({ field: 'phone', message: errors.phone });
    if (paymentMethod === 'Credit Card' && !isPaymentComplete) {
      allErrors.push({
        field: 'Payment Details',
        message: isPaymentEmpty
          ? 'Please enter your card details to complete your order'
          : 'Please complete all required card details correctly',
      });
    }
    return allErrors;
  }, [cart, errors, isAddressComplete, paymentMethod, isPaymentComplete, isPaymentEmpty]);

  const handleValidationError = useCallback(() => {
    const errorSummary = getErrorSummary();
    if (errorSummary.length > 0) {
      if (formContainerRef.current) {
        formContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setTimeout(() => {
        if (contactInfoRef.current) contactInfoRef.current.scrollToFirstError();
      }, 300);
    }
  }, [getErrorSummary]);

  useEffect(() => {
    if (Object.keys(errors).length > 0) handleValidationError();
  }, [errors, handleValidationError]);

  useEffect(() => {
    setTimeout(() => {
      if (!authLoading && !user) openLoginDialog();
    }, 0);
  }, [authLoading, user, openLoginDialog]);

  useEffect(() => {
    setTimeout(() => {
      if (user) {
        setName(user.name || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
      }
    }, 0);
  }, [user]);

  useEffect(() => {
    if (orderCompleted) return;
    if (!cartLoading && (!cart || cart.days.length === 0)) router.push('/cart');
  }, [cart, cartLoading, router, orderCompleted]);

  useEffect(() => {
    const fetchUserAddresses = async () => {
      if (!user) return;
      setAddressesLoading(true);
      try {
        const response = await authenticatedFetch('/api/address');
        if (response.ok) {
          const data = await response.json();
          if (data.success) setUserAddresses(data.data.items || []);
        }
      } catch (error) {
        console.error('Error fetching user addresses:', error);
      } finally {
        setAddressesLoading(false);
      }
    };
    setTimeout(fetchUserAddresses, 0);
  }, [user, authenticatedFetch]);

  useEffect(() => {
    if (userAddresses.length > 0 && !selectedAddressId) {
      const defaultAddress = userAddresses.find(addr => addr.isDefault === true);
      const addressToSelect = defaultAddress || userAddresses[0];
      if (addressToSelect?._id) updateAddress(addressToSelect._id);
    }
  }, [userAddresses, selectedAddressId, updateAddress]);

  const handleOpenAddressDialog = () => setShowAddressDialog(true);
  const handleCloseAddressDialog = () => setShowAddressDialog(false);

  const handleAddressSelect = async (addressId: string) => {
    try {
      await updateAddress(addressId);
      await refreshCart();
      setShowAddressDialog(false);
      setError('');
      setShowValidationErrors(false);
      setValidationErrors([]);
    } catch (error) {
      console.error('Error updating address:', error);
      setError(error instanceof Error ? error.message : 'Failed to update address');
    }
  };

  const handleAddressRefresh = async () => {
    if (!user) return;
    setAddressesLoading(true);
    try {
      const response = await authenticatedFetch('/api/address');
      if (response.ok) {
        const data = await response.json();
        if (data.success) setUserAddresses(data.data.items || []);
      }
    } catch (error) {
      console.error('Error fetching user addresses:', error);
    } finally {
      setAddressesLoading(false);
    }
  };

  const handlePhoneError = (error: string | null) => {
    setErrors(prev => ({ ...prev, phone: error || undefined }));
  };

  const handlePaymentValidationChange = useCallback((isValid: boolean, isEmpty: boolean, error?: string) => {
    setIsPaymentComplete(isValid);
    setIsPaymentEmpty(isEmpty);
    setPaymentError(error);
  }, []);

  const handleNameChange = (value: string) => {
    setName(value);
    if (showValidationErrors) { setShowValidationErrors(false); setValidationErrors([]); }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (showValidationErrors) { setShowValidationErrors(false); setValidationErrors([]); }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (showValidationErrors) { setShowValidationErrors(false); setValidationErrors([]); }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
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

  const pollOrderStatus = async (orderId: string, maxAttempts: number = 10): Promise<void> => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await authenticatedFetch(`/api/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.status === 'confirmed') return;
      }
    }
    console.warn('Order confirmation polling timed out, proceeding anyway');
  };

  const handlePlaceOrderCallback = async (
    stripe: StripeType | null,
    elements: StripeElements | null
  ): Promise<void> => {
    setError('');
    setShowValidationErrors(false);
    setValidationErrors([]);

    if (!validateForm()) {
      const allErrors = collectAllValidationErrors();
      setValidationErrors(allErrors);
      setShowValidationErrors(true);
      setTimeout(() => {
        if (formContainerRef.current) {
          formContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      handleValidationError();
      throw new Error('Form validation failed');
    }

    const allErrors = collectAllValidationErrors();
    if (allErrors.length > 0) {
      setValidationErrors(allErrors);
      setShowValidationErrors(true);
      const hasAddressError = allErrors.some(
        error => error.field === 'Delivery Address' && error.message.includes('complete delivery address')
      );
      if (hasAddressError) setShowAddressDialog(true);
      setTimeout(() => {
        if (formContainerRef.current) {
          formContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      throw new Error('Validation failed');
    }

    if (!cart || cart.days.length === 0) {
      setError('Your cart is empty');
      throw new Error('Cart is empty');
    }

    setIsProcessing(true);

    try {
      const orderRequest = {
        cart,
        customerInfo: { name, email, phone },
        tipPercentage,
        paymentMethod,
        currency: 'usd',
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
        return;
      }

      const { orderId, clientSecret } = data.data;

      if (!stripe || !elements) throw new Error('Stripe not initialized');

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: { name, email, phone },
          },
        }
      );

      if (stripeError) {
        const errorMessage = stripeError.message || 'Payment failed';
        router.push(`/checkout/failure?error=${encodeURIComponent(errorMessage)}`);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        await pollOrderStatus(orderId);
        setOrderCompleted(true);
        localCart.clearCart();
        await refreshCart();
        router.push(`/checkout/success?orderId=${orderId}`);
      } else {
        const errorMessage = 'Payment confirmation failed. Please try again.';
        router.push(`/checkout/failure?error=${encodeURIComponent(errorMessage)}`);
      }
    } catch (err) {
      console.error('Order placement error:', err);
      setError(err instanceof Error ? err.message : 'Failed to place order. Please try again.');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  if (cartLoading || authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#FF9F0D' }} />
      </Box>
    );
  }

  if (!cart || cart.days.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#FF9F0D' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#FAFAFA', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Checkout
          </Typography>
          <Typography variant="body1" sx={{ color: '#666' }}>
            Complete your order and get your delicious food delivered
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {showValidationErrors && validationErrors.length > 0 && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            onClose={() => { setShowValidationErrors(false); setValidationErrors([]); }}
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

        <Box ref={formContainerRef}>
          <Elements stripe={stripePromise} options={{}}>
            <CheckoutFormContent
              cart={cart}
              name={name}
              email={email}
              phone={phone}
              paymentMethod={paymentMethod}
              tipPercentage={tipPercentage}
              isProcessing={isProcessing}
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
              onPlaceOrder={handlePlaceOrderCallback}
              onOpenAddressDialog={handleOpenAddressDialog}
              onAddressSelect={handleAddressSelect}
              onCloseAddressDialog={handleCloseAddressDialog}
              contactInfoRef={contactInfoRef}
              isAuthenticated={!!user}
              onLoginClick={openLoginDialog}
              onSignupClick={openSignupDialog}
              zipcodeConfig={zipcodeConfig}
              onPaymentValidationChange={handlePaymentValidationChange}
              isPaymentComplete={isPaymentComplete}
              isPaymentEmpty={isPaymentEmpty}
              paymentError={paymentError}
              applePayAvailable={applePayAvailable}
              onApplePayAvailable={setApplePayAvailable}
              pollOrderStatus={pollOrderStatus}
              setOrderCompleted={setOrderCompleted}
              refreshCart={refreshCart}
              router={router}
              authenticatedFetch={authenticatedFetch}
            />
          </Elements>
        </Box>
      </Container>

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