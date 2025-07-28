const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Transaction } = require('@mysten/sui/transactions');
const { supabaseAdmin } = require('../../config/database');
const { logger } = require('../../config/logger');

/**
 * NFT Minting Service
 * Handles NFT minting operations and tier management
 */

// Contract configuration
const CONTRACT_CONFIG = {
  PACKAGE_ID: '0x021d50304ae7402dec2cc761ec66b3dfc68c686e2898c75ea6b12244a3c07817',
  MODULE_NAME: 'MyNFTCollections',
  STRUCT_TYPE: 'DualNFT'
};

// NFT pricing (in MIST)
const NFT_PRICING = {
  PRO: {
    cost: 100_000_000, // 0.1 SUI
    costSui: 0.1,
    collection: 'PRO',
    name: 'PRO Tier NFT',
    description: 'Unlock PRO tier benefits with this soulbound NFT'
  },
  ROYAL: {
    cost: 200_000_000, // 0.2 SUI
    costSui: 0.2,
    collection: 'ROYAL',
    name: 'ROYAL Tier NFT', 
    description: 'Unlock ROYAL tier benefits with this soulbound NFT'
  }
};

class NFTService {
  constructor() {
    this.suiClient = new SuiClient({
      url: process.env.SUI_RPC_URL || getFullnodeUrl('testnet')
    });
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Cache management
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Create mint transaction for user
   */
  createMintTransaction(tier, userAddress) {
    try {
      const txb = new Transaction();
      const tierConfig = NFT_PRICING[tier];

      if (!tierConfig) {
        throw new Error(`Invalid tier: ${tier}`);
      }

      // Call mint_nft function
      txb.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::mint_nft`,
        arguments: [
          txb.pure.string(tier),
          txb.gas
        ]
      });

      txb.setSender(userAddress);
      return txb;
    } catch (error) {
      logger.error('Error creating mint transaction:', error);
      throw error;
    }
  }

  /**
   * Get user's NFT tier
   */
  async getUserTier(userAddress) {
    try {
      const cacheKey = `tier_${userAddress}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting NFT tier for ${userAddress}`);

      // Validate address format
      if (!userAddress || !userAddress.startsWith('0x')) {
        logger.warn(`Invalid address format: ${userAddress}`);
        this.setCachedData(cacheKey, 'NOMAD');
        return 'NOMAD';
      }

      try {
        // Query user's NFTs
        logger.debug(`Querying NFTs for ${userAddress} with contract ${CONTRACT_CONFIG.PACKAGE_ID}`);

        const objects = await this.suiClient.getOwnedObjects({
          owner: userAddress,
          filter: {
            StructType: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.STRUCT_TYPE}`
          },
          options: {
            showContent: true,
            showType: true
          }
        });

        logger.debug(`Found ${objects.data?.length || 0} NFTs for ${userAddress}`);

