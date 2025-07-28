# AIONET Backend API Documentation

## Overview

The AIONET Backend is a secure Node.js/Express API service that handles all server-side operations for the AIONET dashboard application. It provides secure endpoints for trading operations, NFT management, payment processing, and administrative functions.

## Base URL

- **Production**: `https://your-backend.vercel.app`
- **Development**: `http://localhost:3001`

## Authentication

Most endpoints require authentication using JWT tokens and wallet address verification.

### Headers Required

```http
Authorization: Bearer <jwt_token>
X-User-Address: <wallet_address>
Content-Type: application/json
```

### Authentication Flow

1. **Login**: `POST /api/auth/login`
2. **Verify**: `POST /api/auth/verify`
3. **Refresh**: `POST /api/auth/refresh`

## API Endpoints

### 🔐 Authentication

#### POST /api/auth/login
Authenticate user with wallet address.

**Request:**
```json
{
  "wallet_address": "0x123...",
  "signature": "optional_signature",
  "message": "optional_message"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "user": {
      "address": "0x123...",
      "type": "wallet"
    },
    "expires_in": "7d"
  }
}
```

#### POST /api/auth/verify
Verify JWT token validity.

#### GET /api/auth/me
Get current user information.

---

### 👤 Admin (Requires Admin Access)

#### GET /api/admin/stats
Get comprehensive admin statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "paion": { "totalSupply": 1000000, "holders": 150 },
    "trading": { "totalTrades": 5000, "totalVolume": 2500000 },
    "nft": { "totalMints": 300, "proMints": 200, "royalMints": 100 },
    "users": { "totalUsers": 500, "newUsersThisWeek": 25 }
  }
}
```

#### GET /api/admin/paion-stats
Get detailed pAION token statistics.

#### GET /api/admin/health
Get system health status.

#### POST /api/admin/broadcast
Broadcast notification to all users.

**Request:**
```json
{
  "title": "System Maintenance",
  "message": "Scheduled maintenance tonight",
  "type": "info",
  "category": "system"
}
```

---

### 📈 Trading

#### GET /api/trading/activities
Get user's trading activities.

**Query Parameters:**
- `symbol` - Filter by trading symbol
- `tradeType` - Filter by trade type (buy, sell, long, short)
- `platform` - Filter by platform
- `status` - Filter by status
- `dateFrom` - Start date filter
- `dateTo` - End date filter
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)

#### POST /api/trading/activities
Record new trading activity.

**Request:**
```json
{
  "trade_type": "buy",
  "symbol": "BTC/USDT",
  "amount": 1000,
  "price": 45000,
  "profit_loss": 150,
  "profit_loss_percentage": 15,
  "platform": "bybit",
  "trade_opened_at": "2024-01-01T00:00:00Z",
  "trade_closed_at": "2024-01-01T01:00:00Z"
}
```

#### GET /api/trading/stats
Get user's trading statistics.

#### GET /api/trading/leaderboard
Get trading leaderboard (public).

**Query Parameters:**
- `limit` - Number of results (default: 50)
- `sortBy` - Sort field (default: total_profit_loss)
- `timeframe` - Time filter (all, week, month, year)

#### GET /api/trading/analytics
Get trading analytics for user.

#### GET /api/trading/summary
Get trading summary for dashboard.

---

### 🎨 Blockchain/NFT

#### GET /api/blockchain/nft/tier/:address?
Get user's NFT tier.

**Response:**
```json
{
  "success": true,
  "data": {
    "tier": "PRO",
    "user_address": "0x123..."
  }
}
```

#### GET /api/blockchain/nft/list/:address?
Get user's NFTs.

#### GET /api/blockchain/nft/has/:tier/:address?
Check if user has specific NFT tier.

#### POST /api/blockchain/nft/mint/create-transaction
Create mint transaction (requires auth).

**Request:**
```json
{
  "tier": "PRO"
}
```

#### POST /api/blockchain/nft/mint/validate
Validate minting requirements.

#### POST /api/blockchain/nft/mint/record
Record mint event after successful transaction.

**Request:**
```json
{
  "tier": "PRO",
  "transaction_hash": "0xabc...",
  "nft_id": "0x123..."
}
```

#### GET /api/blockchain/nft/pricing
Get NFT pricing (public).

**Response:**
```json
{
  "success": true,
  "data": {
    "PRO": {
      "cost": 100000000,
      "costSui": 0.1,
      "collection": "PRO",
      "name": "PRO Tier NFT"
    },
    "ROYAL": {
      "cost": 200000000,
      "costSui": 0.2,
      "collection": "ROYAL",
      "name": "ROYAL Tier NFT"
    }
  }
}
```

---

### 💰 Payments

#### GET /api/payments/paion/balance
Get user's pAION balance.

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 1500.50,
    "total_earned": 2000.00,
    "total_spent": 499.50,
    "locked_amount": 0,
    "last_updated": "2024-01-01T00:00:00Z"
  }
}
```

