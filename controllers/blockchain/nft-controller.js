const { logger } = require('../../config/logger');
const nftService = require('../../services/blockchain/nft-service');
const suiService = require('../../services/blockchain/sui-service');
const { validateNFTTier, validateTransactionHash } = require('../../middleware/validation');

/**
 * NFT Controller
 * Handles NFT minting and management operations
 */

class NFTController {
  /**
   * Get user's NFT tier
   */
  async getUserTier(req, res) {
    try {
      const userAddress = req.params.address || req.userAddress;

      if (!userAddress) {
        return res.status(400).json({
          error: 'User address is required. Either provide address in URL or authenticate.',
          code: 'MISSING_USER_ADDRESS',
          details: [
            'Call with address: GET /api/blockchain/nft/tier/{address}',
            'Or authenticate and call: GET /api/blockchain/nft/tier'
          ]
        });
      }

      logger.info(`Getting NFT tier for ${userAddress}`);

      const tier = await nftService.getUserTier(userAddress);

      res.json({
        success: true,
        data: {
          tier,
          user_address: userAddress
        }
      });
    } catch (error) {
      logger.error('Error getting user tier:', error);
      res.status(500).json({
        error: 'Failed to get user tier',
        code: 'GET_TIER_ERROR'
      });
    }
  }

  /**
   * Get user's NFTs
   */
  async getUserNFTs(req, res) {
    try {
      const userAddress = req.params.address || req.userAddress;

      if (!userAddress) {
        return res.status(400).json({
          error: 'User address is required',
          code: 'MISSING_USER_ADDRESS'
        });
      }

      logger.info(`Getting NFTs for ${userAddress}`);

      const nfts = await nftService.getUserNFTs(userAddress);

      res.json({
        success: true,
        data: nfts,
        count: nfts.length
      });
    } catch (error) {
      logger.error('Error getting user NFTs:', error);
      res.status(500).json({
        error: 'Failed to get user NFTs',
        code: 'GET_NFTS_ERROR'
      });
    }
  }

  /**
   * Check if user has specific NFT tier
   */
  async hasNFTTier(req, res) {
    try {
      const userAddress = req.userAddress || req.params.address;
      const { tier } = req.params;

      if (!userAddress) {
        return res.status(400).json({
          error: 'User address is required',
          code: 'MISSING_USER_ADDRESS'
        });
      }

      // Validate tier
      const tierValidation = validateNFTTier(tier);
      if (!tierValidation.valid) {
        return res.status(400).json({
          error: tierValidation.error,
          code: 'INVALID_TIER'
        });
      }

      logger.info(`Checking if ${userAddress} has ${tier} tier`);

      const hasNFT = await nftService.hasNFTTier(userAddress, tierValidation.value);

      res.json({
        success: true,
        data: {
          user_address: userAddress,
          tier: tierValidation.value,
          has_nft: hasNFT
        }
      });
    } catch (error) {
      logger.error('Error checking NFT tier:', error);
      res.status(500).json({
        error: 'Failed to check NFT tier',
        code: 'CHECK_TIER_ERROR'
      });
    }
  }

