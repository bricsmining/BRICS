import { getServerAdminConfig } from '../src/lib/serverFirebase.js';

const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 10; // Increased limit for admin notifications

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  const record = rateLimitMap.get(ip);
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return false;
  }

  if (record.count >= maxRequests) return true;
  record.count++;
  return false;
}

export default async function handler(req, res) {
  // Set CORS headers for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // Authentication - Check for API key or allow internal requests
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.ADMIN_API_KEY;
  const isInternalRequest = req.headers['user-agent']?.includes('node') || req.headers['x-internal-request'] === 'true';

  if (!isInternalRequest && (!apiKey || apiKey !== validApiKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
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
      // Fallback to environment variable
      adminChatId = process.env.VITE_ADMIN_CHAT_ID;
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

  if (message.length > 4096) {
    return res.status(400).json({ error: 'Message too long' });
  }

  try {
    console.log('Sending notification to admin:', { chatId: adminChatId, messageLength: message.length });
    
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
    console.log('Notification sent successfully:', result.message_id);
    
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
