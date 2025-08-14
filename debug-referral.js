/**
 * Debug script to test referral functionality
 * 
 * Usage: node debug-referral.js
 */

// Test Mini App URL parsing
function testMiniAppUrlParsing() {
  console.log('🧪 Testing Mini App URL parsing...');
  
  // Simulate Mini App URL
  const testUrl = 'https://skyton.vercel.app/?start=refID123456';
  const urlParams = new URLSearchParams(new URL(testUrl).search);
  
  const startParam = urlParams.get('start');
  console.log('Start parameter:', startParam);
  
  if (startParam && startParam.startsWith('refID')) {
    const referrerId = startParam.replace('refID', '');
    console.log('✅ Extracted referrer ID:', referrerId);
  } else {
    console.log('❌ Failed to extract referrer ID');
  }
}

// Test API call format
function testApiCall() {
  console.log('\n🧪 Testing API call format...');
  
  const baseUrl = 'https://skyton.vercel.app';
  const adminApiKey = 'adminsumon7891';
  const newUserId = '999888777';
  const referrerId = '123456';
  
  const referralUrl = `${baseUrl}/api/utils?action=refer&api=${encodeURIComponent(adminApiKey)}&new=${encodeURIComponent(newUserId)}&referreby=${encodeURIComponent(referrerId)}`;
  
  console.log('Generated API URL:');
  console.log(referralUrl);
  
  console.log('\nURL Parameters:');
  const url = new URL(referralUrl);
  for (const [key, value] of url.searchParams) {
    console.log(`  ${key}: ${value}`);
  }
}

// Test self-referral prevention
function testSelfReferralPrevention() {
  console.log('\n🧪 Testing self-referral prevention...');
  
  const userId = '123456';
  const referrerId = '123456'; // Same as user ID
  
  const isValidReferral = !(
    !referrerId || 
    referrerId === userId.toString() || 
    referrerId === String(userId) ||
    parseInt(referrerId) === parseInt(userId)
  );
  
  console.log(`User ID: ${userId}`);
  console.log(`Referrer ID: ${referrerId}`);
  console.log(`Is valid referral: ${isValidReferral}`);
  
  if (!isValidReferral) {
    console.log('✅ Self-referral correctly prevented');
  } else {
    console.log('❌ Self-referral not prevented!');
  }
}

// Test environment variables
function testEnvironmentVariables() {
  console.log('\n🧪 Testing environment variables...');
  
  const requiredVars = [
    'VITE_ADMIN_API_KEY',
    'TG_BOT_TOKEN',
    'ADMIN_API_KEY'
  ];
  
  console.log('Required environment variables:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`❌ ${varName}: Not set`);
    }
  });
}

// Main test function
function runTests() {
  console.log('🚀 SkyTON Referral System Debug Tool\n');
  console.log('='.repeat(50));
  
  testMiniAppUrlParsing();
  testApiCall();
  testSelfReferralPrevention();
  testEnvironmentVariables();
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Debug tests completed!');
  
  console.log('\n📋 Common Issues & Solutions:');
  console.log('1. ❌ API Key missing → Set VITE_ADMIN_API_KEY in Vercel');
  console.log('2. ❌ User already exists → API returns 409 error');
  console.log('3. ❌ Self-referral → Check referrer ID validation');
  console.log('4. ❌ URL parsing → Check start parameter format');
  console.log('5. ❌ Network error → Check API endpoint accessibility');
}

// Run tests
runTests();
