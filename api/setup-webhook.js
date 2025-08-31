/**
 * Dynamic Webhook Setup API Endpoint
 * Call this endpoint to set up webhook for any bot via URL parameters
 * 
 * Usage: GET /api/setup-webhook?TG_BOT_TOKEN=xxx&ADMIN_API_KEY=xxx&TELEGRAM_WEBHOOK_SECRET=xxx
 */

export default async function handler(req, res) {
  // Only allow GET requests for this endpoint
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'This endpoint only accepts GET requests'
    });
  }

  try {
    // Extract parameters from URL query
    const {
      TG_BOT_TOKEN,
      ADMIN_API_KEY,
      TELEGRAM_WEBHOOK_SECRET,
      VITE_WEB_APP_URL
    } = req.query;

    // Validate required parameters
    if (!TG_BOT_TOKEN) {
      return res.status(400).json({
        error: 'Missing TG_BOT_TOKEN parameter',
        usage: 'GET /api/setup-webhook?TG_BOT_TOKEN=your_token&ADMIN_API_KEY=your_key&TELEGRAM_WEBHOOK_SECRET=your_secret'
      });
    }

    // Use ADMIN_API_KEY from query or environment variable
    const adminApiKey = ADMIN_API_KEY || process.env.ADMIN_API_KEY || process.env.VITE_ADMIN_API_KEY;
    
    if (!adminApiKey) {
      return res.status(400).json({
        error: 'Missing ADMIN_API_KEY parameter',
        usage: 'GET /api/setup-webhook?TG_BOT_TOKEN=your_token&ADMIN_API_KEY=your_key&TELEGRAM_WEBHOOK_SECRET=your_secret',
        note: 'You can also set ADMIN_API_KEY as an environment variable'
      });
    }

    // Set defaults for optional parameters using environment variables as fallbacks
    const webhookSecret = TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET || 'default-webhook-secret';
    let webAppUrl = VITE_WEB_APP_URL || process.env.VITE_WEB_APP_URL || getBaseUrl(req);
    
    // Ensure URL has proper protocol
    if (webAppUrl && !webAppUrl.startsWith('http://') && !webAppUrl.startsWith('https://')) {
      webAppUrl = `https://${webAppUrl}`;
    }
    
    const webhookUrl = `${webAppUrl}/api/telegram-bot`;

    console.log(`🤖 Setting up webhook via API for bot token: ${TG_BOT_TOKEN.substring(0, 10)}...`);
    console.log(`🌐 Webhook URL will be: ${webhookUrl}`);

    // Step 1: Validate bot token by getting bot info
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/getMe`);
    const botInfoResult = await botInfoResponse.json();

    if (!botInfoResult.ok) {
      return res.status(400).json({
        error: 'Invalid bot token',
        details: botInfoResult.description,
        provided_token: TG_BOT_TOKEN.substring(0, 10) + '...'
      });
    }

    const botInfo = botInfoResult.result;

    // Step 2: Remove old webhook
    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/deleteWebhook`, {
      method: 'POST'
    });

    // Step 3: Set new webhook
    const webhookResponse = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true
      })
    });

    const webhookResult = await webhookResponse.json();

    if (!webhookResult.ok) {
      return res.status(500).json({
        error: 'Failed to set webhook',
        details: webhookResult.description,
        webhook_url: webhookUrl
      });
    }

    // Step 4: Set bot commands (dynamic)
    const commands = [
      { command: "start", description: "Start the bot and open the app" },
      { command: "help", description: "Show help information" },
      { command: "stats", description: "View your mining stats" },
      { command: "invite", description: "Get your referral link" }
    ];

    const commandsResponse = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands })
    });

    const commandsResult = await commandsResponse.json();

    // Step 5: Verify webhook setup
    const verifyResponse = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/getWebhookInfo`);
    const verifyResult = await verifyResponse.json();

    // Step 6: Test webhook endpoint
    let endpointStatus = 'unknown';
    let endpointError = null;
    try {
      const testResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Telegram-Bot-Api-Secret-Token': webhookSecret
        },
        body: JSON.stringify({
          update_id: 999999,
          message: {
            message_id: 1,
            from: { id: 123456, first_name: "Test" },
            chat: { id: 123456, type: "private" },
            date: Math.floor(Date.now() / 1000),
            text: "/start"
          }
        })
      });
      
      endpointStatus = testResponse.status === 200 ? 'working' : `error_${testResponse.status}`;
      if (testResponse.status !== 200) {
        const errorText = await testResponse.text().catch(() => 'Unknown error');
        endpointError = `HTTP ${testResponse.status}: ${errorText}`;
      }
    } catch (error) {
      endpointStatus = 'unreachable';
      endpointError = error.message;
    }

    // Success response
    const response = {
      success: true,
      message: 'Webhook setup completed successfully',
      bot_info: {
        id: botInfo.id,
        username: botInfo.username,
        first_name: botInfo.first_name,
        can_join_groups: botInfo.can_join_groups,
        can_read_all_group_messages: botInfo.can_read_all_group_messages
      },
      webhook_info: {
        url: webhookUrl,
        secret_token: webhookSecret.substring(0, 8) + '...',
        webhook_status: webhookResult.description,
        endpoint_status: endpointStatus,
        endpoint_error: endpointError,
        pending_updates: verifyResult.ok ? verifyResult.result.pending_update_count : 'unknown'
      },
      commands_status: commandsResult.ok ? 'set' : 'failed',
      configuration: {
        TG_BOT_TOKEN: TG_BOT_TOKEN.substring(0, 10) + '...',
        ADMIN_API_KEY: adminApiKey.substring(0, 5) + '...',
        TELEGRAM_WEBHOOK_SECRET: webhookSecret.substring(0, 8) + '...',
        VITE_WEB_APP_URL: webAppUrl
      },
      links: {
        bot_link: `https://t.me/${botInfo.username}`,
        start_link: `https://t.me/${botInfo.username}`,
        referral_example: `https://t.me/${botInfo.username}?start=refID123456`
      },
      next_steps: [
        "Add the same environment variables to your deployment platform (Vercel/etc.)",
        "Redeploy your project if environment variables were changed",
        `Test your bot: https://t.me/${botInfo.username}`,
        `Test referral: https://t.me/${botInfo.username}?start=refID123456`,
        "Configure your app name and token name in the admin panel"
      ]
    };

    // Log success
    console.log(`✅ Webhook setup completed for @${botInfo.username}`);

    return res.status(200).json(response);

  } catch (error) {
    console.error('Webhook setup error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      usage: 'GET /api/setup-webhook?TG_BOT_TOKEN=your_token&ADMIN_API_KEY=your_key&TELEGRAM_WEBHOOK_SECRET=your_secret'
    });
  }
}

// Helper function to get base URL dynamically
function getBaseUrl(req) {
  // Check for various deployment environment URLs
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.RAILWAY_STATIC_URL) {
    return process.env.RAILWAY_STATIC_URL;
  }
  
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }
  
  // Fallback to request headers
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
}
