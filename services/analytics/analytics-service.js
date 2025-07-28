const { supabaseAdmin } = require('../../config/database');
const { logger } = require('../../config/logger');

/**
 * Analytics Service
 * Handles analytics calculations and data aggregation
 */

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 10 * 60 * 1000; // 10 minutes
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
   * Get community analytics
   */
  async getCommunityAnalytics() {
    try {
      const cacheKey = 'community_analytics';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info('Calculating community analytics');

      // Get user statistics
      const { data: users, error: usersError } = await supabaseAdmin
        .from('user_profiles')
        .select('role_tier, created_at, last_login_at');

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

      // Get trading statistics
      const { data: tradingActivities, error: tradingError } = await supabaseAdmin
        .from('trading_activities')
        .select('profit_loss, amount, created_at');

      if (tradingError) {
        logger.warn('Error getting trading activities:', tradingError);
      }

      // Calculate statistics
      const totalUsers = users?.length || 0;
      const totalHolders = nftEvents?.length || 0;
      const totalTrades = tradingActivities?.length || 0;

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
      const timeframes = {
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        quarter: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      };

      const growth = {
        newUsersThisWeek: users?.filter(u => 
          new Date(u.created_at) > timeframes.week
        ).length || 0,
        newUsersThisMonth: users?.filter(u => 
          new Date(u.created_at) > timeframes.month
        ).length || 0,
        newUsersThisQuarter: users?.filter(u => 
          new Date(u.created_at) > timeframes.quarter
        ).length || 0,
        activeUsersThisWeek: users?.filter(u => 
          u.last_login_at && new Date(u.last_login_at) > timeframes.week
        ).length || 0
      };

      // Calculate trading metrics
      const totalVolume = tradingActivities?.reduce((sum, t) => 
        sum + (parseFloat(t.amount) || 0), 0) || 0;
      const totalProfitLoss = tradingActivities?.reduce((sum, t) => 
        sum + (parseFloat(t.profit_loss) || 0), 0) || 0;

      const analytics = {
        users: {
          total: totalUsers,
          tierBreakdown,
          growth
        },
        nfts: {
          totalHolders,
          breakdown: nftBreakdown
        },
        trading: {
          totalTrades,
          totalVolume,
          totalProfitLoss,
          averageTradeSize: totalTrades > 0 ? totalVolume / totalTrades : 0
        },
        engagement: {
          activeUsersThisWeek: growth.activeUsersThisWeek,
          engagementRate: totalUsers > 0 ? (growth.activeUsersThisWeek / totalUsers) * 100 : 0
        },
        timestamp: new Date().toISOString()
      };

      this.setCachedData(cacheKey, analytics);
      return analytics;
    } catch (error) {
      logger.error('Error calculating community analytics:', error);
      throw error;
    }
  }

  /**
   * Get user-specific analytics
   */
  async getUserAnalytics(userAddress) {
    try {
      const cacheKey = `user_analytics_${userAddress}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Calculating user analytics for ${userAddress}`);

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
        .select('*')
        .eq('user_address', userAddress)
        .order('created_at', { ascending: false });

      if (tradingError) {
        logger.warn('Error getting trading activities:', tradingError);
      }

      // Get user's NFT events
      const { data: nftEvents, error: nftError } = await supabaseAdmin
        .from('nft_mint_events')
        .select('*')
        .eq('user_address', userAddress)
        .eq('status', 'completed');

      if (nftError) {
        logger.warn('Error getting NFT events:', nftError);
      }

      // Get user's pAION balance
      const { data: paionBalance, error: paionError } = await supabaseAdmin
        .from('paion_balances')
        .select('*')
        .eq('user_address', userAddress)
        .single();

      if (paionError && paionError.code !== 'PGRST116') {
        logger.warn('Error getting pAION balance:', paionError);
      }

      // Calculate trading analytics
      const totalTrades = tradingActivities?.length || 0;
      const profitableTrades = tradingActivities?.filter(t => 
        (parseFloat(t.profit_loss) || 0) > 0
      ).length || 0;
      const totalProfitLoss = tradingActivities?.reduce((sum, t) => 
        sum + (parseFloat(t.profit_loss) || 0), 0) || 0;
      const totalVolume = tradingActivities?.reduce((sum, t) => 
        sum + (parseFloat(t.amount) || 0), 0) || 0;

      const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
      const averageTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;
      const averageProfitLoss = totalTrades > 0 ? totalProfitLoss / totalTrades : 0;

      // Calculate performance over time
      const performanceData = this.calculatePerformanceOverTime(tradingActivities || []);

      const analytics = {
        profile: profile || null,
        trading: {
          totalTrades,
          profitableTrades,
          winRate,
          totalProfitLoss,
          totalVolume,
          averageTradeSize,
          averageProfitLoss,
          performanceOverTime: performanceData
        },
        nfts: {
          totalMinted: nftEvents?.length || 0,
          tiers: nftEvents?.map(n => n.tier) || [],
          mintingHistory: nftEvents || []
        },
        paion: {
          balance: parseFloat(paionBalance?.balance || 0),
          totalEarned: parseFloat(paionBalance?.total_earned || 0),
          totalSpent: parseFloat(paionBalance?.total_spent || 0),
          lockedAmount: parseFloat(paionBalance?.locked_amount || 0)
        },
        summary: {
          accountAge: profile?.created_at ? 
            Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
          lastActivity: this.getLastActivity(tradingActivities, nftEvents),
          tier: profile?.role_tier || 'NOMAD'
        },
        timestamp: new Date().toISOString()
      };

      this.setCachedData(cacheKey, analytics);
      return analytics;
    } catch (error) {
      logger.error('Error calculating user analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate performance over time
   */
  calculatePerformanceOverTime(tradingActivities) {
    const dailyData = {};
    
    tradingActivities.forEach(activity => {
      const date = new Date(activity.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          trades: 0,
          volume: 0,
          profit_loss: 0,
          cumulative_profit_loss: 0
        };
      }
      dailyData[date].trades += 1;
      dailyData[date].volume += parseFloat(activity.amount) || 0;
      dailyData[date].profit_loss += parseFloat(activity.profit_loss) || 0;
    });

    // Sort by date and calculate cumulative profit/loss
    const sortedData = Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let cumulativeProfitLoss = 0;
    sortedData.forEach(day => {
      cumulativeProfitLoss += day.profit_loss;
      day.cumulative_profit_loss = cumulativeProfitLoss;
    });

    return sortedData;
  }

  /**
   * Get last activity timestamp
   */
  getLastActivity(tradingActivities, nftEvents) {
    const activities = [];
    
    if (tradingActivities && tradingActivities.length > 0) {
      activities.push(new Date(tradingActivities[0].created_at));
    }
    
    if (nftEvents && nftEvents.length > 0) {
      activities.push(new Date(nftEvents[nftEvents.length - 1].created_at));
    }
    
    if (activities.length === 0) {
      return null;
    }
    
    return new Date(Math.max(...activities)).toISOString();
  }

  /**
   * Get platform statistics
   */
  async getPlatformStatistics() {
    try {
      const cacheKey = 'platform_statistics';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info('Calculating platform statistics');

      // Get various counts in parallel
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

      // Get aggregated data
      const [tradingData, paionData] = await Promise.all([
        supabaseAdmin.from('trading_activities').select('amount, profit_loss'),
        supabaseAdmin.from('paion_balances').select('balance, total_earned')
      ]);

      // Calculate trading metrics
      const totalVolume = tradingData.data?.reduce((sum, t) => 
        sum + (parseFloat(t.amount) || 0), 0) || 0;
      const totalProfitLoss = tradingData.data?.reduce((sum, t) => 
        sum + (parseFloat(t.profit_loss) || 0), 0) || 0;

      // Calculate pAION metrics
      const totalPaionSupply = paionData.data?.reduce((sum, p) => 
        sum + (parseFloat(p.total_earned) || 0), 0) || 0;
      const totalPaionCirculating = paionData.data?.reduce((sum, p) => 
        sum + (parseFloat(p.balance) || 0), 0) || 0;
      const paionHolders = paionData.data?.filter(p => 
        parseFloat(p.balance || 0) > 0
      ).length || 0;

      const statistics = {
        users: {
          total: totalUsers || 0
        },
        trading: {
          totalTrades: totalTrades || 0,
          totalVolume,
          totalProfitLoss,
          averageTradeSize: (totalTrades || 0) > 0 ? totalVolume / totalTrades : 0
        },
        nfts: {
          totalMinted: totalNFTs || 0
        },
        paion: {
          totalSupply: totalPaionSupply,
          circulatingSupply: totalPaionCirculating,
          holders: paionHolders
        },
        notifications: {
          total: totalNotifications || 0
        },
        timestamp: new Date().toISOString()
      };

      this.setCachedData(cacheKey, statistics);
      return statistics;
    } catch (error) {
      logger.error('Error calculating platform statistics:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

module.exports = new AnalyticsService();
