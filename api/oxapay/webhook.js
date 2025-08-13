/**
 * Oxapay Webhook Handler
 * POST /api/oxapay/webhook
 * Handles payment and withdrawal status updates from Oxapay
 */

import { db } from '../../src/lib/serverFirebase.js';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc,
  serverTimestamp,
  increment,
  arrayUnion 
} from 'firebase/firestore';
import { verifyWebhookSignature } from '../../src/services/oxapayService.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Oxapay-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const webhookData = req.body;
    const signature = req.headers['x-oxapay-signature'];

    console.log('Webhook received:', webhookData);
    console.log('Signature:', signature);

    // Verify webhook signature (optional but recommended for production)
    // const webhookSecret = process.env.OXAPAY_WEBHOOK_SECRET;
    // if (webhookSecret && signature) {
    //   const isValid = verifyWebhookSignature(
    //     JSON.stringify(webhookData), 
    //     signature, 
    //     webhookSecret
    //   );
    //   if (!isValid) {
    //     return res.status(401).json({ success: false, error: 'Invalid signature' });
    //   }
    // }

    const { 
      id: oxapayId, 
      track_id,
      payment_id,
      type, 
      status, 
      amount, 
      currency, 
      tx_hash, 
      order_id,
      metadata 
    } = webhookData;

    // Use fallback IDs if main ID is missing
    const finalOxapayId = oxapayId || track_id || payment_id;

    console.log('Webhook data received:', {
      id: oxapayId,
      track_id,
      payment_id,
      finalOxapayId,
      type,
      status,
      order_id,
      amount,
      currency
    });

    if (!finalOxapayId || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required webhook data (id/track_id/payment_id and status required)'
      });
    }

    // Handle different webhook types
    // Default to 'payment' if type is not specified (many payment providers omit this)
    const webhookType = type || 'payment';
    
    if (webhookType === 'payment') {
      await handlePaymentWebhook(webhookData);
    } else if (webhookType === 'withdrawal') {
      await handleWithdrawalWebhook(webhookData);
    } else {
      console.log('Unknown webhook type:', webhookType);
      return res.status(400).json({
        success: false,
        error: `Unknown webhook type: ${webhookType}`
      });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * Handle payment webhook (mining card purchases)
 */
async function handlePaymentWebhook(webhookData) {
  const { 
    id: oxapayId, 
    track_id,
    payment_id,
    status, 
    amount, 
    currency, 
    tx_hash, 
    order_id,
    metadata 
  } = webhookData;

  // Use fallback IDs if main ID is missing
  const finalOxapayId = oxapayId || track_id || payment_id;

  console.log(`Processing payment webhook for Oxapay ID: ${finalOxapayId}, Status: ${status}`);

  // Find payment record in Firebase (try multiple methods)
  const paymentsRef = collection(db, 'payments');
  
  // First try: search by oxapayId
  let querySnapshot = await getDocs(query(paymentsRef, where('oxapayId', '==', finalOxapayId)));
  
  // Second try: search by order_id if first fails
  if (querySnapshot.empty && order_id) {
    console.log(`Trying to find payment by order_id: ${order_id}`);
    querySnapshot = await getDocs(query(paymentsRef, where('orderId', '==', order_id)));
  }
  
  // Third try: search in oxapayData.id if still empty
  if (querySnapshot.empty) {
    console.log(`Trying to find payment by oxapayData.id: ${finalOxapayId}`);
    querySnapshot = await getDocs(query(paymentsRef, where('oxapayData.id', '==', finalOxapayId)));
  }
  
  // Fourth try: search by track_id field if we have it
  if (querySnapshot.empty && track_id) {
    console.log(`Trying to find payment by track_id: ${track_id}`);
    querySnapshot = await getDocs(query(paymentsRef, where('trackId', '==', track_id)));
  }

  if (querySnapshot.empty) {
    console.error(`Payment record not found for Oxapay ID: ${finalOxapayId}, Order ID: ${order_id}, Track ID: ${track_id}`);
    throw new Error(`Payment record not found for Oxapay ID: ${finalOxapayId}, Order ID: ${order_id}`);
  }

  const paymentDoc = querySnapshot.docs[0];
  const paymentData = paymentDoc.data();
  const paymentRef = doc(db, 'payments', paymentDoc.id);

  // Update payment record
  const updateData = {
    oxapayStatus: status,
    updatedAt: serverTimestamp(),
    'oxapayData.status': status,
    'oxapayData.updatedAt': new Date().toISOString()
  };

  if (tx_hash) {
    updateData['oxapayData.txHash'] = tx_hash;
    updateData.txHash = tx_hash;
  }

  await updateDoc(paymentRef, updateData);

  // Handle different payment statuses
  if (status === 'completed' || status === 'confirmed') {
    // Payment successful - activate mining card
    await activateMiningCard(paymentData.userId, paymentData.cardNumber, paymentDoc.id);
    
    // Update payment status to completed
    await updateDoc(paymentRef, {
      status: 'completed',
      completedAt: serverTimestamp()
    });

    // Send success notification
    await sendPaymentNotification(paymentData, 'success', tx_hash);

  } else if (status === 'failed' || status === 'expired' || status === 'cancelled') {
    // Payment failed - update status
    await updateDoc(paymentRef, {
      status: 'failed',
      failedAt: serverTimestamp(),
      failureReason: status
    });

    // Send failure notification
    await sendPaymentNotification(paymentData, 'failed', null, status);

  } else if (status === 'pending' || status === 'processing') {
    // Payment in progress - update status
    await updateDoc(paymentRef, {
      status: 'processing'
    });
  }

  console.log(`Payment webhook processed successfully for ${finalOxapayId}`);
}

/**
 * Handle withdrawal webhook
 */
async function handleWithdrawalWebhook(webhookData) {
  const { 
    id: oxapayId, 
    status, 
    amount, 
    currency, 
    tx_hash, 
    order_id,
    metadata 
  } = webhookData;

  console.log(`Processing withdrawal webhook for Oxapay ID: ${oxapayId}, Status: ${status}`);

  // Find withdrawal record in Firebase
  const withdrawalsRef = collection(db, 'withdrawals');
  const q = query(withdrawalsRef, where('oxapayId', '==', oxapayId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.error(`Withdrawal record not found for Oxapay ID: ${oxapayId}`);
    throw new Error(`Withdrawal record not found for Oxapay ID: ${oxapayId}`);
  }

  const withdrawalDoc = querySnapshot.docs[0];
  const withdrawalData = withdrawalDoc.data();
  const withdrawalRef = doc(db, 'withdrawals', withdrawalDoc.id);

  // Update withdrawal record
  const updateData = {
    oxapayStatus: status,
    updatedAt: serverTimestamp(),
    'oxapayData.status': status,
    'oxapayData.updatedAt': new Date().toISOString()
  };

  if (tx_hash) {
    updateData['oxapayData.txHash'] = tx_hash;
    updateData.txHash = tx_hash;
  }

  await updateDoc(withdrawalRef, updateData);

  // Handle different withdrawal statuses
  if (status === 'completed' || status === 'confirmed') {
    // Withdrawal successful
    await updateDoc(withdrawalRef, {
      status: 'completed',
      completedAt: serverTimestamp()
    });

    // Send success notification
    await sendWithdrawalNotification(withdrawalData, 'success', tx_hash);

  } else if (status === 'failed' || status === 'expired' || status === 'cancelled') {
    // Withdrawal failed - refund user balance
    await refundWithdrawal(withdrawalData.userId, withdrawalData.amount);
    
    await updateDoc(withdrawalRef, {
      status: 'failed',
      failedAt: serverTimestamp(),
      failureReason: status,
      refunded: true
    });

    // Send failure notification
    await sendWithdrawalNotification(withdrawalData, 'failed', null, status);

  } else if (status === 'pending' || status === 'processing') {
    // Withdrawal in progress
    await updateDoc(withdrawalRef, {
      status: 'processing'
    });
  }

  console.log(`Withdrawal webhook processed successfully for ${oxapayId}`);
}

/**
 * Activate mining card for user (Individual Card System)
 * If user already has the same card, extend its validity instead of creating new instance
 */
async function activateMiningCard(userId, cardNumber, paymentId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error(`User not found: ${userId}`);
    }

    const userData = userDoc.data();
    const currentCardData = userData.cardData || {};
    
    // Import the card configurations (should match frontend)
    const INDIVIDUAL_CARDS = {
      1: {
        id: 1,
        name: 'Basic Miner Card',
        validityDays: 7
      },
      2: {
        id: 2,
        name: 'Advanced Miner Card',
        validityDays: 15
      },
      3: {
        id: 3,
        name: 'Pro Miner Card',
        validityDays: 30
      }
    };
    
    const cardConfig = INDIVIDUAL_CARDS[cardNumber];
    if (!cardConfig) {
      throw new Error(`Invalid card number: ${cardNumber}`);
    }
    
    // Look for existing card of the same type
    const existingCardKey = Object.keys(currentCardData)
      .find(key => key.startsWith(`${cardNumber}_`) && currentCardData[key].active);
    
    const now = new Date();
    let newExpirationDate;
    let cardKey;
    let updateData = {};
    
    if (existingCardKey && currentCardData[existingCardKey]) {
      // Extend existing card validity
      cardKey = existingCardKey;
      const existingCard = currentCardData[existingCardKey];
      const currentExpiration = existingCard.expirationDate.toDate ? 
        existingCard.expirationDate.toDate() : 
        new Date(existingCard.expirationDate);
      
      // Reset validity to full period from now (renewal gives full validity)
      newExpirationDate = new Date(now);
      newExpirationDate.setDate(newExpirationDate.getDate() + cardConfig.validityDays);
      
      // Update existing card with extended validity and increased quantity
      updateData[`cardData.${cardKey}`] = {
        ...existingCard,
        expirationDate: newExpirationDate,
        quantity: (existingCard.quantity || 1) + 1,
        lastRenewalDate: serverTimestamp(),
        renewalHistory: arrayUnion({
          renewedAt: serverTimestamp(),
          paymentId,
          validityReset: cardConfig.validityDays,
          newExpirationDate: newExpirationDate
        })
      };
      
      console.log(`Extended existing mining card ${cardNumber} for user ${userId}. New expiration: ${newExpirationDate}`);
    } else {
      // Create new card instance (first time purchase)
      const existingInstances = Object.keys(currentCardData)
        .filter(key => key.startsWith(`${cardNumber}_`))
        .length;
      
      cardKey = `${cardNumber}_${existingInstances + 1}`;
      newExpirationDate = new Date();
      newExpirationDate.setDate(newExpirationDate.getDate() + cardConfig.validityDays);
      
      // Create new card
      updateData[`cardData.${cardKey}`] = {
        cardId: cardNumber,
        purchaseDate: serverTimestamp(),
        expirationDate: newExpirationDate,
        validityDays: cardConfig.validityDays,
        quantity: 1,
        active: true,
        paymentId,
        method: 'oxapay',
        renewalHistory: []
      };
      
      console.log(`Created new mining card ${cardNumber} (instance ${cardKey}) for user ${userId}`);
    }
    
    // Add purchase history entry
    updateData.lastCardPurchase = serverTimestamp();
    updateData[`cardPurchaseHistory.${paymentId}`] = {
      purchasedAt: serverTimestamp(),
      paymentId,
      method: 'oxapay',
      cardNumber,
      cardKey,
      expiresAt: newExpirationDate,
      action: existingCardKey ? 'renewal' : 'new_purchase'
    };

    // Update user's card data
    await updateDoc(userRef, updateData);

    console.log(`Mining card ${cardNumber} activation completed for user ${userId}`);
  } catch (error) {
    console.error('Error activating mining card:', error);
    throw error;
  }
}

