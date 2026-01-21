# First-Time User Address Prompt - Implementation Guide

## 📁 File Structure

```
src/
├── components/
│   └── layout/
│       └── FirstTimeAddressPrompt.tsx    # Main component (292 lines)
├── contexts/
│   ├── AuthContext.tsx                   # User authentication state
│   └── CartContext.tsx                   # Shopping cart context
├── app/
│   └── layout.tsx                        # Root layout (integration point)
└── utils/
    └── validation.ts                     # Phone validation utilities
```

## 🏗️ Architecture Overview

### Component Hierarchy
```
RootLayout (app/layout.tsx)
├── AuthProvider
│   └── AuthContext
├── CartProvider
│   └── CartContext
├── HeaderProvider
└── FirstTimeAddressPrompt ← Our Feature
    └── AddressDialog (reused component)
```

## 💻 Component Implementation

### File: `src/components/layout/FirstTimeAddressPrompt.tsx`

#### Core Imports
```typescript
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Typography, Alert, useTheme,
  useMediaQuery, IconButton, Fade,
} from '@mui/material';
import { IconX, IconMapPin } from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import AddressDialog from '@/components/account/AddressDialog';
import { invalidateAddressCache } from '@/lib/zipcodeCache';
```

#### TypeScript Interface
```typescript
interface Address {
  _id?: string;
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
```

#### Constants
```typescript
const LOCAL_STORAGE_KEY = 'hasDismissedAddressPrompt';
```

## 🔧 State Management

### Component State
```typescript
const [showPrompt, setShowPrompt] = useState(false);
const [showAddressDialog, setShowAddressDialog] = useState(false);
const [addresses, setAddresses] = useState<Address[]>([]);
const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
```

| State | Purpose | Initial Value |
|-------|---------|---------------|
| `showPrompt` | Controls prompt visibility | `false` |
| `showAddressDialog` | Controls address dialog visibility | `false` |
| `addresses` | Stores user's addresses | `[]` |
| `isLoadingAddresses` | Tracks address fetch status | `false` |

### Context Dependencies
```typescript
const { user } = useAuth();                    // Auth state
const { authenticatedFetch } = useApiClient();  // API client
```

## 🎯 Display Logic

### localStorage Check (Mount)
```typescript
useEffect(() => {
  const hasDismissed = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (hasDismissed === 'true') {
    setShowPrompt(false);
  }
}, []);
```

### Conditional Display Logic
```typescript
useEffect(() => {
  const hasDismissed = localStorage.getItem(LOCAL_STORAGE_KEY) === 'true';

  // Show prompt if ALL conditions are met:
  // 1. User is logged in
  // 2. User is not completed (!user.isCompleted)
  // 3. User has no addresses
  // 4. User has not dismissed prompt
  if (
    user &&
    !user.isCompleted &&
    addresses.length === 0 &&
    !hasDismissed &&
    !isLoadingAddresses
  ) {
    setShowPrompt(true);
  } else {
    setShowPrompt(false);
  }
}, [user, addresses, isLoadingAddresses]);
```

### Condition Breakdown
| Condition | Check | Purpose |
|-----------|-------|---------|
| User Authenticated | `user &&` | Must be logged in |
| Profile Incomplete | `!user.isCompleted` | First-time user flag |
| No Addresses | `addresses.length === 0` | User hasn't added address |
| Not Dismissed | `!hasDismissed` | Haven't dismissed before |
| Loading Complete | `!isLoadingAddresses` | Finished checking |

## 🔄 Data Fetching

### Fetch Addresses Function
```typescript
const fetchAddresses = useCallback(async () => {
  if (!user) return;

  setIsLoadingAddresses(true);
  try {
    const response = await authenticatedFetch('/api/address');
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setAddresses(data.data?.items || []);
  } catch (error) {
    console.error('Error fetching addresses:', error);
  } finally {
    setIsLoadingAddresses(false);
  }
}, [user, authenticatedFetch]);
```

### Fetch Trigger
```typescript
useEffect(() => {
  if (user) {
    fetchAddresses();
  }
}, [user, fetchAddresses]);
```

## 🎨 UI Components

### Prompt Banner Structure
```typescript
<Fade in={showPrompt}>
  <Box sx={{ /* gradient background */ }}>
    <Box sx={{ /* max-width container */ }}>
      {/* Message Section */}
      <Box sx={{ /* icon + text */ }}>
        <IconMapPin /> {/* Location icon */}
        <Box>
          <Typography>Headline</Typography>
          <Typography>Subheadline</Typography>
        </Box>
      </Box>

      {/* Actions Section */}
      <Box sx={{ /* buttons */ }}>
        <Button>Add Address</Button>
        <IconButton>Dismiss</IconButton>
      </Box>
    </Box>
  </Box>
</Fade>
```

