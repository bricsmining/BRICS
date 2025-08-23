// API endpoint to get admin configuration using Firebase Admin SDK
// This ensures reliable server-side access without client offline issues

import { getAdminConfigServerSide } from '@/lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple API key check for security
  const { api } = req.query;
  const validApiKey = process.env.ADMIN_API_KEY;
  
  if (!api || api !== validApiKey) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  try {
    console.log('[AdminConfigAPI] Getting admin configuration via Admin SDK...');
    console.log('[AdminConfigAPI] Environment check - GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'Set' : 'Not set');
    
    const adminConfig = await getAdminConfigServerSide();
    
    console.log('[AdminConfigAPI] Successfully retrieved admin config with stonToTonRate:', adminConfig.stonToTonRate);
    
    return res.status(200).json({
      success: true,
      data: adminConfig
    });
  } catch (error) {
    console.error('[AdminConfigAPI] Error getting admin config:', error);
    console.error('[AdminConfigAPI] Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
}
