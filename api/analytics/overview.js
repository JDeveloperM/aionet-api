// Analytics Overview Vercel Function
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const timeframe = req.query.timeframe || '7d'; // 24h, 7d, 30d, 90d

    // Mock analytics data
    const analytics = {
      timeframe,
      platform_metrics: {
        total_users: 12500,
        active_users: 8750,
        new_users: timeframe === '24h' ? 45 : timeframe === '7d' ? 320 : 1250,
        retention_rate: 78.5,
        user_growth_rate: 12.3
      },
      trading_metrics: {
        total_volume: 2500000,
        total_trades: 18500,
        average_trade_size: 135.14,
        volume_change: 15.8,
        trades_change: 8.2
      },
      token_metrics: {
        paion_supply: 1000000,
        paion_holders: 3200,
        average_balance: 312.5,
        distribution_score: 85.2
      },
      nft_metrics: {
        total_collections: 45,
        total_nfts: 8500,
        total_owners: 2100,
        floor_price: 0.85,
        volume_24h: 15000
      },
      social_metrics: {
        twitter_followers: 25000,
        discord_members: 18500,
        telegram_members: 12000,
        verified_users: 1850
      },
      governance_metrics: {
        active_proposals: 3,
        total_voters: 1200,
        average_participation: 65.5,
        governance_token_staked: 450000
      },
      revenue_metrics: {
        trading_fees: 12500,
        nft_royalties: 3200,
        premium_subscriptions: 1800,
        total_revenue: 17500
      },
      top_activities: [
        { activity: 'Trading', count: 8500, percentage: 45.2 },
        { activity: 'NFT Trading', count: 3200, percentage: 17.1 },
        { activity: 'Social Verification', count: 2800, percentage: 14.9 },
        { activity: 'Governance Voting', count: 1200, percentage: 6.4 },
        { activity: 'Staking', count: 3100, percentage: 16.4 }
      ],
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting analytics overview:', error);
    res.status(500).json({
      error: 'Failed to get analytics overview',
      code: 'ANALYTICS_ERROR'
    });
  }
};
