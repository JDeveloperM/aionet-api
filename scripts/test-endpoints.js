#!/usr/bin/env node

/**
 * Endpoint Testing Script
 * Tests all backend endpoints to ensure they're working correctly
 */

const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

async function testEndpoints() {
  console.log('🧪 Testing AIONET Backend Endpoints...\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test function
  async function test(name, method, endpoint, expectedStatus = 200, headers = {}) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers,
        validateStatus: () => true // Don't throw on any status
      };

      const response = await axios(config);
      const passed = response.status === expectedStatus;
      
      results.tests.push({
        name,
        endpoint,
        method,
        expectedStatus,
        actualStatus: response.status,
        passed
      });

      if (passed) {
        results.passed++;
        console.log(`✅ ${name}`);
      } else {
        results.failed++;
        console.log(`❌ ${name} (Expected: ${expectedStatus}, Got: ${response.status})`);
      }

      return response;
    } catch (error) {
      results.failed++;
      results.tests.push({
        name,
        endpoint,
        method,
        expectedStatus,
        actualStatus: 'ERROR',
        passed: false,
        error: error.message
      });
      console.log(`❌ ${name} (Error: ${error.message})`);
      return null;
    }
  }

  // Health check
  await test('Health Check', 'GET', '/health');

  // Public endpoints (should work without auth)
  await test('NFT Pricing', 'GET', '/api/blockchain/nft/pricing');
  await test('NFT Statistics', 'GET', '/api/blockchain/nft/stats');
  await test('Trading Leaderboard', 'GET', '/api/trading/leaderboard');
  await test('Community Analytics', 'GET', '/api/analytics/community');
  await test('Platform Statistics', 'GET', '/api/analytics/stats');
  await test('pAION Statistics', 'GET', '/api/payments/paion/stats');

  // Protected endpoints (should return 401 without auth)
  await test('User Balance (No Auth)', 'GET', '/api/payments/paion/balance', 401);
  await test('Trading Activities (No Auth)', 'GET', '/api/trading/activities', 401);
  await test('User NFTs (No Auth)', 'GET', '/api/blockchain/nft/list', 401);
  await test('Notifications (No Auth)', 'GET', '/api/notifications', 401);

  // Admin endpoints (should return 401/403 without admin auth)
  await test('Admin Stats (No Auth)', 'GET', '/api/admin/stats', 401);
  await test('Admin Health (No Auth)', 'GET', '/api/admin/health', 401);

  // Invalid endpoints (should return 404)
  await test('Invalid Endpoint', 'GET', '/api/invalid/endpoint', 404);

  // Test with invalid data
  await test('Invalid NFT Tier', 'GET', '/api/blockchain/nft/has/INVALID/0x123', 400);

  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   ${test.name}: ${test.method} ${test.endpoint}`);
        console.log(`   Expected: ${test.expectedStatus}, Got: ${test.actualStatus}`);
        if (test.error) {
          console.log(`   Error: ${test.error}`);
        }
      });
  }

  console.log('\n🔍 Detailed Test Results:');
  results.tests.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${status} ${test.method} ${test.endpoint} - ${test.actualStatus}`);
  });

  return results;
}

// Test with authentication (if token provided)
async function testWithAuth(token) {
  console.log('\n🔐 Testing Authenticated Endpoints...\n');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-User-Address': '0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456'
  };

  // Test authenticated endpoints
  await test('User Balance (With Auth)', 'GET', '/api/payments/paion/balance', 200, headers);
  await test('Trading Activities (With Auth)', 'GET', '/api/trading/activities', 200, headers);
  await test('User NFTs (With Auth)', 'GET', '/api/blockchain/nft/list', 200, headers);
  await test('Notifications (With Auth)', 'GET', '/api/notifications', 200, headers);
  await test('Trading Stats (With Auth)', 'GET', '/api/trading/stats', 200, headers);
}

// Run tests if called directly
if (require.main === module) {
  testEndpoints().then(results => {
    if (results.failed === 0) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Some tests failed!');
      process.exit(1);
    }
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { testEndpoints, testWithAuth };
