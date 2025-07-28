const { logger } = require('../../config/logger');
const paionTokenService = require('../../services/paion-token-service');
const { validateAmount } = require('../../middleware/validation');

/**
 * pAION Controller
 * Handles pAION token operations
 */

class PaionController {
  /**
   * Get user's pAION balance
   */
  async getBalance(req, res) {
    try {
      const userAddress = req.userAddress;
      
      logger.info(`Getting pAION balance for ${userAddress}`);
      
      const balance = await paionTokenService.getUserBalance(userAddress);
      
      res.json({
        success: true,
        data: balance
      });
    } catch (error) {
      logger.error('Error getting pAION balance:', error);
      res.status(500).json({
        error: 'Failed to get pAION balance',
        code: 'GET_BALANCE_ERROR'
      });
    }
  }

  /**
   * Get user's pAION transaction history
   */
  async getTransactionHistory(req, res) {
    try {
      const userAddress = req.userAddress;
      const { 
        transaction_type, 
        source_type, 
        limit = 50, 
        offset = 0 
      } = req.query;
      
      logger.info(`Getting pAION transactions for ${userAddress}`);
      
      const options = {
        limit: parseInt(limit),
        offset: parseInt(offset),
        transactionType: transaction_type,
        sourceType: source_type
      };
      
      const history = await paionTokenService.getTransactionHistory(userAddress, options);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Error getting pAION transactions:', error);
      res.status(500).json({
        error: 'Failed to get pAION transactions',
        code: 'GET_TRANSACTIONS_ERROR'
      });
    }
  }

