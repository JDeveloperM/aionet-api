const express = require('express');
const router = express.Router();
const { verifyWalletAddress, verifyAdmin } = require('../middleware/auth');
const socialController = require('../controllers/social-controller');

/**
 * Social Verification Routes
 * Mix of public and authenticated endpoints
 */

/**
 * POST /api/social/verify/twitter
 * Verify Twitter/X follow (authenticated)
 */
router.post('/verify/twitter', verifyWalletAddress, socialController.verifyTwitterFollow);

/**
 * POST /api/social/verify/discord
 * Verify Discord server membership (authenticated)
 */
router.post('/verify/discord', verifyWalletAddress, socialController.verifyDiscordMembership);

/**
 * POST /api/social/verify/telegram
 * Verify Telegram channel membership (authenticated)
 */
router.post('/verify/telegram', verifyWalletAddress, socialController.verifyTelegramMembership);

/**
 * GET /api/social/verifications
 * Get user's social verifications (authenticated)
 */
router.get('/verifications', verifyWalletAddress, socialController.getUserVerifications);

/**
 * POST /api/social/verify/bulk
 * Bulk verify multiple social accounts (authenticated)
 */
router.post('/verify/bulk', verifyWalletAddress, socialController.bulkVerify);

/**
 * GET /api/social/stats
 * Get verification statistics (public)
 */
router.get('/stats', socialController.getVerificationStats);

/**
 * DELETE /api/social/verifications/:platform
 * Remove verification for a specific platform (authenticated)
 */
router.delete('/verifications/:platform', verifyWalletAddress, socialController.removeVerification);

/**
 * GET /api/social/platforms
 * Get supported platforms and their verification methods (public)
 */
router.get('/platforms', socialController.getSupportedPlatforms);

/**
 * POST /api/social/cleanup
 * Cleanup expired verifications (admin only)
 */
router.post('/cleanup', verifyAdmin, socialController.cleanupExpiredVerifications);

module.exports = router;
