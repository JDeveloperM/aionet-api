// Social Telegram Verification Vercel Function
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

    const { telegram_username, telegram_id } = req.body;

    if (!telegram_username || !telegram_id) {
      return res.status(400).json({
        error: 'Telegram username and Telegram ID are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Mock Telegram verification (replace with actual Telegram Bot API integration)
    const isMember = Math.random() > 0.25; // 75% success rate for demo
    const isValidId = telegram_id.match(/^\d+$/); // Telegram ID format

    if (!isValidId) {
      return res.status(400).json({
        error: 'Invalid Telegram ID format',
        code: 'INVALID_TELEGRAM_ID'
      });
    }

    if (!isMember) {
      return res.status(400).json({
        error: 'Telegram membership verification failed. Please join the AIONET Telegram channel',
        code: 'MEMBERSHIP_VERIFICATION_FAILED'
      });
    }

    // Mock successful verification
    const verification = {
      platform: 'telegram',
      user_address: userAddress,
      username: telegram_username,
      telegram_id,
      verified: true,
      verified_at: new Date().toISOString(),
      channel_name: 'AIONET Official',
      rewards_earned: 50,
      verification_id: `telegram_${Date.now()}`
    };

    console.log(`Telegram verification successful for ${userAddress}: @${telegram_username}`);

    res.json({
      success: true,
      data: verification,
      message: 'Telegram verification successful! 50 pAION tokens earned.'
    });
  } catch (error) {
    console.error('Error in Telegram verification:', error);
    res.status(500).json({
      error: 'Telegram verification failed',
      code: 'TELEGRAM_VERIFICATION_ERROR'
    });
  }
};
