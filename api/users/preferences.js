// User Preferences Vercel Function
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
      // Get user preferences
      const preferences = {
        user_address: userAddress,
        notifications: {
          email_enabled: true,
          push_enabled: true,
          trading_alerts: true,
          price_alerts: true,
          governance_updates: false,
          social_mentions: true,
          affiliate_updates: true,
          security_alerts: true
        },
        privacy: {
          show_trading_stats: true,
          show_nft_collection: true,
          show_social_links: false,
          show_affiliate_stats: false,
          public_profile: true,
          allow_direct_messages: true
        },
        trading: {
          default_slippage: 0.5,
          auto_approve_tokens: false,
          preferred_gas_price: 'standard', // low, standard, high
          max_gas_price: 50,
          trading_mode: 'advanced', // simple, advanced
          show_advanced_charts: true,
          default_trade_amount: 100
        },
        display: {
          theme: 'dark', // light, dark, auto
          language: 'en',
          currency: 'USD',
          timezone: 'UTC',
          date_format: 'MM/DD/YYYY',
          number_format: 'en-US'
        },
        security: {
          two_factor_enabled: false,
          session_timeout: 24, // hours
          require_confirmation_for_trades: true,
          require_confirmation_for_withdrawals: true,
          whitelist_addresses: []
        },
        affiliate: {
          show_referral_link: true,
          auto_share_achievements: false,
          commission_notifications: true
        },
        last_updated: new Date().toISOString()
      };

      res.json({
        success: true,
        data: preferences
      });
    } else if (req.method === 'PUT') {
      // Update user preferences
      const {
        notifications,
        privacy,
        trading,
        display,
        security,
        affiliate
      } = req.body;

      // Validate trading preferences
      if (trading?.default_slippage && (trading.default_slippage < 0.1 || trading.default_slippage > 10)) {
        return res.status(400).json({
          error: 'Default slippage must be between 0.1% and 10%',
          code: 'INVALID_SLIPPAGE'
        });
      }

      if (trading?.max_gas_price && (trading.max_gas_price < 1 || trading.max_gas_price > 1000)) {
        return res.status(400).json({
          error: 'Max gas price must be between 1 and 1000 gwei',
          code: 'INVALID_GAS_PRICE'
        });
      }

      // Mock preferences update
      const updatedPreferences = {
        user_address: userAddress,
        notifications: notifications || {},
        privacy: privacy || {},
        trading: trading || {},
        display: display || {},
        security: security || {},
        affiliate: affiliate || {},
        last_updated: new Date().toISOString()
      };

      console.log(`Preferences updated for ${userAddress}`);

      res.json({
        success: true,
        data: updatedPreferences,
        message: 'Preferences updated successfully'
      });
    }
  } catch (error) {
    console.error('Error handling user preferences:', error);
    res.status(500).json({
      error: 'Failed to handle user preferences',
      code: 'PREFERENCES_ERROR'
    });
  }
};