        if (!objects.data || objects.data.length === 0) {
          logger.info(`No NFTs found for ${userAddress}, returning NOMAD tier`);
          this.setCachedData(cacheKey, 'NOMAD');
          return 'NOMAD';
        }
      } catch (suiError) {
        logger.warn(`Sui client error for ${userAddress}:`, suiError.message);
        logger.debug('Sui error details:', suiError);

        // If Sui query fails, check database fallback or return default
        const fallbackTier = await this.getFallbackTier(userAddress);
        this.setCachedData(cacheKey, fallbackTier);
        return fallbackTier;
      }

      // Check for ROYAL tier first (highest tier)
      const hasRoyal = objects.data.some(obj => {
        const content = obj.data?.content;
        return content?.fields?.collection === 'ROYAL';
      });

      if (hasRoyal) {
        this.setCachedData(cacheKey, 'ROYAL');
        return 'ROYAL';
      }

      // Check for PRO tier
      const hasPro = objects.data.some(obj => {
        const content = obj.data?.content;
        return content?.fields?.collection === 'PRO';
      });

      if (hasPro) {
        this.setCachedData(cacheKey, 'PRO');
        return 'PRO';
      }

      this.setCachedData(cacheKey, 'NOMAD');
      return 'NOMAD';
    } catch (error) {
      logger.error('Error getting user tier:', error);
      return 'NOMAD';
    }
  }

  /**
   * Get fallback tier from database or return default
   */
  async getFallbackTier(userAddress) {
    try {
      // Check if user has any recorded NFT mints in database
      const { data, error } = await supabaseAdmin
        .from('nft_mint_events')
        .select('tier')
        .eq('user_address', userAddress)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        logger.info(`No NFT records found for ${userAddress}, returning NOMAD`);
        return 'NOMAD';
      }

      const tier = data[0].tier;
      logger.info(`Found fallback tier ${tier} for ${userAddress} from database`);
      return tier;
    } catch (error) {
      logger.warn('Error getting fallback tier:', error.message);
      return 'NOMAD';
    }
  }

  /**
   * Check if user has specific NFT tier
   */
  async hasNFTTier(userAddress, tier) {
    try {
      const userTier = await this.getUserTier(userAddress);
      
      if (tier === 'PRO') {
        return userTier === 'PRO' || userTier === 'ROYAL';
      }
      
      if (tier === 'ROYAL') {
        return userTier === 'ROYAL';
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking NFT tier:', error);
      return false;
    }
  }

  /**
   * Get user's NFTs
   */
  async getUserNFTs(userAddress) {
    try {
      const cacheKey = `nfts_${userAddress}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting NFTs for ${userAddress}`);

      const objects = await this.suiClient.getOwnedObjects({
        owner: userAddress,
        filter: {
          StructType: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.STRUCT_TYPE}`
        },
        options: {
          showContent: true,
          showType: true,
          showDisplay: true
        }
      });

      const nfts = (objects.data || []).map(obj => {
        const content = obj.data?.content;
        const display = obj.data?.display?.data;
        
        return {
          id: obj.data?.objectId,
          type: obj.data?.type,
          collection: content?.fields?.collection,
          name: display?.name || content?.fields?.name,
          description: display?.description || content?.fields?.description,
          image_url: display?.image_url || content?.fields?.image_url,
          owner: userAddress,
          created_at: content?.fields?.created_at
        };
      });

      this.setCachedData(cacheKey, nfts);
      return nfts;
    } catch (error) {
      logger.error('Error getting user NFTs:', error);
      return [];
    }
  }

  /**
   * Validate minting requirements
   */
  async validateMinting(userAddress, tier, userBalance) {
    try {
      const tierConfig = NFT_PRICING[tier];
      
      if (!tierConfig) {
        return { valid: false, error: `Invalid tier: ${tier}` };
      }

      // Check balance (need minting cost + gas)
      const estimatedGas = 0.01; // 0.01 SUI for gas
      const totalNeeded = tierConfig.costSui + estimatedGas;
      
      if (userBalance < totalNeeded) {
        return {
          valid: false,
          error: `Insufficient balance. Need ${totalNeeded.toFixed(3)} SUI, have ${userBalance.toFixed(4)} SUI`
        };
      }

      // Check if user already has this tier or higher
      const currentTier = await this.getUserTier(userAddress);
      
      if (tier === 'PRO' && (currentTier === 'PRO' || currentTier === 'ROYAL')) {
        return {
          valid: false,
          error: 'You already have PRO tier or higher'
        };
      }

      if (tier === 'ROYAL' && currentTier === 'ROYAL') {
        return {
          valid: false,
          error: 'You already have ROYAL tier'
        };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Error validating minting:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  /**
   * Record mint event
   */
  async recordMintEvent(userAddress, tier, transactionHash, nftId) {
    try {
      logger.info(`Recording mint event for ${userAddress}`);

      const { data, error } = await supabaseAdmin
        .from('nft_mint_events')
        .insert({
          user_address: userAddress,
          tier,
          transaction_hash: transactionHash,
          nft_id: nftId,
          status: 'completed',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error recording mint event:', error);
        throw error;
      }

      // Clear cache
      this.cache.delete(`tier_${userAddress}`);
      this.cache.delete(`nfts_${userAddress}`);

      return data;
    } catch (error) {
      logger.error('Error in recordMintEvent:', error);
      throw error;
    }
  }

  /**
   * Get mint statistics
   */
  async getMintStatistics() {
    try {
      const cacheKey = 'mint_stats';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info('Getting mint statistics');

      const { data, error } = await supabaseAdmin
        .from('nft_mint_events')
        .select('tier, status, created_at')
        .eq('status', 'completed');

      if (error) {
        // If table doesn't exist, return default stats
        if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
          logger.warn('nft_mint_events table does not exist, returning default stats');
          const defaultStats = {
            totalMints: 0,
            proMints: 0,
            royalMints: 0,
            recentMints: []
          };
          this.setCachedData(cacheKey, defaultStats);
          return defaultStats;
        }
        throw error;
      }

      const stats = {
        totalMints: data?.length || 0,
        proMints: data?.filter(m => m.tier === 'PRO').length || 0,
        royalMints: data?.filter(m => m.tier === 'ROYAL').length || 0,
        recentMints: data
          ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10) || []
      };

      this.setCachedData(cacheKey, stats);
      return stats;
    } catch (error) {
      logger.error('Error getting mint statistics:', error);
      // Return default stats instead of throwing
      return {
        totalMints: 0,
        proMints: 0,
        royalMints: 0,
        recentMints: []
      };
    }
  }

  /**
   * Get NFT pricing
   */
  getNFTPricing() {
    return NFT_PRICING;
  }
}

module.exports = new NFTService();
