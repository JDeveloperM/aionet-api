// Auth Refresh Vercel Function
const jwt = require('jsonwebtoken');

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.debug('Token verification failed:', error.message);
    return null;
  }
};

// Generate JWT token
const generateToken = (payload, expiresIn = '7d') => {
  try {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  } catch (error) {
    console.error('Error generating JWT token:', error);
    throw new Error('Token generation failed');
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Address');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify current token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }

    // Get user address from headers
    const userAddress = req.headers['x-user-address'];
    
    if (!userAddress) {
      return res.status(401).json({
        error: 'User address required in X-User-Address header.',
        code: 'NO_USER_ADDRESS'
      });
    }

    // Validate address format
    if (!isValidAddress(userAddress)) {
      return res.status(400).json({
        error: 'Invalid wallet address format.',
        code: 'INVALID_ADDRESS'
      });
    }

    // Generate new token
    const newToken = generateToken({
      address: userAddress,
      type: 'wallet',
      timestamp: Date.now()
    });

    console.log(`Token refreshed for ${userAddress}`);

    res.json({
      success: true,
      data: {
        token: newToken,
        user: {
          address: userAddress,
          type: 'wallet'
        },
        expires_in: process.env.JWT_EXPIRES_IN || '7d'
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
};