#### GET /api/payments/paion/transactions
Get user's pAION transaction history.

#### POST /api/payments/paion/transfer
Transfer pAION tokens between users.

**Request:**
```json
{
  "to_address": "0x456...",
  "amount": 100,
  "description": "Payment for services"
}
```

#### POST /api/payments/paion/add (Admin Only)
Add pAION tokens to user account.

#### POST /api/payments/paion/spend (Admin Only)
Spend pAION tokens from user account.

#### POST /api/payments/paion/lock
Lock pAION tokens.

#### POST /api/payments/paion/unlock
Unlock pAION tokens.

#### GET /api/payments/paion/stats
Get pAION token statistics (public).

#### GET /api/payments/sui/balance
Get user's SUI balance.

---

### 🔔 Notifications

#### GET /api/notifications
Get user's notifications.

**Query Parameters:**
- `category` - Filter by category
- `type` - Filter by type
- `read` - Filter by read status
- `limit` - Number of results
- `offset` - Pagination offset

#### POST /api/notifications
Create notification (admin only).

#### PATCH /api/notifications/:id
Update notification (mark as read).

#### DELETE /api/notifications/:id
Delete notification.

#### PATCH /api/notifications/mark-all-read
Mark all notifications as read.

#### GET /api/notifications/unread-count
Get unread notification count.

---

### 📊 Analytics

#### GET /api/analytics/community
Get community analytics (public).

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 500,
    "totalHolders": 300,
    "tierBreakdown": {
      "nomad": 200,
      "pro": 200,
      "royal": 100
    },
    "growth": {
      "newUsersThisWeek": 25,
      "weeklyGrowthRate": 5.2
    }
  }
}
```

#### GET /api/analytics/user/:address?
Get user-specific analytics.

#### GET /api/analytics/leaderboard
Get various leaderboards.

**Query Parameters:**
- `type` - Leaderboard type (trading, paion)
- `limit` - Number of results

#### GET /api/analytics/stats
Get platform statistics (public).

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": ["Additional error details"]
}
```

### Common Error Codes

- `NO_TOKEN` - No authentication token provided
- `INVALID_TOKEN` - Invalid or expired token
- `NO_USER_ADDRESS` - Missing user address header
- `INVALID_ADDRESS` - Invalid wallet address format
- `ADMIN_ACCESS_REQUIRED` - Admin privileges required
- `VALIDATION_ERROR` - Request validation failed
- `INSUFFICIENT_BALANCE` - Insufficient balance for operation
- `RATE_LIMIT_EXCEEDED` - Too many requests

## Rate Limiting

- **Default**: 100 requests per 15 minutes
- **Admin**: 200 requests per 15 minutes
- **Payments**: 20 requests per 15 minutes
- **Blockchain**: 50 requests per 15 minutes

## Response Format

All successful responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `limit` - Number of items per page (default: 50, max: 1000)
- `offset` - Number of items to skip (default: 0)

**Response includes:**
- `count` - Number of items in current response
- `hasMore` - Boolean indicating if more items exist

## Testing

Use the provided test script to verify all endpoints:

```bash
npm run test-endpoints
```

## Support

For API support and questions:
1. Check endpoint logs in Vercel dashboard
2. Verify authentication headers
3. Validate request format
4. Check rate limiting status
