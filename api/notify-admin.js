import { getServerAdminConfig } from '../src/lib/serverFirebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, adminChatId: providedChatId } = req.body;
  
  // Get bot token from environment
  const botToken = process.env.VITE_TG_BOT_TOKEN || process.env.TG_BOT_TOKEN;

  if (!botToken) {
    console.error('Bot token not configured');
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  // Get admin chat ID from database or use provided one
  let adminChatId = providedChatId;
  
  if (!adminChatId) {
    try {
      const adminConfig = await getServerAdminConfig();
      adminChatId = adminConfig.adminChatId;
    } catch (error) {
      console.error('Failed to get admin config:', error);
      adminChatId = null;
    }
  }

  // Validation
  if (!adminChatId) {
    console.error('Admin chat ID not configured');
    return res.status(500).json({ error: 'Admin chat ID not configured' });
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid message' });
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: message.trim(),
          parse_mode: 'HTML',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram API error:', errorData);
      return res.status(500).json({ 
        error: 'Failed to send message to Telegram', 
        details: errorData 
      });
    }

    const result = await response.json();
    
    return res.status(200).json({ 
      success: true, 
      messageId: result.message_id,
      chatId: adminChatId 
    });
    
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return res.status(500).json({ 
      error: 'Failed to send notification', 
      details: error.message 
    });
  }
}
