const { logger } = require('../../config/logger');
const tradingService = require('../../services/trading-service');
const { validateTradingActivity } = require('../../middleware/validation');

/**
 * Trading Controller
 * Handles trading-related operations
 */

class TradingController {
  /**
   * Get user's trading activities
   */
  async getTradingActivities(req, res) {
    try {
      const userAddress = req.userAddress;
      const {
        symbol,
        tradeType,
        platform,
        status,
        dateFrom,
        dateTo,
        limit = 50,
        offset = 0
      } = req.query;

      logger.info(`Getting trading activities for ${userAddress}`);

      const filters = {
        symbol,
        tradeType,
        platform,
        status,
        dateFrom,
        dateTo,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const activities = await tradingService.getTradingActivities(userAddress, filters);

      res.json({
        success: true,
        data: activities,
        count: activities.length,
        filters
      });
    } catch (error) {
      logger.error('Error getting trading activities:', error);
      res.status(500).json({
        error: 'Failed to get trading activities',
        code: 'TRADING_ACTIVITIES_ERROR'
      });
    }
  }

  /**
   * Record new trading activity
   */
  async recordTradingActivity(req, res) {
    try {
      const userAddress = req.userAddress;
      const activityData = {
        user_address: userAddress,
        ...req.body
      };

      logger.info(`Recording trading activity for ${userAddress}`);

      // Validate trading activity data
      const validation = validateTradingActivity(activityData);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.errors,
          code: 'VALIDATION_ERROR'
        });
      }

      const activity = await tradingService.recordTradingActivity(activityData);

      res.status(201).json({
        success: true,
        data: activity,
        message: 'Trading activity recorded successfully'
      });
    } catch (error) {
      logger.error('Error recording trading activity:', error);
      res.status(500).json({
        error: 'Failed to record trading activity',
        code: 'RECORD_ACTIVITY_ERROR'
      });
    }
  }

  /**
   * Get user's trading statistics
   */
  async getTradingStats(req, res) {
    try {
      const userAddress = req.userAddress || req.query.user_address;

      if (!userAddress) {
        return res.status(400).json({
          error: 'User address is required',
          code: 'MISSING_USER_ADDRESS'
        });
      }

      logger.info(`Getting trading stats for ${userAddress}`);

      const stats = await tradingService.getUserTradingStats(userAddress);

      if (!stats) {
        return res.json({
          success: true,
          data: null,
          message: 'No trading statistics found for this user'
        });
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting trading stats:', error);
      res.status(500).json({
        error: 'Failed to get trading stats',
        code: 'TRADING_STATS_ERROR'
      });
    }
  }

  /**
   * Refresh user's trading statistics
   */
  async refreshTradingStats(req, res) {
    try {
      const userAddress = req.userAddress;

      logger.info(`Refreshing trading stats for ${userAddress}`);

      await tradingService.updateTradingStats(userAddress);
      const updatedStats = await tradingService.getUserTradingStats(userAddress);

      res.json({
        success: true,
        data: updatedStats,
        message: 'Trading statistics refreshed successfully'
      });
    } catch (error) {
      logger.error('Error refreshing trading stats:', error);
      res.status(500).json({
        error: 'Failed to refresh trading stats',
        code: 'REFRESH_STATS_ERROR'
      });
    }
  }

  /**
   * Get trading leaderboard
   */
  async getTradingLeaderboard(req, res) {
    try {
      const {
        limit = 50,
        sortBy = 'total_profit_loss',
        timeframe = 'all'
      } = req.query;

      logger.info('Getting trading leaderboard');

      const options = {
        limit: parseInt(limit),
        sortBy,
        timeframe
      };

      const leaderboard = await tradingService.getTradingLeaderboard(options);

      res.json({
        success: true,
        data: leaderboard,
        count: leaderboard.length,
        options
      });
    } catch (error) {
      logger.error('Error getting trading leaderboard:', error);
      res.status(500).json({
        error: 'Failed to get trading leaderboard',
        code: 'LEADERBOARD_ERROR'
      });
    }
  }

  /**
   * Get trading analytics
   */
  async getTradingAnalytics(req, res) {
    try {
      const userAddress = req.userAddress;
      const { timeframe = '30d' } = req.query;

      logger.info(`Getting trading analytics for ${userAddress}`);

      const analytics = await tradingService.getTradingAnalytics(userAddress, timeframe);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error getting trading analytics:', error);
      res.status(500).json({
        error: 'Failed to get trading analytics',
        code: 'ANALYTICS_ERROR'
      });
    }
  }

  /**
   * Get trading summary for dashboard
   */
  async getTradingSummary(req, res) {
    try {
      const userAddress = req.userAddress;

      logger.info(`Getting trading summary for ${userAddress}`);

      const [stats, recentActivities] = await Promise.all([
        tradingService.getUserTradingStats(userAddress),
        tradingService.getTradingActivities(userAddress, { limit: 5 })
      ]);

      const summary = {
        stats: stats || {
          total_volume: 0,
          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0,
          win_rate: 0,
          total_profit_loss: 0,
          best_trade: 0,
          worst_trade: 0,
          average_trade_size: 0,
          last_trade_at: null
        },
        recentActivities: recentActivities || [],
        hasData: !!(stats && stats.total_trades > 0)
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error getting trading summary:', error);
      res.status(500).json({
        error: 'Failed to get trading summary',
        code: 'SUMMARY_ERROR'
      });
    }
  }

  /**
   * Get trading performance metrics
   */
  async getPerformanceMetrics(req, res) {
    try {
      const userAddress = req.userAddress;
      const { period = '30d' } = req.query;

      logger.info(`Getting performance metrics for ${userAddress}`);

      // Calculate date range based on period
      const now = new Date();
      let dateFrom;
      
      switch (period) {
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

      const activities = await tradingService.getTradingActivities(userAddress, {
        dateFrom: dateFrom.toISOString(),
        limit: 1000
      });

      // Calculate performance metrics
      const totalTrades = activities.length;
      const profitableTrades = activities.filter(a => (a.profit_loss || 0) > 0).length;
      const totalProfitLoss = activities.reduce((sum, a) => sum + (a.profit_loss || 0), 0);
      const totalVolume = activities.reduce((sum, a) => sum + (a.amount || 0), 0);

      const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
      const avgProfitLoss = totalTrades > 0 ? totalProfitLoss / totalTrades : 0;
      const avgVolume = totalTrades > 0 ? totalVolume / totalTrades : 0;

      // Calculate daily performance
      const dailyPerformance = {};
      activities.forEach(activity => {
        const date = new Date(activity.trade_opened_at).toISOString().split('T')[0];
        if (!dailyPerformance[date]) {
          dailyPerformance[date] = {
            date,
            trades: 0,
            profit_loss: 0,
            volume: 0
          };
        }
        dailyPerformance[date].trades += 1;
        dailyPerformance[date].profit_loss += activity.profit_loss || 0;
        dailyPerformance[date].volume += activity.amount || 0;
      });

      const metrics = {
        period,
        totalTrades,
        profitableTrades,
        winRate,
        totalProfitLoss,
        avgProfitLoss,
        totalVolume,
        avgVolume,
        dailyPerformance: Object.values(dailyPerformance).sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )
      };

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      res.status(500).json({
        error: 'Failed to get performance metrics',
        code: 'PERFORMANCE_METRICS_ERROR'
      });
    }
  }
}

module.exports = new TradingController();
