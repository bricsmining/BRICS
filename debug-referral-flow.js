/**
 * Debug script to trace referral flow issues
 */

console.log('🔍 Debugging Referral Flow Issues\n');

// Test URL parsing for Mini App referral
const testUrl = 'https://t.me/xSkyTON_Bot/app?start=refID123456';
console.log('Test URL:', testUrl);

// Simulate URL parsing
const url = new URL(testUrl);
const urlParams = new URLSearchParams(url.search);

console.log('\n📊 URL Parameters:');
console.log('- search:', url.search);
console.log('- start param:', urlParams.get('start'));
console.log('- referred param:', urlParams.get('referred'));
console.log('- referrer param:', urlParams.get('referrer'));

// Simulate Mini App referral parsing
const startParam = urlParams.get('start');
let urlReferrerId = urlParams.get('referrer');

console.log('\n🔄 Referral ID Extraction:');
console.log('- startParam:', startParam);
console.log('- initial urlReferrerId:', urlReferrerId);

if (startParam && !urlReferrerId) {
  if (startParam.startsWith('refID')) {
    urlReferrerId = startParam.replace('refID', '');
    console.log('✅ Mini App referral detected:', { startParam, urlReferrerId });
  }
}

console.log('- final urlReferrerId:', urlReferrerId);

// Test different URL scenarios
console.log('\n🧪 Testing Different URL Scenarios:');

const testCases = [
  'https://t.me/xSkyTON_Bot/app?start=refID123456',
  'https://skyton.vercel.app/?start=refID123456', 
  'https://skyton.vercel.app/?referred=true&referrer=123456',
  'https://skyton.vercel.app/'
];

testCases.forEach((testUrl, index) => {
  console.log(`\nTest ${index + 1}: ${testUrl}`);
  
  const url = new URL(testUrl);
  const params = new URLSearchParams(url.search);
  
  const isReferred = params.get('referred') === 'true';
  let referrerId = params.get('referrer');
  const start = params.get('start');
  
  if (start && !referrerId && start.startsWith('refID')) {
    referrerId = start.replace('refID', '');
  }
  
  console.log(`  - isReferred: ${isReferred}`);
  console.log(`  - referrerId: ${referrerId}`);
  console.log(`  - start: ${start}`);
});

console.log('\n🚨 Potential Issues:');
console.log('1. ❓ Are console.log statements appearing in browser?');
console.log('2. ❓ Is parseLaunchParams() being called correctly?');
console.log('3. ❓ Is referrerId null when passed to getOrCreateUser()?');
console.log('4. ❓ Is defaultFirestoreUser() receiving null instead of referrerId?');
console.log('5. ❓ Is there a timing issue with URL parameter reading?');

console.log('\n📝 Debug Steps:');
console.log('1. Check browser console for referral detection logs');
console.log('2. Add console.log in getOrCreateUser to see referrerId value');
console.log('3. Add console.log in defaultFirestoreUser to see invitedBy value');
console.log('4. Check if URL parameters are available when parseLaunchParams runs');
console.log('5. Verify Telegram Mini App URL format is correct');

console.log('\n🎯 Expected Logs in Browser:');
console.log('✅ "Mini App referral detected: { startParam: refID123456, urlReferrerId: 123456 }"');
console.log('✅ "Using Mini App referrer ID: 123456"');
console.log('✅ "Processing Mini App referral: { userId: 7395045429, referrerId: 123456 }"');
console.log('✅ "Created new user 7395045429 with referrer 123456"');

console.log('\n❌ If invitedBy is null, check:');
console.log('- Is referrerId undefined/null in getOrCreateUser?');
console.log('- Is defaultFirestoreUser receiving undefined as 5th parameter?');
console.log('- Is there a bug in defaultFirestoreUser function?');
