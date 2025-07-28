const express = require('express');
const router = express.Router();

const tradingController = require('../controllers/trading/trading-controller');
const { verifyWalletAddress, optionalAuth, createUserRateLimit } = require('../middleware/auth');
const { validateCommonParams } = require('../middleware/validation');

/**
 * Trading Routes
 * Handle trading-related operations
 */

// Apply rate limiting
router.use(createUserRateLimit(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

/**
 * GET /api/trading/activities
 * Get user's trading activities
 * Requires authentication
 */
router.get('/activities', 
  verifyWalletAddress,
  validateCommonParams,
  tradingController.getTradingActivities
);

/**
 * POST /api/trading/activities
 * Record new trading activity
 * Requires authentication
 */
router.post('/activities',
  verifyWalletAddress,
  tradingController.recordTradingActivity
);

/**
 * GET /api/trading/stats
 * Get user's trading statistics
 * Optional authentication (can query other users with user_address param)
 */
router.get('/stats',
  optionalAuth,
  tradingController.getTradingStats
);

/**
 * POST /api/trading/stats/refresh
 * Refresh user's trading statistics
 * Requires authentication
 */
router.post('/stats/refresh',
  verifyWalletAddress,
  tradingController.refreshTradingStats
);

/**
 * GET /api/trading/leaderboard
 * Get trading leaderboard
 * Public endpoint
 */
router.get('/leaderboard',
  validateCommonParams,
  tradingController.getTradingLeaderboard
);

/**
 * GET /api/trading/analytics
 * Get trading analytics for user
 * Requires authentication
 */
router.get('/analytics',
  verifyWalletAddress,
  tradingController.getTradingAnalytics
);

/**
 * GET /api/trading/summary
 * Get trading summary for dashboard
 * Requires authentication
 */
router.get('/summary',
  verifyWalletAddress,
  tradingController.getTradingSummary
);

/**
 * GET /api/trading/performance
 * Get trading performance metrics
 * Requires authentication
 */
router.get('/performance',
  verifyWalletAddress,
  tradingController.getPerformanceMetrics
);

module.exports = router;
