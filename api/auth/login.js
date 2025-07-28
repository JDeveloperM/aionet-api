// Auth Login Vercel Function
const jwt = require('jsonwebtoken');

// Simple wallet address validation
const validateWalletAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Wallet address must be a string' };
  }
  
  // Basic validation - starts with 0x and has proper length
  if (address.startsWith('0x') && address.length === 42) {
    return { valid: true };
  }
  
  // SUI address validation (starts with 0x and 64 chars)
  if (address.startsWith('0x') && address.length === 66) {
    return { valid: true };
  }
  
  return { valid: false, error: 'Invalid wallet address format' };
};

// Generate JWT token
const generateToken = (payload, expiresIn = '7d') => {
  try {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  } catch (error) {
    console.error('Error generating JWT token:', error);
    throw new Error('Token generation failed');
  }
};

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet_address, signature, message } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        error: 'Wallet address is required',
        code: 'MISSING_WALLET_ADDRESS'
      });
    }

    // Validate wallet address format
    const addressValidation = validateWalletAddress(wallet_address);
    if (!addressValidation.valid) {
      return res.status(400).json({
        error: addressValidation.error,
        code: 'INVALID_WALLET_ADDRESS'
      });
    }

    console.log(`Authentication attempt for ${wallet_address}`);

    // Check if JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not found in environment variables');
      return res.status(500).json({
        error: 'Server configuration error',
        code: 'MISSING_JWT_SECRET'
      });
    }

    // Generate token based on the wallet address
    const token = generateToken({
      address: wallet_address,
      type: 'wallet',
      timestamp: Date.now()
    });

    console.log(`Authentication successful for ${wallet_address}`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          address: wallet_address,
          type: 'wallet'
        },
        expires_in: process.env.JWT_EXPIRES_IN || '7d'
      },
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error('Error in authentication:', error);
    res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};
