// Social Twitter Verification Vercel Function
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

    const { twitter_username, tweet_url } = req.body;

    if (!twitter_username || !tweet_url) {
      return res.status(400).json({
        error: 'Twitter username and tweet URL are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Mock Twitter verification (replace with actual Twitter API integration)
    const isFollowing = Math.random() > 0.3; // 70% success rate for demo
    const isValidTweet = tweet_url.includes('twitter.com') || tweet_url.includes('x.com');

    if (!isValidTweet) {
      return res.status(400).json({
        error: 'Invalid Twitter/X URL format',
        code: 'INVALID_TWEET_URL'
      });
    }

    if (!isFollowing) {
      return res.status(400).json({
        error: 'Twitter follow verification failed. Please ensure you are following @AIONET_Official',
        code: 'FOLLOW_VERIFICATION_FAILED'
      });
    }

    // Mock successful verification
    const verification = {
      platform: 'twitter',
      user_address: userAddress,
      username: twitter_username,
      verified: true,
      verified_at: new Date().toISOString(),
      tweet_url,
      rewards_earned: 50,
      verification_id: `twitter_${Date.now()}`
    };

    console.log(`Twitter verification successful for ${userAddress}: @${twitter_username}`);

    res.json({
      success: true,
      data: verification,
      message: 'Twitter verification successful! 50 pAION tokens earned.'
    });
  } catch (error) {
    console.error('Error in Twitter verification:', error);
    res.status(500).json({
      error: 'Twitter verification failed',
      code: 'TWITTER_VERIFICATION_ERROR'
    });
  }
};
