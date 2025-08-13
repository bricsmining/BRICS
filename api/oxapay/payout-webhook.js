/**
 * OxaPay Payout Webhook handler
 * Handles payout status updates from OxaPay
 */

import { db, doc, updateDoc, getDoc, serverTimestamp, getServerAdminConfig } from '@/lib/serverFirebase';

export default async function handler(req, res) {
  console.log('OxaPay payout webhook received:', {
    method: req.method,
    body: req.body,
    headers: req.headers
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const webhookData = req.body;
    
    // Extract data from webhook
    const {
      track_id: trackId,
      status,
      amount,
      currency,
      address,
      tx_id: transactionId,
      network
    } = webhookData;

    console.log('Processing payout webhook:', {
      trackId,
      status,
      amount,
      currency,
      address,
      transactionId,
      network
    });

    if (!trackId) {
      console.error('No track_id provided in webhook');
      return res.status(400).json({
        success: false,
        error: 'No track_id provided'
      });
    }

    // Try to find the withdrawal record by track_id
    // Note: We need to store the track_id when creating the payout
    // For now, we'll log the webhook data and return success
    
    console.log('Payout status update:', {
      trackId,
      status,
      amount,
      currency,
      transactionId,
      timestamp: new Date().toISOString()
    });

    // Send notification to admin about payout status
    try {
      const adminConfig = await getServerAdminConfig();
      const adminChatId = adminConfig.adminChatId;

      if (adminChatId) {
        let statusMessage = '';
        let statusEmoji = '';
        
        switch (status?.toLowerCase()) {
          case 'paid':
          case 'completed':
          case 'confirmed':
            statusMessage = 'Payout completed successfully';
            statusEmoji = '✅';
            break;
          case 'failed':
          case 'rejected':
            statusMessage = 'Payout failed';
            statusEmoji = '❌';
            break;
          case 'pending':
            statusMessage = 'Payout is being processed';
            statusEmoji = '⏳';
            break;
          default:
            statusMessage = `Payout status: ${status}`;
            statusEmoji = 'ℹ️';
        }

        await fetch(`https://api.telegram.org/bot${process.env.VITE_TG_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminChatId,
            text: `${statusEmoji} <b>${statusMessage}</b>\n\nTrack ID: <code>${trackId}</code>\nAmount: ${amount} ${currency}\nAddress: <code>${address}</code>${transactionId ? `\nTx ID: <code>${transactionId}</code>` : ''}`,
            parse_mode: 'HTML'
          })
        });
      }
    } catch (notificationError) {
      console.error('Failed to send payout webhook notification:', notificationError);
    }

    // Return success to acknowledge webhook
    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Error processing payout webhook:', error);
    
    // Still return success to avoid webhook retries
    return res.status(200).json({
      success: true,
      message: 'Webhook received but processing failed',
      error: error.message
    });
  }
}
