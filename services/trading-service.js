const { supabaseAdmin } = require('../config/database');
const { logger } = require('../config/logger');

/**
 * Trading Service
 * Handles all trading-related database operations
 */

class TradingService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = {
      stats: 5 * 60 * 1000,      // 5 minutes
      activities: 2 * 60 * 1000, // 2 minutes
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
   * Record a new trading activity
   */
  async recordTradingActivity(activityData) {
    try {
      logger.info(`Recording trading activity for ${activityData.user_address}`);

      const { data, error } = await supabaseAdmin
        .from('trading_activities')
        .insert({
          user_address: activityData.user_address,
          trade_type: activityData.trade_type,
          symbol: activityData.symbol,
          amount: activityData.amount,
          price: activityData.price,
          profit_loss: activityData.profit_loss,
          profit_loss_percentage: activityData.profit_loss_percentage,
          status: activityData.status || 'completed',
          platform: activityData.platform || 'manual',
          trade_opened_at: activityData.trade_opened_at,
          trade_closed_at: activityData.trade_closed_at,
          metadata: activityData.metadata || {}
        })
        .select()
        .single();

      if (error) {
        logger.error('Error recording trading activity:', error);
        throw error;
      }

      // Clear cache for user stats
      this.cache.delete(`stats_${activityData.user_address}`);
      this.cache.delete(`activities_${activityData.user_address}`);

      // Update trading stats in background
      this.updateTradingStats(activityData.user_address).catch(err => {
        logger.error('Error updating trading stats:', err);
      });

      logger.info(`Successfully recorded trading activity for ${activityData.user_address}`);
      return data;
    } catch (error) {
      logger.error('Error in recordTradingActivity:', error);
      throw error;
    }
  }

  /**
   * Get user's trading activities
   */
  async getTradingActivities(userAddress, filters = {}) {
    try {
      const cacheKey = `activities_${userAddress}_${JSON.stringify(filters)}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting trading activities for ${userAddress}`);

      let query = supabaseAdmin
        .from('trading_activities')
        .select('*')
        .eq('user_address', userAddress);

      // Apply filters
      if (filters.symbol) {
        query = query.eq('symbol', filters.symbol);
      }
      if (filters.tradeType) {
        query = query.eq('trade_type', filters.tradeType);
      }
      if (filters.platform) {
        query = query.eq('platform', filters.platform);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.dateFrom) {
        query = query.gte('trade_opened_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('trade_opened_at', filters.dateTo);
      }

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      query = query
        .order('trade_opened_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      this.setCachedData(cacheKey, data || [], this.CACHE_TTL.activities);
      return data || [];
    } catch (error) {
      logger.error('Error getting trading activities:', error);
      throw error;
    }
  }

  /**
   * Get user's trading statistics
   */
  async getUserTradingStats(userAddress) {
    try {
      const cacheKey = `stats_${userAddress}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting trading stats for ${userAddress}`);

      const { data, error } = await supabaseAdmin
        .from('trading_stats')
        .select('*')
        .eq('user_address', userAddress)
        .single();

      if (error) {
        // Handle missing table or no data
        if (error.code === 'PGRST116' || error.code === 'PGRST106' || error.message.includes('does not exist')) {
          logger.warn(`Trading stats not found for ${userAddress}, returning default stats`);
          const defaultStats = {
            user_address: userAddress,
            total_volume: 0,
            total_trades: 0,
            winning_trades: 0,
            losing_trades: 0,
            win_rate: 0,
            total_profit_loss: 0,
            best_trade: 0,
            worst_trade: 0,
            average_trade_size: 0,
            last_trade_at: null,
            updated_at: new Date().toISOString()
          };
          this.setCachedData(cacheKey, defaultStats, this.CACHE_TTL.stats);
          return defaultStats;
        }
        throw error;
      }

      const stats = data || null;
      this.setCachedData(cacheKey, stats, this.CACHE_TTL.stats);
      return stats;
    } catch (error) {
      logger.error('Error getting user trading stats:', error);
      // Return default stats instead of throwing
      return {
        user_address: userAddress,
        total_volume: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        win_rate: 0,
        total_profit_loss: 0,
        best_trade: 0,
        worst_trade: 0,
        average_trade_size: 0,
        last_trade_at: null,
        updated_at: new Date().toISOString()
      };
    }
  }

