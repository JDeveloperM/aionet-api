// Social Verifications Vercel Function
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

    // Mock user verifications (replace with database query)
    const verifications = {
      user_address: userAddress,
      verifications: {
        twitter: {
          verified: true,
          username: '@user123',
          verified_at: '2024-01-15T10:30:00Z',
          rewards_earned: 50
        },
        discord: {
          verified: true,
          username: 'user123#1234',
          verified_at: '2024-01-16T14:20:00Z',
          rewards_earned: 50
        },
        telegram: {
          verified: false,
          username: null,
          verified_at: null,
          rewards_earned: 0
        }
      },
      total_rewards: 100,
      verification_count: 2,
      last_updated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: verifications
    });
  } catch (error) {
    console.error('Error getting user verifications:', error);
    res.status(500).json({
      error: 'Failed to get user verifications',
      code: 'VERIFICATIONS_ERROR'
    });
  }
};
