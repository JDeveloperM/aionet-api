const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin/admin-controller');
const { verifyWalletAddress, verifyAdmin, createUserRateLimit } = require('../middleware/auth');
const { validateCommonParams } = require('../middleware/validation');

/**
 * Admin Routes
 * All routes require admin authentication
 */

// Apply admin verification to all routes
router.use(verifyWalletAddress);
router.use(verifyAdmin);

// Apply rate limiting for admin routes
router.use(createUserRateLimit(15 * 60 * 1000, 200)); // 200 requests per 15 minutes

/**
 * GET /api/admin/stats
 * Get comprehensive admin statistics
 */
router.get('/stats', adminController.getAdminStats);

/**
 * GET /api/admin/paion-stats
 * Get pAION token statistics
 */
router.get('/paion-stats', adminController.getPaionStats);

/**
 * GET /api/admin/health
 * Get system health status
 */
router.get('/health', adminController.getSystemHealth);

/**
 * POST /api/admin/broadcast
 * Broadcast notification to all users
 */
router.post('/broadcast', adminController.broadcastNotification);

/**
 * GET /api/admin/activity-logs
 * Get admin activity logs
 */
router.get('/activity-logs', validateCommonParams, adminController.getActivityLogs);

module.exports = router;
