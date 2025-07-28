/**
 * Application Constants
 * Centralized constants used across the backend
 */

// Admin Configuration
const ADMIN = {
  WALLET_ADDRESS: process.env.ADMIN_WALLET_ADDRESS || '0x311479200d45ef0243b92dbcf9849b8f6b931d27ae885197ea73066724f2bcf4'
};

// NFT Configuration
const NFT = {
  PACKAGE_ID: '0x021d50304ae7402dec2cc761ec66b3dfc68c686e2898c75ea6b12244a3c07817',
  MODULE_NAME: 'MyNFTCollections',
  STRUCT_TYPE: 'DualNFT',
  TIERS: {
    NOMAD: 'NOMAD',
    PRO: 'PRO',
    ROYAL: 'ROYAL'
  },
  PRICING: {
    PRO: {
      cost: 100_000_000, // 0.1 SUI in MIST
      costSui: 0.1,
      collection: 'PRO',
      name: 'PRO Tier NFT',
      description: 'Unlock PRO tier benefits with this soulbound NFT'
    },
    ROYAL: {
      cost: 200_000_000, // 0.2 SUI in MIST
      costSui: 0.2,
      collection: 'ROYAL',
      name: 'ROYAL Tier NFT',
      description: 'Unlock ROYAL tier benefits with this soulbound NFT'
    }
  }
};

// Blockchain Configuration
const BLOCKCHAIN = {
  SUI: {
    COIN_TYPE: '0x2::sui::SUI',
    MIST_PER_SUI: 1_000_000_000,
    DEFAULT_GAS_BUDGET: 10_000_000, // 0.01 SUI
    NETWORK: process.env.SUI_NETWORK || 'testnet'
  }
};

// pAION Token Configuration
const PAION = {
  DECIMALS: 6,
  SYMBOL: 'pAION',
  NAME: 'pAION Token',
  SOURCES: {
    TRADING: 'trading',
    AFFILIATE: 'affiliate',
    NFT_MINT: 'nft_mint',
    REFERRAL: 'referral',
    BONUS: 'bonus',
    ADMIN: 'admin',
    TRANSFER: 'transfer'
  },
  TRANSACTION_TYPES: {
    EARNED: 'earned',
    SPENT: 'spent',
    LOCKED: 'locked',
    UNLOCKED: 'unlocked'
  }
};

// Trading Configuration
const TRADING = {
  TYPES: {
    BUY: 'buy',
    SELL: 'sell',
    LONG: 'long',
    SHORT: 'short'
  },
  STATUSES: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    FAILED: 'failed'
  },
  PLATFORMS: {
    MANUAL: 'manual',
    BYBIT: 'bybit',
    BINANCE: 'binance',
    OKEX: 'okex'
  }
};

// Notification Configuration
const NOTIFICATIONS = {
  TYPES: {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
  },
  CATEGORIES: {
    SYSTEM: 'system',
    TRADING: 'trading',
    NFT: 'nft',
    AFFILIATE: 'affiliate',
    GENERAL: 'general'
  }
};

// Rate Limiting Configuration
const RATE_LIMITS = {
  DEFAULT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  },
  ADMIN: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 200
  },
  PAYMENTS: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 20
  },
  BLOCKCHAIN: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 50
  }
};

// Cache Configuration
const CACHE = {
  TTL: {
    SHORT: 2 * 60 * 1000,      // 2 minutes
    MEDIUM: 5 * 60 * 1000,     // 5 minutes
    LONG: 10 * 60 * 1000,      // 10 minutes
    VERY_LONG: 30 * 60 * 1000  // 30 minutes
  }
};

// Database Configuration
const DATABASE = {
  TABLES: {
    USER_PROFILES: 'user_profiles',
    TRADING_ACTIVITIES: 'trading_activities',
    TRADING_STATS: 'trading_stats',
    PAION_BALANCES: 'paion_balances',
    PAION_TRANSACTIONS: 'paion_transactions',
    NFT_MINT_EVENTS: 'nft_mint_events',
    NOTIFICATIONS: 'notifications',
    AFFILIATE_SUBSCRIPTIONS: 'affiliate_subscriptions'
  }
};

// API Response Codes
const RESPONSE_CODES = {
  // Success
  SUCCESS: 'SUCCESS',
  
  // Authentication Errors
  NO_TOKEN: 'NO_TOKEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  NO_USER_ADDRESS: 'NO_USER_ADDRESS',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  ADMIN_ACCESS_REQUIRED: 'ADMIN_ACCESS_REQUIRED',
  
  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELDS: 'MISSING_FIELDS',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_TIER: 'INVALID_TIER',
  INVALID_TRANSACTION_HASH: 'INVALID_TRANSACTION_HASH',
  
  // Business Logic Errors
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  MINTING_VALIDATION_FAILED: 'MINTING_VALIDATION_FAILED',
  TRANSACTION_VERIFICATION_FAILED: 'TRANSACTION_VERIFICATION_FAILED',
  TRANSFER_FAILED: 'TRANSFER_FAILED',
  
  // System Errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  BLOCKCHAIN_ERROR: 'BLOCKCHAIN_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

// Time Constants
const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000
};

// Validation Constants
const VALIDATION = {
  ADDRESS: {
    MIN_LENGTH: 42,
    PREFIX: '0x',
    REGEX: /^0x[a-fA-F0-9]+$/
  },
  AMOUNT: {
    MIN: 0,
    MAX: 1_000_000
  },
  PAGINATION: {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 1000,
    DEFAULT_OFFSET: 0
  },
  STRING: {
    MAX_TITLE_LENGTH: 200,
    MAX_MESSAGE_LENGTH: 1000,
    MAX_DESCRIPTION_LENGTH: 500
  }
};

// Environment Configuration
const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test'
};

// Encryption Configuration
const ENCRYPTION = {
  ALGORITHM: 'aes-256-gcm',
  KEY_LENGTH: 32,
  IV_LENGTH: 16,
  SALT: process.env.ENCRYPTION_SALT || 'AIODash2025_SupabaseEncryption_SecureSalt_k8mN9pQ2rS5tU7vW'
};

// JWT Configuration
const JWT = {
  ALGORITHM: 'HS256',
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ISSUER: 'aionet-backend',
  AUDIENCE: 'aionet-dashboard'
};

// External Services
const EXTERNAL_SERVICES = {
  ZKLOGIN: {
    SALT_SERVICE_URL: process.env.ZKLOGIN_SALT_SERVICE_URL || 'https://salt.api.mystenlabs.com',
    PROVING_SERVICE_URL: process.env.ZKLOGIN_PROVING_SERVICE_URL || 'https://prover-dev.mystenlabs.com/v1'
  },
  ENOKI: {
    PRIVATE_API_KEY: process.env.ENOKI_PRIVATE_API_KEY,
    PUBLIC_API_KEY: process.env.ENOKI_PUBLIC_API_KEY
  },
  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
  }
};

module.exports = {
  ADMIN,
  NFT,
  BLOCKCHAIN,
  PAION,
  TRADING,
  NOTIFICATIONS,
  RATE_LIMITS,
  CACHE,
  DATABASE,
  RESPONSE_CODES,
  TIME,
  VALIDATION,
  ENVIRONMENT,
  ENCRYPTION,
  JWT,
  EXTERNAL_SERVICES
};
