// User Notifications Vercel Function
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Address');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!['GET', 'POST', 'PATCH'].includes(req.method)) {
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
      // Get user notifications
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const unread_only = req.query.unread_only === 'true';

      // Mock notifications
      const notifications = [
        {
          id: 'notif_001',
          type: 'reward',
          title: 'pAION Tokens Earned',
          message: 'You earned 50 pAION tokens for Twitter verification',
          data: { amount: 50, source: 'social_verification' },
          read: false,
          created_at: '2024-01-20T10:30:00Z'
        },
        {
          id: 'notif_002',
          type: 'trading',
          title: 'Trade Executed',
          message: 'Your buy order for 1000 SUI/USDC was executed at $2.45',
          data: { pair: 'SUI/USDC', amount: 1000, price: 2.45 },
          read: true,
          created_at: '2024-01-19T15:45:00Z'
        },
        {
          id: 'notif_003',
          type: 'governance',
          title: 'New Proposal',
          message: 'A new governance proposal "Increase Trading Rewards" is now live',
          data: { proposal_id: 'prop_001' },
          read: false,
          created_at: '2024-01-18T12:00:00Z'
        }
      ];

      let filteredNotifications = notifications;
      if (unread_only) {
        filteredNotifications = notifications.filter(n => !n.read);
      }

      const offset = (page - 1) * limit;
      const paginatedNotifications = filteredNotifications.slice(offset, offset + limit);

      res.json({
        success: true,
        data: {
          notifications: paginatedNotifications,
          pagination: {
            page,
            limit,
            total: filteredNotifications.length,
            totalPages: Math.ceil(filteredNotifications.length / limit)
          },
          unread_count: notifications.filter(n => !n.read).length
        }
      });
    } else if (req.method === 'PATCH') {
      // Mark notifications as read
      const { notification_ids, mark_all_read } = req.body;

      if (mark_all_read) {
        console.log(`All notifications marked as read for ${userAddress}`);
        res.json({
          success: true,
          message: 'All notifications marked as read',
          updated_count: 5
        });
      } else if (notification_ids && Array.isArray(notification_ids)) {
        console.log(`Notifications ${notification_ids.join(', ')} marked as read for ${userAddress}`);
        res.json({
          success: true,
          message: 'Notifications marked as read',
          updated_count: notification_ids.length
        });
      } else {
        return res.status(400).json({
          error: 'Either notification_ids array or mark_all_read flag is required',
          code: 'MISSING_FIELDS'
        });
      }
    }
  } catch (error) {
    console.error('Error handling notifications:', error);
    res.status(500).json({
      error: 'Failed to handle notifications',
      code: 'NOTIFICATIONS_ERROR'
    });
  }
};
