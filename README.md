# AIONET Backend Service

A secure Node.js/Express backend service for the AIONET dashboard application.

## Architecture

```
backend/
├── controllers/            # Request handlers
│   ├── admin/             # Admin-specific controllers
│   ├── auth/              # Authentication controllers
│   ├── blockchain/        # Blockchain operation controllers
│   ├── payments/          # Payment processing controllers
│   └── trading/           # Trading-related controllers
├── models/                # Data models and schemas
├── routes/                # API route definitions
├── services/              # Business logic services
│   ├── blockchain/        # Blockchain services
│   ├── analytics/         # Analytics and statistics
│   ├── notifications/     # Notification services
│   └── payments/          # Payment processing
├── middleware/            # Express middleware
├── utils/                 # Utility functions
├── config/                # Configuration files
└── index.js               # Entry point
```

## Features

- **Secure Authentication**: JWT + Wallet verification
- **Payment Processing**: Crypto payment handling
- **Blockchain Integration**: Sui network operations
- **Analytics Service**: Background processing
- **Admin Operations**: Privileged administrative functions
- **Notification System**: Queue-based delivery

## Environment Variables

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
ENOKI_PRIVATE_API_KEY=...
JWT_SECRET=...
```

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Run Setup Script**
   ```bash
   npm run setup
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Test Endpoints**
   ```bash
   npm run test-endpoints
   ```

## Deployment

Configured for Vercel deployment with proper environment variable management.

### Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login and Deploy**
   ```bash
   vercel login
   vercel --prod
   ```

3. **Set Environment Variables**
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   # ... add all required variables
   ```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

## Scripts

- `npm run dev` - Start development server
- `npm run start` - Start production server
- `npm run setup` - Run setup and verification
- `npm run test-endpoints` - Test all API endpoints
- `npm run deploy` - Deploy to Vercel
- `npm run logs` - View Vercel logs