### Styling Approach
- **Gradient Background**: `linear-gradient(135deg, primary.main08 0%, primary.light05 100%)`
- **Responsive Layout**: Flexbox with `flexWrap` for mobile
- **Icon Container**: Circular background with `backgroundColor: primary.main15`
- **Button Styling**: Custom box-shadow and hover effects
- **Fade Animation**: Smooth entry with Material-UI Fade component

## 🔘 Event Handlers

### Dismiss Handler
```typescript
const handleDismiss = () => {
  setShowPrompt(false);
  localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
};
```

**Behavior:**
1. Hides prompt immediately
2. Saves dismissal to localStorage
3. Prevents future display

### Add Address Handler
```typescript
const handleAddAddressClick = () => {
  setShowAddressDialog(true);
};
```

**Behavior:**
1. Opens AddressDialog component
2. Passes user profile data for pre-filling
3. Sets mode to "add"

### Save Address Handler
```typescript
const handleSaveAddress = async (addressData: Address) => {
  const response = await authenticatedFetch('/api/address', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(addressData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create address');
  }

  // Invalidate address cache so next fetch gets fresh data
  invalidateAddressCache();

  // Refresh addresses - prompt will auto-hide when addresses.length > 0
  await fetchAddresses();

  setShowAddressDialog(false);
};
```

**Behavior:**
1. POSTs address to `/api/address` endpoint
2. Handles errors appropriately
3. Invalidates address cache
4. Refreshes address list
5. Closes dialog
6. Prompt auto-hides due to `addresses.length > 0`

## 🗂️ Address Dialog Integration

### Props Passed to AddressDialog
```typescript
<AddressDialog
  open={showAddressDialog}
  onClose={handleDialogClose}
  onSave={handleSaveAddress}
  mode="add"
  userProfile={{
    name: user.name,
    email: user.email,
    phone: user.phone,
  }}
  existingAddressCount={0}
/>
```

### Dialog Features Used
- **Mode**: `"add"` - Enables address search and new address creation
- **User Profile**: Pre-fills name, email, phone from user context
- **Validation**: Built-in zipcode and phone validation
- **Address Search**: Google Places integration for autocomplete
- **Serviceability Check**: Validates delivery area during entry

## 🔌 Integration Points

### 1. Root Layout Integration
**File**: `src/app/layout.tsx`

```typescript
import FirstTimeAddressPrompt from "@/components/layout/FirstTimeAddressPrompt";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            <HeaderProvider>
              <ThemeProvider>
                <NotificationProvider>
                  <Header />
                  <TimezoneWarningBanner />
                  <FirstTimeAddressPrompt />  {/* ← Added here */}
                  <DialogsProvider>
                    {children}
                  </DialogsProvider>
                </NotificationProvider>
              </ThemeProvider>
            </HeaderProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Placement Rationale:**
- Below header, above page content
- Inside providers for context access
- After timezone warning for proper stacking
- Within notification provider for error handling

### 2. AuthContext Dependency
**File**: `src/contexts/AuthContext.tsx`

**Used Properties:**
```typescript
interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: string;
  isCompleted: boolean;  // ← Critical for display logic
}
```

**Why It Matters:**
- `user.isCompleted` determines first-time user status
- Set to `false` for new registrations
- Set to `true` after profile completion
- Controls prompt eligibility

### 3. CartContext Interaction
**File**: `src/contexts/CartContext.tsx`

**Indirect Relationship:**
- Cart requires address for checkout
- Adding address via prompt enables checkout
- Cart can fetch addresses via `updateAddress()` method
- Address cache is shared between components

### 4. API Endpoints Used
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/address` | GET | Fetch user addresses |
| `/api/address` | POST | Create new address |
| `/api/config/zipcode/:zip` | GET | Validate serviceability |

## 🎯 Architecture Decisions

### 1. Why localStorage for Dismissal?
**Pros:**
- No database schema changes required
- Instant check without API call
- Survives page refreshes
- Simple to implement

