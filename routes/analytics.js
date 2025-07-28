const express = require('express');
const router = express.Router();

const { verifyWalletAddress, optionalAuth, createUserRateLimit } = require('../middleware/auth');
const { validateCommonParams } = require('../middleware/validation');
const { logger } = require('../config/logger');
const { supabaseAdmin } = require('../config/database');

/**
 * Analytics Routes
 * Handle analytics and statistics
 */

// Apply rate limiting
router.use(createUserRateLimit(15 * 60 * 1000, 50)); // 50 requests per 15 minutes

/**
 * GET /api/analytics/community
 * Get community analytics
 */
router.get('/community',
  async (req, res) => {
    try {
      logger.info('Getting community analytics');
      
      // Get user statistics
      const { data: users, error: usersError } = await supabaseAdmin
        .from('user_profiles')
        .select('role_tier, created_at');
      
      if (usersError) {
        throw usersError;
      }
      
      // Get NFT statistics
      const { data: nftEvents, error: nftError } = await supabaseAdmin
        .from('nft_mint_events')
        .select('tier, created_at')
        .eq('status', 'completed');
      
      if (nftError) {
        logger.warn('Error getting NFT events:', nftError);
      }
      
      // Calculate statistics
      const totalUsers = users?.length || 0;
      const totalHolders = nftEvents?.length || 0;
      
      const tierBreakdown = {
        nomad: users?.filter(u => u.role_tier === 'NOMAD').length || 0,
        pro: users?.filter(u => u.role_tier === 'PRO').length || 0,
        royal: users?.filter(u => u.role_tier === 'ROYAL').length || 0
      };
      
      const nftBreakdown = {
        pro: nftEvents?.filter(n => n.tier === 'PRO').length || 0,
        royal: nftEvents?.filter(n => n.tier === 'ROYAL').length || 0
      };
      
      // Calculate growth metrics
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const newUsersThisWeek = users?.filter(u => 
        new Date(u.created_at) > oneWeekAgo
      ).length || 0;
      
      const newUsersThisMonth = users?.filter(u => 
        new Date(u.created_at) > oneMonthAgo
      ).length || 0;
      
      const analytics = {
        totalUsers,
        totalHolders,
        tierBreakdown,
        nftBreakdown,
        growth: {
          newUsersThisWeek,
          newUsersThisMonth,
          weeklyGrowthRate: totalUsers > 0 ? (newUsersThisWeek / totalUsers) * 100 : 0,
          monthlyGrowthRate: totalUsers > 0 ? (newUsersThisMonth / totalUsers) * 100 : 0
        },
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error getting community analytics:', error);
      res.status(500).json({
        error: 'Failed to get community analytics',
        code: 'COMMUNITY_ANALYTICS_ERROR'
      });
    }
  }
);

/**
 * GET /api/analytics/user/:address?
 * Get user-specific analytics
 */
router.get('/user/:address?',
  optionalAuth,
  async (req, res) => {
    try {
      const userAddress = req.userAddress || req.params.address;
      
      if (!userAddress) {
        return res.status(400).json({
          error: 'User address is required',
          code: 'MISSING_USER_ADDRESS'
        });
      }
      
      logger.info(`Getting user analytics for ${userAddress}`);
      
      // Get user profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('address', userAddress)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }
      
      // Get user's trading activities
      const { data: tradingActivities, error: tradingError } = await supabaseAdmin
        .from('trading_activities')
        .select('profit_loss, amount, created_at')
        .eq('user_address', userAddress);
      
      if (tradingError) {
        logger.warn('Error getting trading activities:', tradingError);
      }
      
      // Get user's NFT events
      const { data: nftEvents, error: nftError } = await supabaseAdmin
        .from('nft_mint_events')
        .select('tier, created_at')
        .eq('user_address', userAddress)
        .eq('status', 'completed');
      
      if (nftError) {
        logger.warn('Error getting NFT events:', nftError);
      }
      
      // Get user's pAION balance
      const { data: paionBalance, error: paionError } = await supabaseAdmin
        .from('paion_balances')
        .select('balance, total_earned, total_spent')
        .eq('user_address', userAddress)
        .single();
      
      if (paionError && paionError.code !== 'PGRST116') {
        logger.warn('Error getting pAION balance:', paionError);
      }
      
      // Calculate analytics
      const totalTrades = tradingActivities?.length || 0;
      const totalProfitLoss = tradingActivities?.reduce((sum, t) => 
        sum + (parseFloat(t.profit_loss) || 0), 0) || 0;
      const totalVolume = tradingActivities?.reduce((sum, t) => 
        sum + (parseFloat(t.amount) || 0), 0) || 0;
      
      const analytics = {
        profile: profile || null,
        trading: {
          totalTrades,
          totalProfitLoss,
          totalVolume,
          averageTradeSize: totalTrades > 0 ? totalVolume / totalTrades : 0
        },
        nfts: {
          totalMinted: nftEvents?.length || 0,
          tiers: nftEvents?.map(n => n.tier) || []
        },
        paion: {
          balance: parseFloat(paionBalance?.balance || 0),
          totalEarned: parseFloat(paionBalance?.total_earned || 0),
          totalSpent: parseFloat(paionBalance?.total_spent || 0)
        },
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      res.status(500).json({
        error: 'Failed to get user analytics',
        code: 'USER_ANALYTICS_ERROR'
      });
    }
  }
);

/**
 * GET /api/analytics/leaderboard
 * Get various leaderboards
 */
router.get('/leaderboard',
  validateCommonParams,
  async (req, res) => {
    try {
      const { type = 'trading', limit = 50 } = req.query;
      
      logger.info(`Getting ${type} leaderboard`);
      
      let leaderboard = [];
      
      switch (type) {
        case 'trading':
          const { data: tradingStats, error: tradingError } = await supabaseAdmin
            .from('trading_stats')
            .select('user_address, total_profit_loss, total_volume, total_trades, win_rate')
            .order('total_profit_loss', { ascending: false })
            .limit(parseInt(limit));
          
          if (tradingError) {
            throw tradingError;
          }
          
          leaderboard = tradingStats || [];
          break;
          
        case 'paion':
          const { data: paionStats, error: paionError } = await supabaseAdmin
            .from('paion_balances')
            .select('user_address, balance, total_earned')
            .order('balance', { ascending: false })
            .limit(parseInt(limit));
          
          if (paionError) {
            throw paionError;
          }
          
          leaderboard = paionStats || [];
          break;
          
        default:
          return res.status(400).json({
            error: 'Invalid leaderboard type. Supported types: trading, paion',
            code: 'INVALID_LEADERBOARD_TYPE'
          });
      }
      
      res.json({
        success: true,
        data: {
          type,
          leaderboard,
          count: leaderboard.length
        }
      });
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      res.status(500).json({
        error: 'Failed to get leaderboard',
        code: 'LEADERBOARD_ERROR'
      });
    }
  }
);

/**
 * GET /api/analytics/stats
 * Get general platform statistics
 */
router.get('/stats',
  async (req, res) => {
    try {
      logger.info('Getting platform statistics');
      
      // Get various counts
      const [
        { count: totalUsers },
        { count: totalTrades },
        { count: totalNFTs },
        { count: totalNotifications }
      ] = await Promise.all([
        supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('trading_activities').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('nft_mint_events').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabaseAdmin.from('notifications').select('*', { count: 'exact', head: true })
      ]);
      
      // Get total trading volume
      const { data: tradingData, error: tradingError } = await supabaseAdmin
        .from('trading_activities')
        .select('amount, profit_loss');
      
      if (tradingError) {
        logger.warn('Error getting trading data:', tradingError);
      }
      
      const totalVolume = tradingData?.reduce((sum, t) => 
        sum + (parseFloat(t.amount) || 0), 0) || 0;
      const totalProfitLoss = tradingData?.reduce((sum, t) => 
        sum + (parseFloat(t.profit_loss) || 0), 0) || 0;
      
      // Get pAION statistics
      const { data: paionData, error: paionError } = await supabaseAdmin
        .from('paion_balances')
        .select('balance, total_earned');
      
      if (paionError) {
        logger.warn('Error getting pAION data:', paionError);
      }
      
      const totalPaionSupply = paionData?.reduce((sum, p) => 
        sum + (parseFloat(p.total_earned) || 0), 0) || 0;
      const totalPaionCirculating = paionData?.reduce((sum, p) => 
        sum + (parseFloat(p.balance) || 0), 0) || 0;
      
      const stats = {
        users: {
          total: totalUsers || 0
        },
        trading: {
          totalTrades: totalTrades || 0,
          totalVolume,
          totalProfitLoss
        },
        nfts: {
          totalMinted: totalNFTs || 0
        },
        paion: {
          totalSupply: totalPaionSupply,
          circulatingSupply: totalPaionCirculating,
          holders: paionData?.filter(p => parseFloat(p.balance || 0) > 0).length || 0
        },
        notifications: {
          total: totalNotifications || 0
        },
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting platform statistics:', error);
      res.status(500).json({
        error: 'Failed to get platform statistics',
        code: 'PLATFORM_STATS_ERROR'
      });
    }
  }
);

module.exports = router;
