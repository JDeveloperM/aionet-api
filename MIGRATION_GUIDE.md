# Frontend to Backend Migration Guide

## Overview

This guide explains how to migrate your frontend API calls to use the new dedicated backend service instead of Next.js API routes.

## Backend URL Configuration

### Environment Variables

Add these to your frontend `.env.local`:

```bash
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=https://your-backend.vercel.app
# or for development
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### API Client Configuration

Create or update your API client configuration:

```typescript
// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export const apiClient = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
};
```

## Migration Mapping

### Authentication Endpoints

| Frontend (Old) | Backend (New) | Notes |
|----------------|---------------|-------|
| `/api/enoki/oauth` | `/api/auth/login` | Updated request format |
| `/api/zklogin/verify` | `/api/auth/verify` | JWT-based verification |

### Trading Endpoints

| Frontend (Old) | Backend (New) | Notes |
|----------------|---------------|-------|
| `/api/trading/activities` | `/api/trading/activities` | Same endpoint |
| `/api/trading/stats` | `/api/trading/stats` | Enhanced response |
| `/api/trading/leaderboard` | `/api/trading/leaderboard` | Added timeframe filters |

### NFT Endpoints

| Frontend (Old) | Backend (New) | Notes |
|----------------|---------------|-------|
| `/api/rafflecraft/user-tier` | `/api/blockchain/nft/tier` | Simplified response |
| `/api/rafflecraft/mint` | `/api/blockchain/nft/mint/create-transaction` | Split into multiple endpoints |
| `/api/rafflecraft/pricing` | `/api/blockchain/nft/pricing` | Same functionality |

### Payment Endpoints

| Frontend (Old) | Backend (New) | Notes |
|----------------|---------------|-------|
| `/api/paion/balance` | `/api/payments/paion/balance` | Enhanced balance info |
| `/api/paion/transactions` | `/api/payments/paion/transactions` | Better pagination |
| `/api/paion/transfer` | `/api/payments/paion/transfer` | Same functionality |

### Admin Endpoints

| Frontend (Old) | Backend (New) | Notes |
|----------------|---------------|-------|
| `/api/admin/stats` | `/api/admin/stats` | Comprehensive statistics |
| `/api/admin/paion-stats` | `/api/admin/paion-stats` | Detailed pAION metrics |
| `/api/admin/broadcast` | `/api/admin/broadcast` | Notification broadcasting |

## Code Migration Examples

### 1. Authentication

**Before (Frontend API Route):**
```typescript
// pages/api/auth/login.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authentication logic
}

// Usage in component
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ wallet_address })
});
```

**After (Backend API):**
```typescript
// lib/auth.ts
export async function login(walletAddress: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ wallet_address: walletAddress })
  });
  
  return response.json();
}

// Usage in component
const result = await login(walletAddress);
```

### 2. Trading Activities

**Before:**
```typescript
const response = await fetch('/api/trading/activities');
const activities = await response.json();
```

**After:**
```typescript
const response = await fetch(`${API_BASE_URL}/api/trading/activities`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-User-Address': userAddress,
  }
});
const result = await response.json();
const activities = result.data;
```

### 3. NFT Operations

**Before:**
```typescript
const response = await fetch('/api/rafflecraft/user-tier', {
  method: 'POST',
  body: JSON.stringify({ userAddress })
});
```

**After:**
```typescript
const response = await fetch(`${API_BASE_URL}/api/blockchain/nft/tier/${userAddress}`);
const result = await response.json();
const tier = result.data.tier;
```

### 4. pAION Balance

**Before:**
```typescript
const response = await fetch('/api/paion/balance', {
  method: 'POST',
  body: JSON.stringify({ userAddress })
});
```

**After:**
```typescript
const response = await fetch(`${API_BASE_URL}/api/payments/paion/balance`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-User-Address': userAddress,
  }
});
const result = await response.json();
const balance = result.data;
```

## Authentication Changes

### JWT Token Management

The backend uses JWT tokens for authentication. Update your auth context:

```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  token: string | null;
  userAddress: string | null;
  login: (walletAddress: string) => Promise<void>;
  logout: () => void;
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  const login = async (walletAddress: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: walletAddress })
    });
    
    const result = await response.json();
    if (result.success) {
      setToken(result.data.token);
      setUserAddress(walletAddress);
      localStorage.setItem('auth_token', result.data.token);
      localStorage.setItem('user_address', walletAddress);
    }
  };

  // ... rest of context
};
```

### API Request Helper

Create a helper function for authenticated requests:

```typescript
// lib/api.ts
export async function authenticatedRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem('auth_token');
  const userAddress = localStorage.getItem('user_address');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-User-Address': userAddress,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
}

