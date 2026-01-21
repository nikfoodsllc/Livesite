# API Changes - Signup Flow Simplification

## 📋 Overview

This document provides detailed information about all API changes related to the signup flow simplification. It includes endpoint specifications, request/response formats, validation rules, and breaking changes.

**Last Updated**: January 12, 2026
**API Version**: 2.0.0

---

## 🔄 Breaking Changes

### Removed Endpoint

#### ❌ `POST /api/auth/signup/step2` - REMOVED

**Status**: **DEPRECATED AND REMOVED**

**Previous Usage:**
```http
POST /api/auth/signup/step2
Content-Type: application/json

{
  "userId": "string",
  "street_address": "string",
  "city": "string",
  "postal_code": "string",
  "apartment": "string",
  "floor": "string",
  "entrance": "string"
}
```

**Why Removed:**
- Address collection moved to separate `/api/address` endpoint
- Simplified signup to single-step process
- Better separation of concerns (authentication vs. profile data)
- Improved user experience with progressive data collection

**Migration Path:**
Use `POST /api/address` with authentication token instead. See [New Address Endpoint](#new-post-apiaddress) below.

---

## ✅ Current Endpoints

### 1. User Signup

#### `POST /api/auth/signup`

Creates a new user account with basic information. Address collection is deferred to post-login.

**Endpoint:** `POST /api/auth/signup`

**Authentication:** Not required (public endpoint)

**Request Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```typescript
{
  fullName?: string,      // Optional, min 2 characters if provided
  email: string,          // Required, valid email format
  password: string,       // Required, min 8 chars, must contain uppercase,
                          // lowercase, number, and special character
  phone?: string          // Optional, phone number
}
```

**Validation Rules:**
- `email`: Must be valid email format, automatically trimmed and lowercased
- `password`:
  - Minimum 8 characters
  - Must contain at least one uppercase letter (A-Z)
  - Must contain at least one lowercase letter (a-z)
  - Must contain at least one number (0-9)
  - Must contain at least one special character (!@#$%^&* etc.)
- `fullName`: If provided, minimum 2 characters
- `phone`: If provided, validated format (optional field)

**Success Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe",
      "phone": "+1234567890",
      "role": "USER",
      "isCompleted": false  // ← Indicates address not yet provided
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,  // 1 day in seconds
    "isCompleted": false
  },
  "message": "User registered successfully"
}
```

**Error Responses:**

*400 Bad Request - Validation Error:*
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Password must contain uppercase, lowercase, number, and special character"
}
```

*400 Bad Request - Email Already Registered:*
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Email already registered"
}
```

*500 Internal Server Error:*
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "Internal server error"
}
```

**Behavior:**
- Creates user with `isCompleted: false` by default
- Generates JWT access token (valid for 1 day)
- Generates JWT refresh token (valid for 7 days)
- Password is hashed before storage (never stored in plain text)
- Email is normalized (lowercased and trimmed)
- User can immediately log in after signup

**Example Usage:**
```javascript
const response = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fullName: 'John Doe',
    email: 'john@example.com',
    password: 'SecurePass123!',
    phone: '+1234567890'
  })
});

const data = await response.json();
// Store tokens for subsequent requests
localStorage.setItem('token', data.data.token);
localStorage.setItem('refreshToken', data.data.refreshToken);
```

---

### 2. User Login

#### `POST /api/auth/login`

Authenticates a user and returns JWT tokens.

**Endpoint:** `POST /api/auth/login`

**Authentication:** Not required (public endpoint)

**Request Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```typescript
{
  email: string,      // Required, valid email format
  password: string    // Required
}
```

**Success Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe",
      "phone": "+1234567890",
      "role": "USER",
      "isCompleted": false  // ← Check this to show address prompt
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "isCompleted": false
  },
  "message": "User logged in successfully"
}
```

**Error Responses:**

*401 Unauthorized - Invalid Credentials:*
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Invalid email or password"
}
```

