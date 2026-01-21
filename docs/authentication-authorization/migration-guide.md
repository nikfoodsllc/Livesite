# Migration Guide - Signup Flow Simplification

## 📋 Overview

This guide helps developers migrate from the two-step signup flow to the simplified single-step signup flow. It provides step-by-step instructions, code examples, and common pitfalls to avoid.

**Target Audience**: Frontend Developers, Backend Developers, Mobile App Developers
**Last Updated**: January 12, 2026
**Migration Complexity**: Medium

---

## 🎯 Migration Checklist

Use this checklist to track your migration progress:

- [ ] **Step 1**: Review breaking changes
- [ ] **Step 2**: Update API client libraries
- [ ] **Step 3**: Modify signup forms
- [ ] **Step 4**: Update authentication flow
- [ ] **Step 5**: Implement address prompt (if applicable)
- [ ] **Step 6**: Update error handling
- [ ] **Step 7**: Test authentication flow
- [ ] **Step 8**: Update documentation
- [ ] **Step 9**: Deploy to staging
- [ ] **Step 10**: Monitor and validate

---

## 🚨 Breaking Changes

### 1. Removed Endpoint

**❌ DEPRECATED**: `POST /api/auth/signup/step2`

This endpoint no longer exists. Any code calling it will fail with a 404 error.

### 2. Changed Response Structure

**Before:**
```typescript
{
  user: { ... },
  token: string,
  step2Required: true  // ← This field removed
}
```

**After:**
```typescript
{
  data: {
    user: {
      ...
      isCompleted: false  // ← New field indicates completion status
    },
    token: string,
    refreshToken: string,
    expiresIn: number,
    isCompleted: false
  }
}
```

### 3. New Address Endpoint

Address creation now requires authentication and uses a separate endpoint.

---

## 📦 Step-by-Step Migration

### Step 1: Update API Client

#### Before

```typescript
// api/auth.ts
export interface SignupStep1Response {
  user: User;
  token: string;
  step2Required: boolean;
}

export interface SignupStep2Request {
  userId: string;
  street_address: string;
  city: string;
  postal_code: string;
  apartment?: string;
  floor?: string;
  entrance?: string;
}

export async function signupStep1(data: {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<SignupStep1Response> {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  return response.json();
}

export async function signupStep2(
  data: SignupStep2Request
): Promise<{ success: boolean; isCompleted: boolean }> {
  const response = await fetch('/api/auth/signup/step2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  return response.json();
}
```

#### After

```typescript
// api/auth.ts
export interface SignupResponse {
  data: {
    user: {
      id: string;
      email: string;
      name?: string;
      phone?: string;
      role: 'USER' | 'ADMIN';
      isCompleted: boolean;  // ← New field
    };
    token: string;
    refreshToken: string;   // ← New field
    expiresIn: number;
    isCompleted: boolean;
  };
  message: string;
}

export async function signup(data: {
  fullName?: string;        // Now optional
  email: string;
  password: string;
  phone?: string;           // Optional
}): Promise<SignupResponse> {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(await response.json().error);
  }

  return response.json();
}

// Remove signupStep2 function entirely
```

---

### Step 2: Update Signup Form Component

#### Before (React Example)

```typescript
// components/SignupForm.tsx (OLD)
import { useState } from 'react';
import { signupStep1, signupStep2 } from '@/api/auth';

export function SignupForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: ''
  });
  const [addressData, setAddressData] = useState({
    street_address: '',
    city: '',
    postal_code: '',
    apartment: '',
    floor: '',
    entrance: ''
  });

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signupStep1(formData);

    if (result.step2Required) {
      setStep(2);  // Move to address step
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signupStep2({
      userId: result.user.id,
      ...addressData
    });
    // Redirect to dashboard
    router.push('/dashboard');
  };

  if (step === 1) {
    return (
      <form onSubmit={handleStep1Submit}>
        <input name="fullName" />
        <input name="email" />
        <input name="password" />
        <input name="phone" />
        <button type="submit">Continue</button>
      </form>
    );
  }

  return (
    <form onSubmit={handleStep2Submit}>
      <input name="street_address" />
      <input name="city" />
      <input name="postal_code" />
      <input name="apartment" />
      <input name="floor" />
      <input name="entrance" />
      <button type="submit">Complete Registration</button>
    </form>
  );
}
```

#### After (React Example)

