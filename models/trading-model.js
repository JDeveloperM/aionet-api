const { supabaseAdmin } = require('../config/database');
const { logger } = require('../config/logger');

/**
 * Trading Model
 * Handles trading-related database operations
 */

class TradingModel {
  /**
   * Create trading activity
   */
  static async createActivity(activityData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('trading_activities')
        .insert(activityData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error creating trading activity:', error);
      throw error;
    }
  }

  /**
   * Get trading activities by user
   */
  static async getActivitiesByUser(userAddress, options = {}) {
    try {
      const {
        symbol,
        tradeType,
        platform,
        status,
        dateFrom,
        dateTo,
        limit = 50,
        offset = 0
      } = options;

      let query = supabaseAdmin
        .from('trading_activities')
        .select('*')
        .eq('user_address', userAddress);

      // Apply filters
      if (symbol) {
        query = query.eq('symbol', symbol);
      }
      if (tradeType) {
        query = query.eq('trade_type', tradeType);
      }
      if (platform) {
        query = query.eq('platform', platform);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (dateFrom) {
        query = query.gte('trade_opened_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('trade_opened_at', dateTo);
      }

      query = query
        .order('trade_opened_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error getting trading activities:', error);
      throw error;
    }
  }

  /**
   * Get trading statistics by user
   */
  static async getStatsByUser(userAddress) {
    try {
      const { data, error } = await supabaseAdmin
        .from('trading_stats')
        .select('*')
        .eq('user_address', userAddress)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error getting trading stats:', error);
      throw error;
    }
  }

  /**
   * Upsert trading statistics
   */
  static async upsertStats(statsData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('trading_stats')
        .upsert(statsData, {
          onConflict: 'user_address'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error upserting trading stats:', error);
      throw error;
    }
  }

  /**
   * Get trading leaderboard
   */
  static async getLeaderboard(options = {}) {
    try {
      const { limit = 50, sortBy = 'total_profit_loss', timeframe = 'all' } = options;

      let query = supabaseAdmin
        .from('trading_stats')
        .select('*');

      // Apply timeframe filter if needed
      if (timeframe !== 'all') {
        const now = new Date();
        let dateFilter;
        
        switch (timeframe) {
          case 'week':
            dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        }
        
        if (dateFilter) {
          query = query.gte('last_trade_at', dateFilter.toISOString());
        }
      }

      // Sort and limit
      const ascending = sortBy === 'worst_trade';
      query = query
        .order(sortBy, { ascending })
        .limit(limit);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error getting trading leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get all trading activities for analytics
   */
  static async getAllActivities(options = {}) {
    try {
      const { dateFrom, dateTo, limit = 1000 } = options;

      let query = supabaseAdmin
        .from('trading_activities')
        .select('*');

      if (dateFrom) {
        query = query.gte('trade_opened_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('trade_opened_at', dateTo);
      }

      query = query
        .order('trade_opened_at', { ascending: false })
        .limit(limit);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error getting all trading activities:', error);
      throw error;
    }
  }

  /**
   * Update trading activity
   */
  static async updateActivity(activityId, updateData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('trading_activities')
        .update(updateData)
        .eq('id', activityId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error updating trading activity:', error);
      throw error;
    }
  }

  /**
   * Delete trading activity
   */
  static async deleteActivity(activityId, userAddress) {
    try {
      const { error } = await supabaseAdmin
        .from('trading_activities')
        .delete()
        .eq('id', activityId)
        .eq('user_address', userAddress);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      logger.error('Error deleting trading activity:', error);
      throw error;
    }
  }

  /**
   * Get trading summary for period
   */
  static async getSummaryForPeriod(userAddress, days = 30) {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const { data, error } = await supabaseAdmin
        .from('trading_activities')
        .select('*')
        .eq('user_address', userAddress)
        .gte('trade_opened_at', dateFrom.toISOString());

      if (error) {
        throw error;
      }

      const activities = data || [];
      const totalTrades = activities.length;
      const totalVolume = activities.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
      const totalProfitLoss = activities.reduce((sum, a) => sum + (parseFloat(a.profit_loss) || 0), 0);
      const profitableTrades = activities.filter(a => (parseFloat(a.profit_loss) || 0) > 0).length;

      return {
        totalTrades,
        totalVolume,
        totalProfitLoss,
        profitableTrades,
        winRate: totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0,
        averageTradeSize: totalTrades > 0 ? totalVolume / totalTrades : 0,
        period: `${days} days`
      };
    } catch (error) {
      logger.error('Error getting trading summary:', error);
      throw error;
    }
  }

  /**
   * Get top performers
   */
  static async getTopPerformers(metric = 'total_profit_loss', limit = 10) {
    try {
      const { data, error } = await supabaseAdmin
        .from('trading_stats')
        .select('user_address, total_profit_loss, total_volume, win_rate, total_trades')
        .order(metric, { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error getting top performers:', error);
      throw error;
    }
  }

  /**
   * Get trading activity count by user
   */
  static async getActivityCount(userAddress) {
    try {
      const { count, error } = await supabaseAdmin
        .from('trading_activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_address', userAddress);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      logger.error('Error getting activity count:', error);
      throw error;
    }
  }

  /**
   * Get symbol statistics
   */
  static async getSymbolStats(userAddress = null) {
    try {
      let query = supabaseAdmin
        .from('trading_activities')
        .select('symbol, amount, profit_loss');

      if (userAddress) {
        query = query.eq('user_address', userAddress);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const symbolStats = {};
      
      (data || []).forEach(activity => {
        const symbol = activity.symbol;
        if (!symbolStats[symbol]) {
          symbolStats[symbol] = {
            symbol,
            trades: 0,
            volume: 0,
            profit_loss: 0
          };
        }
        
        symbolStats[symbol].trades += 1;
        symbolStats[symbol].volume += parseFloat(activity.amount) || 0;
        symbolStats[symbol].profit_loss += parseFloat(activity.profit_loss) || 0;
      });

      return Object.values(symbolStats).sort((a, b) => b.volume - a.volume);
    } catch (error) {
      logger.error('Error getting symbol stats:', error);
      throw error;
    }
  }
}

module.exports = TradingModel;
