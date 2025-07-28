const governanceService = require('../services/governance-service');
const { logger } = require('../config/logger');

/**
 * Governance Controller
 * Handles HTTP requests for governance operations
 */
class GovernanceController {
  /**
   * POST /api/governance/proposals
   * Create a new proposal
   */
  async createProposal(req, res) {
    try {
      const userAddress = req.userAddress;
      const proposalData = req.body;

      // Validate required fields
      if (!proposalData.title || !proposalData.description || !proposalData.category) {
        return res.status(400).json({
          error: 'Title, description, and category are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      const proposal = await governanceService.createProposal(userAddress, proposalData);
      
      res.status(201).json({
        success: true,
        data: proposal
      });
    } catch (error) {
      logger.error('Error creating proposal:', error);
      
      if (error.message.includes('Insufficient voting power')) {
        return res.status(403).json({
          error: error.message,
          code: 'INSUFFICIENT_VOTING_POWER'
        });
      }

      res.status(500).json({
        error: error.message || 'Failed to create proposal',
        code: 'PROPOSAL_CREATION_ERROR'
      });
    }
  }

  /**
   * GET /api/governance/proposals
   * Get all proposals with filters
   */
  async getProposals(req, res) {
    try {
      const filters = {
        status: req.query.status,
        category: req.query.category,
        creator_address: req.query.creator_address,
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0,
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const proposals = await governanceService.getProposals(filters);
      
      res.json({
        success: true,
        data: proposals,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: proposals.length
        }
      });
    } catch (error) {
      logger.error('Error getting proposals:', error);
      res.status(500).json({
        error: 'Failed to get proposals',
        code: 'PROPOSALS_FETCH_ERROR'
      });
    }
  }

  /**
   * GET /api/governance/proposals/:id
   * Get single proposal with detailed information
   */
  async getProposal(req, res) {
    try {
      const proposalId = req.params.id;

      if (!proposalId) {
        return res.status(400).json({
          error: 'Proposal ID is required',
          code: 'MISSING_PROPOSAL_ID'
        });
      }

      const proposal = await governanceService.getProposal(proposalId);
      
      res.json({
        success: true,
        data: proposal
      });
    } catch (error) {
      logger.error('Error getting proposal:', error);
      
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Proposal not found',
          code: 'PROPOSAL_NOT_FOUND'
        });
      }

      res.status(500).json({
        error: 'Failed to get proposal',
        code: 'PROPOSAL_FETCH_ERROR'
      });
    }
  }

  /**
   * POST /api/governance/proposals/:id/vote
   * Cast a vote on a proposal
   */
  async castVote(req, res) {
    try {
      const userAddress = req.userAddress;
      const proposalId = req.params.id;
      const { option, reasoning } = req.body;

      if (!proposalId || !option) {
        return res.status(400).json({
          error: 'Proposal ID and voting option are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      const vote = await governanceService.castVote(
        userAddress,
        proposalId,
        option,
        reasoning
      );
      
      res.status(201).json({
        success: true,
        data: vote
      });
    } catch (error) {
      logger.error('Error casting vote:', error);
      
      if (error.message.includes('already voted')) {
        return res.status(400).json({
          error: error.message,
          code: 'ALREADY_VOTED'
        });
      }

      if (error.message.includes('not active')) {
        return res.status(400).json({
          error: error.message,
          code: 'PROPOSAL_INACTIVE'
        });
      }

      if (error.message.includes('Invalid voting option')) {
        return res.status(400).json({
          error: error.message,
          code: 'INVALID_OPTION'
        });
      }

      res.status(500).json({
        error: error.message || 'Failed to cast vote',
        code: 'VOTE_ERROR'
      });
    }
  }

  /**
   * GET /api/governance/votes
   * Get user's voting history
   */
  async getUserVotes(req, res) {
    try {
      const userAddress = req.userAddress;
      const filters = {
        proposal_id: req.query.proposal_id,
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0
      };

      const votes = await governanceService.getUserVotes(userAddress, filters);
      
      res.json({
        success: true,
        data: votes,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: votes.length
        }
      });
    } catch (error) {
      logger.error('Error getting user votes:', error);
      res.status(500).json({
        error: 'Failed to get voting history',
        code: 'VOTES_FETCH_ERROR'
      });
    }
  }

  /**
   * GET /api/governance/stats
   * Get governance statistics
   */
  async getStats(req, res) {
    try {
      const stats = await governanceService.getGovernanceStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting governance stats:', error);
      res.status(500).json({
        error: 'Failed to get governance statistics',
        code: 'STATS_ERROR'
      });
    }
  }

  /**
   * GET /api/governance/voting-power
   * Get user's voting power
   */
  async getVotingPower(req, res) {
    try {
      const userAddress = req.userAddress;
      
      const votingPower = await governanceService.getUserVotingPower(userAddress);
      
      res.json({
        success: true,
        data: {
          user_address: userAddress,
          voting_power: votingPower,
          tier: votingPower >= 5 ? 'ROYAL' : votingPower >= 3 ? 'PRO' : 'NOMAD'
        }
      });
    } catch (error) {
      logger.error('Error getting voting power:', error);
      res.status(500).json({
        error: 'Failed to get voting power',
        code: 'VOTING_POWER_ERROR'
      });
    }
  }

  /**
   * POST /api/governance/close-expired (Admin only)
   * Close expired proposals
   */
  async closeExpiredProposals(req, res) {
    try {
      // This should be called by admin or cron job
      const closedProposals = await governanceService.closeExpiredProposals();
      
      res.json({
        success: true,
        data: {
          closed_count: closedProposals.length,
          closed_proposals: closedProposals
        }
      });
    } catch (error) {
      logger.error('Error closing expired proposals:', error);
      res.status(500).json({
        error: 'Failed to close expired proposals',
        code: 'CLOSE_PROPOSALS_ERROR'
      });
    }
  }
}

module.exports = new GovernanceController();
