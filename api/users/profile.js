// User Profile Vercel Function
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Address');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!['GET', 'PUT'].includes(req.method)) {
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
      // Get user profile
      const targetAddress = req.query.address || userAddress;
      const isOwnProfile = targetAddress.toLowerCase() === userAddress.toLowerCase();

      // Mock user profile data
      const profile = {
        address: targetAddress,
        username: `user_${targetAddress.slice(-6)}`,
        display_name: isOwnProfile ? 'John Doe' : 'Anonymous User',
        bio: isOwnProfile ? 'DeFi enthusiast and early AIONET adopter' : null,
        avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${targetAddress}`,
        joined_date: '2023-08-15T10:30:00Z',
        last_active: '2024-01-20T15:45:00Z',
        verification_status: {
          email_verified: isOwnProfile ? true : null,
          phone_verified: isOwnProfile ? false : null,
          kyc_verified: isOwnProfile ? 'pending' : null // pending, verified, rejected
        },
        social_links: {
          twitter: isOwnProfile ? '@johndoe' : null,
          discord: isOwnProfile ? 'johndoe#1234' : null,
          telegram: isOwnProfile ? '@johndoe' : null,
          website: isOwnProfile ? 'https://johndoe.com' : null
        },
        public_stats: {
          total_trades: 245,
          trading_volume: 125000,
          nfts_owned: 15,
          social_verifications: 2,
          governance_votes: 8,
          reputation_score: 85.5
        },
        preferences: isOwnProfile ? {
          notifications: {
            email: true,
            push: true,
            trading_alerts: true,
            governance_updates: false
          },
          privacy: {
            show_trading_stats: true,
            show_nft_collection: true,
            show_social_links: false
          },
          trading: {
            default_slippage: 0.5,
            auto_approve_tokens: false,
            preferred_gas_price: 'standard'
          }
        } : null,
        achievements: [
          {
            id: 'early_adopter',
            name: 'Early Adopter',
            description: 'Joined AIONET in the first month',
            earned_date: '2023-08-15T10:30:00Z',
            rarity: 'rare'
          },
          {
            id: 'social_butterfly',
            name: 'Social Butterfly',
            description: 'Verified on all social platforms',
            earned_date: '2023-09-20T14:20:00Z',
            rarity: 'common'
          }
        ],
        is_own_profile: isOwnProfile,
        last_updated: new Date().toISOString()
      };

      res.json({
        success: true,
        data: profile
      });
    } else if (req.method === 'PUT') {
      // Update user profile
      const {
        username,
        display_name,
        bio,
        social_links,
        preferences
      } = req.body;

      // Validate username if provided
      if (username && (username.length < 3 || username.length > 20)) {
        return res.status(400).json({
          error: 'Username must be between 3 and 20 characters',
          code: 'INVALID_USERNAME'
        });
      }

      // Mock profile update
      const updatedProfile = {
        address: userAddress,
        username: username || `user_${userAddress.slice(-6)}`,
        display_name: display_name || 'Anonymous User',
        bio: bio || null,
        social_links: social_links || {},
        preferences: preferences || {},
        last_updated: new Date().toISOString()
      };

      console.log(`Profile updated for ${userAddress}`);

      res.json({
        success: true,
        data: updatedProfile,
        message: 'Profile updated successfully'
      });
    }
  } catch (error) {
    console.error('Error handling user profile:', error);
    res.status(500).json({
      error: 'Failed to handle user profile',
      code: 'PROFILE_ERROR'
    });
  }
};
