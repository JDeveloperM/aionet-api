const express = require('express');
const router = express.Router();
const { verifyWalletAddress } = require('../middleware/auth');
const affiliateController = require('../controllers/affiliate-controller');

/**
 * Affiliate Subscription Routes
 * All routes require authentication
 */

/**
 * GET /api/affiliate/pricing
 * Get subscription pricing (public)
 */
router.get('/pricing', affiliateController.getPricing);

/**
 * POST /api/affiliate/quote
 * Get price quote for specific duration (public)
 */
router.post('/quote', affiliateController.getQuote);

/**
 * POST /api/affiliate/subscribe
 * Create new subscription (authenticated)
 */
router.post('/subscribe', verifyWalletAddress, affiliateController.createSubscription);

/**
 * GET /api/affiliate/subscription
 * Get user's subscription status (authenticated)
 */
router.get('/subscription', verifyWalletAddress, affiliateController.getSubscription);

/**
 * POST /api/affiliate/verify-payment
 * Verify subscription payment (authenticated)
 */
router.post('/verify-payment', verifyWalletAddress, affiliateController.verifyPayment);

/**
 * GET /api/affiliate/stats
 * Get affiliate statistics (authenticated)
 */
router.get('/stats', verifyWalletAddress, affiliateController.getStats);

/**
 * POST /api/affiliate/cancel
 * Cancel subscription (authenticated)
 */
router.post('/cancel', verifyWalletAddress, affiliateController.cancelSubscription);

/**
 * GET /api/affiliate/sponsor
 * Get user's sponsor/account manager information (authenticated)
 */
router.get('/sponsor', verifyWalletAddress, affiliateController.getSponsor);

/**
 * POST /api/affiliate/fix-relationship
 * Fix or establish affiliate relationship (authenticated)
 */
router.post('/fix-relationship', verifyWalletAddress, affiliateController.fixRelationship);

module.exports = router;
