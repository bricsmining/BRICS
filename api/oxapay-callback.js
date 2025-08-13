import { verifyWebhookSignature } from '../src/services/oxapayService';
import { db } from '../src/lib/firebase';
import { doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { sendAdminNotification } from '../src/lib/telegramUtils';

const OXAPAY_SECRET = process.env.VITE_OXAPAY_SECRET_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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
