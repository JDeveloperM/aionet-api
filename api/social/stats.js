// Social Stats Vercel Function (Public endpoint)
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Mock social verification statistics
    const stats = {
      totalVerifications: 1850,
      platforms: {
        twitter: {
          verified: 1200,
          percentage: 64.9
        },
        discord: {
          verified: 950,
          percentage: 51.4
        },
        telegram: {
          verified: 780,
          percentage: 42.2
        }
      },
      recentVerifications: {
        last24h: 45,
        last7d: 320,
        last30d: 1250
      },
      topVerifiers: [
        { address: '0x1234...5678', platforms: 3, rewards: 150 },
        { address: '0x2345...6789', platforms: 3, rewards: 150 },
        { address: '0x3456...7890', platforms: 2, rewards: 100 }
      ],
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting social stats:', error);
    res.status(500).json({
      error: 'Failed to get social statistics',
      code: 'SOCIAL_STATS_ERROR'
    });
  }
};
