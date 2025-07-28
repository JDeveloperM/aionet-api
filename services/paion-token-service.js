const { supabaseAdmin } = require('../config/database');
const { logger } = require('../config/logger');

/**
 * pAION Token Service
 * Handles all pAION token operations including balance management,
 * transactions, and token distribution
 */

class PaionTokenService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = {
      balance: 2 * 60 * 1000,      // 2 minutes
      transactions: 5 * 60 * 1000, // 5 minutes
      stats: 10 * 60 * 1000,       // 10 minutes
    };
  }

  /**
   * Cache management
   */
  setCachedData(key, data, ttl) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Get user's pAION balance
   */
  async getUserBalance(userAddress) {
    try {
      const cacheKey = `balance_${userAddress}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting pAION balance for ${userAddress}`);

      const { data, error } = await supabaseAdmin
        .from('paion_balances')
        .select('balance, total_earned, total_spent, locked_amount, last_updated')
        .eq('user_address', userAddress)
        .single();

      if (error) {
        // Handle missing table or no data
        if (error.code === 'PGRST116' || error.code === 'PGRST106' || error.message.includes('does not exist')) {
          logger.warn(`pAION balance not found for ${userAddress}, returning default balance`);
          const defaultBalance = {
            balance: 0,
            total_earned: 0,
            total_spent: 0,
            locked_amount: 0,
            last_updated: new Date().toISOString()
          };
          this.setCachedData(cacheKey, defaultBalance);
          return defaultBalance;
        }
        throw error;
      }

      const balance = data || {
        balance: 0,
        total_earned: 0,
        total_spent: 0,
        locked_amount: 0,
        last_updated: new Date().toISOString()
      };

      this.setCachedData(cacheKey, balance, this.CACHE_TTL.balance);
      return balance;
    } catch (error) {
      logger.error('Error getting user balance:', error);
      throw error;
    }
  }

  /**
   * Add pAION tokens to user's balance
   */
  async addTokens(userAddress, amount, description, sourceType, sourceId = null, metadata = {}) {
    try {
      logger.info(`Adding ${amount} pAION to ${userAddress}`);

      const { data, error } = await supabaseAdmin.rpc('update_paion_balance', {
        user_addr: userAddress,
        amount_change: amount,
        trans_type: 'earned',
        description_text: description,
        source_type_val: sourceType,
        source_id_val: sourceId,
        metadata_val: metadata
      });

      if (error) {
        logger.error('Error adding pAION tokens:', error);
        return { success: false, error: error.message };
      }

      // Clear cache
      this.cache.delete(`balance_${userAddress}`);

      logger.info(`Successfully added ${amount} pAION to ${userAddress}`);
      return { success: true, balance: data?.new_balance, transaction: data };
    } catch (error) {
      logger.error('Error in addTokens:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Spend pAION tokens from user's balance
   */
  async spendTokens(userAddress, amount, description, sourceType, sourceId = null, metadata = {}) {
    try {
      logger.info(`Spending ${amount} pAION from ${userAddress}`);

      // Check if user has sufficient balance
      const balance = await this.getUserBalance(userAddress);
      if (balance.balance < amount) {
        return { 
          success: false, 
          error: `Insufficient balance. Required: ${amount}, Available: ${balance.balance}` 
        };
      }

      const { data, error } = await supabaseAdmin.rpc('update_paion_balance', {
        user_addr: userAddress,
        amount_change: -amount,
        trans_type: 'spent',
        description_text: description,
        source_type_val: sourceType,
        source_id_val: sourceId,
        metadata_val: metadata
      });

      if (error) {
        logger.error('Error spending pAION tokens:', error);
        return { success: false, error: error.message };
      }

      // Clear cache
      this.cache.delete(`balance_${userAddress}`);

      logger.info(`Successfully spent ${amount} pAION from ${userAddress}`);
      return { success: true, balance: data?.new_balance, transaction: data };
    } catch (error) {
      logger.error('Error in spendTokens:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Transfer tokens between users
   */
  async transferTokens(fromAddress, toAddress, amount, description = 'Transfer', metadata = {}) {
    try {
      logger.info(`Transferring ${amount} pAION from ${fromAddress} to ${toAddress}`);

      // Check sender balance
      const senderBalance = await this.getUserBalance(fromAddress);
      if (senderBalance.balance < amount) {
        return { 
          success: false, 
          error: `Insufficient balance. Required: ${amount}, Available: ${senderBalance.balance}` 
        };
      }

      // Use transaction to ensure atomicity
      const { data, error } = await supabaseAdmin.rpc('transfer_paion_tokens', {
        from_addr: fromAddress,
        to_addr: toAddress,
        transfer_amount: amount,
        description_text: description,
        metadata_val: metadata
      });

      if (error) {
        logger.error('Error transferring pAION tokens:', error);
        return { success: false, error: error.message };
      }

      // Clear cache for both users
      this.cache.delete(`balance_${fromAddress}`);
      this.cache.delete(`balance_${toAddress}`);

      logger.info(`Successfully transferred ${amount} pAION from ${fromAddress} to ${toAddress}`);
      return { success: true, data };
    } catch (error) {
      logger.error('Error in transferTokens:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(userAddress, options = {}) {
    try {
      const { limit = 50, offset = 0, transactionType, sourceType } = options;
      const cacheKey = `transactions_${userAddress}_${JSON.stringify(options)}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting transaction history for ${userAddress}`);

      let query = supabaseAdmin
        .from('paion_transactions')
        .select('*')
        .eq('user_address', userAddress)
        .order('created_at', { ascending: false });

      if (transactionType) {
        query = query.eq('transaction_type', transactionType);
      }

      if (sourceType) {
        query = query.eq('source_type', sourceType);
      }

      query = query.range(offset, offset + limit - 1);

      const { data: transactions, error } = await query;

      if (error) {
        throw error;
      }

      // Get total count for pagination
      const { count, error: countError } = await supabaseAdmin
        .from('paion_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_address', userAddress);

      if (countError) {
        throw countError;
      }

      const result = {
        transactions: transactions || [],
        totalCount: count || 0,
        hasMore: (offset + limit) < (count || 0)
      };

      this.setCachedData(cacheKey, result, this.CACHE_TTL.transactions);
      return result;
    } catch (error) {
      logger.error('Error getting transaction history:', error);
      throw error;
    }
  }

  /**
   * Get pAION statistics
   */
  async getTokenStatistics() {
    try {
      const cacheKey = 'paion_stats';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info('Getting pAION token statistics');

      const { data: balances, error } = await supabaseAdmin
        .from('paion_balances')
        .select('balance, total_earned, total_spent');

      if (error) {
        throw error;
      }

      const stats = {
        totalSupply: balances.reduce((sum, b) => sum + parseFloat(b.total_earned || 0), 0),
        circulatingSupply: balances.reduce((sum, b) => sum + parseFloat(b.balance || 0), 0),
        totalHolders: balances.filter(b => parseFloat(b.balance || 0) > 0).length,
        totalSpent: balances.reduce((sum, b) => sum + parseFloat(b.total_spent || 0), 0),
        averageBalance: balances.length > 0 
          ? balances.reduce((sum, b) => sum + parseFloat(b.balance || 0), 0) / balances.length 
          : 0
      };

      this.setCachedData(cacheKey, stats, this.CACHE_TTL.stats);
      return stats;
    } catch (error) {
      logger.error('Error getting token statistics:', error);
      throw error;
    }
  }

  /**
   * Lock tokens (for staking, etc.)
   */
  async lockTokens(userAddress, amount, description, unlockDate, metadata = {}) {
    try {
      logger.info(`Locking ${amount} pAION for ${userAddress}`);

      const { data, error } = await supabaseAdmin.rpc('lock_paion_tokens', {
        user_addr: userAddress,
        lock_amount: amount,
        description_text: description,
        unlock_date: unlockDate,
        metadata_val: metadata
      });

      if (error) {
        logger.error('Error locking pAION tokens:', error);
        return { success: false, error: error.message };
      }

      // Clear cache
      this.cache.delete(`balance_${userAddress}`);

      logger.info(`Successfully locked ${amount} pAION for ${userAddress}`);
      return { success: true, data };
    } catch (error) {
      logger.error('Error in lockTokens:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unlock tokens
   */
  async unlockTokens(userAddress, amount, description, metadata = {}) {
    try {
      logger.info(`Unlocking ${amount} pAION for ${userAddress}`);

      const { data, error } = await supabaseAdmin.rpc('unlock_paion_tokens', {
        user_addr: userAddress,
        unlock_amount: amount,
        description_text: description,
        metadata_val: metadata
      });

      if (error) {
        logger.error('Error unlocking pAION tokens:', error);
        return { success: false, error: error.message };
      }

      // Clear cache
      this.cache.delete(`balance_${userAddress}`);

      logger.info(`Successfully unlocked ${amount} pAION for ${userAddress}`);
      return { success: true, data };
    } catch (error) {
      logger.error('Error in unlockTokens:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PaionTokenService();
