// Social Discord Verification Vercel Function
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

    const { discord_username, discord_id } = req.body;

    if (!discord_username || !discord_id) {
      return res.status(400).json({
        error: 'Discord username and Discord ID are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Mock Discord verification (replace with actual Discord API integration)
    const isMember = Math.random() > 0.2; // 80% success rate for demo
    const isValidId = discord_id.match(/^\d{17,19}$/); // Discord ID format

    if (!isValidId) {
      return res.status(400).json({
        error: 'Invalid Discord ID format',
        code: 'INVALID_DISCORD_ID'
      });
    }

    if (!isMember) {
      return res.status(400).json({
        error: 'Discord membership verification failed. Please join the AIONET Discord server',
        code: 'MEMBERSHIP_VERIFICATION_FAILED'
      });
    }

    // Mock successful verification
    const verification = {
      platform: 'discord',
      user_address: userAddress,
      username: discord_username,
      discord_id,
      verified: true,
      verified_at: new Date().toISOString(),
      server_name: 'AIONET Official',
      rewards_earned: 50,
      verification_id: `discord_${Date.now()}`
    };

    console.log(`Discord verification successful for ${userAddress}: ${discord_username}`);

    res.json({
      success: true,
      data: verification,
      message: 'Discord verification successful! 50 pAION tokens earned.'
    });
  } catch (error) {
    console.error('Error in Discord verification:', error);
    res.status(500).json({
      error: 'Discord verification failed',
      code: 'DISCORD_VERIFICATION_ERROR'
    });
  }
};
