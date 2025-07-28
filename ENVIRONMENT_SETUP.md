# Environment Variables Setup

## ⚠️ SECURITY NOTICE
**NEVER commit ANY .env files to version control! No examples, no templates, nothing!**

## Development Setup

1. Create a `.env` file in the project root:
   ```bash
   touch .env
   ```

2. Add the following variables with your actual credentials:

```bash
# Server Configuration
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001

# Database Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# Authentication
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
JWT_EXPIRES_IN=7d

# Blockchain Configuration
SUI_RPC_URL=https://fullnode.testnet.sui.io
SUI_NETWORK=testnet

# Enoki Configuration
ENOKI_PRIVATE_API_KEY=enoki_private_your_key_here
ENOKI_PUBLIC_API_KEY=enoki_public_your_key_here

# Google OAuth (for zkLogin)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret_here

# zkLogin Configuration
ZKLOGIN_SALT_SERVICE_URL=https://salt.api.mystenlabs.com
ZKLOGIN_PROVING_SERVICE_URL=https://prover-dev.mystenlabs.com/v1

# Walrus Configuration
WALRUS_NETWORK=testnet

# Redis Configuration (for queues and caching)
REDIS_URL=redis://localhost:6379

# Admin Configuration
ADMIN_WALLET_ADDRESS=0x_your_admin_wallet_address_here
RAFFLE_ADMIN_TOKEN=your_raffle_admin_token_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Encryption
ENCRYPTION_SALT=your_encryption_salt_here_minimum_32_chars

# Logging
LOG_LEVEL=info
```

## Production Deployment (Vercel)

Set these environment variables in your Vercel dashboard:

### Required Variables:
```
NODE_ENV=production
API_BASE_URL=https://your-backend-name.vercel.app
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
JWT_SECRET=generate_new_secure_32_char_secret_for_production
GOOGLE_CLIENT_ID=your_actual_google_client_id
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret
ENOKI_PRIVATE_API_KEY=your_actual_enoki_private_key
ENOKI_PUBLIC_API_KEY=your_actual_enoki_public_key
```

### Optional Variables:
```
JWT_EXPIRES_IN=7d
SUI_RPC_URL=https://fullnode.testnet.sui.io
SUI_NETWORK=testnet
ZKLOGIN_SALT_SERVICE_URL=https://salt.api.mystenlabs.com
ZKLOGIN_PROVING_SERVICE_URL=https://prover-dev.mystenlabs.com/v1
WALRUS_NETWORK=testnet
ADMIN_WALLET_ADDRESS=your_admin_wallet_address
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ENCRYPTION_SALT=your_encryption_salt_32_chars_minimum
LOG_LEVEL=info
```

## Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use different secrets for production** - Don't reuse development keys
3. **Rotate secrets regularly** - Update keys periodically
4. **Use environment-specific values** - Different URLs for dev/prod
5. **Limit access** - Only give team members access to necessary secrets
