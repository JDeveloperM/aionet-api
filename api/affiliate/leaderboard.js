// Affiliate Leaderboard Vercel Function (Public endpoint)
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
    const timeframe = req.query.timeframe || '30d'; // 7d, 30d, 90d, all
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    // Mock leaderboard data
    const leaderboard = [
      {
        rank: 1,
        address: '0x1234...5678',
        username: 'CryptoKing',
        total_referrals: 125,
        active_referrals: 98,
        total_earnings: 15750.50,
        total_volume_generated: 2500000,
        tier: 'Diamond',
        badge: 'Top Performer',
        join_date: '2023-08-15T10:30:00Z'
      },
      {
        rank: 2,
        address: '0x2345...6789',
        username: 'DeFiMaster',
        total_referrals: 89,
        active_referrals: 72,
        total_earnings: 12450.25,
        total_volume_generated: 1850000,
        tier: 'Platinum',
        badge: 'Rising Star',
        join_date: '2023-09-20T14:20:00Z'
      },
      {
        rank: 3,
        address: '0x3456...7890',
        username: 'TradeGuru',
        total_referrals: 67,
        active_referrals: 55,
        total_earnings: 9875.75,
        total_volume_generated: 1420000,
        tier: 'Gold',
        badge: 'Consistent',
        join_date: '2023-10-05T09:15:00Z'
      },
      {
        rank: 4,
        address: '0x4567...8901',
        username: 'BlockchainPro',
        total_referrals: 52,
        active_referrals: 41,
        total_earnings: 7250.30,
        total_volume_generated: 980000,
        tier: 'Gold',
        badge: 'Quality Focus',
        join_date: '2023-11-12T16:45:00Z'
      },
      {
        rank: 5,
        address: '0x5678...9012',
        username: 'CryptoWhale',
        total_referrals: 45,
        active_referrals: 38,
        total_earnings: 6850.80,
        total_volume_generated: 875000,
        tier: 'Silver',
        badge: 'High Value',
        join_date: '2023-12-01T11:30:00Z'
      }
    ];

    // Add more entries to reach the limit
    for (let i = 6; i <= limit && i <= 50; i++) {
      leaderboard.push({
        rank: i,
        address: `0x${Math.random().toString(16).substr(2, 4)}...${Math.random().toString(16).substr(2, 4)}`,
        username: `Affiliate${i}`,
        total_referrals: Math.floor(Math.random() * 40) + 5,
        active_referrals: Math.floor(Math.random() * 30) + 3,
        total_earnings: Math.floor(Math.random() * 5000) + 500,
        total_volume_generated: Math.floor(Math.random() * 500000) + 50000,
        tier: ['Bronze', 'Silver', 'Gold'][Math.floor(Math.random() * 3)],
        badge: ['Newcomer', 'Steady', 'Growing'][Math.floor(Math.random() * 3)],
        join_date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString()
      });
    }

    const topPerformers = leaderboard.slice(0, limit);

    // Calculate statistics
    const totalAffiliates = 1250;
    const totalEarnings = leaderboard.reduce((sum, affiliate) => sum + affiliate.total_earnings, 0);
    const totalVolume = leaderboard.reduce((sum, affiliate) => sum + affiliate.total_volume_generated, 0);
    const averageReferrals = leaderboard.reduce((sum, affiliate) => sum + affiliate.total_referrals, 0) / leaderboard.length;

    res.json({
      success: true,
      data: {
        leaderboard: topPerformers,
        timeframe,
        statistics: {
          total_affiliates: totalAffiliates,
          total_earnings_distributed: totalEarnings,
          total_volume_generated: totalVolume,
          average_referrals_per_affiliate: Math.round(averageReferrals * 100) / 100,
          top_tier_count: leaderboard.filter(a => ['Diamond', 'Platinum'].includes(a.tier)).length
        },
        tier_distribution: {
          diamond: leaderboard.filter(a => a.tier === 'Diamond').length,
          platinum: leaderboard.filter(a => a.tier === 'Platinum').length,
          gold: leaderboard.filter(a => a.tier === 'Gold').length,
          silver: leaderboard.filter(a => a.tier === 'Silver').length,
          bronze: leaderboard.filter(a => a.tier === 'Bronze').length
        },
        rewards_info: {
          top_3_bonus: '500 pAION each',
          top_10_bonus: '200 pAION each',
          monthly_reset: true,
          next_reset: '2024-02-01T00:00:00Z'
        },
        last_updated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting affiliate leaderboard:', error);
    res.status(500).json({
      error: 'Failed to get affiliate leaderboard',
      code: 'LEADERBOARD_ERROR'
    });
  }
};
