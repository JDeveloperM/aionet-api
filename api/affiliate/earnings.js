// Affiliate Earnings Vercel Function
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
      // Get earnings history
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const timeframe = req.query.timeframe || '30d'; // 7d, 30d, 90d, all
      const offset = (page - 1) * limit;

      // Mock earnings data
      const earnings = [
        {
          id: 'earn_001',
          referral_id: 'ref_001',
          referred_user: '0x1234...5678',
          earning_type: 'trading_commission',
          amount: 25.50,
          commission_rate: 0.20,
          source_amount: 127.50, // Original trading fee
          timestamp: '2024-01-20T10:30:00Z',
          status: 'confirmed',
          tx_hash: '0xabc123...'
        },
        {
          id: 'earn_002',
          referral_id: 'ref_002',
          referred_user: '0x2345...6789',
          earning_type: 'nft_commission',
          amount: 15.75,
          commission_rate: 0.05,
          source_amount: 315.00, // Original NFT sale
          timestamp: '2024-01-19T15:45:00Z',
          status: 'confirmed',
          tx_hash: '0xdef456...'
        },
        {
          id: 'earn_003',
          referral_id: 'ref_001',
          referred_user: '0x1234...5678',
          earning_type: 'subscription_commission',
          amount: 45.00,
          commission_rate: 0.30,
          source_amount: 150.00, // Original subscription fee
          timestamp: '2024-01-18T12:00:00Z',
          status: 'pending',
          tx_hash: null
        }
      ];

      const paginatedEarnings = earnings.slice(offset, offset + limit);

      // Calculate summary statistics
      const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
      const confirmedEarnings = earnings.filter(e => e.status === 'confirmed').reduce((sum, e) => sum + e.amount, 0);
      const pendingEarnings = earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);

      res.json({
        success: true,
        data: {
          earnings: paginatedEarnings,
          pagination: {
            page,
            limit,
            total: earnings.length,
            totalPages: Math.ceil(earnings.length / limit)
          },
          summary: {
            total_earnings: totalEarnings,
            confirmed_earnings: confirmedEarnings,
            pending_earnings: pendingEarnings,
            earnings_this_month: 285.30,
            average_commission_rate: 0.18,
            top_earning_type: 'trading_commission'
          },
          breakdown_by_type: {
            trading_commission: earnings.filter(e => e.earning_type === 'trading_commission').reduce((sum, e) => sum + e.amount, 0),
            nft_commission: earnings.filter(e => e.earning_type === 'nft_commission').reduce((sum, e) => sum + e.amount, 0),
            subscription_commission: earnings.filter(e => e.earning_type === 'subscription_commission').reduce((sum, e) => sum + e.amount, 0)
          }
        }
      });
    } else if (req.method === 'POST') {
      // Request payout
      const { amount, payout_method } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          error: 'Valid payout amount is required',
          code: 'INVALID_AMOUNT'
        });
      }

      if (!payout_method || !['wallet', 'paion'].includes(payout_method)) {
        return res.status(400).json({
          error: 'Payout method must be "wallet" or "paion"',
          code: 'INVALID_PAYOUT_METHOD'
        });
      }

      // Mock available balance check
      const availableBalance = 1125.25;
      const minimumPayout = 50.00;

      if (amount > availableBalance) {
        return res.status(400).json({
          error: 'Insufficient available balance',
          code: 'INSUFFICIENT_BALANCE',
          available_balance: availableBalance
        });
      }

      if (amount < minimumPayout) {
        return res.status(400).json({
          error: `Minimum payout amount is ${minimumPayout} pAION`,
          code: 'BELOW_MINIMUM_PAYOUT',
          minimum_payout: minimumPayout
        });
      }

      // Mock payout request
      const payoutRequest = {
        id: `payout_${Date.now()}`,
        user_address: userAddress,
        amount,
        payout_method,
        status: 'pending',
        requested_at: new Date().toISOString(),
        estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        fee: amount * 0.02, // 2% fee
        net_amount: amount * 0.98
      };

      console.log(`Payout requested by ${userAddress}: ${amount} pAION via ${payout_method}`);

      res.json({
        success: true,
        data: payoutRequest,
        message: 'Payout request submitted successfully. Processing time: 24-48 hours.'
      });
    }
  } catch (error) {
    console.error('Error handling affiliate earnings:', error);
    res.status(500).json({
      error: 'Failed to handle affiliate earnings',
      code: 'EARNINGS_ERROR'
    });
  }
};
