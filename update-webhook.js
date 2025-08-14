/**
 * Update Telegram Bot Webhook
 * This script updates the webhook to point to the correct deployment
 */

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const WORKING_WEBHOOK_URL = 'https://sky-ton-2.vercel.app/api/telegram-bot';
const TARGET_WEBHOOK_URL = 'https://skyton.vercel.app/api/telegram-bot';

console.log('🔄 Updating Telegram Bot Webhook...\n');

async function updateWebhook() {
  try {
    // First, get bot info to confirm we're working with the right bot
    console.log('🤖 Checking bot information...');
    const botResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const botResult = await botResponse.json();
    
    if (!botResult.ok) {
      throw new Error(`Invalid bot token: ${botResult.description}`);
    }
    
    const botInfo = botResult.result;
    console.log(`✅ Bot confirmed: @${botInfo.username} (${botInfo.first_name})`);
    console.log(`   Bot ID: ${botInfo.id}\n`);
    
    // Check if the target URL is working
    console.log('🔍 Checking target webhook endpoint...');
    
    try {
      const testResponse = await fetch(TARGET_WEBHOOK_URL, {
        method: 'GET'
      });
      console.log(`📊 Target endpoint status: ${testResponse.status}`);
      
      if (testResponse.status === 405 || testResponse.status === 200) {
        console.log('✅ Target endpoint exists and is responding');
        
        // Update webhook to target URL
        console.log(`🎯 Setting webhook to: ${TARGET_WEBHOOK_URL}`);
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: TARGET_WEBHOOK_URL,
            secret_token: WEBHOOK_SECRET,
            allowed_updates: ["message", "callback_query"],
            drop_pending_updates: true
          })
        });
        
        const result = await response.json();
        console.log('📤 Webhook update result:', result);
        
      } else {
        console.log('❌ Target endpoint not ready, using working deployment');
        await setWorkingWebhook();
      }
    } catch (endpointError) {
      console.log('❌ Target endpoint not accessible, using working deployment');
      console.log(`   Error: ${endpointError.message}`);
      await setWorkingWebhook();
    }
    
    // Verify webhook status
    await verifyWebhookStatus(botInfo);
    
    // Test the webhook endpoint
    await testWebhookEndpoint();
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Test the bot: https://t.me/' + botInfo.username);
    console.log('2. Test referral: https://t.me/' + botInfo.username + '?start=refID123456');
    console.log('3. If using working deployment, deploy bot code to skyton.vercel.app');
    console.log('4. Once deployed, run this script again to update to main URL');
    console.log('5. Test admin broadcast system in admin panel');
    
  } catch (error) {
    console.error('❌ Error updating webhook:', error);
    console.log('\n🔧 Manual Commands:');
    console.log(`Set webhook: curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" -H "Content-Type: application/json" -d '{"url":"${WORKING_WEBHOOK_URL}","secret_token":"${WEBHOOK_SECRET}"}'`);
    console.log(`Check webhook: curl "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"`);
    console.log(`Delete webhook: curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook"`);
  }
}

async function setWorkingWebhook() {
  console.log(`🔧 Setting webhook to working deployment: ${WORKING_WEBHOOK_URL}`);
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: WORKING_WEBHOOK_URL,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true
    })
  });
  
  const result = await response.json();
  console.log('📤 Webhook update result:', result);
}

async function verifyWebhookStatus(botInfo) {
  console.log('\n🔍 Verifying webhook status...');
  const statusResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  const statusResult = await statusResponse.json();
  
  if (statusResult.ok) {
    const info = statusResult.result;
    console.log('✅ Webhook Status:');
    console.log(`   URL: ${info.url}`);
    console.log(`   Pending Updates: ${info.pending_update_count}`);
    console.log(`   Max Connections: ${info.max_connections}`);
    console.log(`   Allowed Updates: ${info.allowed_updates?.join(', ') || 'All'}`);
    
    if (info.last_error_date) {
      console.log(`   ⚠️ Last Error: ${info.last_error_message}`);
      console.log(`   Error Date: ${new Date(info.last_error_date * 1000)}`);
    } else {
      console.log('   ✅ No recent errors');
    }
    
    // Check if webhook URL matches expected
    if (info.url === WORKING_WEBHOOK_URL) {
      console.log('   📍 Using working deployment URL');
    } else if (info.url === TARGET_WEBHOOK_URL) {
      console.log('   📍 Using target deployment URL');
    } else {
      console.log('   ⚠️ Using unexpected URL');
    }
  }
}

async function testWebhookEndpoint() {
  console.log('\n🧪 Testing webhook endpoint...');
  
  const statusResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  const statusResult = await statusResponse.json();
  
  if (statusResult.ok && statusResult.result.url) {
    const webhookUrl = statusResult.result.url;
    
    try {
      const testResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Telegram-Bot-Api-Secret-Token': WEBHOOK_SECRET
        },
        body: JSON.stringify({
          update_id: 999999,
          message: {
            message_id: 1,
            from: { id: 123456, first_name: "Test", username: "testuser" },
            chat: { id: 123456, type: "private" },
            date: Math.floor(Date.now() / 1000),
            text: "/start"
          }
        })
      });
      
      if (testResponse.ok) {
        console.log('✅ Webhook endpoint responding correctly');
      } else {
        console.log(`⚠️ Webhook endpoint returned status: ${testResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Could not reach webhook endpoint: ${error.message}`);
    }
  }
}

// Run the update
updateWebhook();
