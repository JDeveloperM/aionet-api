const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');
const suiService = require('../services/blockchain/sui-service');

/**
 * Authentication Middleware
 * Handles JWT and wallet verification for secure endpoints
 */

/**
 * Verify JWT token
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (jwtError) {
      logger.warn('Invalid JWT token:', jwtError.message);
      return res.status(401).json({
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    logger.error('Error in token verification:', error);
    return res.status(500).json({
      error: 'Token verification failed.',
      code: 'TOKEN_VERIFICATION_ERROR'
    });
  }
};

/**
 * Verify wallet address from headers
 */
const verifyWalletAddress = (req, res, next) => {
  try {
    const userAddress = req.headers['x-user-address'];
    
    if (!userAddress) {
      return res.status(401).json({
        error: 'User address required in X-User-Address header.',
        code: 'NO_USER_ADDRESS'
      });
    }

    // Validate address format
    if (!suiService.isValidAddress(userAddress)) {
      return res.status(400).json({
        error: 'Invalid wallet address format.',
        code: 'INVALID_ADDRESS'
      });
    }

    req.userAddress = userAddress;
    next();
  } catch (error) {
    logger.error('Error in wallet address verification:', error);
    return res.status(500).json({
      error: 'Wallet address verification failed.',
      code: 'ADDRESS_VERIFICATION_ERROR'
    });
  }
};

/**
 * Verify admin access
 */
const verifyAdmin = (req, res, next) => {
  try {
    const userAddress = req.userAddress || req.headers['x-user-address'];
    const adminAddress = process.env.ADMIN_WALLET_ADDRESS;
    
    if (!adminAddress) {
      logger.error('Admin wallet address not configured');
      return res.status(500).json({
        error: 'Admin configuration error.',
        code: 'ADMIN_CONFIG_ERROR'
      });
    }

    if (!userAddress || userAddress.toLowerCase() !== adminAddress.toLowerCase()) {
      logger.warn(`Unauthorized admin access attempt from: ${userAddress}`);
      return res.status(403).json({
        error: 'Admin access required.',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    req.isAdmin = true;
    next();
  } catch (error) {
    logger.error('Error in admin verification:', error);
    return res.status(500).json({
      error: 'Admin verification failed.',
      code: 'ADMIN_VERIFICATION_ERROR'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      } catch (jwtError) {
        // Log but don't fail - this is optional auth
        logger.debug('Optional auth failed:', jwtError.message);
      }
    }

    // Also try to get user address from headers
    const userAddress = req.headers['x-user-address'];
    if (userAddress && suiService.isValidAddress(userAddress)) {
      req.userAddress = userAddress;
    }

    next();
  } catch (error) {
    logger.error('Error in optional auth:', error);
    next(); // Continue anyway for optional auth
  }
};

/**
 * Rate limiting by user address
 */
const createUserRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    try {
      const userAddress = req.userAddress || req.headers['x-user-address'] || req.ip;
      const now = Date.now();
      
      // Clean old entries
      for (const [key, data] of requests.entries()) {
        if (now - data.resetTime > windowMs) {
          requests.delete(key);
        }
      }
      
      // Get or create user data
      let userData = requests.get(userAddress);
      if (!userData || now - userData.resetTime > windowMs) {
        userData = {
          count: 0,
          resetTime: now
        };
        requests.set(userAddress, userData);
      }
      
      // Check limit
      if (userData.count >= max) {
        return res.status(429).json({
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((windowMs - (now - userData.resetTime)) / 1000)
        });
      }
      
      // Increment counter
      userData.count++;
      
      // Add headers
      res.set({
        'X-RateLimit-Limit': max,
        'X-RateLimit-Remaining': Math.max(0, max - userData.count),
        'X-RateLimit-Reset': new Date(userData.resetTime + windowMs).toISOString()
      });
      
      next();
    } catch (error) {
      logger.error('Error in user rate limiting:', error);
      next(); // Continue on error
    }
  };
};

/**
 * Validate request body schema
 */
const validateSchema = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          })),
          code: 'VALIDATION_ERROR'
        });
      }
      
      req.body = value; // Use validated/sanitized data
      next();
    } catch (error) {
      logger.error('Error in schema validation:', error);
      return res.status(500).json({
        error: 'Validation failed.',
        code: 'VALIDATION_FAILED'
      });
    }
  };
};

/**
 * Generate JWT token
 */
const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '7d') => {
  try {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  } catch (error) {
    logger.error('Error generating JWT token:', error);
    throw new Error('Token generation failed');
  }
};

/**
 * Verify and decode JWT token without middleware
 */
const verifyTokenSync = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logger.debug('Token verification failed:', error.message);
    return null;
  }
};

/**
 * Extract user address from request
 */
const getUserAddress = (req) => {
  return req.userAddress || 
         req.user?.address || 
         req.headers['x-user-address'] || 
         null;
};

/**
 * Check if user is admin
 */
const isAdmin = (userAddress) => {
  const adminAddress = process.env.ADMIN_WALLET_ADDRESS;
  return adminAddress && 
         userAddress && 
         userAddress.toLowerCase() === adminAddress.toLowerCase();
};

module.exports = {
  verifyToken,
  verifyWalletAddress,
  verifyAdmin,
  optionalAuth,
  createUserRateLimit,
  validateSchema,
  generateToken,
  verifyTokenSync,
  getUserAddress,
  isAdmin
};
