const express = require('express');
const router = express.Router();
const { verifyWalletAddress, verifyAdmin } = require('../middleware/auth');
const governanceController = require('../controllers/governance-controller');

/**
 * Governance Routes
 * Mix of public and authenticated endpoints
 */

/**
 * POST /api/governance/proposals
 * Create a new proposal (authenticated)
 */
router.post('/proposals', verifyWalletAddress, governanceController.createProposal);

/**
 * GET /api/governance/proposals
 * Get all proposals with filters (public)
 */
router.get('/proposals', governanceController.getProposals);

/**
 * GET /api/governance/proposals/:id
 * Get single proposal with detailed information (public)
 */
router.get('/proposals/:id', governanceController.getProposal);

/**
 * POST /api/governance/proposals/:id/vote
 * Cast a vote on a proposal (authenticated)
 */
router.post('/proposals/:id/vote', verifyWalletAddress, governanceController.castVote);

/**
 * GET /api/governance/votes
 * Get user's voting history (authenticated)
 */
router.get('/votes', verifyWalletAddress, governanceController.getUserVotes);

/**
 * GET /api/governance/stats
 * Get governance statistics (public)
 */
router.get('/stats', governanceController.getStats);

/**
 * GET /api/governance/voting-power
 * Get user's voting power (authenticated)
 */
router.get('/voting-power', verifyWalletAddress, governanceController.getVotingPower);

/**
 * POST /api/governance/close-expired
 * Close expired proposals (admin only)
 */
router.post('/close-expired', verifyAdmin, governanceController.closeExpiredProposals);

module.exports = router;
