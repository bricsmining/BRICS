/**
 * Telegram Bot Setup Script
 * Run this script to set up your bot webhook and commands
 */

const BOT_TOKEN = process.env.TG_BOT_TOKEN || process.env.VITE_TG_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-app.vercel.app/api/telegram-bot';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'your-webhook-secret';

async function setupBot() {
  if (!BOT_TOKEN) {
    console.error('❌ Bot token not found. Please set TG_BOT_TOKEN environment variable.');
    process.exit(1);
  }

  console.log('🤖 Setting up Telegram bot...');

  try {
    // Set webhook
    await setWebhook();
    
    // Set bot commands
    await setBotCommands();
    
    // Get bot info
    await getBotInfo();
    
    console.log('✅ Bot setup completed successfully!');
  } catch (error) {
    console.error('❌ Bot setup failed:', error);
    process.exit(1);
  }
}

async function setWebhook() {
  console.log('📡 Setting webhook...');
  
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
  const payload = {
    url: WEBHOOK_URL,
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  
  if (result.ok) {
    console.log('✅ Webhook set successfully:', WEBHOOK_URL);
  } else {
    throw new Error(`Failed to set webhook: ${result.description}`);
  }
}

async function setBotCommands() {
  console.log('📋 Setting bot commands...');
  
  const commands = [
    { command: 'start', description: 'Start the bot and open SkyTON app' },
    { command: 'help', description: 'Show help information' },
    { command: 'stats', description: 'View your mining stats' },
    { command: 'invite', description: 'Get your referral link' }
  ];

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commands })
  });

  const result = await response.json();
  
  if (result.ok) {
    console.log('✅ Bot commands set successfully');
  } else {
    throw new Error(`Failed to set commands: ${result.description}`);
  }
}

async function getBotInfo() {
  console.log('ℹ️ Getting bot info...');
  
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getMe`;
  const response = await fetch(url);
  const result = await response.json();
  
  if (result.ok) {
    const bot = result.result;
    console.log(`✅ Bot info:
    • Name: ${bot.first_name}
    • Username: @${bot.username}
    • ID: ${bot.id}
    • Can join groups: ${bot.can_join_groups}
    • Can read messages: ${bot.can_read_all_group_messages}
    • Supports inline: ${bot.supports_inline_queries}`);
    
    console.log(`\n🔗 Bot links:
    • Start: https://t.me/${bot.username}
    • Referral example: https://t.me/${bot.username}?start=123456`);
  } else {
    throw new Error(`Failed to get bot info: ${result.description}`);
  }
}

async function getWebhookInfo() {
  console.log('📡 Getting webhook info...');
  
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;
  const response = await fetch(url);
  const result = await response.json();
  
  if (result.ok) {
    const info = result.result;
    console.log(`📡 Webhook info:
    • URL: ${info.url || 'Not set'}
    • Pending updates: ${info.pending_update_count}
    • Last error: ${info.last_error_message || 'None'}
    • Max connections: ${info.max_connections || 'Default'}`);
  }
}

async function deleteWebhook() {
  console.log('🗑️ Deleting webhook...');
  
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`;
  const response = await fetch(url, { method: 'POST' });
  const result = await response.json();
  
  if (result.ok) {
    console.log('✅ Webhook deleted successfully');
  } else {
    throw new Error(`Failed to delete webhook: ${result.description}`);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'setup':
    setupBot();
    break;
  case 'info':
    getBotInfo();
    break;
  case 'webhook-info':
    getWebhookInfo();
    break;
  case 'delete-webhook':
    deleteWebhook();
    break;
  default:
    console.log(`
🤖 Telegram Bot Setup

Usage:
  node scripts/setup-bot.js <command>

Commands:
  setup         - Set up webhook and commands
  info          - Get bot information
  webhook-info  - Get webhook information
  delete-webhook - Delete webhook

Environment Variables Required:
  TG_BOT_TOKEN           - Your bot token from @BotFather
  WEBHOOK_URL            - Your webhook URL (e.g., https://your-app.vercel.app/api/telegram-bot)
  TELEGRAM_WEBHOOK_SECRET - Secret token for webhook security (optional)
  BOT_USERNAME           - Your bot username (optional, for referral links)

Example:
  TG_BOT_TOKEN=123456789:ABC... WEBHOOK_URL=https://your-app.vercel.app/api/telegram-bot node scripts/setup-bot.js setup
    `);
    break;
}
