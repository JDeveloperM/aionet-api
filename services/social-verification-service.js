const { supabaseAdmin } = require('../config/database');
const { logger } = require('../config/logger');
const axios = require('axios');

/**
 * Social Verification Service
 * Handles social media verification and third-party integrations
 */
class SocialVerificationService {
  constructor() {
    this.CACHE_TTL = {
      verification: 60 * 60 * 1000, // 1 hour
      followers: 30 * 60 * 1000, // 30 minutes
      profile: 24 * 60 * 60 * 1000 // 24 hours
    };
    this.cache = new Map();

    // Rate limiting for external APIs
    this.rateLimits = new Map();
    this.RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
    this.MAX_REQUESTS_PER_WINDOW = 100;

    // Social platform configurations
    this.PLATFORMS = {
      twitter: {
        name: 'Twitter/X',
        api_base: 'https://api.twitter.com/2',
        verification_methods: ['follow', 'tweet', 'profile']
      },
      discord: {
        name: 'Discord',
        api_base: 'https://discord.com/api/v10',
        verification_methods: ['server_join', 'role_verification']
      },
      telegram: {
        name: 'Telegram',
        api_base: 'https://api.telegram.org',
        verification_methods: ['channel_join', 'bot_interaction']
      }
    };
  }

  /**
   * Cache management
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data, ttl = this.CACHE_TTL.verification) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(key) {
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW;
    
    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, []);
    }
    
    const requests = this.rateLimits.get(key);
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= this.MAX_REQUESTS_PER_WINDOW) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    recentRequests.push(now);
    this.rateLimits.set(key, recentRequests);
  }

  /**
   * Verify Twitter/X follow
   */
  async verifyXFollow(userAddress, twitterUsername, targetAccount = 'AIONetworkAI') {
    try {
      const cacheKey = `x_follow_${userAddress}_${twitterUsername}_${targetAccount}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Verifying X follow: ${twitterUsername} -> ${targetAccount}`);

      // Check rate limit
      this.checkRateLimit(`x_api_${userAddress}`);

      // For now, we'll simulate the verification since Twitter API requires special access
      // In production, you would use Twitter API v2 with proper authentication
      const isFollowing = await this.simulateXFollowCheck(twitterUsername, targetAccount);

      const verification = {
        platform: 'twitter',
        user_address: userAddress,
        username: twitterUsername,
        target_account: targetAccount,
        verification_type: 'follow',
        verified: isFollowing,
        verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };

      if (isFollowing) {
        // Store verification in database
        await this.storeVerification(verification);
      }

      this.setCachedData(cacheKey, verification);
      return verification;
    } catch (error) {
      logger.error('Error verifying X follow:', error);
      throw error;
    }
  }

  /**
   * Simulate X follow check (replace with real API in production)
   */
  async simulateXFollowCheck(username, targetAccount) {
    // This is a simulation - in production you would:
    // 1. Use Twitter API v2 to check if username follows targetAccount
    // 2. Handle authentication with Bearer token
    // 3. Parse the response to determine follow status
    
    // For demo purposes, we'll return true for valid usernames
    return username && username.length > 3 && !username.includes('fake');
  }

  /**
   * Verify Discord server membership
   */
  async verifyDiscordMembership(userAddress, discordUserId, serverId) {
    try {
      const cacheKey = `discord_member_${userAddress}_${discordUserId}_${serverId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Verifying Discord membership: ${discordUserId} in ${serverId}`);

      // Check rate limit
      this.checkRateLimit(`discord_api_${userAddress}`);

      // Simulate Discord API check
      const isMember = await this.simulateDiscordMemberCheck(discordUserId, serverId);

      const verification = {
        platform: 'discord',
        user_address: userAddress,
        user_id: discordUserId,
        server_id: serverId,
        verification_type: 'server_membership',
        verified: isMember,
        verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours
      };

      if (isMember) {
        await this.storeVerification(verification);
      }

      this.setCachedData(cacheKey, verification);
      return verification;
    } catch (error) {
      logger.error('Error verifying Discord membership:', error);
      throw error;
    }
  }

  /**
   * Simulate Discord member check
   */
  async simulateDiscordMemberCheck(userId, serverId) {
    // In production, use Discord API:
    // GET /guilds/{guild.id}/members/{user.id}
    return userId && serverId && userId.length > 10;
  }

  /**
   * Verify Telegram channel membership
   */
  async verifyTelegramMembership(userAddress, telegramUserId, channelId) {
    try {
      const cacheKey = `telegram_member_${userAddress}_${telegramUserId}_${channelId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Verifying Telegram membership: ${telegramUserId} in ${channelId}`);

      // Check rate limit
      this.checkRateLimit(`telegram_api_${userAddress}`);

      // Simulate Telegram API check
      const isMember = await this.simulateTelegramMemberCheck(telegramUserId, channelId);

      const verification = {
        platform: 'telegram',
        user_address: userAddress,
        user_id: telegramUserId,
        channel_id: channelId,
        verification_type: 'channel_membership',
        verified: isMember,
        verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours
      };

      if (isMember) {
        await this.storeVerification(verification);
      }

      this.setCachedData(cacheKey, verification);
      return verification;
    } catch (error) {
      logger.error('Error verifying Telegram membership:', error);
      throw error;
    }
  }

  /**
   * Simulate Telegram member check
   */
  async simulateTelegramMemberCheck(userId, channelId) {
    // In production, use Telegram Bot API:
    // getChatMember method
    return userId && channelId && userId.length > 5;
  }

  /**
   * Store verification result in database
   */
  async storeVerification(verification) {
    try {
      const { error } = await supabaseAdmin
        .from('social_verifications')
        .upsert({
          user_address: verification.user_address,
          platform: verification.platform,
          verification_type: verification.verification_type,
          verification_data: verification,
          verified: verification.verified,
          verified_at: verification.verified_at,
          expires_at: verification.expires_at,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_address,platform,verification_type'
        });

      if (error) {
        throw error;
      }

      logger.info(`Verification stored for ${verification.user_address} on ${verification.platform}`);
    } catch (error) {
      logger.error('Error storing verification:', error);
      throw error;
    }
  }

  /**
   * Get user's social verifications
   */
  async getUserVerifications(userAddress) {
    try {
      const cacheKey = `user_verifications_${userAddress}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting verifications for ${userAddress}`);

      const { data: verifications, error } = await supabaseAdmin
        .from('social_verifications')
        .select('*')
        .eq('user_address', userAddress)
        .eq('verified', true)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        throw error;
      }

      // Group by platform
      const groupedVerifications = verifications.reduce((acc, verification) => {
        if (!acc[verification.platform]) {
          acc[verification.platform] = [];
        }
        acc[verification.platform].push(verification);
        return acc;
      }, {});

      const result = {
        user_address: userAddress,
        verifications: groupedVerifications,
        total_verifications: verifications.length,
        platforms_verified: Object.keys(groupedVerifications),
        last_updated: new Date().toISOString()
      };

      this.setCachedData(cacheKey, result, this.CACHE_TTL.profile);
      return result;
    } catch (error) {
      logger.error('Error getting user verifications:', error);
      throw error;
    }
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats() {
    try {
      const cacheKey = 'verification_stats';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info('Getting verification statistics');

      const { data: verifications, error } = await supabaseAdmin
        .from('social_verifications')
        .select('platform, verification_type, verified, created_at');

      if (error) {
        throw error;
      }

      const stats = {
        total_verifications: verifications.length,
        successful_verifications: verifications.filter(v => v.verified).length,
        by_platform: verifications.reduce((acc, v) => {
          acc[v.platform] = (acc[v.platform] || 0) + 1;
          return acc;
        }, {}),
        by_type: verifications.reduce((acc, v) => {
          acc[v.verification_type] = (acc[v.verification_type] || 0) + 1;
          return acc;
        }, {}),
        success_rate: verifications.length > 0 
          ? (verifications.filter(v => v.verified).length / verifications.length * 100).toFixed(2)
          : 0,
        this_month: verifications.filter(v => 
          new Date(v.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length
      };

      this.setCachedData(cacheKey, stats, this.CACHE_TTL.verification);
      return stats;
    } catch (error) {
      logger.error('Error getting verification stats:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired verifications
   */
  async cleanupExpiredVerifications() {
    try {
      logger.info('Cleaning up expired verifications');

      const { data: expired, error } = await supabaseAdmin
        .from('social_verifications')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) {
        throw error;
      }

      // Clear relevant caches
      this.cache.clear();

      logger.info(`Cleaned up ${expired.length} expired verifications`);
      return expired;
    } catch (error) {
      logger.error('Error cleaning up expired verifications:', error);
      throw error;
    }
  }

  /**
   * Bulk verify multiple social accounts
   */
  async bulkVerify(userAddress, verificationRequests) {
    try {
      logger.info(`Bulk verification for ${userAddress}: ${verificationRequests.length} requests`);

      const results = [];

      for (const request of verificationRequests) {
        try {
          let result;
          
          switch (request.platform) {
            case 'twitter':
              result = await this.verifyXFollow(userAddress, request.username, request.target);
              break;
            case 'discord':
              result = await this.verifyDiscordMembership(userAddress, request.user_id, request.server_id);
              break;
            case 'telegram':
              result = await this.verifyTelegramMembership(userAddress, request.user_id, request.channel_id);
              break;
            default:
              throw new Error(`Unsupported platform: ${request.platform}`);
          }

          results.push({
            platform: request.platform,
            success: true,
            result
          });
        } catch (error) {
          results.push({
            platform: request.platform,
            success: false,
            error: error.message
          });
        }

        // Add delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return {
        user_address: userAddress,
        total_requests: verificationRequests.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      logger.error('Error in bulk verification:', error);
      throw error;
    }
  }
}

module.exports = new SocialVerificationService();