**Key Behavior:**
- Returns `isCompleted` flag to indicate if user needs to add address
- Generates new tokens on each login
- Stores refresh token in database for token rotation

---

### 3. Create Address (NEW)

#### `POST /api/address`

Creates a new delivery address for the authenticated user. This is the replacement for the removed `/api/auth/signup/step2` endpoint.

**Endpoint:** `POST /api/address`

**Authentication:** Required (Bearer token)

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  name: string,              // Required, min 2 characters
  email: string,             // Required, valid email format
  phone?: string,            // Optional, 10-digit US format
  street_address: string,    // Required, min 5 characters
  city: string,              // Required, min 2 characters
  postal_code: string,       // Required, 5-digit or 5+4 digit format (12345 or 12345-6789)
  apartment?: string,        // Optional
  floor?: string,            // Optional
  entrance?: string,         // Optional
  isDefault?: boolean        // Optional, if true unsets other default addresses
}
```

**Validation Rules:**
- `name`: Minimum 2 characters
- `email`: Valid email format
- `phone`: If provided, must be 10-digit US phone number
- `street_address`: Minimum 5 characters
- `city`: Minimum 2 characters
- `postal_code`: Must match regex `^\d{5}(-\d{4})?$` (12345 or 12345-6789)
- **Serviceability Check**: Zip code is validated against serviceable areas

**Success Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "message": "Address created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "user": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "street_address": "123 Main Street",
    "city": "New York",
    "province": "",
    "postal_code": "10001",
    "apartment": "4B",
    "floor": "2",
    "entrance": "A",
    "isDefault": true,
    "createdAt": "2026-01-12T04:00:00.000Z",
    "updatedAt": "2026-01-12T04:00:00.000Z"
  }
}
```

**Error Responses:**

*400 Bad Request - Validation Error:*
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Street address is too short"
}
```

*400 Bad Request - Zipcode Not Serviceable:*
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "This area is not serviceable. We currently don't deliver to this zip code."
}
```

*401 Unauthorized - No Token:*
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Unauthorized - No token provided"
}
```

**Key Behavior:**
- Automatically sets `user.isCompleted = true` on first address creation
- Adds address reference to user's `addresses` array
- If `isDefault: true`, unsets default flag on all other user addresses
- Validates zipcode serviceability before creation
- Requires valid JWT access token

**Example Usage:**
```javascript
const token = localStorage.getItem('token');

const response = await fetch('/api/address', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    street_address: '123 Main Street',
    city: 'New York',
    postal_code: '10001',
    apartment: '4B',
    isDefault: true
  })
});

const data = await response.json();
// User is now considered "completed" (isCompleted = true)
```

---

### 4. Get User Addresses

#### `GET /api/address`

Retrieves all addresses for the authenticated user.

**Endpoint:** `GET /api/address`

**Authentication:** Required (Bearer token)

**Request Headers:**
```http
Authorization: Bearer <access_token>
```

**Success Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "user": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "street_address": "123 Main Street",
        "city": "New York",
        "postal_code": "10001",
        "isDefault": true,
        ...
      }
    ],
    "page": 1,
    "pageSize": 1,
    "total": 1
  }
}
```

---

### 5. Update Address

#### `PUT /api/address`

Updates an existing address.

**Endpoint:** `PUT /api/address`

**Authentication:** Required (Bearer token)

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  _id: string,              // Required - address ID to update
  name: string,
  email: string,
  phone?: string,
  street_address: string,
  city: string,
  postal_code: string,
  apartment?: string,
  floor?: string,
  entrance?: string,
  isDefault?: boolean
}
```

**Success Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Address updated successfully",
  "data": { /* Updated address object */ }
}
```

---

### 6. Delete Address

#### `DELETE /api/address?id={addressId}`

Deletes an address by ID.

**Endpoint:** `DELETE /api/address?id={addressId}`

**Authentication:** Required (Bearer token)

**Request Headers:**
```http
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `id` (required): Address ID to delete

**Success Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Address deleted successfully"
}
```