```typescript
// components/SignupForm.tsx (NEW)
import { useState } from 'react';
import { signup } from '@/api/auth';
import { useAuth } from '@/contexts/AuthContext';

export function SignupForm() {
  const [formData, setFormData] = useState({
    fullName: '',    // Optional
    email: '',
    password: '',
    phone: ''        // Optional
  });

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Single step signup
      const response = await signup(formData);

      // Store tokens
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);

      // Update auth context
      login(response.data.user);

      // Redirect immediately - no address required
      router.push('/dashboard');

    } catch (error) {
      console.error('Signup failed:', error);
      // Show error to user
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="fullName"
        value={formData.fullName}
        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
        placeholder="Full Name (optional)"
      />
      <input
        name="email"
        type="email"
        required
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
      />
      <input
        name="password"
        type="password"
        required
        value={formData.password}
        onChange={(e) => setFormData({...formData, password: e.target.value})}
      />
      <input
        name="phone"
        value={formData.phone}
        onChange={(e) => setFormData({...formData, phone: e.target.value})}
        placeholder="Phone (optional)"
      />
      <button type="submit">Create Account</button>
    </form>
  );
}
```

**Key Changes:**
- ✅ Removed step state management
- ✅ Removed address form from signup
- ✅ Simplified to single form submission
- ✅ `fullName` and `phone` are now optional
- ✅ Immediate redirect after signup
- ✅ Token storage moved to signup handler

---

### Step 3: Implement Address Creation (Separate Flow)

If your application needs to collect addresses post-signup, implement address creation:

```typescript
// api/address.ts
export interface AddressRequest {
  name: string;
  email: string;
  phone?: string;
  street_address: string;
  city: string;
  postal_code: string;
  apartment?: string;
  floor?: string;
  entrance?: string;
  isDefault?: boolean;
}

export async function createAddress(
  addressData: AddressRequest,
  token: string
): Promise<{ success: boolean; data: any; message: string }> {
  const response = await fetch('/api/address', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(addressData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

export async function getAddresses(
  token: string
): Promise<{ success: boolean; data: { items: any[] } }> {
  const response = await fetch('/api/address', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
}
```

---

### Step 4: Implement First-Time Address Prompt (Optional but Recommended)

```typescript
// components/FirstTimeAddressPrompt.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createAddress, getAddresses } from '@/api/address';
import { AddressDialog } from './AddressDialog';

export function FirstTimeAddressPrompt() {
  const { user, token } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);

  useEffect(() => {
    // Check if user should see prompt
    const dismissed = localStorage.getItem('hasDismissedAddressPrompt');

    if (!dismissed && user && !user.isCompleted) {
      loadAddresses();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadAddresses = async () => {
    try {
      const result = await getAddresses(token);
      setAddresses(result.data.items || []);
    } catch (error) {
      console.error('Failed to load addresses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show prompt only if:
  // - User is logged in
  // - User is not completed (!user.isCompleted)
  // - No addresses exist
  // - Not currently loading
  // - Hasn't been dismissed
  const shouldShowPrompt =
    user &&
    !user.isCompleted &&
    addresses.length === 0 &&
    !isLoading &&
    !localStorage.getItem('hasDismissedAddressPrompt');

  useEffect(() => {
    setShowPrompt(shouldShowPrompt);
  }, [shouldShowPrompt]);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('hasDismissedAddressPrompt', 'true');
  };

  const handleAddAddress = async (addressData: any) => {
    try {
      await createAddress(addressData, token);

      // Refresh user data and addresses
      await loadAddresses();

      // Close dialogs
      setShowAddressDialog(false);
      setShowPrompt(false);

      // Optionally update auth context to reflect isCompleted = true
    } catch (error) {
      console.error('Failed to create address:', error);
      // Show error to user
    }
  };

  if (!showPrompt) return null;

  return (
    <>
      {/* Prompt Banner */}
      <div className="address-prompt-banner">
        <div className="prompt-content">
          <span className="prompt-icon">📍</span>
          <div className="prompt-text">
            <h3>Complete your profile to get started</h3>
            <p>Add your delivery address and you'll be ready to place your first order.</p>
          </div>
        </div>
        <div className="prompt-actions">
          <button onClick={() => setShowAddressDialog(true)}>
            Add Address
          </button>
          <button onClick={handleDismiss} className="dismiss-btn">
            ✕
          </button>
        </div>
      </div>

      {/* Address Dialog */}
      {showAddressDialog && (
        <AddressDialog
          onSave={handleAddAddress}
          onCancel={() => setShowAddressDialog(false)}
        />
      )}
    </>
  );
}
```

---

### Step 5: Update Checkout Validation

Ensure your checkout process handles users without addresses:

