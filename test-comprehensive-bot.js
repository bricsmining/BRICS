/**
 * Comprehensive Bot System Test
 * Tests referral processing, notifications, and broadcast features
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const WEBHOOK_URL = 'https://sky-ton-2.vercel.app/api/telegram-bot';
const ADMIN_API_URL = 'https://sky-ton-2.vercel.app/api/admin';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

console.log('🚀 Starting Comprehensive Bot System Test...\n');

// Test 1: Simulate referral webhook
async function testReferralFlow() {
  console.log('📋 TEST 1: Referral Flow');
  console.log('========================');
  
  const testUpdate = {
    update_id: 123456,
    message: {
      message_id: 1,
      from: {
        id: 999888777,
        is_bot: false,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser123'
      },
      chat: {
        id: 999888777,
        type: 'private'
      },
      date: Math.floor(Date.now() / 1000),
      text: '/start refID1234567'
    }
  };

  try {
    console.log('📤 Sending referral test to webhook...');
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': process.env.TELEGRAM_WEBHOOK_SECRET || ''
      },
      body: JSON.stringify(testUpdate)
    });

    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ Referral webhook processed successfully');
      
      // Check if bot sent messages
      console.log('🔍 Expected results:');
      console.log('  - User 999888777 created with invitedBy: "1234567"');
      console.log('  - Welcome message sent to user');
      console.log('  - Admin notification sent');
      console.log('  - Referrer notification sent (if referrer exists)');
    } else {
      const error = await response.text();
      console.log('❌ Referral webhook failed:', error);
    }
  } catch (error) {
    console.log('❌ Error testing referral flow:', error.message);
  }
  
  console.log('\n');
}

// Test 2: Test enhanced broadcast with buttons
async function testEnhancedBroadcast() {
  console.log('📋 TEST 2: Enhanced Broadcast');
  console.log('============================');
  
  const broadcastData = {
    message: `🎉 *SkyTON Update!*

Hello miners! We have exciting news to share:

🔥 *New Features:*
• Enhanced mining rewards
• New social tasks
• Improved referral system

💰 *Special Offer:*
Complete any task today and get 2x rewards!

Ready to boost your earnings?`,
    adminEmail: 'admin@skyton.com',
    parseMode: 'Markdown',
    buttons: [
      [
        { text: '🚀 Open SkyTON', web_app: { url: 'https://sky-ton-2.vercel.app' } }
      ],
      [
        { text: '📱 Share with Friends', url: 'https://t.me/share/url?url=https://t.me/xSkyTON_Bot&text=Join%20me%20on%20SkyTON!' },
        { text: '💬 Support Chat', url: 'https://t.me/SkyTONSupport' }
      ],
      [
        { text: '📊 View Stats', callback_data: 'show_stats' }
      ]
    ]
  };

  try {
    console.log('📤 Sending enhanced broadcast...');
    const response = await fetch(`${ADMIN_API_URL}?action=broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ADMIN_API_KEY
      },
      body: JSON.stringify(broadcastData)
    });

    const result = await response.json();
    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ Enhanced broadcast sent successfully');
      console.log(`📈 Results:`, result);
    } else {
      console.log('❌ Enhanced broadcast failed:', result);
    }
  } catch (error) {
    console.log('❌ Error testing enhanced broadcast:', error.message);
  }
  
  console.log('\n');
}

// Test 3: Test media broadcast
async function testMediaBroadcast() {
  console.log('📋 TEST 3: Media Broadcast');
  console.log('=========================');
  
  const mediaBroadcastData = {
    message: `🎥 *Watch Our Latest Tutorial!*

Learn how to maximize your STON mining with our new video guide.

🎯 Topics covered:
• Advanced mining strategies
• Task completion tips
• Referral optimization

Don't miss out on these pro tips! 🚀`,
    adminEmail: 'admin@skyton.com',
    mediaType: 'photo',
    mediaUrl: 'https://via.placeholder.com/600x400/0066cc/ffffff?text=SkyTON+Tutorial',
    parseMode: 'Markdown',
    buttons: [
      [
        { text: '▶️ Watch Full Tutorial', url: 'https://youtube.com/watch?v=example' }
      ],
      [
        { text: '🚀 Start Mining', web_app: { url: 'https://sky-ton-2.vercel.app' } }
      ]
    ]
  };

  try {
    console.log('📤 Sending media broadcast...');
    const response = await fetch(`${ADMIN_API_URL}?action=broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ADMIN_API_KEY
      },
      body: JSON.stringify(mediaBroadcastData)
    });

    const result = await response.json();
    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ Media broadcast sent successfully');
      console.log(`📈 Results:`, result);
    } else {
      console.log('❌ Media broadcast failed:', result);
    }
  } catch (error) {
    console.log('❌ Error testing media broadcast:', error.message);
  }
  
  console.log('\n');
}

// Test 4: Test bot commands
async function testBotCommands() {
  console.log('📋 TEST 4: Bot Commands');
  console.log('=======================');
  
  const commands = [
    { text: '/help', description: 'Help command' },
    { text: '/start', description: 'Regular start command' },
    { text: 'random message', description: 'Unknown message handling' }
  ];

  for (const cmd of commands) {
    console.log(`🤖 Testing: ${cmd.text}`);
    
    const testUpdate = {
      update_id: Math.floor(Math.random() * 1000000),
      message: {
        message_id: 1,
        from: {
          id: 888777666,
          is_bot: false,
          first_name: 'Command',
          last_name: 'Tester'
        },
        chat: {
          id: 888777666,
          type: 'private'
        },
        date: Math.floor(Date.now() / 1000),
        text: cmd.text
      }
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testUpdate)
      });

      if (response.ok) {
        console.log(`  ✅ ${cmd.description} processed`);
      } else {
        console.log(`  ❌ ${cmd.description} failed`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    // Small delay between commands
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n');
}

// Test 5: Test callback query handling
async function testCallbackQueries() {
  console.log('📋 TEST 5: Callback Queries');
  console.log('===========================');
  
  const callbacks = [
    'get_referral_link',
    'show_stats', 
    'show_help'
  ];

  for (const callbackData of callbacks) {
    console.log(`🔘 Testing callback: ${callbackData}`);
    
    const testUpdate = {
      update_id: Math.floor(Math.random() * 1000000),
      callback_query: {
        id: 'callback_test_' + Date.now(),
        from: {
          id: 777666555,
          first_name: 'Callback',
          last_name: 'Tester'
        },
        message: {
          message_id: 1,
          chat: {
            id: 777666555,
            type: 'private'
          }
        },
        data: callbackData
      }
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testUpdate)
      });

      if (response.ok) {
        console.log(`  ✅ Callback ${callbackData} processed`);
      } else {
        console.log(`  ❌ Callback ${callbackData} failed`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n');
}

// Run all tests
async function runAllTests() {
  console.log('🧪 COMPREHENSIVE BOT SYSTEM TEST SUITE');
  console.log('=====================================\n');
  
  await testReferralFlow();
  await testEnhancedBroadcast();
  await testMediaBroadcast();
  await testBotCommands();
  await testCallbackQueries();
  
  console.log('🎯 TEST SUITE COMPLETED');
  console.log('======================');
  console.log('✅ All tests executed');
  console.log('📋 Check Vercel function logs for detailed results');
  console.log('🤖 Check Telegram bot for actual message delivery');
  console.log('\n💡 Next steps:');
  console.log('  1. Test referral link: https://t.me/xSkyTON_Bot?start=refID1234567');
  console.log('  2. Check admin panel for notifications');
  console.log('  3. Verify Firebase database updates');
}

// Execute the test suite
runAllTests().catch(console.error);