**Error Responses:**

*400 Bad Request - Missing ID:*
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Address ID is required"
}
```

*404 Not Found:*
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "Address not found or unauthorized"
}
```

---

## 🔐 Authentication Headers

All authenticated endpoints require:

```http
Authorization: Bearer <access_token>
```

**Token Sources:**
- Access token from login/signup response
- Valid for 1 day
- Sent in `Authorization` header

**Token Refresh:**
When access token expires, use refresh token to obtain new access token (implementation may vary).

---

## 📊 Response Format Standards

### Success Response Structure
```typescript
{
  success?: boolean,        // For address endpoints
  data?: {
    user?: UserResponse,
    token?: string,
    refreshToken?: string,
    expiresIn?: number,
    isCompleted?: boolean,
    items?: any[],          // For GET /api/address
    // ... other data
  },
  message?: string
}
```

### Error Response Structure
```typescript
{
  error: string            // Human-readable error message
}
```

### HTTP Status Codes
- `200 OK`: Successful GET/PUT/DELETE
- `201 Created`: Successful POST
- `400 Bad Request`: Validation error, invalid input
- `401 Unauthorized`: Missing/invalid token
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## 🧪 Validation Examples

### Password Validation
```javascript
// ✅ Valid passwords
"SecurePass123!"
"MyP@ssw0rd"
"Test#2026"

// ❌ Invalid passwords
"password"         // Missing uppercase, number, special char
"PASSWORD"         // Missing lowercase, number, special char
"Pass123"          // Missing special character
"Secure!"          // Missing number
```

### Email Validation
```javascript
// ✅ Valid emails
"user@example.com"
"john.doe@company.co.uk"
"test+tag@email.org"

// ❌ Invalid emails
"user@"
"@example.com"
"user@example"
```

### Zipcode Validation
```javascript
// ✅ Valid zipcodes
"12345"           // Basic 5-digit
"12345-6789"      // 5+4 digit format

// ❌ Invalid zipcodes
"1234"            // Too short
"123456"          // Too long
"1234-5678"       // Wrong format
"abcd"            // Non-numeric
```

---

## 🔄 Migration from Old Flow

### Old Flow (Deprecated)
```javascript
// Step 1: Basic signup
const step1 = await fetch('/api/auth/signup', {
  method: 'POST',
  body: JSON.stringify({ email, password, name })
});

// Step 2: Address (DEPRECATED)
const step2 = await fetch('/api/auth/signup/step2', {
  method: 'POST',
  body: JSON.stringify({ userId, address, city, zipcode })
});
```

### New Flow (Current)
```javascript
// Single signup step
const signup = await fetch('/api/auth/signup', {
  method: 'POST',
  body: JSON.stringify({ email, password, name })
});

// User is now logged in with token

// Later: Add address (separate endpoint)
const address = await fetch('/api/address', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ street_address, city, postal_code })
});
```

---

## 📝 TypeScript Types

### Request Types
```typescript
interface SignupRequest {
  fullName?: string;
  email: string;
  password: string;
  phone?: string;
}

interface AddressRequest {
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

interface LoginRequest {
  email: string;
  password: string;
}
```

### Response Types
```typescript
interface AuthResponse {
  data: {
    user: UserResponse;
    token: string;
    refreshToken: string;
    expiresIn: number;
    isCompleted: boolean;
  };
  message: string;
}

interface UserResponse {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: 'USER' | 'ADMIN';
  isCompleted: boolean;
}

interface AddressResponse {
  success: boolean;
  message: string;
  data: IAddress;
}
```

---

## 🔗 Related Documentation

- [Signup Flow Simplification Overview](./signup-flow-simplification.md)
- [Before/After Comparison](./before-after-comparison.md)
- [Migration Guide](./migration-guide.md)
- [Address API Reference](../api/address-api.md)

---

**Last Updated**: January 12, 2026
**API Version**: 2.0.0