  /**
   * Transfer pAION tokens between users
   */
  async transferTokens(req, res) {
    try {
      const fromAddress = req.userAddress;
      const { to_address, amount, description = 'Transfer' } = req.body;
      
      if (!to_address || !amount) {
        return res.status(400).json({
          error: 'to_address and amount are required',
          code: 'MISSING_FIELDS'
        });
      }
      
      // Validate amount
      const amountValidation = validateAmount(amount);
      if (!amountValidation.valid) {
        return res.status(400).json({
          error: amountValidation.error,
          code: 'INVALID_AMOUNT'
        });
      }
      
      logger.info(`Transferring ${amount} pAION from ${fromAddress} to ${to_address}`);
      
      const result = await paionTokenService.transferTokens(
        fromAddress,
        to_address,
        amountValidation.value,
        description
      );
      
      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: 'TRANSFER_FAILED'
        });
      }
      
      res.json({
        success: true,
        data: result.data,
        message: 'Transfer completed successfully'
      });
    } catch (error) {
      logger.error('Error transferring pAION:', error);
      res.status(500).json({
        error: 'Failed to transfer pAION',
        code: 'TRANSFER_ERROR'
      });
    }
  }

  /**
   * Add pAION tokens (admin only)
   */
  async addTokens(req, res) {
    try {
      const { user_address, amount, description, source_type = 'admin', metadata = {} } = req.body;
      
      if (!user_address || !amount || !description) {
        return res.status(400).json({
          error: 'user_address, amount, and description are required',
          code: 'MISSING_FIELDS'
        });
      }
      
      // Validate amount
      const amountValidation = validateAmount(amount);
      if (!amountValidation.valid) {
        return res.status(400).json({
          error: amountValidation.error,
          code: 'INVALID_AMOUNT'
        });
      }
      
      logger.info(`Admin adding ${amount} pAION to ${user_address}`);
      
      const result = await paionTokenService.addTokens(
        user_address,
        amountValidation.value,
        description,
        source_type,
        null,
        metadata
      );
      
      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: 'ADD_TOKENS_FAILED'
        });
      }
      
      res.json({
        success: true,
        data: result,
        message: 'Tokens added successfully'
      });
    } catch (error) {
      logger.error('Error adding pAION tokens:', error);
      res.status(500).json({
        error: 'Failed to add pAION tokens',
        code: 'ADD_TOKENS_ERROR'
      });
    }
  }

  /**
   * Spend pAION tokens (admin only)
   */
  async spendTokens(req, res) {
    try {
      const { user_address, amount, description, source_type = 'admin', metadata = {} } = req.body;
      
      if (!user_address || !amount || !description) {
        return res.status(400).json({
          error: 'user_address, amount, and description are required',
          code: 'MISSING_FIELDS'
        });
      }
      
      // Validate amount
      const amountValidation = validateAmount(amount);
      if (!amountValidation.valid) {
        return res.status(400).json({
          error: amountValidation.error,
          code: 'INVALID_AMOUNT'
        });
      }
      
      logger.info(`Admin spending ${amount} pAION from ${user_address}`);
      
      const result = await paionTokenService.spendTokens(
        user_address,
        amountValidation.value,
        description,
        source_type,
        null,
        metadata
      );
      
      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: 'SPEND_TOKENS_FAILED'
        });
      }
      
      res.json({
        success: true,
        data: result,
        message: 'Tokens spent successfully'
      });
    } catch (error) {
      logger.error('Error spending pAION tokens:', error);
      res.status(500).json({
        error: 'Failed to spend pAION tokens',
        code: 'SPEND_TOKENS_ERROR'
      });
    }
  }

  /**
   * Lock pAION tokens
   */
  async lockTokens(req, res) {
    try {
      const userAddress = req.userAddress;
      const { amount, description, unlock_date, metadata = {} } = req.body;
      
      if (!amount || !description || !unlock_date) {
        return res.status(400).json({
          error: 'amount, description, and unlock_date are required',
          code: 'MISSING_FIELDS'
        });
      }
      
      // Validate amount
      const amountValidation = validateAmount(amount);
      if (!amountValidation.valid) {
        return res.status(400).json({
          error: amountValidation.error,
          code: 'INVALID_AMOUNT'
        });
      }
      
      // Validate unlock date
      const unlockDate = new Date(unlock_date);
      if (isNaN(unlockDate.getTime()) || unlockDate <= new Date()) {
        return res.status(400).json({
          error: 'unlock_date must be a valid future date',
          code: 'INVALID_UNLOCK_DATE'
        });
      }
      
      logger.info(`Locking ${amount} pAION for ${userAddress}`);
      
      const result = await paionTokenService.lockTokens(
        userAddress,
        amountValidation.value,
        description,
        unlockDate.toISOString(),
        metadata
      );
      
      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: 'LOCK_TOKENS_FAILED'
        });
      }
      
      res.json({
        success: true,
        data: result.data,
        message: 'Tokens locked successfully'
      });
    } catch (error) {
      logger.error('Error locking pAION tokens:', error);
      res.status(500).json({
        error: 'Failed to lock pAION tokens',
        code: 'LOCK_TOKENS_ERROR'
      });
    }
  }

  /**
   * Unlock pAION tokens
   */
  async unlockTokens(req, res) {
    try {
      const userAddress = req.userAddress;
      const { amount, description, metadata = {} } = req.body;
      
      if (!amount || !description) {
        return res.status(400).json({
          error: 'amount and description are required',
          code: 'MISSING_FIELDS'
        });
      }
      
      // Validate amount
      const amountValidation = validateAmount(amount);
      if (!amountValidation.valid) {
        return res.status(400).json({
          error: amountValidation.error,
          code: 'INVALID_AMOUNT'
        });
      }
      
      logger.info(`Unlocking ${amount} pAION for ${userAddress}`);
      
      const result = await paionTokenService.unlockTokens(
        userAddress,
        amountValidation.value,
        description,
        metadata
      );
      
      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: 'UNLOCK_TOKENS_FAILED'
        });
      }
      
      res.json({
        success: true,
        data: result.data,
        message: 'Tokens unlocked successfully'
      });
    } catch (error) {
      logger.error('Error unlocking pAION tokens:', error);
      res.status(500).json({
        error: 'Failed to unlock pAION tokens',
        code: 'UNLOCK_TOKENS_ERROR'
      });
    }
  }

  /**
   * Get pAION token statistics
   */
  async getTokenStatistics(req, res) {
    try {
      logger.info('Getting pAION token statistics');
      
      const stats = await paionTokenService.getTokenStatistics();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting token statistics:', error);
      res.status(500).json({
        error: 'Failed to get token statistics',
        code: 'GET_STATS_ERROR'
      });
    }
  }

  /**
   * Get earning sources breakdown for user
   */
  async getEarningSourcesBreakdown(req, res) {
    try {
      const userAddress = req.userAddress;
      
      logger.info(`Getting earning sources breakdown for ${userAddress}`);
      
      const { data: transactions, error } = await supabaseAdmin
        .from('paion_transactions')
        .select('source_type, amount')
        .eq('user_address', userAddress)
        .eq('transaction_type', 'earned');

      if (error) {
        throw error;
      }

      const breakdown = {};
      (transactions || []).forEach(transaction => {
        const sourceType = transaction.source_type;
        if (!breakdown[sourceType]) {
          breakdown[sourceType] = 0;
        }
        breakdown[sourceType] += parseFloat(transaction.amount) || 0;
      });
      
      res.json({
        success: true,
        data: breakdown
      });
    } catch (error) {
      logger.error('Error getting earning sources breakdown:', error);
      res.status(500).json({
        error: 'Failed to get earning sources breakdown',
        code: 'GET_BREAKDOWN_ERROR'
      });
    }
  }
}

module.exports = new PaionController();