// Usage
const balance = await authenticatedRequest('/api/payments/paion/balance');
```

## Response Format Changes

### Standardized Response Format

All backend responses follow this format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface ApiError {
  error: string;
  code: string;
  details?: string[];
}
```

Update your response handling:

```typescript
// Before
const response = await fetch('/api/trading/activities');
const activities = await response.json(); // Direct data

// After
const response = await fetch(`${API_BASE_URL}/api/trading/activities`);
const result = await response.json();
if (result.success) {
  const activities = result.data; // Data is nested
} else {
  console.error(result.error);
}
```

## Error Handling

### Updated Error Handling

```typescript
async function handleApiRequest<T>(request: Promise<Response>): Promise<T> {
  try {
    const response = await request;
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }
    
    return result.data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
```

## Environment-Specific Configuration

### Development vs Production

```typescript
// lib/config.ts
export const config = {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? 'https://your-backend.vercel.app'
    : 'http://localhost:3001',
};
```

## Testing Migration

### 1. Update API Calls Gradually

Start with non-critical endpoints and gradually migrate:

1. Analytics endpoints (public)
2. Trading data (read-only)
3. NFT information (read-only)
4. Payment operations (critical)
5. Admin functions (critical)

### 2. Parallel Testing

Run both old and new APIs in parallel during migration:

```typescript
const useNewApi = process.env.NEXT_PUBLIC_USE_NEW_API === 'true';

const apiEndpoint = useNewApi 
  ? `${API_BASE_URL}/api/trading/activities`
  : '/api/trading/activities';
```

### 3. Feature Flags

Use feature flags to control migration:

```typescript
// lib/features.ts
export const features = {
  useBackendApi: process.env.NEXT_PUBLIC_BACKEND_API === 'true',
};

// In components
if (features.useBackendApi) {
  // Use new backend API
} else {
  // Use old Next.js API routes
}
```

## Rollback Plan

### Quick Rollback

If issues arise, quickly rollback by:

1. Setting `NEXT_PUBLIC_USE_NEW_API=false`
2. Reverting API client configuration
3. Re-enabling Next.js API routes

### Gradual Rollback

Rollback specific endpoints while keeping others on the new backend:

```typescript
const endpointsToRollback = ['/api/payments/paion/transfer'];

const shouldUseOldApi = (endpoint: string) => {
  return endpointsToRollback.some(old => endpoint.includes(old));
};
```

## Performance Considerations

### Caching

The backend includes built-in caching. Update your frontend caching strategy:

```typescript
// Remove frontend caching for endpoints now cached on backend
const response = await fetch(endpoint, {
  // Remove cache headers - backend handles caching
});
```

### Rate Limiting

Be aware of backend rate limits:
- Default: 100 requests per 15 minutes
- Payments: 20 requests per 15 minutes
- Admin: 200 requests per 15 minutes

## Monitoring

### Error Tracking

Update error tracking to include backend errors:

```typescript
try {
  const result = await authenticatedRequest('/api/endpoint');
} catch (error) {
  // Track backend API errors
  analytics.track('backend_api_error', {
    endpoint: '/api/endpoint',
    error: error.message,
  });
}
```

### Performance Monitoring

Monitor API response times:

```typescript
const startTime = Date.now();
const result = await authenticatedRequest('/api/endpoint');
const duration = Date.now() - startTime;

analytics.track('api_performance', {
  endpoint: '/api/endpoint',
  duration,
});
```

This migration guide ensures a smooth transition from Next.js API routes to the dedicated backend service while maintaining functionality and improving security.
