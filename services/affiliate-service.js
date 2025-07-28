const { supabaseAdmin } = require('../config/database');
const { logger } = require('../config/logger');
const { PAION } = require('../utils/constants');
const CryptoJS = require('crypto-js');

/**
 * Affiliate Subscription Service
 * Handles affiliate subscription operations, payments, and management
 */
class AffiliateService {

  /**
   * Generate encryption key from user's wallet address
   * This matches the frontend encryption method
   */
  generateEncryptionKey(address) {
    const appSecret = process.env.NEXT_PUBLIC_ENCRYPTION_SALT || 'your-app-secret-salt';
    return CryptoJS.SHA256(address + appSecret).toString();
  }

  /**
   * Decrypt encrypted field
   */
  decrypt(encryptedData, address) {
    try {
      const key = this.generateEncryptionKey(address);
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      logger.error('Decryption failed:', error);
      return '';
    }
  }
  constructor() {
    this.CACHE_TTL = {
      subscription: 5 * 60 * 1000, // 5 minutes
      pricing: 30 * 60 * 1000, // 30 minutes
      stats: 10 * 60 * 1000 // 10 minutes
    };
    this.cache = new Map();
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

  setCachedData(key, data, ttl = this.CACHE_TTL.subscription) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get subscription pricing
   */
  async getPricing() {
    try {
      const cacheKey = 'affiliate_pricing';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info('Getting affiliate subscription pricing');

      // Pricing tiers based on duration
      const pricing = {
        plans: [
          {
            duration: 30,
            name: '1 Month',
            price: 100, // pAION
            discount: 0,
            features: ['Basic affiliate tools', 'Commission tracking', 'Monthly reports']
          },
          {
            duration: 90,
            name: '3 Months',
            price: 270, // 10% discount
            discount: 10,
            features: ['Basic affiliate tools', 'Commission tracking', 'Monthly reports', 'Priority support']
          },
          {
            duration: 180,
            name: '6 Months',
            price: 480, // 20% discount
            discount: 20,
            features: ['All features', 'Advanced analytics', 'Custom referral codes', 'Priority support']
          },
          {
            duration: 365,
            name: '1 Year',
            price: 840, // 30% discount
            discount: 30,
            features: ['All features', 'Advanced analytics', 'Custom referral codes', 'Priority support', 'Dedicated account manager']
          }
        ],
        currency: 'pAION',
        updated_at: new Date().toISOString()
      };

      this.setCachedData(cacheKey, pricing, this.CACHE_TTL.pricing);
      return pricing;
    } catch (error) {
      logger.error('Error getting affiliate pricing:', error);
      throw error;
    }
  }

  /**
   * Get price quote for specific duration
   */
  async getQuote(durationDays) {
    try {
      logger.info(`Getting price quote for ${durationDays} days`);

      const pricing = await this.getPricing();
      const plan = pricing.plans.find(p => p.duration === durationDays);

      if (!plan) {
        throw new Error(`No pricing plan found for ${durationDays} days`);
      }

      return {
        duration: durationDays,
        price: plan.price,
        discount: plan.discount,
        original_price: Math.round(plan.price / (1 - plan.discount / 100)),
        currency: 'pAION',
        features: plan.features,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min expiry
      };
    } catch (error) {
      logger.error('Error getting price quote:', error);
      throw error;
    }
  }

  /**
   * Create affiliate subscription
   */
  async createSubscription(userAddress, durationDays, paymentData) {
    try {
      logger.info(`Creating affiliate subscription for ${userAddress}, duration: ${durationDays} days`);

      // Get quote to verify pricing
      const quote = await this.getQuote(durationDays);

      // Verify user has sufficient pAION balance
      const { data: balance, error: balanceError } = await supabaseAdmin
        .from('paion_balances')
        .select('balance')
        .eq('user_address', userAddress)
        .single();

      if (balanceError || !balance || balance.balance < quote.price) {
        throw new Error('Insufficient pAION balance');
      }

      // Check if user already has active subscription
      const { data: existingSubscription } = await supabaseAdmin
        .from('affiliate_subscriptions')
        .select('*')
        .eq('user_address', userAddress)
        .eq('status', 'active')
        .single();

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      // If extending existing subscription, start from current end date
      if (existingSubscription) {
        const currentEndDate = new Date(existingSubscription.end_date);
        if (currentEndDate > startDate) {
          startDate.setTime(currentEndDate.getTime());
          endDate.setTime(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        }
      }

      // Create subscription record
      const { data: subscription, error: subscriptionError } = await supabaseAdmin
        .from('affiliate_subscriptions')
        .insert({
          user_address: userAddress,
          plan_duration: durationDays,
          price_paid: quote.price,
          currency: 'pAION',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: 'active',
          features: quote.features,
          payment_data: paymentData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (subscriptionError) {
        throw subscriptionError;
      }

      // Deduct pAION from user balance
      const { error: deductError } = await supabaseAdmin
        .from('paion_balances')
        .update({
          balance: balance.balance - quote.price,
          total_spent: (balance.total_spent || 0) + quote.price,
          last_updated: new Date().toISOString()
        })
        .eq('user_address', userAddress);

      if (deductError) {
        // Rollback subscription creation
        await supabaseAdmin
          .from('affiliate_subscriptions')
          .delete()
          .eq('id', subscription.id);
        throw deductError;
      }

      // Record transaction
      await supabaseAdmin
        .from('paion_transactions')
        .insert({
          user_address: userAddress,
          type: 'spent',
          amount: quote.price,
          description: `Affiliate subscription - ${durationDays} days`,
          reference_id: subscription.id,
          reference_type: 'affiliate_subscription',
          created_at: new Date().toISOString()
        });

      // Clear cache
      this.cache.delete(`subscription_${userAddress}`);

      logger.info(`Affiliate subscription created successfully for ${userAddress}`);
      return subscription;
    } catch (error) {
      logger.error('Error creating affiliate subscription:', error);
      throw error;
    }
  }

  /**
   * Get user's subscription status
   */
  async getUserSubscription(userAddress) {
    try {
      const cacheKey = `subscription_${userAddress}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting subscription for ${userAddress}`);

      const { data: subscription, error } = await supabaseAdmin
        .from('affiliate_subscriptions')
        .select('*')
        .eq('user_address', userAddress)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const result = subscription ? {
        ...subscription,
        is_active: subscription.status === 'active' && new Date(subscription.end_date) > new Date(),
        days_remaining: subscription.status === 'active' 
          ? Math.max(0, Math.ceil((new Date(subscription.end_date) - new Date()) / (24 * 60 * 60 * 1000)))
          : 0
      } : null;

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error getting user subscription:', error);
      throw error;
    }
  }

  /**
   * Verify subscription payment
   */
  async verifyPayment(userAddress, transactionHash) {
    try {
      logger.info(`Verifying payment for ${userAddress}, tx: ${transactionHash}`);

      // This would integrate with your blockchain verification
      // For now, we'll simulate verification
      const isValid = transactionHash && transactionHash.length > 10;

      if (!isValid) {
        throw new Error('Invalid transaction hash');
      }

      return {
        verified: true,
        transaction_hash: transactionHash,
        verified_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error verifying payment:', error);
      throw error;
    }
  }

  /**
   * Get affiliate statistics
   */
  async getAffiliateStats(userAddress) {
    try {
      const cacheKey = `affiliate_stats_${userAddress}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting affiliate stats for ${userAddress}`);

      // Get referral statistics from referral_sessions table
      const { data: referrals, error: referralError } = await supabaseAdmin
        .from('referral_sessions')
        .select('*')
        .eq('referrer_address', userAddress);

      if (referralError) {
        throw referralError;
      }

      // Get commission data from affiliate_commissions table
      const { data: commissions, error: commissionError } = await supabaseAdmin
        .from('affiliate_commissions')
        .select('*')
        .eq('referrer_address', userAddress);

      if (commissionError) {
        logger.warn('Error getting commission data:', commissionError);
      }

      // Calculate total commissions
      const totalCommissions = commissions ? commissions.reduce((sum, c) => sum + (c.amount || 0), 0) : 0;

      // Get user profile data for tier information
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('role_tier, profile_level')
        .eq('address', userAddress)
        .single();

      if (profileError) {
        logger.warn('Error getting user profile:', profileError);
      }

      // Calculate monthly statistics
      const thisMonth = referrals.filter(r =>
        new Date(r.visited_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
      const monthlyCommissions = commissions ? commissions.filter(c =>
        new Date(c.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).reduce((sum, c) => sum + (c.amount || 0), 0) : 0;

      // Calculate conversion rate
      const convertedReferrals = referrals.filter(r => r.converted === true);
      const conversionRate = referrals.length > 0
        ? (convertedReferrals.length / referrals.length * 100)
        : 0;

      // Enhanced statistics matching frontend expectations
      const stats = {
        // Network metrics
        totalNetworkSize: convertedReferrals.length,
        directReferrals: convertedReferrals.length,
        indirectReferrals: 0, // TODO: Implement multi-level tracking
        networkDepth: 1,
        monthlyGrowth: thisMonth.filter(r => r.converted).length,
        networkValue: totalCommissions,

        // User breakdown (simplified for now)
        personalNomadUsers: convertedReferrals.length,
        personalProUsers: 0,
        personalRoyalUsers: 0,
        networkNomadUsers: 0,
        networkProUsers: 0,
        networkRoyalUsers: 0,

        // Profile level breakdown
        networkLevel5Users: 0,
        networkLevel6Users: 0,
        networkLevel7Users: 0,
        networkLevel8Users: 0,
        networkLevel9Users: 0,
        networkLevel10Users: 0,

        // Commission data
        totalEarned: totalCommissions,
        monthlyEarned: monthlyCommissions,
        pendingCommissions: 0, // TODO: Calculate pending commissions
        paidCommissions: totalCommissions,
        commissionRate: 0.05, // 5% default rate
        totalCommissions: totalCommissions,

        // Performance metrics
        performanceMetrics: {
          clickThroughRate: referrals.length > 0 ? (convertedReferrals.length / referrals.length * 100) : 0,
          conversionRate: conversionRate,
          averageOrderValue: convertedReferrals.length > 0 ? (totalCommissions / convertedReferrals.length) : 0
        },

        // Tier breakdown
        tierBreakdown: {
          nomadCommissions: totalCommissions,
          proCommissions: 0,
          royalCommissions: 0
        },

        // Recent transactions (empty for now)
        recentTransactions: [],

        // Affiliate users list (empty for now)
        affiliateUsers: [],
        totalCount: convertedReferrals.length,

        // User profile level
        userProfileLevel: {
          level: userProfile?.profile_level || 1,
          name: this.getProfileLevelName(userProfile?.profile_level || 1),
          requirements: {
            minReferrals: 0,
            minCommissions: 0,
            minNetworkSize: 0
          },
          benefits: ['Basic access'],
          commissionRate: 0.05,
          bonuses: {}
        }
      };

      this.setCachedData(cacheKey, stats, this.CACHE_TTL.stats);
      return stats;
    } catch (error) {
      logger.error('Error getting affiliate stats:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userAddress, reason) {
    try {
      logger.info(`Canceling subscription for ${userAddress}, reason: ${reason}`);

      const { data: subscription, error } = await supabaseAdmin
        .from('affiliate_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason
        })
        .eq('user_address', userAddress)
        .eq('status', 'active')
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Clear cache
      this.cache.delete(`subscription_${userAddress}`);

      return subscription;
    } catch (error) {
      logger.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Get user's sponsor/account manager information
   */
  async getUserSponsor(userAddress) {
    try {
      logger.info(`Getting sponsor for ${userAddress}`);

      // Find the user's referrer from affiliate_relationships
      const { data: relationships, error: relationshipError } = await supabaseAdmin
        .from('affiliate_relationships')
        .select('referrer_address, referral_code, created_at, relationship_status')
        .eq('referee_address', userAddress)
        .eq('relationship_status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      const relationship = relationships && relationships.length > 0 ? relationships[0] : null;

      if (relationshipError && relationshipError.code !== 'PGRST116') {
        logger.error('Error getting affiliate relationship:', relationshipError);
        throw relationshipError;
      }

      if (!relationship) {
        logger.info(`No active affiliate relationship found for ${userAddress}`);
        return null; // No sponsor found
      }

      logger.info(`Found affiliate relationship for ${userAddress}:`, {
        referrer: relationship.referrer_address,
        code: relationship.referral_code,
        status: relationship.relationship_status
      });

      // Get sponsor's profile information
      const { data: sponsorProfiles, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('address, username_encrypted, email_encrypted, role_tier, profile_level, kyc_status, join_date, profile_image_blob_id')
        .eq('address', relationship.referrer_address)
        .limit(1);

      const sponsorProfile = sponsorProfiles && sponsorProfiles.length > 0 ? sponsorProfiles[0] : null;

      if (profileError) {
        logger.warn('Error getting sponsor profile:', profileError);
        return null;
      }

      if (!sponsorProfile) {
        logger.warn(`No profile found for sponsor ${relationship.referrer_address}`);
        return null;
      }

      logger.info(`Found sponsor profile for ${relationship.referrer_address}:`, {
        role_tier: sponsorProfile.role_tier,
        profile_level: sponsorProfile.profile_level,
        kyc_status: sponsorProfile.kyc_status
      });

      // Handle username and email
      let username = 'Account Manager';
      let email = 'support@aionet.com';

      // Try to decrypt the actual username
      if (sponsorProfile.username_encrypted) {
        try {
          logger.info(`Attempting to decrypt username for sponsor: ${sponsorProfile.address}`);
          logger.info(`Encrypted username: ${sponsorProfile.username_encrypted}`);
          logger.info(`Using encryption salt: ${process.env.NEXT_PUBLIC_ENCRYPTION_SALT ? 'SET' : 'NOT SET'}`);

          const decryptedUsername = this.decrypt(sponsorProfile.username_encrypted, sponsorProfile.address);
          logger.info(`Decryption result: "${decryptedUsername}"`);

          if (decryptedUsername && decryptedUsername.trim()) {
            username = decryptedUsername;
            logger.info(`✅ Successfully decrypted sponsor username: ${username}`);
          } else {
            logger.warn('❌ Decrypted username is empty, using fallback');
            username = `${sponsorProfile.role_tier || 'NOMAD'} Sponsor`;
          }
        } catch (decryptError) {
          logger.warn('❌ Could not decrypt username, using fallback:', decryptError.message);
          username = `${sponsorProfile.role_tier || 'NOMAD'} Sponsor`;
        }
      } else {
        logger.info('No encrypted username available, using role-based fallback');
        username = `${sponsorProfile.role_tier || 'NOMAD'} Sponsor`;
      }

      // Set email based on role tier
      if (sponsorProfile.role_tier === 'ROYAL') {
        email = 'royal@aionet.com';
      } else if (sponsorProfile.role_tier === 'PRO') {
        email = 'pro@aionet.com';
      } else {
        email = 'support@aionet.com';
      }

      // Construct profile image URL if blob ID exists
      let profileImage = null;
      if (sponsorProfile.profile_image_blob_id) {
        const blobId = sponsorProfile.profile_image_blob_id;

        // Check if it's a default avatar path (starts with /images/animepfp/)
        if (blobId.startsWith('/images/animepfp/')) {
          profileImage = blobId; // Return the path directly for default avatars
        } else {
          // For Walrus blob IDs, we'll skip them for now since they may be expired
          // The frontend will use the fallback avatar with sponsor's initial
          logger.info(`Walrus blob ID found but skipping (may be expired): ${blobId}`);
          profileImage = null;
        }
      }

      return {
        username,
        email,
        address: sponsorProfile.address,
        status: sponsorProfile.role_tier || 'NOMAD',
        profileLevel: sponsorProfile.profile_level || 1,
        affiliateLevel: 1, // TODO: Calculate affiliate level
        kycStatus: sponsorProfile.kyc_status || 'not_verified',
        joinDate: sponsorProfile.join_date || relationship.created_at,
        relationshipDate: relationship.created_at,
        referralCode: relationship.referral_code,
        profileImage: profileImage,
        profileImageBlobId: sponsorProfile.profile_image_blob_id
      };
    } catch (error) {
      logger.error('Error getting user sponsor:', error);
      throw error;
    }
  }

  /**
   * Fix or establish affiliate relationship
   */
  async fixAffiliateRelationship(userAddress) {
    try {
      logger.info(`Fixing affiliate relationship for ${userAddress}`);

      // Check if user already has an active relationship
      const { data: existingRelationship, error: checkError } = await supabaseAdmin
        .from('affiliate_relationships')
        .select('*')
        .eq('referee_address', userAddress)
        .eq('relationship_status', 'active')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingRelationship) {
        return {
          success: true,
          message: 'Affiliate relationship already exists and is active',
          relationship: existingRelationship
        };
      }

      // Look for any referral session that led to this user
      const { data: referralSession, error: sessionError } = await supabaseAdmin
        .from('referral_sessions')
        .select('*')
        .eq('converted_user_address', userAddress)
        .eq('converted', true)
        .order('converted_at', { ascending: false })
        .limit(1)
        .single();

      if (sessionError && sessionError.code !== 'PGRST116') {
        throw sessionError;
      }

      if (!referralSession) {
        // No referral session found, assign to default admin sponsor
        const adminAddress = process.env.ADMIN_WALLET_ADDRESS;
        if (!adminAddress) {
          throw new Error('Admin wallet address not configured');
        }

        // Create relationship with admin as sponsor
        const { data: newRelationship, error: createError } = await supabaseAdmin
          .from('affiliate_relationships')
          .insert({
            referrer_address: adminAddress,
            referee_address: userAddress,
            referral_code: 'ADMIN_ASSIGNED',
            relationship_status: 'active',
            referral_source: 'admin_assignment',
            conversion_source: 'manual_fix',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        logger.info('Created admin sponsor relationship:', newRelationship);
        return {
          success: true,
          message: 'Affiliate relationship created with admin sponsor',
          relationship: newRelationship
        };
      } else {
        // Create relationship based on referral session
        const { data: newRelationship, error: createError } = await supabaseAdmin
          .from('affiliate_relationships')
          .insert({
            referrer_address: referralSession.referrer_address,
            referee_address: userAddress,
            referral_code: referralSession.referral_code,
            relationship_status: 'active',
            referral_source: referralSession.referrer_url || 'referral_link',
            conversion_source: 'session_conversion',
            referral_session_id: referralSession.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        logger.info('Created referral-based relationship:', newRelationship);
        return {
          success: true,
          message: 'Affiliate relationship created based on referral session',
          relationship: newRelationship
        };
      }
    } catch (error) {
      logger.error('Error fixing affiliate relationship:', error);
      throw error;
    }
  }

  /**
   * Get profile level name
   */
  getProfileLevelName(level) {
    const levelNames = {
      1: 'Starter',
      2: 'Explorer',
      3: 'Adventurer',
      4: 'Veteran',
      5: 'Expert',
      6: 'Master',
      7: 'Legend',
      8: 'Champion',
      9: 'Elite',
      10: 'Supreme'
    };
    return levelNames[level] || 'Starter';
  }
}

module.exports = new AffiliateService();
