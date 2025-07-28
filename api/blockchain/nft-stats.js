// NFT Stats Vercel Function (Public endpoint)
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
    // Mock NFT statistics (replace with real blockchain data)
    const stats = {
      total_collections: 45,
      total_nfts: 3200,
      total_owners: 890,
      total_volume: 125000,
      floor_price: 0.5,
      average_price: 39.06,
      recent_sales: [
        {
          collection: 'AIONET Genesis',
          token_id: '1234',
          price: 2.5,
          buyer: '0x1234...5678',
          seller: '0x2345...6789',
          timestamp: '2024-01-20T10:30:00Z'
        },
        {
          collection: 'AIONET Rare',
          token_id: '5678',
          price: 1.8,
          buyer: '0x3456...7890',
          seller: '0x4567...8901',
          timestamp: '2024-01-20T09:15:00Z'
        }
      ],
      top_collections: [
        {
          name: 'AIONET Genesis',
          total_nfts: 1000,
          owners: 450,
          floor_price: 2.5,
          volume_24h: 15000
        },
        {
          name: 'AIONET Rare',
          total_nfts: 500,
          owners: 280,
          floor_price: 1.8,
          volume_24h: 8500
        },
        {
          name: 'AIONET Common',
          total_nfts: 1700,
          owners: 160,
          floor_price: 0.5,
          volume_24h: 3200
        }
      ],
      trending: [
        {
          collection: 'AIONET Genesis',
          price_change_24h: 15.5,
          volume_change_24h: 25.8
        },
        {
          collection: 'AIONET Rare',
          price_change_24h: 8.2,
          volume_change_24h: 12.4
        }
      ],
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting NFT stats:', error);
    res.status(500).json({
      error: 'Failed to get NFT statistics',
      code: 'NFT_STATS_ERROR'
    });
  }
};
