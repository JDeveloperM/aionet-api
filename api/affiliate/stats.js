// Affiliate Stats Vercel Function
const jwt = require('jsonwebtoken');

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Validate wallet address
const isValidAddress = (address) => {
  if (!address || typeof address !== 'string') return false;
  return (address.startsWith('0x') && (address.length === 42 || address.length === 66));
};

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Address');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }

    // Get user address
    const userAddress = req.headers['x-user-address'];
    if (!userAddress || !isValidAddress(userAddress)) {
      return res.status(401).json({
        error: 'User address required in X-User-Address header.',
        code: 'NO_USER_ADDRESS'
      });
    }

    // Mock affiliate statistics
    const affiliateStats = {
      user_address: userAddress,
      affiliate_code: `AIONET${userAddress.slice(-6).toUpperCase()}`,
      referral_stats: {
        total_referrals: 25,
        active_referrals: 18,
        referrals_this_month: 8,
        conversion_rate: 72.0
      },
      earnings: {
        total_earned: 1250.75,
        pending_payout: 125.50,
        last_payout: 1125.25,
        this_month_earnings: 285.30
      },
      commission_rates: {
        trading_fees: 0.20, // 20% of trading fees
        nft_sales: 0.05,    // 5% of NFT sales
        premium_subscriptions: 0.30 // 30% of subscription fees
      },
      recent_referrals: [
        {
          referred_user: '0x1234...5678',
          joined_date: '2024-01-18T10:30:00Z',
          status: 'active',
          total_volume: 5000,
          commission_earned: 25.50
        },
        {
          referred_user: '0x2345...6789',
          joined_date: '2024-01-15T14:20:00Z',
          status: 'active',
          total_volume: 12000,
          commission_earned: 85.20
        }
      ],
      performance_metrics: {
        rank: 15,
        tier: 'Gold',
        next_tier: 'Platinum',
        progress_to_next: 75.5,
        bonus_multiplier: 1.2
      },
      payout_history: [
        {
          amount: 450.25,
          date: '2024-01-01T00:00:00Z',
          tx_hash: '0xabc123...',
          status: 'completed'
        },
        {
          amount: 675.00,
          date: '2023-12-01T00:00:00Z',
          tx_hash: '0xdef456...',
          status: 'completed'
        }
      ],
      referral_link: `https://aionet.app/ref/${userAddress.slice(-6).toUpperCase()}`,
      last_updated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: affiliateStats
    });
  } catch (error) {
    console.error('Error getting affiliate stats:', error);
    res.status(500).json({
      error: 'Failed to get affiliate statistics',
      code: 'AFFILIATE_STATS_ERROR'
    });
  }
};
