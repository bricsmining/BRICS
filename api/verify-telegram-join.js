export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, channelUsername, taskId } = req.body;
  const botToken = process.env.TG_BOT_TOKEN;

  if (!botToken || !userId || !channelUsername) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const apiUrl = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=@${channelUsername}&user_id=${userId}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.ok) {
      const status = data.result.status;
      const isMember = ['member', 'administrator', 'creator'].includes(status);
      
      return res.status(200).json({ 
        success: true, 
        isMember,
        status 
      });
    } else {
      console.error('Telegram API error:', data);
      return res.status(400).json({ 
        success: false, 
        error: data.description || 'Failed to verify membership',
        errorCode: data.error_code 
      });
    }
  } catch (error) {
    console.error('Error verifying Telegram membership:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
