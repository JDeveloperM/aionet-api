// Main API endpoint - Vercel Function
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const name = req.query.name || 'World';

      return res.status(200).json({
        message: `Hello ${name}! Welcome to AIONET API`,
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        endpoints: {
          health: '/api/health',
          hello: '/api/hello',
          dbTest: '/api/db-test'
        }
      });
    }

    if (req.method === 'POST') {
      return res.status(200).json({
        message: 'API POST endpoint',
        received: req.body,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
