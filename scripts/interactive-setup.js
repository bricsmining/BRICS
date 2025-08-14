/**
 * Interactive Bot Setup Script
 * Guides you through the webhook setup process step by step
 */

import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setupBot() {
  console.log('🤖 Welcome to SkyTON Bot Interactive Setup!\n');
  
  try {
    // Step 1: Get basic info
    console.log('📋 First, let\'s gather the required information:\n');
    
    const vercelUrl = await ask('1. What is your Vercel app URL? (e.g., https://your-app.vercel.app): ');
    if (!vercelUrl.startsWith('https://')) {
      console.log('❌ Please provide a valid HTTPS URL');
      process.exit(1);
    }
    
    const botToken = await ask('2. What is your Telegram bot token from @BotFather? ');
    if (!botToken.includes(':')) {
      console.log('❌ Bot token should contain a colon (:)');
      process.exit(1);
    }
    
    const apiKey = await ask('3. What is your ADMIN_API_KEY? (create a secure random string): ');
    if (apiKey.length < 10) {
      console.log('❌ API key should be at least 10 characters long');
      process.exit(1);
    }
    
    const webhookSecret = await ask('4. Webhook secret (optional, press Enter to skip): ') || 'skyton-webhook-secret';
    
    console.log('\n📝 Configuration Summary:');
    console.log(`   Vercel URL: ${vercelUrl}`);
    console.log(`   Bot Token: ${botToken.substring(0, 10)}...`);
    console.log(`   API Key: ${apiKey.substring(0, 5)}...`);
    console.log(`   Webhook Secret: ${webhookSecret}`);
    const webhookUrl = vercelUrl.endsWith('/') ? `${vercelUrl}api/telegram-bot` : `${vercelUrl}/api/telegram-bot`;
    console.log(`   Webhook URL: ${webhookUrl}`);
    
    const confirm = await ask('\n✅ Does this look correct? (y/n): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Setup cancelled');
      process.exit(0);
    }
    
    // Step 2: Test bot token
    console.log('\n🔍 Testing bot token...');
    const botInfo = await testBotToken(botToken);
    if (!botInfo) {
      console.log('❌ Invalid bot token or bot is not accessible');
      process.exit(1);
    }
    
    console.log(`✅ Bot found: @${botInfo.username} (${botInfo.first_name})`);
    
    // Step 3: Test webhook URL
    console.log('\n🌐 Testing webhook URL...');
    const webhookUrlForTesting = vercelUrl.endsWith('/') ? `${vercelUrl}api/telegram-bot` : `${vercelUrl}/api/telegram-bot`;
    const webhookOk = await testWebhookUrl(webhookUrlForTesting);
    if (!webhookOk) {
      console.log('❌ Webhook URL is not accessible. Make sure your Vercel deployment is complete.');
      console.log('   You can continue setup and the webhook will work once deployment is ready.');
    } else {
      console.log('✅ Webhook URL is accessible');
    }
    
    // Step 4: Set webhook
    console.log('\n📡 Setting up webhook...');
    const webhookResult = await setWebhook(botToken, webhookUrlForTesting, webhookSecret);
    
    if (webhookResult.ok) {
      console.log('✅ Webhook set successfully!');
      
      // Step 5: Set bot commands
      console.log('\n📋 Setting bot commands...');
      await setBotCommands(botToken);
      console.log('✅ Bot commands configured!');
      
      // Step 6: Final instructions
      console.log('\n🎉 Setup Complete! Next steps:');
      console.log('\n📝 Add these environment variables to your Vercel project:');
      console.log(`   TG_BOT_TOKEN=${botToken}`);
      console.log(`   ADMIN_API_KEY=${apiKey}`);
      console.log(`   VITE_WEB_APP_URL=${vercelUrl}`);
      console.log(`   TELEGRAM_WEBHOOK_SECRET=${webhookSecret}`);
      console.log(`   BOT_USERNAME=${botInfo.username}`);
      
      console.log('\n🔧 How to add them:');
      console.log('   1. Go to https://vercel.com/dashboard');
      console.log('   2. Click on your project');
      console.log('   3. Go to Settings > Environment Variables');
      console.log('   4. Add each variable above');
      console.log('   5. Redeploy your project');
      
      console.log('\n🧪 Test your bot:');
      console.log(`   1. Open https://t.me/${botInfo.username}`);
      console.log('   2. Send /start command');
      console.log('   3. Test referral: https://t.me/${botInfo.username}?start=123456');
      
    } else {
      console.log('❌ Failed to set webhook:', webhookResult.description);
      console.log('\n🔧 Manual setup:');
      console.log(`curl -X POST "https://api.telegram.org/bot${botToken}/setWebhook" \\`);
      console.log('  -H "Content-Type: application/json" \\');
      console.log(`  -d '{"url": "${webhookUrlForTesting}", "secret_token": "${webhookSecret}"}'`);
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

async function testBotToken(token) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const result = await response.json();
    return result.ok ? result.result : null;
  } catch (error) {
    return null;
  }
}

async function testWebhookUrl(url) {
  try {
    const response = await fetch(url, { method: 'POST' });
    return response.status !== 404; // Any response other than 404 means the endpoint exists
  } catch (error) {
    return false;
  }
}

async function setWebhook(token, url, secret) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        secret_token: secret,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true
      })
    });
    return await response.json();
  } catch (error) {
    return { ok: false, description: error.message };
  }
}

async function setBotCommands(token) {
  const commands = [
    { command: 'start', description: 'Start the bot and open SkyTON app' },
    { command: 'help', description: 'Show help information' },
    { command: 'stats', description: 'View your mining stats' },
    { command: 'invite', description: 'Get your referral link' }
  ];
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands })
    });
    return await response.json();
  } catch (error) {
    console.log('⚠️ Failed to set commands:', error.message);
  }
}

// Run the setup
setupBot();
