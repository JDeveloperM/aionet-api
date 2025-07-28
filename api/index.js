// Environment variables are automatically loaded by Vercel
// Only load dotenv for local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { logger, requestLogger } = require('../config/logger');
const { testConnection } = require('../config/database');

// Import routes
const authRoutes = require('../routes/auth');
const adminRoutes = require('../routes/admin');
const tradingRoutes = require('../routes/trading');
const blockchainRoutes = require('../routes/blockchain');
const paymentRoutes = require('../routes/payments');
const notificationRoutes = require('../routes/notifications');
const analyticsRoutes = require('../routes/analytics');
const affiliateRoutes = require('../routes/affiliate');
const governanceRoutes = require('../routes/governance');
const socialRoutes = require('../routes/social');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://aionet-dashboard.vercel.app', // Update with your actual frontend domain
        'https://your-custom-domain.com' // Add your custom domain if you have one
      ]
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Address']
}));

// Rate limiting (disabled for development)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);
  logger.info('Rate limiting enabled for production');
} else {
  logger.info('Rate limiting disabled for development');
}

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Database initialization middleware for serverless (skip for health checks)
app.use(async (req, res, next) => {
  // Skip database initialization for health check endpoints
  if (req.path === '/health') {
    return next();
  }

  try {
    await initializeDatabase();
    next();
  } catch (error) {
    console.error('Database initialization failed:', error);
    return res.status(500).json({
      error: 'Database connection failed',
      message: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Health check endpoint (no database required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'unknown',
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
});

// Database health check endpoint
app.get('/health/db', async (req, res) => {
  try {
    await initializeDatabase();
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/social', socialRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Initialize database connection for serverless
let dbInitialized = false;

async function initializeDatabase() {
  if (!dbInitialized) {
    try {
      // Check if required environment variables exist
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      }

      const dbConnected = await testConnection();
      if (!dbConnected) {
        throw new Error('Database connection test failed');
      }
      dbInitialized = true;
      console.log('✅ Database connection initialized');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }
}



// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;

  initializeDatabase().then(() => {
    app.listen(PORT, () => {
      logger.info(`🚀 AIONET Backend Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  }).catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Export the Express app directly for Vercel (latest approach)
module.exports = app;