  /**
   * Update trading statistics for a user
   */
  async updateTradingStats(userAddress) {
    try {
      logger.info(`Updating trading stats for ${userAddress}`);

      // Get all activities for the user
      const activities = await this.getTradingActivities(userAddress, { limit: 1000 });

      if (!activities || activities.length === 0) {
        logger.info(`No trading activities found for ${userAddress}`);
        return;
      }

      // Calculate statistics
      const totalTrades = activities.length;
      const totalVolume = activities.reduce((sum, activity) => sum + (activity.amount || 0), 0);
      const totalProfitLoss = activities.reduce((sum, activity) => sum + (activity.profit_loss || 0), 0);

      const profitableTrades = activities.filter(a => (a.profit_loss || 0) > 0);
      const losingTrades = activities.filter(a => (a.profit_loss || 0) < 0);
      const winningTrades = profitableTrades.length;

      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      const profitLosses = activities.map(a => a.profit_loss || 0).filter(p => p !== 0);
      const bestTrade = profitLosses.length > 0 ? Math.max(...profitLosses) : 0;
      const worstTrade = profitLosses.length > 0 ? Math.min(...profitLosses) : 0;

      const averageTradeSize = totalVolume / totalTrades;
      const lastTradeAt = activities[0]?.trade_opened_at;

      // Upsert trading stats
      const { error: upsertError } = await supabaseAdmin
        .from('trading_stats')
        .upsert({
          user_address: userAddress,
          total_volume: totalVolume,
          total_trades: totalTrades,
          winning_trades: winningTrades,
          losing_trades: losingTrades.length,
          win_rate: winRate,
          total_profit_loss: totalProfitLoss,
          best_trade: bestTrade,
          worst_trade: worstTrade,
          average_trade_size: averageTradeSize,
          last_trade_at: lastTradeAt,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_address'
        });

      if (upsertError) {
        throw upsertError;
      }

      // Clear cache
      this.cache.delete(`stats_${userAddress}`);

      logger.info(`Successfully updated trading stats for ${userAddress}`);
    } catch (error) {
      logger.error('Error updating trading stats:', error);
      throw error;
    }
  }

  /**
   * Get trading leaderboard
   */
  async getTradingLeaderboard(options = {}) {
    try {
      const { limit = 50, sortBy = 'total_profit_loss', timeframe = 'all' } = options;
      const cacheKey = `leaderboard_${sortBy}_${timeframe}_${limit}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info('Getting trading leaderboard');

      let query = supabaseAdmin
        .from('trading_stats')
        .select(`
          user_address,
          total_volume,
          total_trades,
          winning_trades,
          losing_trades,
          win_rate,
          total_profit_loss,
          best_trade,
          worst_trade,
          average_trade_size,
          last_trade_at,
          updated_at
        `);

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
        // If table doesn't exist, return empty leaderboard
        if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
          logger.warn('trading_stats table does not exist, returning empty leaderboard');
          const emptyLeaderboard = [];
          this.setCachedData(cacheKey, emptyLeaderboard, this.CACHE_TTL.stats);
          return emptyLeaderboard;
        }
        throw error;
      }

      this.setCachedData(cacheKey, data || [], this.CACHE_TTL.stats);
      return data || [];
    } catch (error) {
      logger.error('Error getting trading leaderboard:', error);
      // Return empty leaderboard instead of throwing
      return [];
    }
  }

  /**
   * Get trading analytics
   */
  async getTradingAnalytics(userAddress, timeframe = '30d') {
    try {
      const cacheKey = `analytics_${userAddress}_${timeframe}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting trading analytics for ${userAddress}`);

      // Calculate date range
      const now = new Date();
      let dateFrom;
      
      switch (timeframe) {
        case '7d':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const activities = await this.getTradingActivities(userAddress, {
        dateFrom: dateFrom.toISOString(),
        limit: 1000
      });

      // Group by date for chart data
      const dailyData = {};
      activities.forEach(activity => {
        const date = new Date(activity.trade_opened_at).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = {
            date,
            trades: 0,
            volume: 0,
            profit_loss: 0
          };
        }
        dailyData[date].trades += 1;
        dailyData[date].volume += activity.amount || 0;
        dailyData[date].profit_loss += activity.profit_loss || 0;
      });

      const chartData = Object.values(dailyData).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Symbol breakdown
      const symbolData = {};
      activities.forEach(activity => {
        if (!symbolData[activity.symbol]) {
          symbolData[activity.symbol] = {
            symbol: activity.symbol,
            trades: 0,
            volume: 0,
            profit_loss: 0
          };
        }
        symbolData[activity.symbol].trades += 1;
        symbolData[activity.symbol].volume += activity.amount || 0;
        symbolData[activity.symbol].profit_loss += activity.profit_loss || 0;
      });

      const analytics = {
        chartData,
        symbolBreakdown: Object.values(symbolData),
        totalTrades: activities.length,
        totalVolume: activities.reduce((sum, a) => sum + (a.amount || 0), 0),
        totalProfitLoss: activities.reduce((sum, a) => sum + (a.profit_loss || 0), 0),
        timeframe
      };

      this.setCachedData(cacheKey, analytics, this.CACHE_TTL.stats);
      return analytics;
    } catch (error) {
      logger.error('Error getting trading analytics:', error);
      throw error;
    }
  }
}

module.exports = new TradingService();
