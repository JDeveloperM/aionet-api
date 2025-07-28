const express = require('express');
const router = express.Router();

const { generateToken, verifyWalletAddress } = require('../middleware/auth');
const { validateWalletAddress } = require('../middleware/validation');
const { logger } = require('../config/logger');

/**
 * Authentication Routes
 * Handle user authentication and token management
 */

/**
 * POST /api/auth/login
 * Authenticate user with wallet address
 */
router.post('/login', async (req, res) => {
  try {
    const { wallet_address, signature, message } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        error: 'Wallet address is required',
        code: 'MISSING_WALLET_ADDRESS'
      });
    }

    // Validate wallet address format
    const addressValidation = validateWalletAddress(wallet_address);
    if (!addressValidation.valid) {
      return res.status(400).json({
        error: addressValidation.error,
        code: 'INVALID_WALLET_ADDRESS'
      });
    }

    logger.info(`Authentication attempt for ${wallet_address}`);

    // Debug: Check if JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not found in environment variables');
      return res.status(500).json({
        error: 'Server configuration error',
        code: 'MISSING_JWT_SECRET'
      });
    }

    // In a production environment, you would verify the signature here
    // For now, we'll generate a token based on the wallet address
    const token = generateToken({
      address: wallet_address,
      type: 'wallet',
      timestamp: Date.now()
    });

    logger.info(`Authentication successful for ${wallet_address}`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          address: wallet_address,
          type: 'wallet'
        },
        expires_in: process.env.JWT_EXPIRES_IN || '7d'
      },
      message: 'Authentication successful'
    });
  } catch (error) {
    logger.error('Error in authentication:', error);
    res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify JWT token
 */
router.post('/verify', verifyWalletAddress, (req, res) => {
  try {
    // If we reach here, the token is valid (verified by middleware)
    res.json({
      success: true,
      data: {
        valid: true,
        user: req.user,
        address: req.userAddress
      },
      message: 'Token is valid'
    });
  } catch (error) {
    logger.error('Error in token verification:', error);
    res.status(500).json({
      error: 'Token verification failed',
      code: 'VERIFY_ERROR'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', verifyWalletAddress, (req, res) => {
  try {
    const userAddress = req.userAddress;

    // Generate new token
    const newToken = generateToken({
      address: userAddress,
      type: 'wallet',
      timestamp: Date.now()
    });

    logger.info(`Token refreshed for ${userAddress}`);

    res.json({
      success: true,
      data: {
        token: newToken,
        user: {
          address: userAddress,
          type: 'wallet'
        },
        expires_in: process.env.JWT_EXPIRES_IN || '7d'
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    logger.error('Error refreshing token:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', (req, res) => {
  try {
    // Since we're using stateless JWT tokens, logout is handled client-side
    // This endpoint is mainly for logging purposes
    const userAddress = req.headers['x-user-address'];
    
    if (userAddress) {
      logger.info(`User logged out: ${userAddress}`);
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Error in logout:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', verifyWalletAddress, (req, res) => {
  try {
    const userAddress = req.userAddress;

    res.json({
      success: true,
      data: {
        address: userAddress,
        type: 'wallet',
        authenticated: true
      }
    });
  } catch (error) {
    logger.error('Error getting user info:', error);
    res.status(500).json({
      error: 'Failed to get user information',
      code: 'USER_INFO_ERROR'
    });
  }
});

module.exports = router;
