#!/usr/bin/env node

/**
 * Backend Setup Script
 * Initializes the backend service and verifies all connections
 */

// Try to load .env.local first, then fallback to .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { testConnection } = require('../config/database');
const { logger } = require('../config/logger');
const suiService = require('../services/blockchain/sui-service');

async function setupBackend() {
  console.log('🚀 Starting AIONET Backend Setup...\n');

  try {
    // Test database connection
    console.log('📊 Testing database connection...');
    const dbConnected = await testConnection();
    if (dbConnected) {
      console.log('✅ Database connection successful');
    } else {
      console.log('❌ Database connection failed');
      process.exit(1);
    }

    // Test Sui network connection
    console.log('\n🔗 Testing Sui network connection...');
    try {
      const networkInfo = await suiService.getNetworkInfo();
      if (networkInfo) {
        console.log('✅ Sui network connection successful');
        console.log(`   Network: ${networkInfo.network}`);
        console.log(`   Chain ID: ${networkInfo.chainId}`);
      }
    } catch (error) {
      console.log('❌ Sui network connection failed:', error.message);
    }

    // Verify environment variables
    console.log('\n🔧 Checking environment variables...');
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET',
      'ADMIN_WALLET_ADDRESS'
    ];

    let missingVars = [];
    requiredEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    });

    if (missingVars.length > 0) {
      console.log('❌ Missing required environment variables:');
      missingVars.forEach(varName => {
        console.log(`   - ${varName}`);
      });
      console.log('\nPlease set these variables in your .env file');
      process.exit(1);
    } else {
      console.log('✅ All required environment variables are set');
    }

    // Test admin wallet address format
    console.log('\n👤 Validating admin wallet address...');
    const adminAddress = process.env.ADMIN_WALLET_ADDRESS;
    if (suiService.isValidAddress(adminAddress)) {
      console.log('✅ Admin wallet address is valid');
      console.log(`   Address: ${adminAddress}`);
    } else {
      console.log('❌ Admin wallet address is invalid');
      process.exit(1);
    }

    // Create logs directory
    console.log('\n📝 Setting up logging...');
    const fs = require('fs');
    const path = require('path');
    const logsDir = path.join(__dirname, '../logs');
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      console.log('✅ Logs directory created');
    } else {
      console.log('✅ Logs directory exists');
    }

    // Test JWT token generation
    console.log('\n🔐 Testing JWT token generation...');
    try {
      const { generateToken } = require('../middleware/auth');
      const testToken = generateToken({ test: true });
      if (testToken) {
        console.log('✅ JWT token generation working');
      }
    } catch (error) {
      console.log('❌ JWT token generation failed:', error.message);
      process.exit(1);
    }

    console.log('\n🎉 Backend setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Test the health endpoint: curl http://localhost:3001/health');
    console.log('3. Deploy to Vercel: vercel --prod');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupBackend();
}

module.exports = { setupBackend };
