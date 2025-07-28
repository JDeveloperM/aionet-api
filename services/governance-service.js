const { supabaseAdmin } = require('../config/database');
const { logger } = require('../config/logger');

/**
 * Governance Service
 * Handles proposal creation, voting, and governance operations
 */
class GovernanceService {
  constructor() {
    this.CACHE_TTL = {
      proposals: 2 * 60 * 1000, // 2 minutes
      votes: 1 * 60 * 1000, // 1 minute
      stats: 5 * 60 * 1000 // 5 minutes
    };
    this.cache = new Map();

    // Voting power based on NFT tier
    this.VOTING_POWER = {
      NOMAD: 1,
      PRO: 3,
      ROYAL: 5
    };

    // Proposal requirements
    this.PROPOSAL_REQUIREMENTS = {
      MIN_VOTING_POWER: 3, // Minimum PRO tier to create proposals
      VOTING_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
      QUORUM_PERCENTAGE: 10 // 10% of total voting power needed
    };
  }

  /**
   * Cache management
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data, ttl = this.CACHE_TTL.proposals) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get user's voting power based on NFT tier
   */
  async getUserVotingPower(userAddress) {
    try {
      // Get user's NFT tier (this would call the NFT service)
      const { data: tierData, error } = await supabaseAdmin
        .from('user_nft_tiers')
        .select('tier')
        .eq('user_address', userAddress)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const tier = tierData?.tier || 'NOMAD';
      return this.VOTING_POWER[tier] || 1;
    } catch (error) {
      logger.error('Error getting user voting power:', error);
      return 1; // Default to NOMAD power
    }
  }