```typescript
// components/Checkout.tsx
export function Checkout() {
  const { user, token } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [showAddressDialog, setShowAddressDialog] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    const result = await getAddresses(token);
    setAddresses(result.data.items || []);
  };

  const handleProceedToCheckout = () => {
    // Validate address exists
    if (addresses.length === 0) {
      // Show address dialog
      setShowAddressDialog(true);
      return;
    }

    // Proceed with checkout
    proceedWithCheckout();
  };

  const handleAddressAdded = () => {
    loadAddresses();
    setShowAddressDialog(false);
    // Auto-proceed or let user click again
  };

  return (
    <div>
      {addresses.length === 0 && (
        <div className="checkout-warning">
          <p>Please add a delivery address to continue</p>
        </div>
      )}

      <button onClick={handleProceedToCheckout}>
        Proceed to Checkout
      </button>

      {showAddressDialog && (
        <AddressDialog
          onSave={handleAddressAdded}
          onCancel={() => setShowAddressDialog(false)}
        />
      )}
    </div>
  );
}
```

---

### Step 6: Update Error Handling

#### Before

```typescript
try {
  const step1 = await signupStep1(data);
  const step2 = await signupStep2(addressData);
} catch (error) {
  if (error.message.includes('email')) {
    // Handle email error
  } else if (error.message.includes('address')) {
    // Handle address error
  }
}
```

#### After

```typescript
try {
  const result = await signup(data);

  // Store tokens
  localStorage.setItem('token', result.data.token);
  localStorage.setItem('refreshToken', result.data.refreshToken);

} catch (error) {
  // Signup errors
  if (error.message.includes('Email already registered')) {
    showNotification('An account with this email already exists');
  } else if (error.message.includes('Password must contain')) {
    showNotification('Password does not meet requirements');
  } else {
    showNotification('Signup failed. Please try again.');
  }
}

// Address creation (separate error handling)
try {
  await createAddress(addressData, token);
} catch (error) {
  if (error.message.includes('not serviceable')) {
    showNotification('We do not deliver to this area yet');
  } else if (error.message.includes('Invalid zip code')) {
    showNotification('Please enter a valid zip code');
  } else {
    showNotification('Failed to save address. Please try again.');
  }
}
```

---

### Step 7: Update Authentication Context

```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isCompleted: boolean;  // ← Add this
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;  // ← Add this
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const isCompleted = user?.isCompleted ?? false;  // ← Add computed property

  const login = (userData: User, accessToken: string) => {
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('token', accessToken);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user,
      isCompleted,  // ← Expose isCompleted
      login,
      logout,
      updateUser   // ← Expose updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

### Step 8: Update Testing

#### Unit Tests

```typescript
// __tests__/signup.test.ts

describe('Signup Flow', () => {
  it('should signup user without address', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      fullName: 'Test User'
    };

    const response = await signup(userData);

    expect(response.data.user.email).toBe('test@example.com');
    expect(response.data.user.isCompleted).toBe(false);
    expect(response.data.token).toBeDefined();
  });

  it('should create address after signup', async () => {
    const addressData = {
      name: 'Test User',
      email: 'test@example.com',
      street_address: '123 Main St',
      city: 'New York',
      postal_code: '10001'
    };

    const response = await createAddress(addressData, token);

    expect(response.success).toBe(true);
    // User's isCompleted should now be true
  });

  it('should fail signup with existing email', async () => {
    await signup({
      email: 'test@example.com',
      password: 'SecurePass123!'
    });

    await expect(
      signup({
        email: 'test@example.com',
        password: 'AnotherPass123!'
      })
    ).rejects.toThrow('Email already registered');
  });
});
```

#### Integration Tests

```typescript
// __tests__/integration/signup-flow.test.ts

describe('Signup Integration Flow', () => {
  it('should complete full signup journey', async () => {
    // 1. Signup
    const signupResponse = await signup({
      email: 'integration@test.com',
      password: 'TestPass123!'
    });

    expect(signupResponse.data.user.isCompleted).toBe(false);

    // 2. Login
    const loginResponse = await login({
      email: 'integration@test.com',
      password: 'TestPass123!'
    });

    expect(loginResponse.data.user.isCompleted).toBe(false);

    // 3. Add address
    const addressResponse = await createAddress({
      name: 'Integration Test',
      email: 'integration@test.com',
      street_address: '123 Test St',
      city: 'Test City',
      postal_code: '12345'
    }, loginResponse.data.token);

    expect(addressResponse.success).toBe(true);

    // 4. Check user is now completed
    const profileResponse = await getProfile(loginResponse.data.token);
    expect(profileResponse.data.user.isCompleted).toBe(true);
  });
});
```

---

## 🌍 Platform-Specific Migration

### React Native / Mobile Apps

```typescript
// api/auth.ts (React Native)
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function signup(data: SignupData): Promise<SignupResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  // Store tokens securely
  await AsyncStorage.setItem('token', result.data.token);
  await AsyncStorage.setItem('refreshToken', result.data.refreshToken);

  return result;
}

