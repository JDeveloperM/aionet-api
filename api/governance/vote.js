// Governance Vote Vercel Function
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

    const { proposal_id, vote, voting_power } = req.body;

    if (!proposal_id || !vote) {
      return res.status(400).json({
        error: 'Proposal ID and vote are required',
        code: 'MISSING_FIELDS'
      });
    }

    if (!['for', 'against', 'abstain'].includes(vote)) {
      return res.status(400).json({
        error: 'Vote must be "for", "against", or "abstain"',
        code: 'INVALID_VOTE'
      });
    }

    // Mock voting power calculation (based on pAION balance)
    const userVotingPower = voting_power || Math.floor(Math.random() * 1000) + 100;

    if (userVotingPower < 100) {
      return res.status(400).json({
        error: 'Insufficient voting power. Minimum 100 pAION required to vote.',
        code: 'INSUFFICIENT_VOTING_POWER'
      });
    }

    // Mock vote recording
    const voteRecord = {
      proposal_id,
      voter: userAddress,
      vote,
      voting_power: userVotingPower,
      timestamp: new Date().toISOString(),
      tx_hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      vote_id: `vote_${Date.now()}`
    };

    // Mock proposal update
    const updatedProposal = {
      id: proposal_id,
      title: 'Increase Trading Fee Rewards',
      votes_for: vote === 'for' ? 15420 + userVotingPower : 15420,
      votes_against: vote === 'against' ? 3280 + userVotingPower : 3280,
      total_votes: 18700 + userVotingPower,
      user_vote: voteRecord
    };

    console.log(`Vote recorded for ${userAddress}: ${vote} on ${proposal_id} with ${userVotingPower} power`);

    res.json({
      success: true,
      data: {
        vote: voteRecord,
        proposal: updatedProposal
      },
      message: `Vote "${vote}" recorded successfully with ${userVotingPower} voting power.`
    });
  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({
      error: 'Failed to record vote',
      code: 'VOTE_ERROR'
    });
  }
};
