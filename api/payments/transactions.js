// pAION Transactions Vercel Function
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
      // Get transaction history
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const type = req.query.type; // earned, spent, transfer
      const offset = (page - 1) * limit;

      // Mock transaction history
      const transactions = [
        {
          id: 'tx_001',
          type: 'earned',
          amount: 50.00,
          source: 'social_verification',
          description: 'Twitter verification reward',
          timestamp: '2024-01-20T10:30:00Z',
          tx_hash: '0xabc123...',
          status: 'completed'
        },
        {
          id: 'tx_002',
          type: 'spent',
          amount: -15.00,
          source: 'trading_fees',
          description: 'Trading fee payment',
          timestamp: '2024-01-19T15:45:00Z',
          tx_hash: '0xdef456...',
          status: 'completed'
        },
        {
          id: 'tx_003',
          type: 'earned',
          amount: 125.50,
          source: 'trading_rewards',
          description: 'Trading volume rewards',
          timestamp: '2024-01-18T12:00:00Z',
          tx_hash: '0x789abc...',
          status: 'completed'
        },
        {
          id: 'tx_004',
          type: 'transfer',
          amount: -100.00,
          source: 'withdrawal',
          description: 'Withdrawal to external wallet',
          timestamp: '2024-01-17T09:15:00Z',
          tx_hash: '0x456def...',
          status: 'completed',
          to_address: '0x9876...5432'
        }
      ];

      // Filter by type if specified
      let filteredTransactions = transactions;
      if (type) {
        filteredTransactions = transactions.filter(tx => tx.type === type);
      }

      const paginatedTransactions = filteredTransactions.slice(offset, offset + limit);

      res.json({
        success: true,
        data: {
          transactions: paginatedTransactions,
          pagination: {
            page,
            limit,
            total: filteredTransactions.length,
            totalPages: Math.ceil(filteredTransactions.length / limit)
          },
          summary: {
            total_earned: transactions.filter(tx => tx.type === 'earned').reduce((sum, tx) => sum + tx.amount, 0),
            total_spent: Math.abs(transactions.filter(tx => tx.type === 'spent').reduce((sum, tx) => sum + tx.amount, 0)),
            total_transfers: Math.abs(transactions.filter(tx => tx.type === 'transfer').reduce((sum, tx) => sum + tx.amount, 0))
          }
        }
      });
    } else if (req.method === 'POST') {
      // Create new transaction (transfer/withdrawal)
      const { type, amount, to_address, description } = req.body;

      if (!type || !amount) {
        return res.status(400).json({
          error: 'Type and amount are required',
          code: 'MISSING_FIELDS'
        });
      }

      if (type === 'transfer' && !to_address) {
        return res.status(400).json({
          error: 'Destination address required for transfers',
          code: 'MISSING_TO_ADDRESS'
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          error: 'Amount must be positive',
          code: 'INVALID_AMOUNT'
        });
      }

      // Mock balance check
      const currentBalance = 1250.75;
      if (amount > currentBalance) {
        return res.status(400).json({
          error: 'Insufficient balance',
          code: 'INSUFFICIENT_BALANCE'
        });
      }

      // Mock transaction creation
      const transaction = {
        id: `tx_${Date.now()}`,
        type,
        amount: -amount, // Negative for outgoing
        source: type,
        description: description || `${type} transaction`,
        timestamp: new Date().toISOString(),
        tx_hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        status: 'pending',
        to_address: to_address || null
      };

      console.log(`Transaction created for ${userAddress}: ${type} ${amount} pAION`);

      res.json({
        success: true,
        data: transaction,
        message: 'Transaction initiated successfully'
      });
    }
  } catch (error) {
    console.error('Error handling transactions:', error);
    res.status(500).json({
      error: 'Failed to handle transactions',
      code: 'TRANSACTIONS_ERROR'
    });
  }
};
