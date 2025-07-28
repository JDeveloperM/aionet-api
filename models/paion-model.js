const { supabaseAdmin } = require('../config/database');
const { logger } = require('../config/logger');

/**
 * pAION Model
 * Handles pAION token-related database operations
 */

class PaionModel {
  /**
   * Get user balance
   */
  static async getBalance(userAddress) {
    try {
      const { data, error } = await supabaseAdmin
        .from('paion_balances')
        .select('*')
        .eq('user_address', userAddress)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || {
        user_address: userAddress,
        balance: 0,
        total_earned: 0,
        total_spent: 0,
        locked_amount: 0,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting pAION balance:', error);
      throw error;
    }
  }

  /**
   * Update balance using stored procedure
   */
  static async updateBalance(userAddress, amount, transactionType, description, sourceType, sourceId = null, metadata = {}) {
    try {
      const { data, error } = await supabaseAdmin.rpc('update_paion_balance', {
        user_addr: userAddress,
        amount_change: amount,
        trans_type: transactionType,
        description_text: description,
        source_type_val: sourceType,
        source_id_val: sourceId,
        metadata_val: metadata
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error updating pAION balance:', error);
      throw error;
    }
  }

  /**
   * Transfer tokens between users
   */
  static async transferTokens(fromAddress, toAddress, amount, description, metadata = {}) {
    try {
      const { data, error } = await supabaseAdmin.rpc('transfer_paion_tokens', {
        from_addr: fromAddress,
        to_addr: toAddress,
        transfer_amount: amount,
        description_text: description,
        metadata_val: metadata
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error transferring pAION tokens:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  static async getTransactionHistory(userAddress, options = {}) {
    try {
      const { limit = 50, offset = 0, transactionType, sourceType } = options;

      let query = supabaseAdmin
        .from('paion_transactions')
        .select('*')
        .eq('user_address', userAddress);

      if (transactionType) {
        query = query.eq('transaction_type', transactionType);
      }

      if (sourceType) {
        query = query.eq('source_type', sourceType);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

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

      return {
        transactions: transactions || [],
        totalCount: count || 0,
        hasMore: (offset + limit) < (count || 0)
      };
    } catch (error) {
      logger.error('Error getting transaction history:', error);
      throw error;
    }
  }

  /**
   * Get all balances for statistics
   */
  static async getAllBalances() {
    try {
      const { data, error } = await supabaseAdmin
        .from('paion_balances')
        .select('*')
        .order('balance', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error getting all balances:', error);
      throw error;
    }
  }

  /**
   * Get top holders
   */
  static async getTopHolders(limit = 50) {
    try {
      const { data, error } = await supabaseAdmin
        .from('paion_balances')
        .select('user_address, balance, total_earned, total_spent')
        .gt('balance', 0)
        .order('balance', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error getting top holders:', error);
      throw error;
    }
  }

  /**
   * Get token statistics
   */
  static async getTokenStatistics() {
    try {
      const balances = await this.getAllBalances();

      if (!balances || balances.length === 0) {
        return {
          totalSupply: 0,
          circulatingSupply: 0,
          totalHolders: 0,
          totalSpent: 0,
          averageBalance: 0
        };
      }

      const totalSupply = balances.reduce((sum, b) => sum + parseFloat(b.total_earned || 0), 0);
      const circulatingSupply = balances.reduce((sum, b) => sum + parseFloat(b.balance || 0), 0);
      const totalHolders = balances.filter(b => parseFloat(b.balance || 0) > 0).length;
      const totalSpent = balances.reduce((sum, b) => sum + parseFloat(b.total_spent || 0), 0);
      const averageBalance = totalHolders > 0 ? circulatingSupply / totalHolders : 0;

      return {
        totalSupply,
        circulatingSupply,
        totalHolders,
        totalSpent,
        averageBalance
      };
    } catch (error) {
      logger.error('Error getting token statistics:', error);
      throw error;
    }
  }

  /**
   * Lock tokens
   */
  static async lockTokens(userAddress, amount, description, unlockDate, metadata = {}) {
    try {
      const { data, error } = await supabaseAdmin.rpc('lock_paion_tokens', {
        user_addr: userAddress,
        lock_amount: amount,
        description_text: description,
        unlock_date: unlockDate,
        metadata_val: metadata
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error locking pAION tokens:', error);
      throw error;
    }
  }

  /**
   * Unlock tokens
   */
  static async unlockTokens(userAddress, amount, description, metadata = {}) {
    try {
      const { data, error } = await supabaseAdmin.rpc('unlock_paion_tokens', {
        user_addr: userAddress,
        unlock_amount: amount,
        description_text: description,
        metadata_val: metadata
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error unlocking pAION tokens:', error);
      throw error;
    }
  }

  /**
   * Get transactions by source type
   */
  static async getTransactionsBySource(sourceType, options = {}) {
    try {
      const { limit = 100, offset = 0, dateFrom, dateTo } = options;

      let query = supabaseAdmin
        .from('paion_transactions')
        .select('*')
        .eq('source_type', sourceType);

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error getting transactions by source:', error);
      throw error;
    }
  }

  /**
   * Get user's earning sources breakdown
   */
  static async getEarningSourcesBreakdown(userAddress) {
    try {
      const { data, error } = await supabaseAdmin
        .from('paion_transactions')
        .select('source_type, amount')
        .eq('user_address', userAddress)
        .eq('transaction_type', 'earned');

      if (error) {
        throw error;
      }

      const breakdown = {};
      (data || []).forEach(transaction => {
        const sourceType = transaction.source_type;
        if (!breakdown[sourceType]) {
          breakdown[sourceType] = 0;
        }
        breakdown[sourceType] += parseFloat(transaction.amount) || 0;
      });

      return breakdown;
    } catch (error) {
      logger.error('Error getting earning sources breakdown:', error);
      throw error;
    }
  }

  /**
   * Get recent transactions across all users
   */
  static async getRecentTransactions(limit = 50) {
    try {
      const { data, error } = await supabaseAdmin
        .from('paion_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error getting recent transactions:', error);
      throw error;
    }
  }

  /**
   * Get balance history for user (if tracking is implemented)
   */
  static async getBalanceHistory(userAddress, days = 30) {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const { data, error } = await supabaseAdmin
        .from('paion_transactions')
        .select('amount, transaction_type, created_at')
        .eq('user_address', userAddress)
        .gte('created_at', dateFrom.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      // Calculate running balance
      let runningBalance = 0;
      const history = [];

      (data || []).forEach(transaction => {
        const amount = parseFloat(transaction.amount) || 0;
        if (transaction.transaction_type === 'earned') {
          runningBalance += amount;
        } else if (transaction.transaction_type === 'spent') {
          runningBalance -= amount;
        }

        history.push({
          date: transaction.created_at,
          balance: runningBalance,
          change: transaction.transaction_type === 'earned' ? amount : -amount,
          type: transaction.transaction_type
        });
      });

      return history;
    } catch (error) {
      logger.error('Error getting balance history:', error);
      throw error;
    }
  }
}

module.exports = PaionModel;