export async function createAddress(
  addressData: AddressData,
  token: string
): Promise<AddressResponse> {
  const response = await fetch(`${API_BASE_URL}/api/address`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(addressData)
  });

  return response.json();
}
```

### Vue.js

```typescript
// composables/useAuth.ts
import { ref, computed } from 'vue';

export function useAuth() {
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);

  const isCompleted = computed(() => user.value?.isCompleted ?? false);

  const signup = async (data: SignupData) => {
    const response = await $fetch('/api/auth/signup', {
      method: 'POST',
      body: data
    });

    user.value = response.data.user;
    token.value = response.data.token;

    // Store in localStorage/state management
    useState('token').value = response.data.token;

    return response;
  };

  return {
    user,
    token,
    isCompleted,
    signup
  };
}
```

---

## ⚠️ Common Pitfalls

### 1. Not Handling `isCompleted` Flag

❌ **Wrong:**
```typescript
if (user) {
  // Show all features
}
```

✅ **Right:**
```typescript
if (user && user.isCompleted) {
  // Show all features
} else if (user && !user.isCompleted) {
  // Show limited features + address prompt
}
```

### 2. Forgetting to Update Auth Context

❌ **Wrong:**
```typescript
const { login } = useAuth();
login(response.data.user);  // Missing token
```

✅ **Right:**
```typescript
const { login } = useAuth();
login(response.data.user, response.data.token);
```

### 3. Not Refreshing User Data After Address Creation

❌ **Wrong:**
```typescript
await createAddress(addressData, token);
// User context still shows isCompleted: false
```

✅ **Right:**
```typescript
await createAddress(addressData, token);

// Refresh user data
const updatedUser = await getProfile(token);
updateUser(updatedUser.data.user);
```

### 4. Calling Removed Endpoint

❌ **Wrong:**
```typescript
await fetch('/api/auth/signup/step2', {...});  // 404 error
```

✅ **Right:**
```typescript
await fetch('/api/address', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify(addressData)
});
```

### 5. Not Handling Dismissed Prompt State

❌ **Wrong:**
```typescript
// Prompt shows every time user logs in
```

✅ **Right:**
```typescript
// Check localStorage before showing prompt
const hasDismissed = localStorage.getItem('hasDismissedAddressPrompt');
if (!hasDismissed && !user.isCompleted) {
  showPrompt();
}
```

---

## 🧪 Testing Checklist

Before deploying to production, verify:

- [ ] New users can signup without providing address
- [ ] Users are automatically logged in after signup
- [ ] JWT tokens are stored correctly
- [ ] `isCompleted` flag is `false` after signup
- [ ] First-time address prompt appears for new users
- [ ] Address can be added via `/api/address` endpoint
- [ ] `isCompleted` flag updates to `true` after address added
- [ ] Prompt dismisses and doesn't show again
- [ ] Existing users with addresses are not affected
- [ ] Checkout requires address before order
- [ ] Error handling works correctly
- [ ] Mobile responsiveness maintained
- [ ] Tokens refresh correctly on expiry

---

## 📦 Rollback Plan

If issues arise, rollback steps:

1. **Frontend**: Revert to previous signup component
2. **Backend**: Restore `POST /api/auth/signup/step2` endpoint (if still in code)
3. **Database**: No changes needed (schema compatible)
4. **Feature Flags**: Use feature flags to control flow:
   ```typescript
   const NEW_SIGNUP_FLOW = featureFlags.isEnabled('new_signup_flow');

   if (NEW_SIGNUP_FLOW) {
     await newSignupFlow();
   } else {
     await oldSignupFlow();
   }
   ```

---

## 🔗 Additional Resources

- [API Changes Detail](./api-changes.md)
- [Before/After Comparison](./before-after-comparison.md)
- [Signup Flow Overview](./signup-flow-simplification.md)
- [First-Time Address Prompt](../features/first-time-address-prompt/overview.md)

---

## 🆘 Support

If you encounter issues during migration:

1. Check the [API Changes](./api-changes.md) documentation
2. Review the [Before/After Comparison](./before-after-comparison.md)
3. Verify you're using the correct endpoint (`/api/address` not `/api/auth/signup/step2`)
4. Ensure JWT tokens are included in address creation requests
5. Check browser console for error messages
6. Contact the development team for assistance

---

**Last Updated**: January 12, 2026
**Migration Version**: 2.0.0
**Status**: ✅ Ready for Migration
