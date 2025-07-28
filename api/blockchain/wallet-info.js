// Blockchain Wallet Info Vercel Function
const jwt = require('jsonwebtoken');

// Verify JWT token (optional)
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
    // Get wallet address from query or headers
    const walletAddress = req.query.address || req.headers['x-user-address'];

    if (!walletAddress || !isValidAddress(walletAddress)) {
      return res.status(400).json({
        error: 'Valid wallet address required',
        code: 'INVALID_WALLET_ADDRESS'
      });
    }

    let isAuthenticated = false;
    let isOwnWallet = false;

    // Optional authentication check
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded) {
        isAuthenticated = true;
        const userAddress = req.headers['x-user-address'];
        isOwnWallet = userAddress && userAddress.toLowerCase() === walletAddress.toLowerCase();
      }
    }

    // Mock wallet information
    const walletInfo = {
      address: walletAddress,
      balances: {
        sui: 1250.75,
        usdc: 5000.00,
        paion: 850.25,
        other_tokens: [
          { symbol: 'WETH', balance: 2.5, value_usd: 6250.00 },
          { symbol: 'USDT', balance: 1000.00, value_usd: 1000.00 }
        ]
      },
      nft_holdings: {
        total_nfts: 15,
        collections: [
          { name: 'AIONET Genesis', count: 5, floor_value: 12.5 },
          { name: 'AIONET Rare', count: 3, floor_value: 5.4 },
          { name: 'Other Collections', count: 7, floor_value: 8.2 }
        ],
        total_value: 125.8
      },
      transaction_stats: {
        total_transactions: 245,
        first_transaction: '2023-08-15T10:30:00Z',
        last_transaction: '2024-01-20T15:45:00Z',
        most_active_day: '2024-01-15',
        transaction_frequency: 'High' // High, Medium, Low
      },
      defi_positions: {
        staking: {
          paion_staked: 500.00,
          rewards_earned: 45.25,
          apy: 12.5
        },
        liquidity_pools: [
          { pair: 'SUI/USDC', liquidity: 2500.00, rewards: 125.50 },
          { pair: 'PAION/SUI', liquidity: 1200.00, rewards: 85.20 }
        ]
      },
      risk_score: 'Low', // Low, Medium, High
      wallet_age_days: 158,
      is_contract: false,
      last_updated: new Date().toISOString()
    };

    // Hide sensitive information if not authenticated or not own wallet
    if (!isAuthenticated || !isOwnWallet) {
      // Round balances and hide exact amounts
      walletInfo.balances.sui = Math.round(walletInfo.balances.sui / 100) * 100;
      walletInfo.balances.usdc = Math.round(walletInfo.balances.usdc / 1000) * 1000;
      walletInfo.balances.paion = Math.round(walletInfo.balances.paion / 100) * 100;
      
      // Hide detailed DeFi positions
      delete walletInfo.defi_positions.staking.rewards_earned;
      walletInfo.defi_positions.liquidity_pools = walletInfo.defi_positions.liquidity_pools.map(pool => ({
        pair: pool.pair,
        liquidity: Math.round(pool.liquidity / 500) * 500,
        rewards: '***'
      }));
    }

    res.json({
      success: true,
      data: walletInfo,
      authenticated: isAuthenticated,
      own_wallet: isOwnWallet
    });
  } catch (error) {
    console.error('Error getting wallet info:', error);
    res.status(500).json({
      error: 'Failed to get wallet information',
      code: 'WALLET_INFO_ERROR'
    });
  }
};
