const express = require('express');
const router = express.Router();

const { verifyWalletAddress, verifyAdmin, createUserRateLimit } = require('../middleware/auth');
const { validateCommonParams, validateTransactionHash, validateAmount } = require('../middleware/validation');
const { logger } = require('../config/logger');
const paionController = require('../controllers/payments/paion-controller');
const suiService = require('../services/blockchain/sui-service');

/**
 * Payment Routes
 * Handle payment processing and token operations
 */

// Apply rate limiting for payment routes
router.use(createUserRateLimit(15 * 60 * 1000, 20)); // 20 requests per 15 minutes

/**
 * pAION Token Routes
 */

/**
 * GET /api/payments/paion/balance
 * Get user's pAION balance
 */
router.get('/paion/balance',
  verifyWalletAddress,
  paionController.getBalance
);

/**
 * GET /api/payments/paion/transactions
 * Get user's pAION transaction history
 */
router.get('/paion/transactions',
  verifyWalletAddress,
  validateCommonParams,
  paionController.getTransactionHistory
);

/**
 * POST /api/payments/paion/transfer
 * Transfer pAION tokens between users
 */
router.post('/paion/transfer',
  verifyWalletAddress,
  paionController.transferTokens
);

/**
 * POST /api/payments/paion/add
 * Add pAION tokens (admin only)
 */
router.post('/paion/add',
  verifyWalletAddress,
  verifyAdmin,
  paionController.addTokens
);

/**
 * POST /api/payments/paion/spend
 * Spend pAION tokens (admin only)
 */
router.post('/paion/spend',
  verifyWalletAddress,
  verifyAdmin,
  paionController.spendTokens
);

/**
 * POST /api/payments/paion/lock
 * Lock pAION tokens
 */
router.post('/paion/lock',
  verifyWalletAddress,
  paionController.lockTokens
);

/**
 * POST /api/payments/paion/unlock
 * Unlock pAION tokens
 */
router.post('/paion/unlock',
  verifyWalletAddress,
  paionController.unlockTokens
);

/**
 * GET /api/payments/paion/stats
 * Get pAION token statistics
 */
router.get('/paion/stats',
  paionController.getTokenStatistics
);

/**
 * GET /api/payments/paion/earning-sources
 * Get earning sources breakdown for user
 */
router.get('/paion/earning-sources',
  verifyWalletAddress,
  paionController.getEarningSourcesBreakdown
);

/**
 * Subscription Payment Routes
 */

/**
 * POST /api/payments/subscription/verify
 * Verify subscription payment transaction
 */
router.post('/subscription/verify',
  verifyWalletAddress,
  async (req, res) => {
    try {
      const userAddress = req.userAddress;
      const { transaction_hash, expected_amount } = req.body;
      
      if (!transaction_hash) {
        return res.status(400).json({
          error: 'Transaction hash is required',
          code: 'MISSING_TRANSACTION_HASH'
        });
      }
      
      // Validate transaction hash
      const hashValidation = validateTransactionHash(transaction_hash);
      if (!hashValidation.valid) {
        return res.status(400).json({
          error: hashValidation.error,
          code: 'INVALID_TRANSACTION_HASH'
        });
      }
      
      logger.info(`Verifying subscription payment for ${userAddress}`);
      
      // Verify transaction on blockchain
      const verification = await suiService.verifyTransaction(
        transaction_hash,
        userAddress,
        expected_amount
      );
      
      if (!verification.valid) {
        return res.status(400).json({
          error: `Transaction verification failed: ${verification.error}`,
          code: 'VERIFICATION_FAILED'
        });
      }
      
      res.json({
        success: true,
        data: {
          verified: true,
          transaction: verification.transaction
        },
        message: 'Payment verified successfully'
      });
    } catch (error) {
      logger.error('Error verifying subscription payment:', error);
      res.status(500).json({
        error: 'Failed to verify payment',
        code: 'VERIFY_PAYMENT_ERROR'
      });
    }
  }
);

/**
 * GET /api/payments/sui/balance
 * Get user's SUI balance
 */
router.get('/sui/balance',
  verifyWalletAddress,
  async (req, res) => {
    try {
      const userAddress = req.userAddress;
      
      logger.info(`Getting SUI balance for ${userAddress}`);
      
      const balance = await suiService.getUserBalance(userAddress);
      
      res.json({
        success: true,
        data: {
          balance,
          address: userAddress
        }
      });
    } catch (error) {
      logger.error('Error getting SUI balance:', error);
      res.status(500).json({
        error: 'Failed to get SUI balance',
        code: 'GET_SUI_BALANCE_ERROR'
      });
    }
  }
);

/**
 * GET /api/payments/transaction/:hash
 * Get transaction details
 */
router.get('/transaction/:hash',
  async (req, res) => {
    try {
      const { hash } = req.params;
      
      // Validate transaction hash
      const hashValidation = validateTransactionHash(hash);
      if (!hashValidation.valid) {
        return res.status(400).json({
          error: hashValidation.error,
          code: 'INVALID_TRANSACTION_HASH'
        });
      }
      
      logger.info(`Getting transaction details for ${hash}`);
      
      const transaction = await suiService.getTransaction(hash);
      
      if (!transaction) {
        return res.status(404).json({
          error: 'Transaction not found',
          code: 'TRANSACTION_NOT_FOUND'
        });
      }
      
      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      logger.error('Error getting transaction details:', error);
      res.status(500).json({
        error: 'Failed to get transaction details',
        code: 'GET_TRANSACTION_ERROR'
      });
    }
  }
);

module.exports = router;
