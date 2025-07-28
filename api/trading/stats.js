// Trading Stats Vercel Function
const jwt = require('jsonwebtoken');

// Verify JWT token (optional)
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
    let userAddress = null;
    let isAuthenticated = false;

    // Optional authentication
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded) {
        isAuthenticated = true;
      }
    }

    // Get user address from headers or query params
    userAddress = req.headers['x-user-address'] || req.query.user_address;

    if (!userAddress || !isValidAddress(userAddress)) {
      return res.status(400).json({
        error: 'Valid user address required',
        code: 'INVALID_USER_ADDRESS'
      });
    }

    // Mock trading statistics (replace with database query)
    const stats = {
      user_address: userAddress,
      trading_stats: {
        total_volume: 125000.50,
        total_trades: 245,
        profitable_trades: 156,
        losing_trades: 89,
        win_rate: 63.67,
        average_profit: 510.20,
        average_loss: -285.30,
        largest_win: 2500.00,
        largest_loss: -1200.00,
        total_pnl: 15750.80
      },
      period_stats: {
        last_24h: {
          volume: 2500.00,
          trades: 8,
          pnl: 125.50
        },
        last_7d: {
          volume: 18500.00,
          trades: 45,
          pnl: 890.20
        },
        last_30d: {
          volume: 75000.00,
          trades: 180,
          pnl: 4250.80
        }
      },
      favorite_pairs: [
        { pair: 'SUI/USDC', trades: 85, volume: 45000 },
        { pair: 'ETH/USDC', trades: 62, volume: 38000 },
        { pair: 'BTC/USDC', trades: 45, volume: 28000 }
      ],
      rank: {
        global: 1250,
        percentile: 85.5
      },
      last_updated: new Date().toISOString()
    };

    // If not authenticated, hide sensitive data
    if (!isAuthenticated) {
      delete stats.trading_stats.total_pnl;
      delete stats.period_stats;
      stats.trading_stats.total_volume = Math.round(stats.trading_stats.total_volume / 1000) * 1000; // Round to nearest 1000
    }

    res.json({
      success: true,
      data: stats,
      authenticated: isAuthenticated
    });
  } catch (error) {
    console.error('Error getting trading stats:', error);
    res.status(500).json({
      error: 'Failed to get trading statistics',
      code: 'TRADING_STATS_ERROR'
    });
  }
};
