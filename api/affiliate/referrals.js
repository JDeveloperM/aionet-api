// Affiliate Referrals Vercel Function
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
      // Get referral list
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const status = req.query.status; // active, inactive, all
      const offset = (page - 1) * limit;

      // Mock referrals data
      const referrals = [
        {
          id: 'ref_001',
          referred_user: '0x1234...5678',
          referral_code: `AIONET${userAddress.slice(-6).toUpperCase()}`,
          status: 'active',
          joined_date: '2024-01-18T10:30:00Z',
          first_trade_date: '2024-01-19T14:20:00Z',
          total_volume: 15000,
          total_trades: 45,
          commission_earned: 125.50,
          last_activity: '2024-01-20T15:45:00Z',
          tier: 'bronze',
          lifetime_value: 125.50
        },
        {
          id: 'ref_002',
          referred_user: '0x2345...6789',
          referral_code: `AIONET${userAddress.slice(-6).toUpperCase()}`,
          status: 'active',
          joined_date: '2024-01-15T08:15:00Z',
          first_trade_date: '2024-01-16T11:30:00Z',
          total_volume: 28000,
          total_trades: 85,
          commission_earned: 285.20,
          last_activity: '2024-01-20T12:30:00Z',
          tier: 'silver',
          lifetime_value: 285.20
        },
        {
          id: 'ref_003',
          referred_user: '0x3456...7890',
          referral_code: `AIONET${userAddress.slice(-6).toUpperCase()}`,
          status: 'inactive',
          joined_date: '2024-01-10T16:45:00Z',
          first_trade_date: null,
          total_volume: 0,
          total_trades: 0,
          commission_earned: 0,
          last_activity: '2024-01-12T09:20:00Z',
          tier: 'none',
          lifetime_value: 0
        }
      ];

      // Filter by status if specified
      let filteredReferrals = referrals;
      if (status && status !== 'all') {
        filteredReferrals = referrals.filter(ref => ref.status === status);
      }

      const paginatedReferrals = filteredReferrals.slice(offset, offset + limit);

      res.json({
        success: true,
        data: {
          referrals: paginatedReferrals,
          pagination: {
            page,
            limit,
            total: filteredReferrals.length,
            totalPages: Math.ceil(filteredReferrals.length / limit)
          },
          summary: {
            total_referrals: referrals.length,
            active_referrals: referrals.filter(r => r.status === 'active').length,
            inactive_referrals: referrals.filter(r => r.status === 'inactive').length,
            total_commission: referrals.reduce((sum, r) => sum + r.commission_earned, 0),
            total_volume: referrals.reduce((sum, r) => sum + r.total_volume, 0)
          }
        }
      });
    } else if (req.method === 'POST') {
      // Generate or regenerate referral code
      const { action } = req.body; // generate, regenerate

      if (!action || !['generate', 'regenerate'].includes(action)) {
        return res.status(400).json({
          error: 'Action must be "generate" or "regenerate"',
          code: 'INVALID_ACTION'
        });
      }

      // Mock referral code generation
      const referralCode = `AIONET${userAddress.slice(-6).toUpperCase()}${Date.now().toString().slice(-3)}`;
      const referralLink = `https://aionet.app/ref/${referralCode}`;

      const referralData = {
        user_address: userAddress,
        referral_code: referralCode,
        referral_link: referralLink,
        created_at: new Date().toISOString(),
        expires_at: null, // Never expires
        usage_count: 0,
        max_uses: null, // Unlimited
        is_active: true
      };

      console.log(`Referral code ${action}d for ${userAddress}: ${referralCode}`);

      res.json({
        success: true,
        data: referralData,
        message: `Referral code ${action}d successfully`
      });
    }
  } catch (error) {
    console.error('Error handling referrals:', error);
    res.status(500).json({
      error: 'Failed to handle referrals',
      code: 'REFERRALS_ERROR'
    });
  }
};
