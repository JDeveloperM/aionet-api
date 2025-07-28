// Admin Stats Vercel Function
const jwt = require('jsonwebtoken');

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Check if user is admin
const isAdmin = (userAddress) => {
  const adminAddress = process.env.ADMIN_WALLET_ADDRESS;
  return adminAddress && 
         userAddress && 
         userAddress.toLowerCase() === adminAddress.toLowerCase();
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

    // Verify admin access
    const userAddress = req.headers['x-user-address'];
    if (!userAddress || !isValidAddress(userAddress)) {
      return res.status(401).json({
        error: 'User address required in X-User-Address header.',
        code: 'NO_USER_ADDRESS'
      });
    }

    if (!isAdmin(userAddress)) {
      return res.status(403).json({
        error: 'Admin access required.',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    // Mock admin statistics (replace with real data later)
    const stats = {
      paion: {
        totalSupply: 1000000,
        circulatingSupply: 750000,
        totalHolders: 1250,
        averageBalance: 600
      },
      trading: {
        totalVolume: 2500000,
        totalTrades: 8500,
        activeTraders: 450,
        averageTradeSize: 294.12
      },
      nft: {
        totalMinted: 3200,
        totalCollections: 45,
        totalOwners: 890,
        floorPrice: 0.5
      },
      users: {
        totalUsers: 2100,
        activeUsers: 1650,
        newUsersToday: 25,
        retentionRate: 78.5
      },
      timestamp: new Date().toISOString()
    };

    console.log(`Admin stats accessed by ${userAddress}`);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({
      error: 'Failed to get admin statistics',
      code: 'ADMIN_STATS_ERROR'
    });
  }
};
