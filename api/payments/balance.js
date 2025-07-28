// pAION Balance Vercel Function
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

    // Mock pAION balance data (replace with database query)
    const balanceData = {
      user_address: userAddress,
      balance: 1250.75,
      total_earned: 2500.50,
      total_spent: 1249.75,
      pending_rewards: 45.25,
      earning_sources: {
        trading_rewards: 1200.30,
        social_verification: 150.00,
        referral_bonus: 300.20,
        staking_rewards: 850.00
      },
      spending_breakdown: {
        nft_purchases: 800.50,
        trading_fees: 249.25,
        premium_features: 100.00,
        withdrawals: 100.00
      },
      recent_transactions: [
        {
          type: 'earned',
          amount: 25.50,
          source: 'trading_rewards',
          timestamp: '2024-01-20T10:30:00Z',
          tx_hash: '0xabc123...'
        },
        {
          type: 'spent',
          amount: -15.00,
          source: 'trading_fees',
          timestamp: '2024-01-19T15:45:00Z',
          tx_hash: '0xdef456...'
        }
      ],
      last_updated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: balanceData
    });
  } catch (error) {
    console.error('Error getting pAION balance:', error);
    res.status(500).json({
      error: 'Failed to get pAION balance',
      code: 'BALANCE_ERROR'
    });
  }
};
