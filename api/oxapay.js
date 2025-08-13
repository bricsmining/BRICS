/**
 * Consolidated OxaPay API handler
 * Handles all OxaPay-related operations in one endpoint
 */

// Import all the individual handlers
import createPaymentHandler from './oxapay/create-payment.js';
import checkPaymentHandler from './oxapay/check-payment.js';
import webhookHandler from './oxapay/webhook.js';
import payoutHandler from './oxapay/payout.js';
import payoutWebhookHandler from './oxapay/payout-webhook.js';
import statusHandler from './oxapay/status.js';

export default async function handler(req, res) {
  // Extract the action from query parameter or body
  const { action } = req.query;
  
  try {
    switch (action) {
      case 'create-payment':
        return await createPaymentHandler(req, res);
      
      case 'check-payment':
        return await checkPaymentHandler(req, res);
      
      case 'webhook':
        return await webhookHandler(req, res);
      
      case 'payout':
        return await payoutHandler(req, res);
      
      case 'payout-webhook':
        return await payoutWebhookHandler(req, res);
      
      case 'status':
        return await statusHandler(req, res);
      
      case 'create-withdrawal':
        // Import dynamically to avoid loading all handlers
        const createWithdrawalHandler = await import('./oxapay/create-withdrawal.js');
        return await createWithdrawalHandler.default(req, res);
      
      default:
        return res.status(400).json({ 
          error: 'Invalid action parameter',
          availableActions: [
            'create-payment', 
            'check-payment', 
            'webhook', 
            'payout', 
            'payout-webhook', 
            'status', 
            'create-withdrawal'
          ]
        });
    }
  } catch (error) {
    console.error('Error in consolidated OxaPay handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      action: action || 'unknown'
    });
  }
}