  /**
   * Create a new proposal
   */
  async createProposal(userAddress, proposalData) {
    try {
      logger.info(`Creating proposal by ${userAddress}`);

      // Check if user has minimum voting power to create proposals
      const votingPower = await this.getUserVotingPower(userAddress);
      if (votingPower < this.PROPOSAL_REQUIREMENTS.MIN_VOTING_POWER) {
        throw new Error('Insufficient voting power to create proposals. Minimum PRO tier required.');
      }

      // Validate proposal data
      if (!proposalData.title || !proposalData.description || !proposalData.category) {
        throw new Error('Missing required proposal fields');
      }

      const endDate = new Date(Date.now() + this.PROPOSAL_REQUIREMENTS.VOTING_DURATION);

      const { data: proposal, error } = await supabaseAdmin
        .from('governance_proposals')
        .insert({
          creator_address: userAddress,
          title: proposalData.title,
          description: proposalData.description,
          category: proposalData.category,
          options: proposalData.options || ['Yes', 'No'],
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          created_at: new Date().toISOString(),
          metadata: proposalData.metadata || {}
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Clear proposals cache
      this.cache.delete('active_proposals');
      this.cache.delete('all_proposals');

      logger.info(`Proposal created successfully: ${proposal.id}`);
      return proposal;
    } catch (error) {
      logger.error('Error creating proposal:', error);
      throw error;
    }
  }

  /**
   * Get all proposals
   */
  async getProposals(filters = {}) {
    try {
      const cacheKey = `proposals_${JSON.stringify(filters)}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info('Getting governance proposals', filters);

      let query = supabaseAdmin
        .from('governance_proposals')
        .select(`
          *,
          vote_counts:governance_votes(count),
          total_voting_power:governance_votes(voting_power.sum())
        `);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.creator_address) {
        query = query.eq('creator_address', filters.creator_address);
      }

      // Pagination
      const limit = Math.min(filters.limit || 20, 100);
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Sorting
      const sortBy = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data: proposals, error } = await query;

      if (error) {
        throw error;
      }

      // Process proposals to add computed fields
      const processedProposals = proposals.map(proposal => ({
        ...proposal,
        is_active: proposal.status === 'active' && new Date(proposal.end_date) > new Date(),
        time_remaining: Math.max(0, new Date(proposal.end_date) - new Date()),
        total_votes: proposal.vote_counts?.length || 0,
        total_voting_power: proposal.total_voting_power || 0
      }));

      this.setCachedData(cacheKey, processedProposals);
      return processedProposals;
    } catch (error) {
      logger.error('Error getting proposals:', error);
      throw error;
    }
  }

  /**
   * Get single proposal with detailed vote information
   */
  async getProposal(proposalId) {
    try {
      const cacheKey = `proposal_${proposalId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting proposal ${proposalId}`);

      const { data: proposal, error } = await supabaseAdmin
        .from('governance_proposals')
        .select(`
          *,
          votes:governance_votes(*)
        `)
        .eq('id', proposalId)
        .single();

      if (error) {
        throw error;
      }

      // Calculate vote statistics
      const voteStats = {};
      proposal.options.forEach(option => {
        voteStats[option] = {
          count: 0,
          voting_power: 0
        };
      });

      proposal.votes.forEach(vote => {
        if (voteStats[vote.option]) {
          voteStats[vote.option].count++;
          voteStats[vote.option].voting_power += vote.voting_power;
        }
      });

      const processedProposal = {
        ...proposal,
        vote_statistics: voteStats,
        total_votes: proposal.votes.length,
        total_voting_power: proposal.votes.reduce((sum, vote) => sum + vote.voting_power, 0),
        is_active: proposal.status === 'active' && new Date(proposal.end_date) > new Date(),
        time_remaining: Math.max(0, new Date(proposal.end_date) - new Date())
      };

      this.setCachedData(cacheKey, processedProposal);
      return processedProposal;
    } catch (error) {
      logger.error('Error getting proposal:', error);
      throw error;
    }
  }

  /**
   * Cast a vote on a proposal
   */
  async castVote(userAddress, proposalId, option, reasoning = '') {
    try {
      logger.info(`User ${userAddress} voting on proposal ${proposalId}: ${option}`);

      // Get proposal to verify it's active
      const proposal = await this.getProposal(proposalId);
      if (!proposal.is_active) {
        throw new Error('Proposal is not active or has ended');
      }

      // Check if user already voted
      const { data: existingVote } = await supabaseAdmin
        .from('governance_votes')
        .select('*')
        .eq('proposal_id', proposalId)
        .eq('voter_address', userAddress)
        .single();

      if (existingVote) {
        throw new Error('User has already voted on this proposal');
      }

      // Validate option
      if (!proposal.options.includes(option)) {
        throw new Error('Invalid voting option');
      }

      // Get user's voting power
      const votingPower = await this.getUserVotingPower(userAddress);

      // Record the vote
      const { data: vote, error } = await supabaseAdmin
        .from('governance_votes')
        .insert({
          proposal_id: proposalId,
          voter_address: userAddress,
          option: option,
          voting_power: votingPower,
          reasoning: reasoning,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Clear relevant caches
      this.cache.delete(`proposal_${proposalId}`);
      this.cache.delete(`user_votes_${userAddress}`);

      logger.info(`Vote cast successfully: ${vote.id}`);
      return vote;
    } catch (error) {
      logger.error('Error casting vote:', error);
      throw error;
    }
  }

  /**
   * Get user's voting history
   */
  async getUserVotes(userAddress, filters = {}) {
    try {
      const cacheKey = `user_votes_${userAddress}_${JSON.stringify(filters)}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting votes for user ${userAddress}`);

      let query = supabaseAdmin
        .from('governance_votes')
        .select(`
          *,
          proposal:governance_proposals(*)
        `)
        .eq('voter_address', userAddress);

      // Apply filters
      if (filters.proposal_id) {
        query = query.eq('proposal_id', filters.proposal_id);
      }

      // Pagination
      const limit = Math.min(filters.limit || 20, 100);
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      query = query.order('created_at', { ascending: false });

      const { data: votes, error } = await query;

      if (error) {
        throw error;
      }

      this.setCachedData(cacheKey, votes, this.CACHE_TTL.votes);
      return votes;
    } catch (error) {
      logger.error('Error getting user votes:', error);
      throw error;
    }
  }

  /**
   * Get governance statistics
   */
  async getGovernanceStats() {
    try {
      const cacheKey = 'governance_stats';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info('Getting governance statistics');

      // Get proposal statistics
      const { data: proposalStats, error: proposalError } = await supabaseAdmin
        .from('governance_proposals')
        .select('status, category, created_at');

      if (proposalError) {
        throw proposalError;
      }

      // Get vote statistics
      const { data: voteStats, error: voteError } = await supabaseAdmin
        .from('governance_votes')
        .select('voting_power, created_at');

      if (voteError) {
        throw voteError;
      }

      const stats = {
        proposals: {
          total: proposalStats.length,
          active: proposalStats.filter(p => p.status === 'active').length,
          completed: proposalStats.filter(p => p.status === 'completed').length,
          by_category: proposalStats.reduce((acc, p) => {
            acc[p.category] = (acc[p.category] || 0) + 1;
            return acc;
          }, {})
        },
        votes: {
          total: voteStats.length,
          total_voting_power: voteStats.reduce((sum, v) => sum + v.voting_power, 0),
          this_month: voteStats.filter(v => 
            new Date(v.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ).length
        },
        participation: {
          average_votes_per_proposal: proposalStats.length > 0 
            ? (voteStats.length / proposalStats.length).toFixed(2)
            : 0
        }
      };

      this.setCachedData(cacheKey, stats, this.CACHE_TTL.stats);
      return stats;
    } catch (error) {
      logger.error('Error getting governance stats:', error);
      throw error;
    }
  }

  /**
   * Close expired proposals
   */
  async closeExpiredProposals() {
    try {
      logger.info('Closing expired proposals');

      const { data: expiredProposals, error } = await supabaseAdmin
        .from('governance_proposals')
        .update({ status: 'completed' })
        .eq('status', 'active')
        .lt('end_date', new Date().toISOString())
        .select();

      if (error) {
        throw error;
      }

      // Clear caches
      this.cache.clear();

      logger.info(`Closed ${expiredProposals.length} expired proposals`);
      return expiredProposals;
    } catch (error) {
      logger.error('Error closing expired proposals:', error);
      throw error;
    }
  }
}

module.exports = new GovernanceService();
