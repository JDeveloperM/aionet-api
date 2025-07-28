const { supabaseAdmin } = require('../config/database');
const { logger } = require('../config/logger');

/**
 * User Model
 * Handles user-related database operations
 */

class UserModel {
  /**
   * Get user profile by address
   */
  static async getByAddress(address) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('address', address)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error getting user by address:', error);
      throw error;
    }
  }

  /**
   * Create or update user profile
   */
  static async upsert(userData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .upsert(userData, {
          onConflict: 'address'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error upserting user:', error);
      throw error;
    }
  }

  /**
   * Update user's last login
   */
  static async updateLastLogin(address) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('address', address)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error updating last login:', error);
      throw error;
    }
  }

  /**
   * Update user tier
   */
  static async updateTier(address, tier) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update({ role_tier: tier })
        .eq('address', address)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error updating user tier:', error);
      throw error;
    }
  }

  /**
   * Get all users with pagination
   */
  static async getAll(options = {}) {
    try {
      const { limit = 50, offset = 0, tier, sortBy = 'created_at' } = options;

      let query = supabaseAdmin
        .from('user_profiles')
        .select('*');

      if (tier) {
        query = query.eq('role_tier', tier);
      }

      query = query
        .order(sortBy, { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Get user count by tier
   */
  static async getCountByTier() {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('role_tier');

      if (error) {
        throw error;
      }

      const counts = {
        NOMAD: 0,
        PRO: 0,
        ROYAL: 0,
        total: data?.length || 0
      };

      data?.forEach(user => {
        if (counts.hasOwnProperty(user.role_tier)) {
          counts[user.role_tier]++;
        }
      });

      return counts;
    } catch (error) {
      logger.error('Error getting user count by tier:', error);
      throw error;
    }
  }

  /**
   * Search users
   */
  static async search(searchTerm, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;

      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .or(`address.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  static async delete(address) {
    try {
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('address', address);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }
}

module.exports = UserModel;
