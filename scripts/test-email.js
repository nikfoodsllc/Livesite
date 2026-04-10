#!/usr/bin/env node

/**
 * Email Testing Script
 *
 * Tests all three email functions via the /api/test/email API endpoint.
 * Usage: node scripts/test-email.js [email-address]
 *
 * Requirements:
 * - Next.js dev server must be running on http://localhost:3000
 * - RESEND_API_KEY must be configured in .env.local
 */

const http = require('http');

// Configuration
const API_HOST = process.env.HOST || 'localhost';
const API_PORT = process.env.PORT || '3001';
const BASE_URL = `http://${API_HOST}:${API_PORT}`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  dim: '\x1b[2m',
};

// Get test email from command line or use default
const TEST_EMAIL = process.argv[2] || 'test@example.com';

/**
 * Make HTTP POST request to the test endpoint
 */
function makeRequest(testType, email, orderData = null) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      type: testType,
      testEmail: email,
      orderData: orderData,
    });

    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: '/api/test/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Print test result
 */
function printResult(testName, success, details, error = null) {
  const icon = success ? '✓' : '✗';
  const color = success ? colors.green : colors.red;

  console.log(`\n${color}${icon} ${testName}${colors.reset}`);
  console.log(`${colors.dim}─${'─'.repeat(testName.length + 2)}${colors.reset}`);

  if (success) {
    if (details.messageId) {
      console.log(`  Message ID: ${colors.blue}${details.messageId}${colors.reset}`);
    }
    if (details.statusInfo) {
      console.log(`  Status: ${colors.green}${details.statusInfo.status}${colors.reset}`);
      console.log(`  Attempts: ${details.statusInfo.attempts}`);
    }
  } else {
    console.log(`  Error: ${colors.red}${error || 'Unknown error'}${colors.reset}`);
  }

  console.log(`  Timestamp: ${details.timestamp || new Date().toISOString()}`);
}

/**
 * Run all email tests
 */
async function runTests() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}        Email Service Test Suite${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`Test Email: ${colors.yellow}${TEST_EMAIL}${colors.reset}`);
  console.log(`API URL: ${colors.dim}${BASE_URL}${colors.reset}`);

  let passed = 0;
  let failed = 0;

  // Test 1: Password Reset OTP
  console.log(`\n${colors.blue}[1/3]${colors.reset} Testing Password Reset OTP Email...`);
  try {
    const response = await makeRequest('password-reset', TEST_EMAIL);

    if (response.status === 200 && response.data.success && response.data.result.success) {
      printResult('Password Reset OTP', true, response.data.result || {});
      passed++;
    } else {
      printResult('Password Reset OTP', false, response.data, response.data.result?.error || response.data.error);
      failed++;
    }
  } catch (error) {
    printResult('Password Reset OTP', false, {}, error.message);
    failed++;
  }

  // Wait a moment between emails
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Order Confirmation Email
  console.log(`\n${colors.blue}[2/3]${colors.reset} Testing Order Confirmation Email...`);
  try {
    const response = await makeRequest('order-confirmation', TEST_EMAIL);

    if (response.status === 200 && response.data.success && response.data.result.success) {
      printResult('Order Confirmation Email', true, response.data.result || {});
      passed++;
    } else {
      printResult('Order Confirmation Email', false, response.data, response.data.result?.error || response.data.error);
      failed++;
    }
  } catch (error) {
    printResult('Order Confirmation Email', false, {}, error.message);
    failed++;
  }

  // Wait a moment between emails
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Password Reset Confirmation Email
  console.log(`\n${colors.blue}[3/3]${colors.reset} Testing Password Reset Confirmation Email...`);
  try {
    const response = await makeRequest('password-reset-confirmation', TEST_EMAIL);

    if (response.status === 200 && response.data.success && response.data.result.success) {
      printResult('Password Reset Confirmation', true, response.data.result || {});
      passed++;
    } else {
      printResult('Password Reset Confirmation', false, response.data, response.data.result?.error || response.data.error);
      failed++;
    }
  } catch (error) {
    printResult('Password Reset Confirmation', false, {}, error.message);
    failed++;
  }

  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}        Test Summary${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);

  if (failed === 0) {
    console.log(`\n${colors.green}All tests passed! Check your email inbox.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}Some tests failed. Check the logs above.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
