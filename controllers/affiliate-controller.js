const affiliateService = require('../services/affiliate-service');
const { logger } = require('../config/logger');

/**
 * Affiliate Subscription Controller
 * Handles HTTP requests for affiliate operations
 */
class AffiliateController {
  /**
   * GET /api/affiliate/pricing
   * Get subscription pricing
   */
  async getPricing(req, res) {
    try {
      const pricing = await affiliateService.getPricing();
      
      res.json({
        success: true,
        data: pricing
      });
    } catch (error) {
      logger.error('Error getting affiliate pricing:', error);
      res.status(500).json({
        error: 'Failed to get pricing',
        code: 'PRICING_ERROR'
      });
    }
  }

  /**
   * POST /api/affiliate/quote
   * Get price quote for specific duration
   */
  async getQuote(req, res) {
    try {
      const { duration } = req.body;

      if (!duration || duration < 1) {
        return res.status(400).json({
          error: 'Valid duration in days is required',
          code: 'INVALID_DURATION'
        });
      }

      const quote = await affiliateService.getQuote(duration);
      
      res.json({
        success: true,
        data: quote
      });
    } catch (error) {
      logger.error('Error getting quote:', error);
      res.status(500).json({
        error: error.message || 'Failed to get quote',
        code: 'QUOTE_ERROR'
      });
    }
  }

  /**
   * POST /api/affiliate/subscribe
   * Create new subscription
   */
  async createSubscription(req, res) {
    try {
      const userAddress = req.userAddress;
      const { duration, payment_data } = req.body;

      if (!duration || !payment_data) {
        return res.status(400).json({
          error: 'Duration and payment data are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      const subscription = await affiliateService.createSubscription(
        userAddress,
        duration,
        payment_data
      );
      
      res.status(201).json({
        success: true,
        data: subscription
      });
    } catch (error) {
      logger.error('Error creating subscription:', error);
      
      if (error.message.includes('Insufficient')) {
        return res.status(400).json({
          error: error.message,
          code: 'INSUFFICIENT_BALANCE'
        });
      }

      res.status(500).json({
        error: error.message || 'Failed to create subscription',
        code: 'SUBSCRIPTION_ERROR'
      });
    }
  }

  /**
   * GET /api/affiliate/subscription
   * Get user's subscription status
   */
  async getSubscription(req, res) {
    try {
      const userAddress = req.userAddress;
      
      const subscription = await affiliateService.getUserSubscription(userAddress);
      
      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      logger.error('Error getting subscription:', error);
      res.status(500).json({
        error: 'Failed to get subscription',
        code: 'SUBSCRIPTION_FETCH_ERROR'
      });
    }
  }

  /**
   * POST /api/affiliate/verify-payment
   * Verify subscription payment
   */
  async verifyPayment(req, res) {
    try {
      const userAddress = req.userAddress;
      const { transaction_hash } = req.body;

      if (!transaction_hash) {
        return res.status(400).json({
          error: 'Transaction hash is required',
          code: 'MISSING_TRANSACTION_HASH'
        });
      }

      const verification = await affiliateService.verifyPayment(userAddress, transaction_hash);
      
      res.json({
        success: true,
        data: verification
      });
    } catch (error) {
      logger.error('Error verifying payment:', error);
      res.status(500).json({
        error: error.message || 'Failed to verify payment',
        code: 'PAYMENT_VERIFICATION_ERROR'
      });
    }
  }

  /**
   * GET /api/affiliate/stats
   * Get affiliate statistics
   */
  async getStats(req, res) {
    try {
      const userAddress = req.userAddress;
      
      const stats = await affiliateService.getAffiliateStats(userAddress);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting affiliate stats:', error);
      res.status(500).json({
        error: 'Failed to get affiliate statistics',
        code: 'STATS_ERROR'
      });
    }
  }

  /**
   * POST /api/affiliate/cancel
   * Cancel subscription
   */
  async cancelSubscription(req, res) {
    try {
      const userAddress = req.userAddress;
      const { reason } = req.body;

      const subscription = await affiliateService.cancelSubscription(userAddress, reason);

      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      logger.error('Error canceling subscription:', error);
      res.status(500).json({
        error: error.message || 'Failed to cancel subscription',
        code: 'CANCELLATION_ERROR'
      });
    }
  }

  /**
   * GET /api/affiliate/sponsor
   * Get user's sponsor/account manager information
   */
  async getSponsor(req, res) {
    try {
      const userAddress = req.userAddress;
      logger.info(`Getting sponsor for user: ${userAddress}`);

      const sponsor = await affiliateService.getUserSponsor(userAddress);
      logger.info(`Sponsor result for ${userAddress}:`, sponsor);

      res.json({
        success: true,
        data: sponsor
      });
    } catch (error) {
      logger.error('Error getting sponsor:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sponsor information',
        code: 'SPONSOR_ERROR'
      });
    }
  }

  /**
   * POST /api/affiliate/fix-relationship
   * Fix or establish affiliate relationship
   */
  async fixRelationship(req, res) {
    try {
      const userAddress = req.userAddress;
      logger.info(`Fixing relationship for user: ${userAddress}`);

      const result = await affiliateService.fixAffiliateRelationship(userAddress);
      logger.info(`Fix relationship result:`, result);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error fixing affiliate relationship:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fix affiliate relationship',
        code: 'FIX_RELATIONSHIP_ERROR'
      });
    }
  }
}

module.exports = new AffiliateController();
