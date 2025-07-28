const express = require('express');
const router = express.Router();

const nftController = require('../controllers/blockchain/nft-controller');
const { verifyWalletAddress, optionalAuth, createUserRateLimit } = require('../middleware/auth');
const { validateCommonParams } = require('../middleware/validation');

/**
 * Blockchain Routes
 * Handle blockchain-related operations (NFTs, transactions, etc.)
 */

// Apply rate limiting
router.use(createUserRateLimit(15 * 60 * 1000, 50)); // 50 requests per 15 minutes

/**
 * NFT Routes
 */

/**
 * GET /api/blockchain/nft/tier/:address?
 * Get user's NFT tier
 * Optional authentication (can query other users)
 */
router.get('/nft/tier/:address?',
  optionalAuth,
  nftController.getUserTier
);

/**
 * GET /api/blockchain/nft/list/:address?
 * Get user's NFTs
 * Requires authentication (can query other users if address provided)
 */
router.get('/nft/list/:address?',
  verifyWalletAddress,
  nftController.getUserNFTs
);

/**
 * GET /api/blockchain/nft/has/:tier/:address?
 * Check if user has specific NFT tier
 * Optional authentication (can query other users)
 */
router.get('/nft/has/:tier/:address?',
  optionalAuth,
  nftController.hasNFTTier
);

/**
 * POST /api/blockchain/nft/mint/create-transaction
 * Create mint transaction
 * Requires authentication
 */
router.post('/nft/mint/create-transaction',
  verifyWalletAddress,
  nftController.createMintTransaction
);

/**
 * POST /api/blockchain/nft/mint/validate
 * Validate minting requirements
 * Requires authentication
 */
router.post('/nft/mint/validate',
  verifyWalletAddress,
  nftController.validateMinting
);

/**
 * POST /api/blockchain/nft/mint/record
 * Record mint event
 * Requires authentication
 */
router.post('/nft/mint/record',
  verifyWalletAddress,
  nftController.recordMintEvent
);

/**
 * GET /api/blockchain/nft/pricing
 * Get NFT pricing
 * Public endpoint
 */
router.get('/nft/pricing',
  nftController.getNFTPricing
);

/**
 * GET /api/blockchain/nft/stats
 * Get mint statistics
 * Public endpoint
 */
router.get('/nft/stats',
  nftController.getMintStatistics
);

/**
 * GET /api/blockchain/nft/history/:address?
 * Get user's minting history
 * Optional authentication (can query other users)
 */
router.get('/nft/history/:address?',
  optionalAuth,
  validateCommonParams,
  nftController.getMintingHistory
);

module.exports = router;
