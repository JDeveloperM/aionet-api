const socialVerificationService = require('../services/social-verification-service');
const { logger } = require('../config/logger');

/**
 * Social Verification Controller
 * Handles HTTP requests for social verification operations
 */
class SocialController {
  /**
   * POST /api/social/verify/twitter
   * Verify Twitter/X follow
   */
  async verifyTwitterFollow(req, res) {
    try {
      const userAddress = req.userAddress;
      const { username, target_account } = req.body;

      if (!username) {
        return res.status(400).json({
          error: 'Twitter username is required',
          code: 'MISSING_USERNAME'
        });
      }

      const verification = await socialVerificationService.verifyXFollow(
        userAddress,
        username,
        target_account || 'AIONetworkAI'
      );
      
      res.json({
        success: true,
        data: verification
      });
    } catch (error) {
      logger.error('Error verifying Twitter follow:', error);
      
      if (error.message.includes('Rate limit')) {
        return res.status(429).json({
          error: error.message,
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      res.status(500).json({
        error: error.message || 'Failed to verify Twitter follow',
        code: 'TWITTER_VERIFICATION_ERROR'
      });
    }
  }

  /**
   * POST /api/social/verify/discord
   * Verify Discord server membership
   */
  async verifyDiscordMembership(req, res) {
    try {
      const userAddress = req.userAddress;
      const { user_id, server_id } = req.body;

      if (!user_id || !server_id) {
        return res.status(400).json({
          error: 'Discord user ID and server ID are required',
          code: 'MISSING_DISCORD_INFO'
        });
      }

      const verification = await socialVerificationService.verifyDiscordMembership(
        userAddress,
        user_id,
        server_id
      );
      
      res.json({
        success: true,
        data: verification
      });
    } catch (error) {
      logger.error('Error verifying Discord membership:', error);
      
      if (error.message.includes('Rate limit')) {
        return res.status(429).json({
          error: error.message,
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      res.status(500).json({
        error: error.message || 'Failed to verify Discord membership',
        code: 'DISCORD_VERIFICATION_ERROR'
      });
    }
  }

  /**
   * POST /api/social/verify/telegram
   * Verify Telegram channel membership
   */
  async verifyTelegramMembership(req, res) {
    try {
      const userAddress = req.userAddress;
      const { user_id, channel_id } = req.body;

      if (!user_id || !channel_id) {
        return res.status(400).json({
          error: 'Telegram user ID and channel ID are required',
          code: 'MISSING_TELEGRAM_INFO'
        });
      }

      const verification = await socialVerificationService.verifyTelegramMembership(
        userAddress,
        user_id,
        channel_id
      );
      
      res.json({
        success: true,
        data: verification
      });
    } catch (error) {
      logger.error('Error verifying Telegram membership:', error);
      
      if (error.message.includes('Rate limit')) {
        return res.status(429).json({
          error: error.message,
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      res.status(500).json({
        error: error.message || 'Failed to verify Telegram membership',
        code: 'TELEGRAM_VERIFICATION_ERROR'
      });
    }
  }

  /**
   * GET /api/social/verifications
   * Get user's social verifications
   */
  async getUserVerifications(req, res) {
    try {
      const userAddress = req.userAddress;
      
      const verifications = await socialVerificationService.getUserVerifications(userAddress);
      
      res.json({
        success: true,
        data: verifications
      });
    } catch (error) {
      logger.error('Error getting user verifications:', error);
      res.status(500).json({
        error: 'Failed to get social verifications',
        code: 'VERIFICATIONS_FETCH_ERROR'
      });
    }
  }

  /**
   * POST /api/social/verify/bulk
   * Bulk verify multiple social accounts
   */
  async bulkVerify(req, res) {
    try {
      const userAddress = req.userAddress;
      const { verifications } = req.body;

      if (!verifications || !Array.isArray(verifications) || verifications.length === 0) {
        return res.status(400).json({
          error: 'Verification requests array is required',
          code: 'MISSING_VERIFICATIONS'
        });
      }

      if (verifications.length > 10) {
        return res.status(400).json({
          error: 'Maximum 10 verifications per bulk request',
          code: 'TOO_MANY_VERIFICATIONS'
        });
      }

      const results = await socialVerificationService.bulkVerify(userAddress, verifications);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Error in bulk verification:', error);
      res.status(500).json({
        error: error.message || 'Failed to perform bulk verification',
        code: 'BULK_VERIFICATION_ERROR'
      });
    }
  }

  /**
   * GET /api/social/stats
   * Get verification statistics (public endpoint)
   */
  async getVerificationStats(req, res) {
    try {
      const stats = await socialVerificationService.getVerificationStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting verification stats:', error);
      res.status(500).json({
        error: 'Failed to get verification statistics',
        code: 'STATS_ERROR'
      });
    }
  }

  /**
   * DELETE /api/social/verifications/:platform
   * Remove verification for a specific platform
   */
  async removeVerification(req, res) {
    try {
      const userAddress = req.userAddress;
      const platform = req.params.platform;

      if (!platform) {
        return res.status(400).json({
          error: 'Platform is required',
          code: 'MISSING_PLATFORM'
        });
      }

      const { error } = await supabaseAdmin
        .from('social_verifications')
        .delete()
        .eq('user_address', userAddress)
        .eq('platform', platform);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: {
          message: `Verification removed for ${platform}`,
          platform,
          user_address: userAddress
        }
      });
    } catch (error) {
      logger.error('Error removing verification:', error);
      res.status(500).json({
        error: 'Failed to remove verification',
        code: 'VERIFICATION_REMOVAL_ERROR'
      });
    }
  }

  /**
   * GET /api/social/platforms
   * Get supported platforms and their verification methods
   */
  async getSupportedPlatforms(req, res) {
    try {
      const platforms = {
        twitter: {
          name: 'Twitter/X',
          verification_methods: ['follow', 'tweet', 'profile'],
          required_fields: ['username'],
          optional_fields: ['target_account']
        },
        discord: {
          name: 'Discord',
          verification_methods: ['server_membership', 'role_verification'],
          required_fields: ['user_id', 'server_id'],
          optional_fields: ['role_id']
        },
        telegram: {
          name: 'Telegram',
          verification_methods: ['channel_membership', 'bot_interaction'],
          required_fields: ['user_id', 'channel_id'],
          optional_fields: ['bot_username']
        }
      };

      res.json({
        success: true,
        data: platforms
      });
    } catch (error) {
      logger.error('Error getting supported platforms:', error);
      res.status(500).json({
        error: 'Failed to get supported platforms',
        code: 'PLATFORMS_ERROR'
      });
    }
  }

  /**
   * POST /api/social/cleanup (Admin only)
   * Cleanup expired verifications
   */
  async cleanupExpiredVerifications(req, res) {
    try {
      const expired = await socialVerificationService.cleanupExpiredVerifications();
      
      res.json({
        success: true,
        data: {
          cleaned_count: expired.length,
          cleaned_verifications: expired
        }
      });
    } catch (error) {
      logger.error('Error cleaning up expired verifications:', error);
      res.status(500).json({
        error: 'Failed to cleanup expired verifications',
        code: 'CLEANUP_ERROR'
      });
    }
  }
}

module.exports = new SocialController();
