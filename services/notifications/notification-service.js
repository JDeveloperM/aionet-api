const { supabaseAdmin } = require('../../config/database');
const { logger } = require('../../config/logger');
const { NOTIFICATIONS } = require('../../utils/constants');

/**
 * Notification Service
 * Handles notification creation, delivery, and management
 */

class NotificationService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 2 * 60 * 1000; // 2 minutes
  }

  /**
   * Cache management
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Create a notification for a user
   */
  async createNotification(userAddress, notificationData) {
    try {
      const { title, message, type, category, metadata = {} } = notificationData;

      logger.info(`Creating notification for ${userAddress}`);

      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_address: userAddress,
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

      // Clear cache for user
      this.cache.delete(`notifications_${userAddress}`);
      this.cache.delete(`unread_count_${userAddress}`);

      logger.info(`Notification created for ${userAddress}: ${title}`);
      return data;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users
   */
  async createBulkNotifications(userAddresses, notificationData) {
    try {
      const { title, message, type, category, metadata = {} } = notificationData;

      logger.info(`Creating bulk notifications for ${userAddresses.length} users`);

      const notifications = userAddresses.map(userAddress => ({
        user_address: userAddress,
        title,
        message,
        type,
        category,
        metadata,
        read: false,
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) {
        throw error;
      }

      // Clear cache for all users
      userAddresses.forEach(userAddress => {
        this.cache.delete(`notifications_${userAddress}`);
        this.cache.delete(`unread_count_${userAddress}`);
      });

      logger.info(`Bulk notifications created for ${userAddresses.length} users`);
      return data;
    } catch (error) {
      logger.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Broadcast notification to all users
   */
  async broadcastNotification(notificationData) {
    try {
      const { title, message, type, category, metadata = {} } = notificationData;

      logger.info('Broadcasting notification to all users');

      // Get all user addresses
      const { data: users, error: usersError } = await supabaseAdmin
        .from('user_profiles')
        .select('address');

      if (usersError) {
        throw usersError;
      }

      if (!users || users.length === 0) {
        logger.info('No users found for broadcast');
        return { sent: 0 };
      }

      const userAddresses = users.map(user => user.address);
      const notifications = await this.createBulkNotifications(userAddresses, {
        title,
        message,
        type,
        category,
        metadata
      });

      logger.info(`Broadcast notification sent to ${userAddresses.length} users`);
      return { sent: userAddresses.length, notifications };
    } catch (error) {
      logger.error('Error broadcasting notification:', error);
      throw error;
    }
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(userAddress, options = {}) {
    try {
      const {
        category,
        type,
        read,
        limit = 50,
        offset = 0
      } = options;

      const cacheKey = `notifications_${userAddress}_${JSON.stringify(options)}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

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
        query = query.eq('read', read);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: notifications, error } = await query;

      if (error) {
        throw error;
      }

      this.setCachedData(cacheKey, notifications || []);
      return notifications || [];
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userAddress) {
    try {
      const cacheKey = `unread_count_${userAddress}`;
      const cached = this.getCachedData(cacheKey);
      if (cached !== null) return cached;

      logger.info(`Getting unread count for ${userAddress}`);

      const { count, error } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_address', userAddress)
        .eq('read', false);

      if (error) {
        throw error;
      }

      const unreadCount = count || 0;
      this.setCachedData(cacheKey, unreadCount);
      return unreadCount;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userAddress) {
    try {
      logger.info(`Marking notification ${notificationId} as read for ${userAddress}`);

      const { data, error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_address', userAddress)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Clear cache
      this.cache.delete(`notifications_${userAddress}`);
      this.cache.delete(`unread_count_${userAddress}`);

      return data;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userAddress, filters = {}) {
    try {
      const { category, type } = filters;

      logger.info(`Marking all notifications as read for ${userAddress}`);

      let query = supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('user_address', userAddress);

      // Apply filters
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

      // Clear cache
      this.cache.delete(`notifications_${userAddress}`);
      this.cache.delete(`unread_count_${userAddress}`);

      logger.info(`Marked ${data?.length || 0} notifications as read for ${userAddress}`);
      return data?.length || 0;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userAddress) {
    try {
      logger.info(`Deleting notification ${notificationId} for ${userAddress}`);

      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_address', userAddress);

      if (error) {
        throw error;
      }

      // Clear cache
      this.cache.delete(`notifications_${userAddress}`);
      this.cache.delete(`unread_count_${userAddress}`);

      return true;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Create system notification
   */
  async createSystemNotification(userAddress, title, message, metadata = {}) {
    return this.createNotification(userAddress, {
      title,
      message,
      type: NOTIFICATIONS.TYPES.INFO,
      category: NOTIFICATIONS.CATEGORIES.SYSTEM,
      metadata
    });
  }

  /**
   * Create trading notification
   */
  async createTradingNotification(userAddress, title, message, metadata = {}) {
    return this.createNotification(userAddress, {
      title,
      message,
      type: NOTIFICATIONS.TYPES.INFO,
      category: NOTIFICATIONS.CATEGORIES.TRADING,
      metadata
    });
  }

  /**
   * Create NFT notification
   */
  async createNFTNotification(userAddress, title, message, metadata = {}) {
    return this.createNotification(userAddress, {
      title,
      message,
      type: NOTIFICATIONS.TYPES.SUCCESS,
      category: NOTIFICATIONS.CATEGORIES.NFT,
      metadata
    });
  }

  /**
   * Create affiliate notification
   */
  async createAffiliateNotification(userAddress, title, message, metadata = {}) {
    return this.createNotification(userAddress, {
      title,
      message,
      type: NOTIFICATIONS.TYPES.INFO,
      category: NOTIFICATIONS.CATEGORIES.AFFILIATE,
      metadata
    });
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      logger.info(`Cleaning up notifications older than ${daysOld} days`);

      const { data, error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .eq('read', true);

      if (error) {
        throw error;
      }

      // Clear all cache
      this.cache.clear();

      logger.info(`Cleaned up old notifications`);
      return data?.length || 0;
    } catch (error) {
      logger.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
