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

// Additional imports for callback handler
import { verifyWebhookSignature } from '../src/services/oxapayService.js';
import { db } from '../src/lib/firebase.js';
import { doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { sendAdminNotification } from '../src/lib/telegramUtils.js';

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
      
      case 'callback':
        return await handleCallback(req, res);
      
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
            'create-withdrawal',
            'callback'
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

// Callback handler (from oxapay-callback.js)
async function handleCallback(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const OXAPAY_SECRET = process.env.VITE_OXAPAY_SECRET_KEY;

  try {
    const signature = req.headers['oxapay-signature'];
    const payload = JSON.stringify(req.body);
    
    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature, OXAPAY_SECRET)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const {
      status,
      payment_id,
      order_id,
      amount,
      currency,
      address,
      customer_id,
      metadata
    } = req.body;

    console.log('Received Oxapay webhook:', {
      status,
      payment_id,
      order_id,
      amount,
      currency
    });

    // Handle different order types
    if (order_id.startsWith('withdrawal_')) {
      await handleWithdrawalCallback({
        status,
        payment_id,
        order_id,
        amount,
        currency,
        address,
        customer_id,
        metadata
      });
    } else if (order_id.startsWith('purchase_')) {
      await handlePurchaseCallback({
        status,
        payment_id,
        order_id,
        amount,
        currency,
        customer_id,
        metadata
      });
    } else {
      console.warn('Unknown order type:', order_id);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    await sendAdminNotification(`🚨 Oxapay Webhook Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleWithdrawalCallback({
  status,
  payment_id,
  order_id,
  amount,
  currency,
  address,
  customer_id,
  metadata
}) {
  const withdrawalId = metadata?.withdrawal_id || order_id.split('_')[1];
  const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
  const withdrawalDoc = await getDoc(withdrawalRef);

  if (!withdrawalDoc.exists()) {
    throw new Error(`Withdrawal ${withdrawalId} not found`);
  }

  const withdrawal = withdrawalDoc.data();
  const userRef = doc(db, 'users', withdrawal.userId);

  // Update withdrawal status
  await updateDoc(withdrawalRef, {
    status: status,
    oxapayPaymentId: payment_id,
    completedAt: status === 'completed' ? new Date() : null,
    updatedAt: new Date(),
    finalAmount: amount,
    finalCurrency: currency
  });

  // Handle different statuses
  switch (status) {
    case 'completed':
    case 'confirmed':
      await sendAdminNotification(
        `✅ Withdrawal Completed\nUser: ${customer_id}\nAmount: ${amount} ${currency}`
      );
      break;

    case 'failed':
    case 'cancelled':
      // Refund user's balance
      await updateDoc(userRef, {
        balance: increment(withdrawal.stonAmount)
      });
      
      await sendAdminNotification(
        `❌ Withdrawal Failed\nUser: ${customer_id}\nAmount: ${amount} ${currency}\nReason: ${status}`
      );
      break;

    default:
      await sendAdminNotification(
        `ℹ️ Withdrawal Status Update\nUser: ${customer_id}\nStatus: ${status}\nAmount: ${amount} ${currency}`
      );
  }
}

async function handlePurchaseCallback({
  status,
  payment_id,
  order_id,
  amount,
  currency,
  customer_id,
  metadata
}) {
  const purchaseId = metadata?.purchase_id || order_id.split('_')[1];
  const purchaseRef = doc(db, 'purchases', purchaseId);
  const purchaseDoc = await getDoc(purchaseRef);

  if (!purchaseDoc.exists()) {
    throw new Error(`Purchase ${purchaseId} not found`);
  }

  const purchase = purchaseDoc.data();
  const userRef = doc(db, 'users', purchase.userId);

  // Update purchase status
  await updateDoc(purchaseRef, {
    status: status,
    oxapayPaymentId: payment_id,
    completedAt: status === 'completed' ? new Date() : null,
    updatedAt: new Date(),
    finalAmount: amount,
    finalCurrency: currency
  });

  // Handle different statuses
  switch (status) {
    case 'completed':
    case 'confirmed':
      // Update user's mining power and card inventory
      await updateDoc(userRef, {
        miningPower: increment(purchase.miningPower),
        [`cards.${purchase.cardType}`]: increment(1),
        lastPurchase: new Date()
      });

      await sendAdminNotification(
        `✅ Mining Card Purchase Completed\nUser: ${customer_id}\nCard: ${purchase.cardType}\nAmount: ${amount} ${currency}`
      );
      break;

    case 'failed':
    case 'cancelled':
      await sendAdminNotification(
        `❌ Mining Card Purchase Failed\nUser: ${customer_id}\nCard: ${purchase.cardType}\nAmount: ${amount} ${currency}\nReason: ${status}`
      );
      break;

    default:
      await sendAdminNotification(
        `ℹ️ Purchase Status Update\nUser: ${customer_id}\nStatus: ${status}\nAmount: ${amount} ${currency}`
      );
  }
}
