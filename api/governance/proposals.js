// Governance Proposals Vercel Function
const jwt = require('jsonwebtoken');

// Verify JWT token (optional for GET)
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
    if (req.method === 'GET') {
      // Get governance proposals (public endpoint)
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const status = req.query.status || 'all'; // active, completed, pending, all

      // Mock proposals data
      const proposals = [
        {
          id: 'prop_001',
          title: 'Increase Trading Fee Rewards',
          description: 'Proposal to increase trading fee rewards from 0.05% to 0.08% for pAION holders',
          proposer: '0x1234...5678',
          status: 'active',
          votes_for: 15420,
          votes_against: 3280,
          total_votes: 18700,
          quorum_required: 10000,
          voting_power_required: 1000,
          start_time: '2024-01-15T00:00:00Z',
          end_time: '2024-01-22T23:59:59Z',
          created_at: '2024-01-14T10:00:00Z'
        },
        {
          id: 'prop_002',
          title: 'New NFT Collection Launch',
          description: 'Proposal to launch AIONET Genesis V2 NFT collection with enhanced utilities',
          proposer: '0x2345...6789',
          status: 'completed',
          votes_for: 22100,
          votes_against: 1850,
          total_votes: 23950,
          quorum_required: 10000,
          voting_power_required: 1000,
          start_time: '2024-01-08T00:00:00Z',
          end_time: '2024-01-15T23:59:59Z',
          created_at: '2024-01-07T15:30:00Z',
          result: 'passed'
        }
      ];

      // Filter by status if specified
      let filteredProposals = proposals;
      if (status !== 'all') {
        filteredProposals = proposals.filter(p => p.status === status);
      }

      const offset = (page - 1) * limit;
      const paginatedProposals = filteredProposals.slice(offset, offset + limit);

      res.json({
        success: true,
        data: {
          proposals: paginatedProposals,
          pagination: {
            page,
            limit,
            total: filteredProposals.length,
            totalPages: Math.ceil(filteredProposals.length / limit)
          },
          stats: {
            total_proposals: proposals.length,
            active_proposals: proposals.filter(p => p.status === 'active').length,
            completed_proposals: proposals.filter(p => p.status === 'completed').length
          }
        }
      });
    } else if (req.method === 'POST') {
      // Create new proposal (requires authentication)
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

      const userAddress = req.headers['x-user-address'];
      if (!userAddress || !isValidAddress(userAddress)) {
        return res.status(401).json({
          error: 'User address required in X-User-Address header.',
          code: 'NO_USER_ADDRESS'
        });
      }

      const { title, description, voting_duration_days } = req.body;

      if (!title || !description) {
        return res.status(400).json({
          error: 'Title and description are required',
          code: 'MISSING_FIELDS'
        });
      }

      // Mock proposal creation
      const proposal = {
        id: `prop_${Date.now()}`,
        title,
        description,
        proposer: userAddress,
        status: 'pending',
        votes_for: 0,
        votes_against: 0,
        total_votes: 0,
        quorum_required: 10000,
        voting_power_required: 1000,
        voting_duration_days: voting_duration_days || 7,
        created_at: new Date().toISOString()
      };

      console.log(`New proposal created by ${userAddress}: ${title}`);

      res.json({
        success: true,
        data: proposal,
        message: 'Proposal created successfully. It will be reviewed before voting begins.'
      });
    }
  } catch (error) {
    console.error('Error handling governance proposals:', error);
    res.status(500).json({
      error: 'Failed to handle governance proposals',
      code: 'GOVERNANCE_ERROR'
    });
  }
};
