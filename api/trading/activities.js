// Trading Activities Vercel Function
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Address');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!['GET', 'POST'].includes(req.method)) {
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

    if (req.method === 'GET') {
      // Get trading activities
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const offset = (page - 1) * limit;

      // Mock trading activities (replace with database query)
      const activities = [
        {
          id: 'trade_001',
          user_address: userAddress,
          pair: 'SUI/USDC',
          type: 'buy',
          amount: 1000,
          price: 2.45,
          total: 2450.00,
          fee: 2.45,
          pnl: 125.50,
          timestamp: '2024-01-20T10:30:00Z',
          tx_hash: '0xabc123...'
        },
        {
          id: 'trade_002',
          user_address: userAddress,
          pair: 'ETH/USDC',
          type: 'sell',
          amount: 0.5,
          price: 2800.00,
          total: 1400.00,
          fee: 1.40,
          pnl: -25.30,
          timestamp: '2024-01-19T15:45:00Z',
          tx_hash: '0xdef456...'
        }
      ];

      res.json({
        success: true,
        data: {
          activities: activities.slice(offset, offset + limit),
          pagination: {
            page,
            limit,
            total: activities.length,
            totalPages: Math.ceil(activities.length / limit)
          }
        }
      });
    } else if (req.method === 'POST') {
      // Record new trading activity
      const { pair, type, amount, price, tx_hash } = req.body;

      if (!pair || !type || !amount || !price || !tx_hash) {
        return res.status(400).json({
          error: 'Missing required fields: pair, type, amount, price, tx_hash',
          code: 'MISSING_FIELDS'
        });
      }

      // Mock recording activity (replace with database insert)
      const activity = {
        id: `trade_${Date.now()}`,
        user_address: userAddress,
        pair,
        type,
        amount: parseFloat(amount),
        price: parseFloat(price),
        total: parseFloat(amount) * parseFloat(price),
        fee: (parseFloat(amount) * parseFloat(price)) * 0.001, // 0.1% fee
        timestamp: new Date().toISOString(),
        tx_hash
      };

      console.log(`Trading activity recorded for ${userAddress}: ${type} ${amount} ${pair}`);

      res.json({
        success: true,
        data: activity,
        message: 'Trading activity recorded successfully'
      });
    }
  } catch (error) {
    console.error('Error handling trading activities:', error);
    res.status(500).json({
      error: 'Failed to handle trading activities',
      code: 'TRADING_ACTIVITIES_ERROR'
    });
  }
};