**Cons:**
- Device-specific (doesn't sync across devices)
- Lost if browser cache is cleared

**Decision:** Client-side dismissal is sufficient since prompt is a gentle nudge, not a requirement. Users can add address later through normal flows.

### 2. Why Check `isCompleted` Flag?
**Rationale:**
- More precise than checking registration date
- Allows for manual control by admins
- Enables re-showing prompt if needed
- Separates "new user" from "existing user"

### 3. Why Fetch Addresses on Mount?
**Approach:**
- Proactively fetch address list on user login
- Avoids race conditions with display logic
- Ensures accurate `addresses.length` check
- Caches results for efficiency

**Alternative Rejected:** Lazy loading would require loading states and could cause flickering.

### 4. Why Reuse AddressDialog?
**Benefits:**
- Single source of truth for address forms
- Consistent validation logic
- Shared error handling
- Maintains existing UX patterns

**Alternative Rejected:** Creating a simplified form would duplicate validation logic and create maintenance burden.

### 5. Why useCallback for Fetch?
**Reasoning:**
- Prevents unnecessary re-renders
- Stabilizes function reference for useEffect
- Optimizes performance with multiple dependencies
- Follows React best practices

## 🧩 Code Snippets

### Snippet 1: Complete Display Logic
```typescript
// Check localStorage for dismissed state on mount
useEffect(() => {
  const hasDismissed = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (hasDismissed === 'true') {
    setShowPrompt(false);
  }
}, []);

// Check if prompt should be visible based on conditions
useEffect(() => {
  const hasDismissed = localStorage.getItem(LOCAL_STORAGE_KEY) === 'true';

  if (
    user &&
    !user.isCompleted &&
    addresses.length === 0 &&
    !hasDismissed &&
    !isLoadingAddresses
  ) {
    setShowPrompt(true);
  } else {
    setShowPrompt(false);
  }
}, [user, addresses, isLoadingAddresses]);
```

### Snippet 2: Address Save Flow
```typescript
const handleSaveAddress = async (addressData: Address) => {
  // API call
  const response = await authenticatedFetch('/api/address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(addressData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create address');
  }

  // Cache management
  invalidateAddressCache();

  // Refresh triggers re-evaluation of display conditions
  await fetchAddresses();

  // Close dialog
  setShowAddressDialog(false);
};
```

### Snippet 3: Responsive Styling
```typescript
<Box
  sx={{
    background: `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.primary.light}05 100%)`,
    borderBottom: `1px solid ${theme.palette.divider}`,
    py: 2,
    px: { xs: 2, sm: 3 },
  }}
>
  <Box
    sx={{
      maxWidth: 'lg',
      mx: 'auto',
      display: 'flex',
      alignItems: { xs: 'flex-start', sm: 'center' },
      justifyContent: 'space-between',
      gap: 2,
      flexWrap: { xs: 'wrap', sm: 'nowrap' },
    }}
  >
    {/* Content */}
  </Box>
</Box>
```

## 🐛 Common Issues & Solutions

### Issue 1: Prompt Shows on Every Page Load
**Cause:** localStorage not checked properly
**Solution:** Ensure localStorage check runs before display logic

### Issue 2: Prompt Doesn't Hide After Adding Address
**Cause:** Address list not refreshed after save
**Solution:** Call `fetchAddresses()` and `invalidateAddressCache()` after successful save

### Issue 3: Flickering on Page Load
**Cause:** Multiple state updates in quick succession
**Solution:** Use `setTimeout(..., 0)` for state updates to batch them

### Issue 4: Prompt Shows for Existing Users
**Cause:** `isCompleted` flag not set correctly on registration
**Solution:** Ensure registration API sets `isCompleted: false` for new users

## 📊 Performance Considerations

### Optimizations
1. **useCallback**: Memoizes fetch function to prevent re-renders
2. **Conditional Rendering**: Returns `null` when prompt hidden (no DOM)
3. **Efficient Dependencies**: Minimal useEffect dependencies
4. **Cache Invalidation**: Targeted cache clearing instead of global

### Bundle Impact
- **Component Size**: ~10KB unminified
- **Dependencies**: Material-UI (already in bundle)
- **Tree Shaking**: All imports are used (no dead code)

## 🔐 Security Considerations

### Data Handling
- Addresses stored via authenticated API calls
- User profile data only used for pre-filling
- No sensitive data in localStorage
- CSRF protection via `authenticatedFetch`

### XSS Prevention
- All user inputs sanitized by AddressDialog
- React's built-in XSS protection
- Material-UI components handle escaping

## 📝 API Contract

### GET /api/address
**Response:**
```typescript
{
  success: true,
  data: {
    items: Address[]
  }
}
```

### POST /api/address
**Request:**
```typescript
{
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
```

**Response:**
```typescript
{
  success: true,
  data: Address
}
```

---

**Last Updated**: January 12, 2026
**Implementation Version**: 1.0.0
**Next Review**: After first production release
