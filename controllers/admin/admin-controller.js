const { logger } = require('../../config/logger');
const { supabaseAdmin } = require('../../config/database');
const paionTokenService = require('../../services/paion-token-service');
const tradingService = require('../../services/trading-service');
const nftService = require('../../services/blockchain/nft-service');

/**
 * Admin Controller
 * Handles administrative operations and statistics
 */

class AdminController {
  /**
   * Get comprehensive admin statistics
   */
  async getAdminStats(req, res) {
    try {
      logger.info('Getting admin statistics');

      const [
        paionStats,
        tradingStats,
        nftStats,
        userStats
      ] = await Promise.all([
        paionTokenService.getTokenStatistics(),
        this.getTradingStatistics(),
        nftService.getMintStatistics(),
        this.getUserStatistics()
      ]);

      const stats = {
        paion: paionStats,
        trading: tradingStats,
        nft: nftStats,
        users: userStats,
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting admin stats:', error);
      res.status(500).json({
        error: 'Failed to get admin statistics',
        code: 'ADMIN_STATS_ERROR'
      });
    }
  }

  /**
   * Get pAION token statistics for admin
   */
  async getPaionStats(req, res) {
    try {
      logger.info('Getting pAION statistics for admin');

      // Get all balances and calculate statistics
      const { data: balances, error: balancesError } = await supabaseAdmin
        .from('paion_balances')
        .select('user_address, balance, total_earned, total_spent')
        .order('balance', { ascending: false });

      if (balancesError) {
        throw balancesError;
      }

      if (!balances || balances.length === 0) {
        return res.json({
          success: true,
          stats: {
            totalSupply: 0,
            circulatingSupply: 0,
            totalHolders: 0,
            averageBalance: 0,
            topHolders: [],
            treasuryBalance: 0,
            royaltiesBalance: 0
          }
        });
      }

      // Calculate statistics
      const totalSupply = balances.reduce((sum, b) => sum + parseFloat(b.total_earned || 0), 0);
      const circulatingSupply = balances.reduce((sum, b) => sum + parseFloat(b.balance || 0), 0);
      const totalHolders = balances.filter(b => parseFloat(b.balance || 0) > 0).length;
      const averageBalance = totalHolders > 0 ? circulatingSupply / totalHolders : 0;

      // Get top 10 holders
      const topHolders = balances
        .filter(b => parseFloat(b.balance || 0) > 0)
        .slice(0, 10)
        .map(b => ({
          user_address: b.user_address,
          balance: parseFloat(b.balance || 0),
          total_earned: parseFloat(b.total_earned || 0),
          total_spent: parseFloat(b.total_spent || 0)
        }));

      const stats = {
        totalSupply,
        circulatingSupply,
        totalHolders,
        averageBalance,
        topHolders,
        treasuryBalance: 0, // TODO: Implement treasury tracking
        royaltiesBalance: 0 // TODO: Implement royalties tracking
      };

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      logger.error('Error getting pAION stats:', error);
      res.status(500).json({
        error: 'Failed to get pAION statistics',
        code: 'PAION_STATS_ERROR'
      });
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics() {
    try {
      const { data: users, error } = await supabaseAdmin
        .from('user_profiles')
        .select('role_tier, created_at, last_login_at');

      if (error) {
        throw error;
      }

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats = {
        totalUsers: users.length,
        newUsersThisWeek: users.filter(u => new Date(u.created_at) > oneWeekAgo).length,
        newUsersThisMonth: users.filter(u => new Date(u.created_at) > oneMonthAgo).length,
        activeUsersThisWeek: users.filter(u => u.last_login_at && new Date(u.last_login_at) > oneWeekAgo).length,
        tierBreakdown: {
          nomad: users.filter(u => u.role_tier === 'NOMAD').length,
          pro: users.filter(u => u.role_tier === 'PRO').length,
          royal: users.filter(u => u.role_tier === 'ROYAL').length
        }
      };

      return stats;
    } catch (error) {
      logger.error('Error getting user statistics:', error);
      return {
        totalUsers: 0,
        newUsersThisWeek: 0,
        newUsersThisMonth: 0,
        activeUsersThisWeek: 0,
        tierBreakdown: { nomad: 0, pro: 0, royal: 0 }
      };
    }
  }

  /**
   * Get trading statistics
   */
  async getTradingStatistics() {
    try {
      const { data: activities, error } = await supabaseAdmin
        .from('trading_activities')
        .select('profit_loss, amount, created_at, status');

      if (error) {
        throw error;
      }

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const weeklyActivities = activities.filter(a => new Date(a.created_at) > oneWeekAgo);
      const monthlyActivities = activities.filter(a => new Date(a.created_at) > oneMonthAgo);

      const stats = {
        totalTrades: activities.length,
        weeklyTrades: weeklyActivities.length,
        monthlyTrades: monthlyActivities.length,
        totalVolume: activities.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0),
        weeklyVolume: weeklyActivities.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0),
        monthlyVolume: monthlyActivities.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0),
        totalProfitLoss: activities.reduce((sum, a) => sum + (parseFloat(a.profit_loss) || 0), 0),
        weeklyProfitLoss: weeklyActivities.reduce((sum, a) => sum + (parseFloat(a.profit_loss) || 0), 0),
        monthlyProfitLoss: monthlyActivities.reduce((sum, a) => sum + (parseFloat(a.profit_loss) || 0), 0)
      };

      return stats;
    } catch (error) {
      logger.error('Error getting trading statistics:', error);
      return {
        totalTrades: 0,
        weeklyTrades: 0,
        monthlyTrades: 0,
        totalVolume: 0,
        weeklyVolume: 0,
        monthlyVolume: 0,
        totalProfitLoss: 0,
        weeklyProfitLoss: 0,
        monthlyProfitLoss: 0
      };
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(req, res) {
    try {
      logger.info('Getting system health status');

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'healthy',
          blockchain: 'healthy',
          cache: 'healthy'
        },
        metrics: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        }
      };

      // Test database connection
      try {
        await supabaseAdmin.from('user_profiles').select('count').limit(1);
      } catch (dbError) {
        health.services.database = 'unhealthy';
        health.status = 'degraded';
      }

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error('Error getting system health:', error);
      res.status(500).json({
        error: 'Failed to get system health',
        code: 'HEALTH_CHECK_ERROR'
      });
    }
  }

  /**
   * Broadcast notification to all users
   */
  async broadcastNotification(req, res) {
    try {
      const { title, message, type = 'info', category = 'system' } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          error: 'Title and message are required',
          code: 'MISSING_FIELDS'
        });
      }

      logger.info('Broadcasting notification to all users');

      // Get all user addresses
      const { data: users, error: usersError } = await supabaseAdmin
        .from('user_profiles')
        .select('address');

      if (usersError) {
        throw usersError;
      }

      if (!users || users.length === 0) {
        return res.json({
          success: true,
          message: 'No users found to notify',
          sent: 0
        });
      }

      // Create notifications for all users
      const notifications = users.map(user => ({
        user_address: user.address,
        title,
        message,
        type,
        category,
        read: false,
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert(notifications);

      if (error) {
        throw error;
      }

      logger.info(`Broadcast notification sent to ${users.length} users`);

      res.json({
        success: true,
        message: 'Notification broadcast successfully',
        sent: users.length
      });
    } catch (error) {
      logger.error('Error broadcasting notification:', error);
      res.status(500).json({
        error: 'Failed to broadcast notification',
        code: 'BROADCAST_ERROR'
      });
    }
  }

  /**
   * Get admin activity logs
   */
  async getActivityLogs(req, res) {
    try {
      const { limit = 100, offset = 0 } = req.query;

      logger.info('Getting admin activity logs');

      // This would typically come from a dedicated audit log table
      // For now, we'll return a placeholder response
      const logs = {
        activities: [],
        totalCount: 0,
        hasMore: false
      };

      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      logger.error('Error getting activity logs:', error);
      res.status(500).json({
        error: 'Failed to get activity logs',
        code: 'ACTIVITY_LOGS_ERROR'
      });
    }
  }
}

module.exports = new AdminController();
