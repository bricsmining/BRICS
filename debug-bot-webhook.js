/**
 * Debug script to test Telegram bot webhook
 * This script helps identify common issues with bot not responding
 */

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-app.vercel.app/api/telegram-bot';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

async function debugWebhook() {
  console.log('🔍 Debugging Telegram Bot Webhook...\n');

  // 1. Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`   TG_BOT_TOKEN: ${BOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log(`   WEBHOOK_URL: ${WEBHOOK_URL}`);
  console.log(`   WEBHOOK_SECRET: ${WEBHOOK_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log();

  if (!BOT_TOKEN) {
    console.error('❌ TG_BOT_TOKEN is required but not set!');
    return;
  }

  // 2. Check bot info
  try {
    console.log('🤖 Checking Bot Information...');
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const botInfo = await botInfoResponse.json();
    
    if (botInfo.ok) {
      console.log(`   ✅ Bot Active: @${botInfo.result.username}`);
      console.log(`   📛 Bot Name: ${botInfo.result.first_name}`);
      console.log(`   🆔 Bot ID: ${botInfo.result.id}`);
    } else {
      console.error('   ❌ Bot Info Error:', botInfo.description);
      return;
    }
  } catch (error) {
    console.error('   ❌ Failed to get bot info:', error.message);
    return;
  }

  // 3. Check current webhook info
  try {
    console.log('\n🔗 Checking Current Webhook...');
    const webhookResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const webhookInfo = await webhookResponse.json();
    
    if (webhookInfo.ok) {
      const info = webhookInfo.result;
      console.log(`   📡 Webhook URL: ${info.url || 'Not set'}`);
      console.log(`   ✅ Has Custom Certificate: ${info.has_custom_certificate}`);
      console.log(`   📊 Pending Updates: ${info.pending_update_count}`);
      console.log(`   🕐 Last Error Date: ${info.last_error_date ? new Date(info.last_error_date * 1000) : 'None'}`);
      console.log(`   ❌ Last Error Message: ${info.last_error_message || 'None'}`);
      console.log(`   🔄 Max Connections: ${info.max_connections || 'Default'}`);
      console.log(`   🏷️ Allowed Updates: ${info.allowed_updates?.join(', ') || 'All'}`);
      
      // Check if webhook URL matches expected
      if (info.url !== WEBHOOK_URL) {
        console.log(`   ⚠️  WARNING: Webhook URL mismatch!`);
        console.log(`   Expected: ${WEBHOOK_URL}`);
        console.log(`   Actual: ${info.url}`);
      } else {
        console.log(`   ✅ Webhook URL matches expected`);
      }
      
      // Check for errors
      if (info.last_error_message) {
        console.log(`   🚨 WEBHOOK ERROR DETECTED:`);
        console.log(`      Error: ${info.last_error_message}`);
        console.log(`      Time: ${new Date(info.last_error_date * 1000)}`);
      }
      
      if (info.pending_update_count > 0) {
        console.log(`   ⚠️  ${info.pending_update_count} pending updates (bot may be unresponsive)`);
      }
    }
  } catch (error) {
    console.error('   ❌ Failed to get webhook info:', error.message);
  }

  // 4. Test webhook endpoint accessibility
  try {
    console.log('\n🌐 Testing Webhook Endpoint...');
    const testResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(WEBHOOK_SECRET && { 'x-telegram-bot-api-secret-token': WEBHOOK_SECRET })
      },
      body: JSON.stringify({
        update_id: 123456789,
        message: {
          message_id: 1,
          from: { id: 12345, is_bot: false, first_name: "Test" },
          chat: { id: 12345, type: "private" },
          date: Math.floor(Date.now() / 1000),
          text: "/test"
        }
      })
    });
    
    console.log(`   📡 Response Status: ${testResponse.status}`);
    console.log(`   📄 Response Headers: ${JSON.stringify(Object.fromEntries(testResponse.headers.entries()))}`);
    
    const responseText = await testResponse.text();
    console.log(`   📝 Response Body: ${responseText}`);
    
    if (testResponse.status === 200) {
      console.log('   ✅ Webhook endpoint is accessible');
    } else {
      console.log('   ❌ Webhook endpoint returned error');
    }
  } catch (error) {
    console.error('   ❌ Failed to test webhook endpoint:', error.message);
  }

  // 5. Provide troubleshooting recommendations
  console.log('\n🛠️  Troubleshooting Recommendations:');
  console.log('1. ✅ Verify TG_BOT_TOKEN is correct');
  console.log('2. ✅ Ensure webhook URL is accessible (HTTPS required)');
  console.log('3. ✅ Check webhook secret matches in both Telegram and your app');
  console.log('4. ✅ Verify your Vercel deployment is successful');
  console.log('5. ✅ Check Vercel function logs for any errors');
  console.log('6. ✅ Try deleting and resetting the webhook');

  // 6. Show reset webhook command
  console.log('\n🔄 To Reset Webhook (if needed):');
  console.log(`   curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook"`);
  console.log(`   curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \\`);
  console.log(`        -H "Content-Type: application/json" \\`);
  console.log(`        -d '{"url":"${WEBHOOK_URL}"${WEBHOOK_SECRET ? `,"secret_token":"${WEBHOOK_SECRET}"` : ''}}'`);
}

// Run the debug script
debugWebhook().catch(console.error);
