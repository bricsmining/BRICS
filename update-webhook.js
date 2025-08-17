/**
 * Update Telegram Webhook Script
 * Run this to update the webhook URL and secret
 */

const BOT_TOKEN = process.env.TG_BOT_TOKEN || process.env.VITE_TG_BOT_TOKEN;
const WEBHOOK_URL = process.env.VITE_WEB_APP_URL ? `${process.env.VITE_WEB_APP_URL}/api/telegram-bot` : 'https://skyton.vercel.app/api/telegram-bot';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'skyton-000ddeab741cc1f0247654567adse';

async function updateWebhook() {
  if (!BOT_TOKEN) {
    console.error('❌ Bot token not found. Please set TG_BOT_TOKEN environment variable.');
    process.exit(1);
  }

  console.log('🔄 Updating Telegram webhook...');
  console.log('📡 Webhook URL:', WEBHOOK_URL);
  console.log('🔐 Secret configured:', WEBHOOK_SECRET ? 'Yes' : 'No');

  try {
    // First delete existing webhook
    const deleteResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`, {
      method: 'POST'
    });
    const deleteResult = await deleteResponse.json();
    console.log('🗑️ Delete webhook result:', deleteResult);

    // Set new webhook with secret
    const setResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        secret_token: WEBHOOK_SECRET,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true
      })
    });

    const setResult = await setResponse.json();
    
    if (setResult.ok) {
      console.log('✅ Webhook updated successfully!');
      
      // Get webhook info to verify
      const infoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
      const infoResult = await infoResponse.json();
      
      if (infoResult.ok) {
        console.log('📋 Webhook Info:');
        console.log('  URL:', infoResult.result.url);
        console.log('  Has Secret:', infoResult.result.has_custom_certificate ? 'Yes' : 'No');
        console.log('  Pending Updates:', infoResult.result.pending_update_count);
        console.log('  Last Error:', infoResult.result.last_error_message || 'None');
      }
    } else {
      console.error('❌ Failed to set webhook:', setResult.description);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error updating webhook:', error);
    process.exit(1);
  }
}

updateWebhook();