/**
 * Refund withdrawal amount to user balance
 */
async function refundWithdrawal(userId, amount) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      balance: increment(amount),
      lastRefundAt: serverTimestamp()
    });

    console.log(`Refunded ${amount} STON to user ${userId}`);
  } catch (error) {
    console.error('Error refunding withdrawal:', error);
    throw error;
  }
}

/**
 * Send payment notification to admin
 */
async function sendPaymentNotification(paymentData, type, txHash, reason) {
  try {
    let message;
    
    if (type === 'success') {
      message = `✅ <b>Mining Card Payment Successful</b>\n` +
                `User: ${paymentData.username ? `@${paymentData.username}` : paymentData.userId}\n` +
                `Card: ${paymentData.cardNumber}\n` +
                `Amount: ${paymentData.cryptoAmount} ${paymentData.currency}\n` +
                `TX Hash: ${txHash}\n` +
                `Card Activated: Yes`;
    } else {
      message = `❌ <b>Mining Card Payment Failed</b>\n` +
                `User: ${paymentData.username ? `@${paymentData.username}` : paymentData.userId}\n` +
                `Card: ${paymentData.cardNumber}\n` +
                `Amount: ${paymentData.cryptoAmount} ${paymentData.currency}\n` +
                `Reason: ${reason}`;
    }

    await fetch(`https://api.telegram.org/bot${process.env.VITE_TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.VITE_ADMIN_CHAT_ID || '5063003944',
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (error) {
    console.error('Failed to send payment notification:', error);
  }
}

/**
 * Send withdrawal notification to admin
 */
async function sendWithdrawalNotification(withdrawalData, type, txHash, reason) {
  try {
    let message;
    
    if (type === 'success') {
      message = `✅ <b>Withdrawal Completed</b>\n` +
                `User: ${withdrawalData.username ? `@${withdrawalData.username}` : withdrawalData.userId}\n` +
                `Amount: ${withdrawalData.amount} STON → ${withdrawalData.cryptoAmount} ${withdrawalData.currency}\n` +
                `Address: ${withdrawalData.walletAddress}\n` +
                `TX Hash: ${txHash}`;
    } else {
      message = `❌ <b>Withdrawal Failed</b>\n` +
                `User: ${withdrawalData.username ? `@${withdrawalData.username}` : withdrawalData.userId}\n` +
                `Amount: ${withdrawalData.amount} STON → ${withdrawalData.cryptoAmount} ${withdrawalData.currency}\n` +
                `Address: ${withdrawalData.walletAddress}\n` +
                `Reason: ${reason}\n` +
                `Refunded: Yes`;
    }

    await fetch(`https://api.telegram.org/bot${process.env.VITE_TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.VITE_ADMIN_CHAT_ID || '5063003944',
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (error) {
    console.error('Failed to send withdrawal notification:', error);
  }
}
