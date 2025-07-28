const express = require('express');
const router = express.Router();

const { verifyWalletAddress, createUserRateLimit } = require('../middleware/auth');
const { validateCommonParams, validateNotification } = require('../middleware/validation');
const { logger } = require('../config/logger');
const { supabaseAdmin } = require('../config/database');

/**
 * Notification Routes
 * Handle user notifications
 */

// Apply rate limiting
router.use(createUserRateLimit(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/',
  verifyWalletAddress,
  validateCommonParams,
  async (req, res) => {
    try {
      const userAddress = req.userAddress;
      const { 
        category, 
        type, 
        read, 
        limit = 50, 
        offset = 0 
      } = req.query;
      
      logger.info(`Getting notifications for ${userAddress}`);
      
      let query = supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_address', userAddress);
      
      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }
      if (type) {
        query = query.eq('type', type);
      }
      if (read !== undefined) {
        query = query.eq('read', read === 'true');
      }
      
      query = query
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
      
      const { data: notifications, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Get unread count
      const { count: unreadCount, error: countError } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_address', userAddress)
        .eq('read', false);
      
      if (countError) {
        logger.warn('Error getting unread count:', countError);
      }
      
      res.json({
        success: true,
        data: {
          notifications: notifications || [],
          unreadCount: unreadCount || 0,
          count: notifications?.length || 0
        }
      });
    } catch (error) {
      logger.error('Error getting notifications:', error);
      res.status(500).json({
        error: 'Failed to get notifications',
        code: 'GET_NOTIFICATIONS_ERROR'
      });
    }
  }
);

/**
 * POST /api/notifications
 * Create a new notification (admin only)
 */
router.post('/',
  verifyWalletAddress,
  async (req, res) => {
    try {
      const { user_address, title, message, type, category, metadata = {} } = req.body;
      
      if (!user_address || !title || !message || !type || !category) {
        return res.status(400).json({
          error: 'Missing required fields: user_address, title, message, type, category',
          code: 'MISSING_FIELDS'
        });
      }
      
      // Validate notification data
      const validation = validateNotification({ title, message, type, category });
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.errors,
          code: 'VALIDATION_ERROR'
        });
      }
      
      logger.info(`Creating notification for ${user_address}`);
      
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_address,
          title,
          message,
          type,
          category,
          metadata,
          read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      res.status(201).json({
        success: true,
        data,
        message: 'Notification created successfully'
      });
    } catch (error) {
      logger.error('Error creating notification:', error);
      res.status(500).json({
        error: 'Failed to create notification',
        code: 'CREATE_NOTIFICATION_ERROR'
      });
    }
  }
);

/**
 * PATCH /api/notifications/:id
 * Update notification (mark as read, etc.)
 */
router.patch('/:id',
  verifyWalletAddress,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userAddress = req.userAddress;
      const { read, delivered_at } = req.body;
      
      logger.info(`Updating notification ${id} for ${userAddress}`);
      
      const updateData = {};
      
      if (read !== undefined) {
        updateData.read = read;
      }
      
      if (delivered_at !== undefined) {
        updateData.delivered_at = delivered_at;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: 'No update fields provided',
          code: 'NO_UPDATE_FIELDS'
        });
      }
      
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .update(updateData)
        .eq('id', id)
        .eq('user_address', userAddress)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Notification not found',
            code: 'NOTIFICATION_NOT_FOUND'
          });
        }
        throw error;
      }
      
      res.json({
        success: true,
        data,
        message: 'Notification updated successfully'
      });
    } catch (error) {
      logger.error('Error updating notification:', error);
      res.status(500).json({
        error: 'Failed to update notification',
        code: 'UPDATE_NOTIFICATION_ERROR'
      });
    }
  }
);

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/:id',
  verifyWalletAddress,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userAddress = req.userAddress;
      
      logger.info(`Deleting notification ${id} for ${userAddress}`);
      
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_address', userAddress);
      
      if (error) {
        throw error;
      }
      
      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting notification:', error);
      res.status(500).json({
        error: 'Failed to delete notification',
        code: 'DELETE_NOTIFICATION_ERROR'
      });
    }
  }
);

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.patch('/mark-all-read',
  verifyWalletAddress,
  async (req, res) => {
    try {
      const userAddress = req.userAddress;
      const { category, type } = req.body;
      
      logger.info(`Marking all notifications as read for ${userAddress}`);
      
      let query = supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('user_address', userAddress);
      
      // Apply filters if provided
      if (category) {
        query = query.eq('category', category);
      }
      if (type) {
        query = query.eq('type', type);
      }
      
      const { data, error } = await query.select();
      
      if (error) {
        throw error;
      }
      
      res.json({
        success: true,
        data: {
          updated: data?.length || 0
        },
        message: 'All notifications marked as read'
      });
    } catch (error) {
      logger.error('Error marking notifications as read:', error);
      res.status(500).json({
        error: 'Failed to mark notifications as read',
        code: 'MARK_READ_ERROR'
      });
    }
  }
);

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count',
  verifyWalletAddress,
  async (req, res) => {
    try {
      const userAddress = req.userAddress;
      
      logger.info(`Getting unread count for ${userAddress}`);
      
      const { count, error } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_address', userAddress)
        .eq('read', false);
      
      if (error) {
        throw error;
      }
      
      res.json({
        success: true,
        data: {
          unreadCount: count || 0
        }
      });
    } catch (error) {
      logger.error('Error getting unread count:', error);
      res.status(500).json({
        error: 'Failed to get unread count',
        code: 'GET_UNREAD_COUNT_ERROR'
      });
    }
  }
);

module.exports = router;