  /**
   * Create mint transaction
   */
  async createMintTransaction(req, res) {
    try {
      const userAddress = req.userAddress;
      const { tier } = req.body;

      if (!tier) {
        return res.status(400).json({
          error: 'Tier is required',
          code: 'MISSING_TIER'
        });
      }

      // Validate tier
      const tierValidation = validateNFTTier(tier);
      if (!tierValidation.valid) {
        return res.status(400).json({
          error: tierValidation.error,
          code: 'INVALID_TIER'
        });
      }

      logger.info(`Creating mint transaction for ${userAddress}, tier: ${tier}`);

      // Get user's SUI balance
      const userBalance = await suiService.getUserBalance(userAddress);

      // Validate minting requirements
      const validation = await nftService.validateMinting(userAddress, tierValidation.value, userBalance);
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error,
          code: 'MINTING_VALIDATION_FAILED'
        });
      }

      // Create mint transaction
      const transaction = nftService.createMintTransaction(tierValidation.value, userAddress);

      // Serialize transaction for client
      const transactionBytes = await transaction.build({
        client: suiService.getClient()
      });

      res.json({
        success: true,
        data: {
          transaction: Array.from(transactionBytes),
          tier: tierValidation.value,
          user_address: userAddress,
          estimated_cost: nftService.getNFTPricing()[tierValidation.value].costSui
        }
      });
    } catch (error) {
      logger.error('Error creating mint transaction:', error);
      res.status(500).json({
        error: 'Failed to create mint transaction',
        code: 'CREATE_MINT_TX_ERROR'
      });
    }
  }

  /**
   * Validate minting requirements
   */
  async validateMinting(req, res) {
    try {
      const userAddress = req.userAddress;
      const { tier } = req.body;

      if (!tier) {
        return res.status(400).json({
          error: 'Tier is required',
          code: 'MISSING_TIER'
        });
      }

      // Validate tier
      const tierValidation = validateNFTTier(tier);
      if (!tierValidation.valid) {
        return res.status(400).json({
          error: tierValidation.error,
          code: 'INVALID_TIER'
        });
      }

      logger.info(`Validating minting for ${userAddress}, tier: ${tier}`);

      // Get user's SUI balance
      const userBalance = await suiService.getUserBalance(userAddress);

      // Validate minting requirements
      const validation = await nftService.validateMinting(userAddress, tierValidation.value, userBalance);

      res.json({
        success: true,
        data: {
          valid: validation.valid,
          error: validation.error,
          user_address: userAddress,
          tier: tierValidation.value,
          user_balance: userBalance,
          required_balance: nftService.getNFTPricing()[tierValidation.value].costSui + 0.01 // + gas
        }
      });
    } catch (error) {
      logger.error('Error validating minting:', error);
      res.status(500).json({
        error: 'Failed to validate minting',
        code: 'VALIDATE_MINTING_ERROR'
      });
    }
  }

  /**
   * Record mint event
   */
  async recordMintEvent(req, res) {
    try {
      const userAddress = req.userAddress;
      const { tier, transaction_hash, nft_id } = req.body;

      if (!tier || !transaction_hash) {
        return res.status(400).json({
          error: 'Tier and transaction hash are required',
          code: 'MISSING_FIELDS'
        });
      }

      // Validate tier
      const tierValidation = validateNFTTier(tier);
      if (!tierValidation.valid) {
        return res.status(400).json({
          error: tierValidation.error,
          code: 'INVALID_TIER'
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

      logger.info(`Recording mint event for ${userAddress}`);

      // Verify transaction on blockchain
      const verification = await suiService.verifyTransaction(
        transaction_hash,
        userAddress,
        nftService.getNFTPricing()[tierValidation.value].costSui
      );

      if (!verification.valid) {
        return res.status(400).json({
          error: `Transaction verification failed: ${verification.error}`,
          code: 'TRANSACTION_VERIFICATION_FAILED'
        });
      }

      // Record mint event
      const mintEvent = await nftService.recordMintEvent(
        userAddress,
        tierValidation.value,
        transaction_hash,
        nft_id
      );

      res.status(201).json({
        success: true,
        data: mintEvent,
        message: 'Mint event recorded successfully'
      });
    } catch (error) {
      logger.error('Error recording mint event:', error);
      res.status(500).json({
        error: 'Failed to record mint event',
        code: 'RECORD_MINT_EVENT_ERROR'
      });
    }
  }

  /**
   * Get NFT pricing
   */
  async getNFTPricing(req, res) {
    try {
      logger.info('Getting NFT pricing');

      const pricing = nftService.getNFTPricing();

      res.json({
        success: true,
        data: pricing
      });
    } catch (error) {
      logger.error('Error getting NFT pricing:', error);
      res.status(500).json({
        error: 'Failed to get NFT pricing',
        code: 'GET_PRICING_ERROR'
      });
    }
  }

  /**
   * Get mint statistics
   */
  async getMintStatistics(req, res) {
    try {
      logger.info('Getting mint statistics');

      const stats = await nftService.getMintStatistics();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting mint statistics:', error);
      res.status(500).json({
        error: 'Failed to get mint statistics',
        code: 'GET_MINT_STATS_ERROR'
      });
    }
  }

  /**
   * Get user's minting history
   */
  async getMintingHistory(req, res) {
    try {
      const userAddress = req.userAddress || req.params.address;
      const { limit = 50, offset = 0 } = req.query;

      if (!userAddress) {
        return res.status(400).json({
          error: 'User address is required',
          code: 'MISSING_USER_ADDRESS'
        });
      }

      logger.info(`Getting minting history for ${userAddress}`);

      const { data: history, error } = await supabaseAdmin
        .from('nft_mint_events')
        .select('*')
        .eq('user_address', userAddress)
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: history || [],
        count: history?.length || 0
      });
    } catch (error) {
      logger.error('Error getting minting history:', error);
      res.status(500).json({
        error: 'Failed to get minting history',
        code: 'GET_MINTING_HISTORY_ERROR'
      });
    }
  }
}

module.exports = new NFTController();
