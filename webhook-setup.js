/**
 * Simple Webhook Setup Script
 * Run this with: node webhook-setup.js
eewj */

// Your bot configuration from environment variables
const BOT_TOKEN = process.env.TG_BOT_TOKEN || process.env.VITE_TG_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL || `${process.env.VITE_WEB_APP_URL || 'https://skyton.vercel.app'}/api/telegram-bot`;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'skyton-webhook-secret';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

async function setupWebhook() {
  console.log("🤖 Setting up Telegram bot webhook...\n");
  
  // Validate required environment variables
  if (!BOT_TOKEN) {
    console.error("❌ Bot token not found!");
    console.log("Please set one of these environment variables:");
    console.log("  - TG_BOT_TOKEN");
    console.log("  - VITE_TG_BOT_TOKEN");
    console.log("\nExample:");
    console.log("  TG_BOT_TOKEN=your_bot_token node webhook-setup.js");
    process.exit(1);
  }
  
  console.log("📋 Configuration:");
  console.log(`   Bot Token: ${BOT_TOKEN.substring(0, 15)}...`);
  console.log(`   Webhook URL: ${WEBHOOK_URL}`);
  console.log(`   Webhook Secret: ${WEBHOOK_SECRET}`);
  console.log(`   Admin API Key: ${ADMIN_API_KEY ? ADMIN_API_KEY.substring(0, 8) + '...' : 'Not set'}\n`);
  
  try {
    // Step 1: Get bot info
    console.log("1️⃣ Getting bot information...");
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const botInfoResult = await botInfoResponse.json();
    
    if (!botInfoResult.ok) {
      throw new Error(`Invalid bot token: ${botInfoResult.description}`);
    }
    
    const botInfo = botInfoResult.result;
    console.log(`✅ Bot found: @${botInfo.username} (${botInfo.first_name})`);
    console.log(`   Bot ID: ${botInfo.id}`);
    console.log();
    
    // Step 2: Delete existing webhook (clean slate)
    console.log("2️⃣ Removing old webhook...");
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`, {
      method: 'POST'
    });
    console.log("✅ Old webhook removed\n");
    
    // Step 3: Set new webhook
    console.log("3️⃣ Setting new webhook...");
    const webhookResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        secret_token: WEBHOOK_SECRET,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true
      })
    });
    
    const webhookResult = await webhookResponse.json();
    
    if (!webhookResult.ok) {
      throw new Error(`Webhook setup failed: ${webhookResult.description}`);
    }
    
    console.log("✅ Webhook set successfully!");
    console.log(`   URL: ${WEBHOOK_URL}`);
    console.log(`   Secret: ${WEBHOOK_SECRET}\n`);
    
    // Step 4: Set bot commands
    console.log("4️⃣ Setting bot commands...");
    const commands = [
      { command: "start", description: "Start the bot and open SkyTON app" },
      { command: "help", description: "Show help information" },
      { command: "stats", description: "View your mining stats" },
      { command: "invite", description: "Get your referral link" }
    ];
    
    const commandsResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands })
    });
    
    const commandsResult = await commandsResponse.json();
    
    if (commandsResult.ok) {
      console.log("✅ Bot commands set successfully!\n");
    } else {
      console.log(`⚠️ Commands setup warning: ${commandsResult.description}\n`);
    }
    
    // Step 5: Verify webhook
    console.log("5️⃣ Verifying webhook setup...");
    const verifyResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const verifyResult = await verifyResponse.json();
    
    if (verifyResult.ok) {
      const info = verifyResult.result;
      console.log("✅ Webhook verification:");
      console.log(`   URL: ${info.url || 'Not set'}`);
      console.log(`   Pending updates: ${info.pending_update_count}`);
      console.log(`   Last error: ${info.last_error_message || 'None'}`);
      if (info.last_error_date) {
        console.log(`   Last error date: ${new Date(info.last_error_date * 1000)}`);
      }
      console.log();
    }
    
    // Step 6: Test webhook endpoint
    console.log("6️⃣ Testing webhook endpoint...");
    try {
      const testResponse = await fetch(WEBHOOK_URL, {
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
        console.log("✅ Webhook endpoint is responding correctly\n");
      } else {
        console.log(`⚠️ Webhook endpoint returned status: ${testResponse.status}\n`);
      }
    } catch (error) {
      console.log(`⚠️ Could not test webhook endpoint: ${error.message}\n`);
    }
    
    // Success summary
    console.log("🎉 SETUP COMPLETE!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🤖 Bot: @${botInfo.username} (${botInfo.first_name})`);
    console.log(`🆔 Bot ID: ${botInfo.id}`);
    console.log(`🔗 Start link: https://t.me/${botInfo.username}`);
    console.log(`🎯 Referral example: https://t.me/${botInfo.username}?start=refID123456`);
    console.log(`📱 Web App: https://t.me/${botInfo.username}/app`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    console.log("\n📝 NEXT STEPS:");
    console.log("1. Add these environment variables to your Vercel project:");
    console.log(`   TG_BOT_TOKEN=${BOT_TOKEN}`);
    console.log(`   ADMIN_API_KEY=${ADMIN_API_KEY}`);
    console.log(`   VITE_WEB_APP_URL=${process.env.VITE_WEB_APP_URL || 'https://sky-ton-2.vercel.app'}`);
    console.log(`   TELEGRAM_WEBHOOK_SECRET=${WEBHOOK_SECRET}`);
    console.log(`   BOT_USERNAME=${botInfo.username}`);
    console.log(`   VITE_BOT_USERNAME=${botInfo.username}`);
    
    console.log("\n2. Redeploy your Vercel project after adding variables");
    console.log("\n3. Test your bot:");
    console.log(`   • Open: https://t.me/${botInfo.username}`);
    console.log("   • Send: /start");
    console.log("   • Check if web app button works");
    console.log(`   • Test referral: https://t.me/${botInfo.username}?start=refID123456`);
    
    console.log("\n4. Test comprehensive bot system:");
    console.log("   • Admin notifications should work");
    console.log("   • Referral system should set invitedBy properly");
    console.log("   • Broadcast system ready for admin use");
    
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    console.log("\n🔧 Manual setup URLs:");
    console.log(`Set webhook: https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(WEBHOOK_URL)}&secret_token=${WEBHOOK_SECRET}`);
    console.log(`Get bot info: https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    console.log(`Check webhook: https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    console.log(`Delete webhook: https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
  }
}

// Run the setup
setupWebhook();
