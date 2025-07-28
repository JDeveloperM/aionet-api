# AIONET Backend Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally with `npm i -g vercel`
3. **Environment Variables**: Prepare all required environment variables

## Environment Variables

Create these environment variables in your Vercel project settings:

### Required Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=3001

# Database Configuration
SUPABASE_URL=https://hbiycjshfvydzsnggrxd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Blockchain Configuration
SUI_RPC_URL=https://fullnode.testnet.sui.io
SUI_NETWORK=testnet

# Enoki Configuration
ENOKI_PRIVATE_API_KEY=your_enoki_private_key_here
ENOKI_PUBLIC_API_KEY=your_enoki_public_key_here

# Google OAuth (for zkLogin)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# zkLogin Configuration
ZKLOGIN_SALT_SERVICE_URL=https://salt.api.mystenlabs.com
ZKLOGIN_PROVING_SERVICE_URL=https://prover-dev.mystenlabs.com/v1

# Walrus Configuration
WALRUS_NETWORK=testnet

# Admin Configuration
ADMIN_WALLET_ADDRESS=0x311479200d45ef0243b92dbcf9849b8f6b931d27ae885197ea73066724f2bcf4

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Encryption
ENCRYPTION_SALT=AIODash2025_WalrusEncryption_SecureSalt_k8mN9pQ2rS5tU7vW

# Logging
LOG_LEVEL=info
```

## Deployment Steps

### 1. Initial Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Login to Vercel
vercel login

# Initialize project
vercel
```

### 2. Configure Environment Variables

```bash
# Set environment variables (repeat for each variable)
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add JWT_SECRET
# ... continue for all variables
```

Or use the Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add all required variables

### 3. Deploy

```bash
# Deploy to production
vercel --prod
```

### 4. Verify Deployment

After deployment, test the endpoints:

```bash
# Health check
curl https://your-backend-url.vercel.app/health

# API test
curl https://your-backend-url.vercel.app/api/analytics/stats
```

## Local Development

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit environment variables
nano .env.local

# Start development server
npm run dev
```

### Testing

```bash
# Run tests (when implemented)
npm test

# Check health endpoint
curl http://localhost:3001/health
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/verify` - Verify JWT token
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user info

### Admin (Requires Admin Access)
- `GET /api/admin/stats` - Get admin statistics
- `GET /api/admin/paion-stats` - Get pAION statistics
- `GET /api/admin/health` - Get system health
- `POST /api/admin/broadcast` - Broadcast notification

### Trading
- `GET /api/trading/activities` - Get trading activities
- `POST /api/trading/activities` - Record trading activity
- `GET /api/trading/stats` - Get trading statistics
- `GET /api/trading/leaderboard` - Get trading leaderboard
- `GET /api/trading/analytics` - Get trading analytics

### Blockchain/NFT
- `GET /api/blockchain/nft/tier/:address?` - Get user's NFT tier
- `GET /api/blockchain/nft/list/:address?` - Get user's NFTs
- `POST /api/blockchain/nft/mint/create-transaction` - Create mint transaction
- `POST /api/blockchain/nft/mint/record` - Record mint event
- `GET /api/blockchain/nft/pricing` - Get NFT pricing

### Payments
- `GET /api/payments/paion/balance` - Get pAION balance
- `GET /api/payments/paion/transactions` - Get pAION transactions
- `POST /api/payments/paion/transfer` - Transfer pAION tokens
- `GET /api/payments/sui/balance` - Get SUI balance

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications` - Create notification
- `PATCH /api/notifications/:id` - Update notification
- `DELETE /api/notifications/:id` - Delete notification

### Analytics
- `GET /api/analytics/community` - Get community analytics
- `GET /api/analytics/user/:address?` - Get user analytics
- `GET /api/analytics/leaderboard` - Get leaderboards
- `GET /api/analytics/stats` - Get platform statistics

## Security Considerations

1. **Environment Variables**: Never commit sensitive environment variables
2. **Rate Limiting**: Configured per endpoint type
3. **Authentication**: JWT-based with wallet verification
4. **Admin Access**: Restricted to configured admin wallet address
5. **Input Validation**: All inputs are validated and sanitized
6. **CORS**: Configured for production domains

## Monitoring

### Health Check
- Endpoint: `GET /health`
- Returns server status, uptime, and service health

### Logging
- All requests are logged with Winston
- Error tracking with stack traces
- Performance metrics included

### Error Handling
- Centralized error handling
- Proper HTTP status codes
- Detailed error messages in development
- Generic error messages in production

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Check Vercel dashboard environment variables
   - Ensure all required variables are present

2. **Database Connection Issues**
   - Verify Supabase URL and service role key
   - Check network connectivity

3. **Authentication Failures**
   - Verify JWT secret is set
   - Check wallet address format

4. **Rate Limiting**
   - Adjust rate limits in environment variables
   - Monitor request patterns

### Debug Mode

Set `LOG_LEVEL=debug` for detailed logging.

## Performance Optimization

1. **Caching**: Implemented for frequently accessed data
2. **Connection Pooling**: Supabase handles connection pooling
3. **Rate Limiting**: Prevents abuse and ensures fair usage
4. **Compression**: Gzip compression enabled
5. **Memory Management**: Proper cleanup and garbage collection

## Scaling Considerations

1. **Vercel Functions**: Automatically scale based on demand
2. **Database**: Supabase handles scaling automatically
3. **Caching**: Consider Redis for distributed caching if needed
4. **Load Balancing**: Vercel handles this automatically

## Support

For deployment issues:
1. Check Vercel function logs
2. Verify environment variables
3. Test endpoints individually
4. Check database connectivity
5. Review error logs in Vercel dashboard
